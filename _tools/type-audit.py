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
import json
import pathlib
import re
import sys
from collections import defaultdict

from cascade import (CSS, DOM, HERE, ROOT, SITE, SKIP, SourceMap, compile_selector,
                     is_vendor, matches, parse_rules, specificity,
                     strip_at_rules)

TYPE_PROPS = ("font-family", "font-size", "font-weight", "font-style",
              "line-height", "letter-spacing", "text-transform")
INHERITED = set(TYPE_PROPS)          # all of these inherit in CSS


ROOT_FONT_PX = 16.0                  # html default; the site never overrides it

# The ramp the site actually works on, fitted to real usage rather than a
# formula: these ten sizes cover 84% of the type on the site. Everything else
# is reported off-scale, which is the point of the column — 37.5px alone
# accounts for 546 elements and is worth seeing as a stray, not as a step.
# Edit this when the scale is decided; the audit reports against it, it does
# not define it.
SCALE = (10.0, 12.0, 16.0, 20.0, 24.0, 32.0, 40.0, 50.0, 60.0, 70.0)

# occurrences recorded per style. Enough to open a few and see the pattern;
# the full count is always reported, so a truncated list never reads as total.
USE_CAP = 60
WIDEST = None                        # set in build(), the widest breakpoint name


_SRC_LINES = {}


def source_line(rel, line):
    if rel not in _SRC_LINES:
        try:
            _SRC_LINES[rel] = (ROOT / rel).read_text(errors="ignore").splitlines()
        except OSError:
            _SRC_LINES[rel] = []
    lines = _SRC_LINES[rel]
    return lines[line - 1] if line and 0 < line <= len(lines) else ""


TOKEN_PROPS = {"family": "font-family", "size": "font-size",
               "weight": "font-weight", "line-height": "line-height",
               "letter-spacing": "letter-spacing",
               "text-transform": "text-transform",
               "font-style": "font-style"}


def type_style_map():
    """`$product-type` / `$expressive-type` from variables.scss, as
    {(register, key): {css-prop: rendered-value}}.

    Read rather than restated, for the same reason the breakpoints are. The
    values are compared against compiled CSS, so they are normalised the way
    the compiler writes them: `0.625rem` loses its leading zero, `$zilla`
    resolves to its stack, weights to their numbers.
    """
    text = (ROOT / "_sass" / "variables.scss").read_text()
    families, weights = {}, {}
    for m in re.finditer(r'^\$([-\w]+):\s*([^;]+);', text, re.M):
        name, val = "$" + m.group(1), m.group(2).strip()
        if val.startswith(("'", '"')):
            families[name] = re.sub(r"'", '"', val)
        elif val.isdigit():
            weights[name] = val

    def norm(v):
        v = v.strip()
        v = families.get(v, weights.get(v, v))
        v = re.sub(r',\s+', ',', v)                # "Lato", sans -> "Lato",sans
        v = re.sub(r'^0(\.\d)', r'\1', v)          # 0.625rem -> .625rem
        return v.rstrip("0").rstrip(".") if re.fullmatch(r'\d+\.\d+', v) else v

    out = {}
    for register in ("product", "expressive"):
        block = re.search(r'\$%s-type:\s*\((.*?)\n\);' % register, text, re.S)
        if not block:
            continue
        for m in re.finditer(r'^\s{2}([-\w]+):\s*\((.*?)\)\s*,', block.group(1),
                             re.S | re.M):
            entry = {}
            for pm in re.finditer(r'([-\w]+):\s*([^,)]+)', m.group(2)):
                prop = TOKEN_PROPS.get(pm.group(1))
                if prop:
                    entry[prop] = norm(pm.group(2))
            out[(register, m.group(1))] = entry
    return out


_TYPE_STYLES = None


# The mixin emits its optional properties through a loop, as `#{$prop}: $value`,
# so the source line names no property at all. Matching only `prop: map-get(...)`
# missed every one of them and reported line-height, letter-spacing and
# text-transform as hand-written literals.
MIXIN_EMIT = re.compile(r'^#\{\$[-\w]+\}\s*:\s*\$[-\w]+\s*;?\s*$')


def from_mixin(rel, line, prop):
    """Whether this declaration was emitted by `type-style()` rather than written."""
    text = source_line(rel, line).strip()
    if MIXIN_EMIT.match(text):
        return True
    m = re.match(r'([-\w]+)\s*:\s*(.+?)\s*;?\s*$', text)
    return bool(m and m.group(1) == prop and "map-get($style" in m.group(2))


def token_for(decls):
    """Which map entry produced this style's mixin-emitted declarations.

    The source map points at the mixin body -- `font-size: map-get($style,
    size)` -- so the line says a token was used but not which one. Every
    property the mixin emits for one element came from the same `$style`,
    though, so intersecting the entries that match each value identifies it.
    A single property is often ambiguous (`1rem` is both `body-sm` and `ui`);
    the combination usually is not.

    Only mixin-emitted declarations are considered. A style aggregates the
    declarations of every element that renders as it, so folding in a literal
    written somewhere else would empty the intersection and lose the name.
    """
    global _TYPE_STYLES
    if _TYPE_STYLES is None:
        _TYPE_STYLES = type_style_map()
    hits = None
    for prop, value, rel, line in decls:
        if not from_mixin(rel, line, prop):
            continue
        cands = {k for k, e in _TYPE_STYLES.items() if e.get(prop) == value}
        hits = cands if hits is None else (hits & cands)
        if not hits:
            return None
    return "%s/%s" % sorted(hits)[0] if hits and len(hits) == 1 else None


def authored_as(rel, line, prop, value, token=None):
    """What the declaration says in the source, when that is not the value.

    `font-weight: 900` in the output is `$lato-black` in the source, and the
    name is the useful half -- it says which decision produced the number.
    Returns None for a plain literal, where the source adds nothing.

    Guarded on the line actually declaring this property: the source map
    occasionally points at the rule rather than the declaration, and reading
    the wrong line would invent an attribution.
    """
    if not rel or not line:
        return None
    text = source_line(rel, line).strip()
    if MIXIN_EMIT.match(text):
        # An interpolated emit names no property, so the usual guard below
        # cannot confirm it. `token_for` still has to match the value against
        # the map to name an entry, so a wrong line degrades to `type-style()`
        # rather than inventing an attribution.
        return token or "type-style()"
    m = re.match(r'([-\w]+)\s*:\s*(.+?)\s*;?\s*$', text)
    if not m or m.group(1) != prop:
        return None
    expr = m.group(2)
    if expr == value:
        return None                       # written exactly as it renders
    if "map-get($style" in expr:
        # emitted by the mixin; name the entry when it can be identified
        return token or "type-style()"
    return expr if ("$" in expr or "(" in expr) else None


def provenance(via):
    """token | variable | literal -- how the value got there.

    `$zilla` is a name but not the design system, which is the distinction
    that matters when asking how much of the site renders from the type map.
    """
    if not via:
        return "literal"
    return "token" if ("/" in via or via == "type-style()") else "variable"


def project_breakpoints():
    """Foundation's `$breakpoints`, read from _settings.scss.

    Read rather than restated so the audit cannot drift from the project. The
    `small: 0` entry is sampled at a real phone width -- resolving at 0 would
    be a viewport no device has.
    """
    text = (ROOT / "_sass" / "_settings.scss").read_text()
    m = re.search(r'\$breakpoints\s*:\s*\((.*?)\);', text, re.S)
    if not m:
        return [("large", 1024.0)]
    out = []
    for name, value, unit in re.findall(r'([\w-]+)\s*:\s*([\d.]+)(px|em|rem)?', m.group(1)):
        px = float(value) * (1.0 if (unit or "px") == "px" else 16.0)
        out.append((name, 375.0 if px == 0 else px))
    return out


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

def style_page(path, compiled_sets):
    """Resting type for every text-bearing element, at each breakpoint.

    -> {breakpoint: [element, ...]}, the lists aligned index for index because
    the same DOM is walked each time. Parsing once and matching several rule
    sets against it keeps the cost in the matching, where it belongs.
    """
    dom = DOM()
    try:
        dom.feed(path.read_text(errors="ignore"))
    except Exception:
        return {name: [] for name in compiled_sets}
    return {name: _resolve(dom, rules) for name, rules in compiled_sets.items()}


def _resolve(dom, compiled):
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
        # `font-size: inherit` is a no-op, exactly like the line-height case
        # below. Foundation writes it on several elements; recording it would
        # credit the size to the file holding the `inherit` rather than to
        # whichever rule actually set the pixels.
        if "font-size" in own and \
                own["font-size"].strip().lower() not in ("inherit", "unset"):
            size_px = resolve_size(own["font-size"], parent_px)
            files["font-size"] = (own["font-size"],) + \
                (node.origin.get("font-size") or (None, None))
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
                files[p] = (own[p],) + (node.origin.get(p) or (None, None))
        if node.tag not in ("html", "[root]") and node.text:
            out.append(dict(
                tag=node.tag,
                line=node.line,
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
                # what was written, where: (prop, value, file, line)
                decls=sorted((p,) + v for p, v in files.items()),
                files=sorted({v[1] for v in files.values() if v[1]}),
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
    # One rule set per breakpoint. The stylesheet is re-flattened at each
    # width, so a `small only` rule is present at 375 and absent at 1024 --
    # which is the whole point: resolving only the wide branch reported the
    # mobile menu at a size no phone ever renders.
    breakpoints = project_breakpoints()
    compiled_sets, unsupported = {}, 0
    for name, width in breakpoints:
        css = strip_at_rules(raw, width=width)
        rules = []
        for sel, decls, order, origin, _ in parse_rules(css, smap, TYPE_PROPS):
            comps = compile_selector(sel)
            if comps is None:
                unsupported += 1
                continue
            rules.append((comps, decls, order, specificity(comps), origin))
        compiled_sets[name] = rules
    unsupported = unsupported // max(1, len(breakpoints))

    global WIDEST
    WIDEST = breakpoints[-1][0]

    pages = sorted(p for p in SITE.rglob("*.html"))
    if limit:
        pages = pages[:limit]

    styles = defaultdict(lambda: dict(pages=set(), tags=set(),
                                      classes=set(), samples=[],
                                      decls=defaultdict(int),
                                      files=defaultdict(int),
                                      uses=[], srcsets={},
                                      bp=defaultdict(int)))
    bp_names = [n for n, _ in breakpoints]

    def key_of(el):
        return (el["family"], el["size"], el["weight"], el["style"],
                el["lh"], el["spacing"], el["transform"])

    for p in pages:
        rel = str(p.relative_to(SITE))
        per_bp = style_page(p, compiled_sets)
        n = len(per_bp[bp_names[0]])
        for i in range(n):
            # Group the breakpoints by what this one element resolves to. Type
            # that does not change across widths collapses to a single entry
            # covering every breakpoint, so only genuinely responsive type is
            # reported per width -- and an element is never counted twice at
            # the same width.
            by_key = defaultdict(list)
            for bp_name in bp_names:
                el = per_bp[bp_name][i]
                if not el["family"]:
                    continue
                by_key[key_of(el)].append((bp_name, el))

            for key, entries in by_key.items():
                at = [b for b, _ in entries]
                el = entries[0][1]
                e = styles[key]
                for b in at:
                    e["bp"][b] += 1
                e["pages"].add(rel)
                e["tags"].add(el["tag"])
                if el["classes"]:
                    e["classes"].add(el["classes"])
                for d in el["decls"]:
                    e["decls"][d] += 1
                # per element, not per declaration: a file that sets three
                # properties on one element is still one element's worth
                for f in el["files"]:
                    e["files"][f] += 1
                # a capped sample of actual occurrences: enough to go and look,
                # not so many that the dataset doubles
                if len(e["uses"]) < USE_CAP:
                    # Elements of one style nearly always resolve through the
                    # same rules -- the median style has a single declaration
                    # set. The sets are stored once and each occurrence points
                    # at one, rather than repeating five declarations.
                    sig = tuple(el["decls"])
                    idx = e["srcsets"].setdefault(sig, len(e["srcsets"]))
                    e["uses"].append(dict(page=rel, line=el["line"],
                                          tag=el["tag"], classes=el["classes"],
                                          text=(el["sample"] or "")[:70],
                                          src=idx, at=at))
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
        # every mixin-emitted declaration on one element shares a `$style`, so
        # the entry is identified once per style and reused for its properties
        style_token = token_for(list(e["decls"]))
        items.append(dict(
            id=f"{family}|{size}|{weight}|{style}|{lh}|{spacing}|{transform}",
            family=family, size=size, weight=weight, style=style,
            line_height=lh, letter_spacing=spacing, text_transform=transform,
            count=max(e["bp"].values()) if e["bp"] else 0,
            bp=dict(e["bp"]),
            # named only when the style does not hold everywhere; type that is
            # the same at every width needs no breakpoint annotation at all
            responsive=(len(e["bp"]) < len(bp_names)),
            pages=sorted(e["pages"])[:40], page_count=len(e["pages"]),
            tags=sorted(e["tags"]), classes=sorted(e["classes"])[:12],
            samples=e["samples"],
            uses=sorted(e["uses"], key=lambda u: (u["page"], u["line"])),
            sources=[[dict(prop=d[0], value=d[1], file=d[2], line=d[3],
                           via=authored_as(d[2], d[3], d[0], d[1],
                                           token_for(list(key))))
                      for d in key]
                     for key, _ in sorted(e["srcsets"].items(),
                                          key=lambda kv: kv[1])],
            decls=[dict(prop=p, value=v, file=f, line=ln, count=c,
                        via=authored_as(f, ln, p, v, style_token))
                   for (p, v, f, ln), c in
                   sorted(e["decls"].items(), key=lambda kv: (kv[0][0], -kv[1]))],
            files=[dict(file=f, count=c)
                   for f, c in sorted(e["files"].items(), key=lambda kv: -kv[1])],
            vendor=all(is_vendor(f) for f in e["files"]) if e["files"] else False,
            on_scale=size in SCALE,
        ))
    items.sort(key=lambda d: -d["count"])

    # Per breakpoint, because a single set of totals across widths would be an
    # average of layouts that never coexist.
    per_bp = {}
    for name in bp_names:
        live = [i for i in items if i["bp"].get(name)]
        per_bp[name] = dict(
            styles=len(live),
            elements=sum(i["bp"][name] for i in live),
            families=len({i["family"] for i in live}),
            sizes=len({i["size"] for i in live}),
            weights=len({i["weight"] for i in live}),
            off_scale=sum(i["bp"][name] for i in live if not i["on_scale"]),
        )

    # Breakpoints that resolve to exactly the same type are not choices. On
    # this site xlarge and xxlarge are indistinguishable from large, so
    # offering all five would be three ways to see one thing.
    sig = {}
    for name in bp_names:
        sig[name] = frozenset((i["id"], i["bp"][name])
                              for i in items if i["bp"].get(name))
    distinct, seen = [], {}
    for name, width in breakpoints:
        if sig[name] in seen:
            distinct[seen[sig[name]]]["covers"].append(name)
        else:
            seen[sig[name]] = len(distinct)
            distinct.append(dict(name=name, width=width, covers=[name]))
    for d in distinct:
        d["label"] = d["name"] if len(d["covers"]) == 1 else \
            f"{d['name']} and up" if d["covers"][-1] == bp_names[-1] else \
            f"{d['name']}-{d['covers'][-1]}"

    data = dict(
        totals=dict(
            styles=len(items),
            elements=max(v["elements"] for v in per_bp.values()),
            pages=len(pages),
            families=len({i["family"] for i in items}),
            sizes=len({i["size"] for i in items}),
            weights=len({i["weight"] for i in items}),
            off_scale=sum(i["count"] for i in items if not i["on_scale"]),
            scale=list(SCALE),
            unsupported_selectors=unsupported,
            breakpoints=[dict(name=n, width=w) for n, w in breakpoints],
            default_breakpoint=distinct[-1]["name"],
            distinct_breakpoints=distinct,
            per_breakpoint=per_bp,
        ),
        styles=items,
    )
    out_path.write_text(json.dumps(data, indent=1))
    return data


TEMPLATE = HERE / "type-atlas.template.html"
SPECIMEN_TEMPLATE = HERE / "type-specimens.template.html"


def build_html(json_path, html_path, template=None):
    template = template or TEMPLATE
    if not template.exists():
        print(f"no template at {template} — skipping the page")
        return None
    data = json_path.read_text().replace("</script>", "<\\/script>")
    page = template.read_text().replace("__DATA__", data)
    if "__DATA__" in page:
        sys.exit("template still contains __DATA__ after substitution")
    html_path.write_text(page)
    return html_path


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Typography audit for rehanbutt.com")
    ap.add_argument("--out", default=str(HERE / "type-audit.json"))
    ap.add_argument("--html", default=str(HERE / "type-atlas.html"))
    ap.add_argument("--specimens", default=str(HERE / "type-specimens.html"))
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
        # two views of one dataset: the atlas lists distinct styles, the
        # specimen sheet shows each property's values drawn at their real size
        for html, template in ((args.html, TEMPLATE),
                               (args.specimens, SPECIMEN_TEMPLATE)):
            made = build_html(pathlib.Path(args.out), pathlib.Path(html), template)
            if made:
                print(f"wrote {made}  ({made.stat().st_size:,} bytes)")
