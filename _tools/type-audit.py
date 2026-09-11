#!/usr/bin/env python3
"""
Typography audit for rehanbutt.com.

Walks every built page, resolves what each element's type actually renders as,
and reports the distinct styles with counts and locations.

    python3 _tools/type-audit.py              # writes the JSON and the page
    python3 _tools/type-audit.py --no-html    # data only
    python3 _tools/type-audit.py --pages 10   # sample, for a quick look

Outputs, both beside this script:
    type-audit.json          the dataset
    type-atlas.html          the specimen viewer

Why this renders rather than reads declarations
-----------------------------------------------
Sass does not resolve `em`. 88 of the 163 font-sizes in the compiled stylesheet
are still relative (`1.25em`, `.75em`), so a declaration on its own says nothing
about what anything looks like — the browser resolves it against each element's
parent at render time.

So this walks the built HTML, matches CSS rules to elements, sorts by
specificity, and carries font-size down the tree to turn every `em` into a real
pixel value. That is a small cascade implementation, and it is deliberately
scoped to what this site uses: descendant and compound selectors, classes,
ids, elements. It does not implement child/sibling combinators (the site's type
rules contain none) and it skips pseudo-element and state selectors, which do
not describe resting type.

Stdlib only, so it runs anywhere Python does.
"""

import argparse
import bisect
import html.parser
import json
import pathlib
import re
import sys
from collections import defaultdict

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
SITE = ROOT / "_site"
CSS = SITE / "css" / "rehan.css"

TYPE_PROPS = ("font-family", "font-size", "font-weight", "font-style",
              "line-height", "letter-spacing", "text-transform")
INHERITED = set(TYPE_PROPS)          # all of these inherit in CSS

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}
SKIP = {"script", "style", "head", "meta", "link", "title", "svg", "path", "g",
        "defs", "clippath", "lineargradient", "stop", "br"}

ROOT_FONT_PX = 16.0                  # html default; the site never overrides it

# The ramp the site actually works on, fitted to real usage rather than a
# formula: these ten sizes cover 84% of the type on the site. Everything else
# is reported off-scale, which is the point of the column — 37.5px alone
# accounts for 546 elements and is worth seeing as a stray, not as a step.
# Edit this when the scale is decided; the audit reports against it, it does
# not define it.
SCALE = (10.0, 12.0, 16.0, 20.0, 24.0, 32.0, 40.0, 50.0, 60.0, 70.0)


# --------------------------------------------------------------------------
# a very small DOM
# --------------------------------------------------------------------------

class Node:
    __slots__ = ("tag", "classes", "id", "parent", "children", "style",
                 "origin", "text")

    def __init__(self, tag, attrs, parent):
        self.tag = tag
        a = dict(attrs)
        self.classes = set((a.get("class") or "").split())
        self.id = a.get("id")
        self.parent = parent
        self.children = []
        self.style = {}
        self.origin = {}
        self.text = ""


class DOM(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("[root]", {}, None)
        self.cur = self.root
        self.nodes = []

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        self.nodes.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        self.nodes.append(n)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        node = self.cur
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is not self.root:
            self.cur = node.parent

    def handle_data(self, data):
        d = data.strip()
        if d and self.cur is not self.root:
            self.cur.text = (self.cur.text + " " + d).strip()[:120]


# --------------------------------------------------------------------------
# CSS: parse, then match
# --------------------------------------------------------------------------

def strip_at_rules(css):
    """Blank out at-rules that do not apply, in place.

    Returns a string the SAME LENGTH as the input, so every character offset
    still points at the same place in the real stylesheet — which is what the
    source map is keyed on. Dropped regions become spaces; for a query that
    does apply, only its prelude and closing brace are blanked, flattening the
    body up a level while leaving it where it sits.

    Media queries are kept when they hold on a wide screen; this audit reports
    the desktop resting state.
    """
    buf = list(css)

    def blank(a, b):
        for i in range(a, b):
            if buf[i] != "\n":
                buf[i] = " "

    def scan(start, end):
        i = start
        while i < end:
            if css[i] != "@":
                i += 1
                continue
            j = css.find("{", i)
            semi = css.find(";", i)
            # statement at-rules (@import, @charset) end at the semicolon and
            # have no block; blanking to the next brace would eat a real rule
            if semi >= 0 and (j < 0 or semi < j):
                blank(i, min(semi + 1, end))
                i = semi + 1
                continue
            if j < 0 or j >= end:
                blank(i, end)
                return
            at = css[i:j]
            depth, k = 0, j
            while k < end:
                if css[k] == "{":
                    depth += 1
                elif css[k] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                k += 1
            keep = ("min-width" in at and "max-width" not in at) or \
                   ("media" not in at and "supports" in at)
            if keep:
                blank(i, j + 1)        # the prelude
                blank(k, k + 1)        # the closing brace
                scan(j + 1, k)         # nested at-rules inside
            else:
                blank(i, min(k + 1, end))
            i = k + 1

    scan(0, len(css))
    out = "".join(buf)
    assert len(out) == len(css)
    return out


# --------------------------------------------------------------------------
# source map: which .scss file wrote this byte of the stylesheet
# --------------------------------------------------------------------------

B64 = {c: i for i, c in enumerate(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/")}


def vlq_decode(segment):
    """Base64 VLQ -> list of ints."""
    out, shift, acc = [], 0, 0
    for ch in segment:
        d = B64[ch]
        acc += (d & 31) << shift
        if d & 32:
            shift += 5
            continue
        sign = acc & 1
        val = acc >> 1
        out.append(-val if sign else val)
        shift, acc = 0, 0
    return out


class SourceMap:
    """Column -> source file, for a single-line (compressed) stylesheet."""

    def __init__(self, path):
        self.sources = []
        self.points = []
        self.astral = []                 # sorted [(generated_col, src_idx)]
        if not path.exists():
            return
        m = json.loads(path.read_text())
        self.sources = [normalise_source(s) for s in m["sources"]]
        gen_col = src_idx = 0
        for line in m["mappings"].split(";"):
            gen_col = 0                  # generated column resets each line
            for seg in line.split(","):
                if not seg:
                    continue
                f = vlq_decode(seg)
                gen_col += f[0]
                if len(f) >= 4:
                    src_idx += f[1]
                    self.points.append((gen_col, src_idx))
        self.points.sort(key=lambda p: p[0])
        self.cols = [p[0] for p in self.points]

    def index(self, css):
        """Note where the astral characters are.

        Source-map columns count UTF-16 code units; Python counts characters.
        The site's emoji cursors (`url("...🪄...")` in about.scss) are astral,
        so each one puts the two counts one further apart. Without this the
        lookup drifts a few columns and starts crediting the wrong file.
        """
        self.astral = [i for i, ch in enumerate(css) if ord(ch) > 0xFFFF]

    def lookup(self, col):
        if not self.points:
            return None
        col += bisect.bisect_right(self.astral, col)
        i = bisect.bisect_right(self.cols, col) - 1
        if i < 0:
            return None
        return self.sources[self.points[i][1]]


VENDOR_DIRS = ("vendor/", "typography/", "xy-grid/", "components/", "util/",
               "forms/", "grid/")
VENDOR_FILES = ("_settings.scss", "foundation.scss", "app.scss")


def normalise_source(src):
    """'../_sass/about.scss' -> '_sass/about.scss'."""
    s = src.replace("\\", "/")
    s = re.sub(r'^(\.\./)+', '', s)
    if not s.startswith("_sass/") and "/" not in s:
        s = "css/" + s
    return s


def is_vendor(src):
    if not src:
        return False
    tail = src.split("/")[-1]
    return any(d in src for d in VENDOR_DIRS) or tail in VENDOR_FILES


def parse_rules(css, smap=None):
    """[(selector, {prop: value}, order, {prop: source_file})] for type rules."""
    rules = []
    for order, m in enumerate(re.finditer(r'([^{}]+)\{([^{}]*)\}', css)):
        body, base = m.group(2), m.start(2)
        decls, origin, at = {}, {}, 0
        for d in body.split(";"):
            start, at = at, at + len(d) + 1
            if ":" not in d:
                continue
            p, _, v = d.partition(":")
            p = p.strip().lower()
            if p in TYPE_PROPS:
                decls[p] = v.strip()
                origin[p] = smap.lookup(base + start) if smap else None
        if not decls:
            continue
        for sel in m.group(1).split(","):
            sel = sel.strip()
            if not sel or "::" in sel or sel.startswith("@"):
                continue
            # state selectors describe interaction, not resting type
            if re.search(r':(hover|focus|active|visited|checked|disabled)', sel):
                continue
            rules.append((sel, decls, order, origin))
    return rules


COMPOUND = re.compile(r'^([a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)')


def parse_compound(part):
    """'div.foo#bar' -> ('div', {'foo'}, 'bar'). Unsupported bits -> None."""
    part = re.sub(r':(?!:)[\w-]+(\([^)]*\))?', '', part)   # drop :pseudo
    part = re.sub(r'\[[^\]]*\]', '', part)                 # drop [attr]
    if not part:
        return ("*", set(), None)
    m = COMPOUND.match(part)
    if not m or m.end() != len(part):
        return None
    tag = (m.group(1) or "*").lower()
    classes, ident = set(), None
    for tok in re.findall(r'[.#][\w-]+', m.group(2) or ""):
        (classes.add(tok[1:]) if tok[0] == "." else None)
        if tok[0] == "#":
            ident = tok[1:]
    return (tag, classes, ident)


def compile_selector(sel):
    """Descendant-only selector -> list of compounds, or None if unsupported."""
    if ">" in sel or "+" in sel or "~" in sel:
        return None
    parts = [p for p in sel.split() if p]
    out = []
    for p in parts:
        c = parse_compound(p)
        if c is None:
            return None
        out.append(c)
    return out or None


def matches_compound(node, comp):
    tag, classes, ident = comp
    if tag != "*" and node.tag != tag:
        return False
    if classes and not classes <= node.classes:
        return False
    if ident and node.id != ident:
        return False
    return True


def matches(node, compounds):
    """Right-to-left descendant match."""
    if not matches_compound(node, compounds[-1]):
        return False
    n = node.parent
    for comp in reversed(compounds[:-1]):
        while n is not None:
            if matches_compound(n, comp):
                break
            n = n.parent
        else:
            return False
        if n is None:
            return False
        n = n.parent
    return True


def specificity(compounds):
    a = b = c = 0
    for tag, classes, ident in compounds:
        if ident:
            a += 1
        b += len(classes)
        if tag != "*":
            c += 1
    return (a, b, c)


# --------------------------------------------------------------------------
# value resolution
# --------------------------------------------------------------------------

ABS = {"xx-small": 9, "x-small": 10, "small": 13, "medium": 16,
       "large": 18, "x-large": 24, "xx-large": 32}


def resolve_size(value, parent_px):
    """font-size -> px, given the parent's computed px."""
    v = value.strip().lower()
    if v in ABS:
        return float(ABS[v])
    if v in ("inherit", "unset", "initial"):
        return parent_px
    m = re.match(r'^(-?[\d.]+)(px|em|rem|%|pt)?$', v)
    if not m:
        return parent_px
    n = float(m.group(1))
    unit = m.group(2) or "px"
    if unit == "px":
        return n
    if unit == "em":
        return n * parent_px
    if unit == "rem":
        return n * ROOT_FONT_PX
    if unit == "%":
        return n * parent_px / 100
    if unit == "pt":
        return n * 4 / 3
    return parent_px


def resolve_line_height(value, size_px):
    """line-height -> px. `normal` is reported as-is; `inherit` never reaches
    here, because it is resolved during the walk against the parent's value."""
    v = (value or "").strip().lower()
    if not v:
        return None
    if v == "normal":
        return "normal"
    if v in ("inherit", "unset", "initial"):
        return None
    m = re.match(r'^([\d.]+)(px|em|rem|%)?$', v)
    if not m:
        return None
    n = float(m.group(1))
    unit = m.group(2)
    if unit is None:
        return n * size_px
    if unit == "px":
        return n
    if unit == "em":
        return n * size_px
    if unit == "rem":
        return n * ROOT_FONT_PX
    if unit == "%":
        return n * size_px / 100
    return None


def first_family(value):
    if not value:
        return None
    f = value.split(",")[0].strip().strip("'\"")
    return f or None


def norm_weight(value):
    v = (value or "").strip().lower()
    return {"normal": "400", "bold": "700"}.get(v, v)


# --------------------------------------------------------------------------
# the walk
# --------------------------------------------------------------------------

def style_page(path, compiled):
    """Compute resting type for every text-bearing element on one page."""
    dom = DOM()
    try:
        dom.feed(path.read_text(errors="ignore"))
    except Exception:
        return []

    # collect declarations per node, cascade-ordered
    for node in dom.nodes:
        if node.tag in SKIP:
            continue
        hits = []
        for compounds, decls, order, spec, origin in compiled:
            if matches(node, compounds):
                hits.append((spec, order, decls, origin))
        hits.sort(key=lambda h: (h[0], h[1]))
        merged, from_file = {}, {}
        for _, _, decls, origin in hits:
            merged.update(decls)
            from_file.update(origin)
        node.style = merged
        node.origin = from_file

    out = []

    def walk(node, inherited, inherited_files):
        if node.tag in SKIP:
            return
        computed = dict(inherited)
        files = dict(inherited_files)
        own = node.style
        # font-size first: everything else can depend on it
        parent_px = inherited.get("_size_px", ROOT_FONT_PX)
        if "font-size" in own:
            size_px = resolve_size(own["font-size"], parent_px)
            files["font-size"] = node.origin.get("font-size")
        else:
            size_px = parent_px
        computed["_size_px"] = size_px
        for p in TYPE_PROPS:
            if p in own and p != "font-size":
                # `inherit` is a no-op: keep whatever came down the tree.
                # Foundation sets `a{line-height:inherit}`, which would
                # otherwise wipe the value for every link on the site.
                if own[p].strip().lower() in ("inherit", "unset"):
                    continue
                computed[p] = own[p]
                files[p] = node.origin.get(p)
        if node.tag not in ("html", "[root]") and node.text:
            out.append(dict(
                tag=node.tag,
                classes=" ".join(sorted(node.classes)) or None,
                family=first_family(computed.get("font-family")),
                size=round(size_px, 2),
                weight=norm_weight(computed.get("font-weight")) or "400",
                style=(computed.get("font-style") or "normal").strip(),
                lh=(lambda x: round(x, 2) if isinstance(x, float) else x)(
                    resolve_line_height(computed.get("line-height"), size_px)),
                spacing=(computed.get("letter-spacing") or "normal").strip(),
                transform=(computed.get("text-transform") or "none").strip(),
                sample=node.text,
                files=sorted({f for f in files.values() if f}),
            ))
        for c in node.children:
            walk(c, computed, files)

    walk(dom.root, {"_size_px": ROOT_FONT_PX}, {})
    return out


def build(out_path, limit=None):
    if not CSS.exists():
        sys.exit(f"compiled CSS not found at {CSS}\nRun `bundle exec jekyll build` first.")

    raw = CSS.read_text()
    smap = SourceMap(CSS.with_suffix(".css.map"))
    smap.index(raw)
    css = strip_at_rules(raw)
    compiled = []
    unsupported = 0
    for sel, decls, order, origin in parse_rules(css, smap):
        comps = compile_selector(sel)
        if comps is None:
            unsupported += 1
            continue
        compiled.append((comps, decls, order, specificity(comps), origin))

    pages = sorted(p for p in SITE.rglob("*.html"))
    if limit:
        pages = pages[:limit]

    styles = defaultdict(lambda: dict(count=0, pages=set(), tags=set(),
                                      classes=set(), samples=[],
                                      files=defaultdict(int)))
    for p in pages:
        rel = str(p.relative_to(SITE))
        for el in style_page(p, compiled):
            if not el["family"]:
                continue
            key = (el["family"], el["size"], el["weight"], el["style"],
                   el["lh"], el["spacing"], el["transform"])
            e = styles[key]
            e["count"] += 1
            e["pages"].add(rel)
            e["tags"].add(el["tag"])
            if el["classes"]:
                e["classes"].add(el["classes"])
            for f in el["files"]:
                e["files"][f] += 1
            # keep the five longest samples, not the first five: the first
            # text a page yields is chrome ("Skip to main content"), which
            # says nothing about what the style is for
            sample = el["sample"]
            if sample:
                e["samples"].append(sample)
                if len(e["samples"]) > 5:
                    e["samples"].sort(key=len, reverse=True)
                    del e["samples"][5:]

    items = []
    for (family, size, weight, style, lh, spacing, transform), e in styles.items():
        items.append(dict(
            id=f"{family}|{size}|{weight}|{style}|{lh}|{spacing}|{transform}",
            family=family, size=size, weight=weight, style=style,
            line_height=lh, letter_spacing=spacing, text_transform=transform,
            count=e["count"],
            pages=sorted(e["pages"])[:40], page_count=len(e["pages"]),
            tags=sorted(e["tags"]), classes=sorted(e["classes"])[:12],
            samples=e["samples"],
            files=[dict(file=f, count=c)
                   for f, c in sorted(e["files"].items(), key=lambda kv: -kv[1])],
            vendor=all(is_vendor(f) for f in e["files"]) if e["files"] else False,
            on_scale=size in SCALE,
        ))
    items.sort(key=lambda d: -d["count"])

    data = dict(
        totals=dict(
            styles=len(items),
            elements=sum(i["count"] for i in items),
            pages=len(pages),
            families=len({i["family"] for i in items}),
            sizes=len({i["size"] for i in items}),
            weights=len({i["weight"] for i in items}),
            off_scale=sum(i["count"] for i in items if not i["on_scale"]),
            scale=list(SCALE),
            unsupported_selectors=unsupported,
        ),
        styles=items,
    )
    out_path.write_text(json.dumps(data, indent=1))
    return data


TEMPLATE = HERE / "type-atlas.template.html"


def build_html(json_path, html_path):
    if not TEMPLATE.exists():
        print(f"no template at {TEMPLATE} — skipping the page")
        return None
    data = json_path.read_text().replace("</script>", "<\\/script>")
    page = TEMPLATE.read_text().replace("__DATA__", data)
    if "__DATA__" in page:
        sys.exit("template still contains __DATA__ after substitution")
    html_path.write_text(page)
    return html_path


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Typography audit for rehanbutt.com")
    ap.add_argument("--out", default=str(HERE / "type-audit.json"))
    ap.add_argument("--html", default=str(HERE / "type-atlas.html"))
    ap.add_argument("--no-html", action="store_true")
    ap.add_argument("--pages", type=int, default=None,
                    help="only walk the first N pages")
    args = ap.parse_args()

    d = build(pathlib.Path(args.out), args.pages)
    t = d["totals"]
    print(f"pages walked        : {t['pages']}")
    print(f"text elements       : {t['elements']}")
    print(f"distinct styles     : {t['styles']}")
    print(f"families / sizes    : {t['families']} / {t['sizes']}")
    print(f"weights             : {t['weights']}")
    if t["unsupported_selectors"]:
        print(f"selectors skipped   : {t['unsupported_selectors']} (combinators/attrs)")
    print(f"\nwrote {args.out}")
    if not args.no_html:
        made = build_html(pathlib.Path(args.out), pathlib.Path(args.html))
        if made:
            print(f"wrote {made}  ({made.stat().st_size:,} bytes)")
