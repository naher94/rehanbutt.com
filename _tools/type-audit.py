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

from cascade import (CSS, DOM, HERE, SITE, SKIP, SourceMap, compile_selector,
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
    css = strip_at_rules(raw)
    compiled = []
    unsupported = 0
    for sel, decls, order, origin, _ in parse_rules(css, smap, TYPE_PROPS):
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
                                      decls=defaultdict(int),
                                      files=defaultdict(int),
                                      uses=[]))
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
            # a capped sample of actual occurrences: enough to go and look,
            # not so many that the dataset doubles
            if len(e["uses"]) < USE_CAP:
                e["uses"].append(dict(page=rel, line=el["line"],
                                      tag=el["tag"], classes=el["classes"],
                                      text=(el["sample"] or "")[:70]))
            e["tags"].add(el["tag"])
            if el["classes"]:
                e["classes"].add(el["classes"])
            for d in el["decls"]:
                e["decls"][d] += 1
            # per element, not per declaration: a file that sets three
            # properties on one element is still one element's worth
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
            uses=sorted(e["uses"], key=lambda u: (u["page"], u["line"])),
            decls=[dict(prop=p, value=v, file=f, line=ln, count=c)
                   for (p, v, f, ln), c in
                   sorted(e["decls"].items(), key=lambda kv: (kv[0][0], -kv[1]))],
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
