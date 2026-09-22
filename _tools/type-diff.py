#!/usr/bin/env python3
"""Compare the rendered type of two builds, element by element, at every width.

    python3 _tools/type-diff.py BASELINE_SITE [CURRENT_SITE]

The audit's headline figures -- distinct styles, off-scale elements -- are
aggregates, and an aggregate can hold steady while individual elements move in
compensating directions. This answers the narrower question the aggregates
cannot: did any element's resting type change, anywhere, at any breakpoint.

Both sides are measured with the *current* resolver, so a difference in the
report is a difference in the sites rather than a difference in the tooling.

`style_page` walks a page once and matches each breakpoint's rule set against
the same DOM, returning lists aligned index for index, so elements pair up by
position without needing an identifier the markup does not carry.
"""

import argparse
import collections
import importlib.util
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import cascade  # noqa: E402

_spec = importlib.util.spec_from_file_location("type_audit", HERE / "type-audit.py")
ta = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ta)

# `style_page` keys element identity off the widest breakpoint, and the audit
# sets that in `build()` -- which this never calls.
ta.WIDEST = ta.project_breakpoints()[-1][0]

# what counts as "the type of this element"; letter-spacing and transform
# included because a token can change them without touching size
FIELDS = ("family", "size", "weight", "style", "lh", "spacing", "transform")


def compiled_sets_for(site):
    css = site / "css" / "rehan.css"
    if not css.exists():
        sys.exit("no compiled CSS at %s -- build that site first" % css)
    raw = css.read_text()
    smap = cascade.SourceMap(css.with_suffix(".css.map"))
    smap.index(raw)
    out = {}
    for name, width in ta.project_breakpoints():
        rules = []
        for sel, decls, order, origin, span in cascade.parse_rules(
                cascade.strip_at_rules(raw, width=width), smap, ta.TYPE_PROPS):
            comps = cascade.compile_selector(sel)
            if comps is not None:
                origin = ta.name_origins(origin, None)
                rules.append((comps, decls, order, cascade.specificity(comps), origin))
        out[name] = rules
    return out


def fingerprint(site):
    """{page: {breakpoint: [(family, size, weight, ...), ...]}}"""
    sets = compiled_sets_for(site)
    out = {}
    for path in sorted(site.rglob("*.html")):
        rel = str(path.relative_to(site))
        per_bp = ta.style_page(path, sets)
        out[rel] = {bp: [tuple(e[f] for f in FIELDS) for e in els]
                    for bp, els in per_bp.items()}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("baseline")
    ap.add_argument("current", nargs="?", default=str(cascade.SITE))
    ap.add_argument("--show", type=int, default=12, help="example rows per change")
    args = ap.parse_args()

    base = fingerprint(pathlib.Path(args.baseline).resolve())
    curr = fingerprint(pathlib.Path(args.current).resolve())

    only_base = sorted(set(base) - set(curr))
    only_curr = sorted(set(curr) - set(base))
    shared = sorted(set(base) & set(curr))

    changes = collections.Counter()     # (bp, before, after) -> elements
    examples = collections.defaultdict(list)
    counted = skipped = 0

    for page in shared:
        for bp in base[page]:
            b, c = base[page][bp], curr[page].get(bp, [])
            if len(b) != len(c):
                skipped += 1
                continue
            for i, (x, y) in enumerate(zip(b, c)):
                counted += 1
                if x != y:
                    changes[(bp, x, y)] += 1
                    if len(examples[(bp, x, y)]) < args.show:
                        examples[(bp, x, y)].append("%s #%d" % (page, i))

    moved = sum(changes.values())
    print("pages compared      : %d" % len(shared))
    if only_base or only_curr:
        print("pages only in one   : %d baseline / %d current"
              % (len(only_base), len(only_curr)))
    if skipped:
        print("pages skipped       : %d (element count differs -- markup changed)"
              % skipped)
    print("elements compared   : %d" % counted)
    print("elements changed    : %d" % moved)

    if not moved:
        print("\nNo element's rendered type differs, at any breakpoint.")
        return 0

    def fmt(t):
        fam, size, weight, style, lh, sp, tr = t
        s = "%s %s/%s" % (fam, size, weight)
        if lh not in (None, "normal"):
            s += "/%s" % lh
        if style != "normal":
            s += " %s" % style
        if sp != "normal":
            s += " ls:%s" % sp
        if tr != "none":
            s += " %s" % tr
        return s

    print("\n%-8s %-6s %-34s %s" % ("width", "n", "before", "after"))
    for (bp, x, y), n in changes.most_common():
        print("%-8s %-6d %-34s %s" % (bp, n, fmt(x), fmt(y)))
        for e in examples[(bp, x, y)][:3]:
            print("         %s" % e)
    return 1


if __name__ == "__main__":
    sys.exit(main())
