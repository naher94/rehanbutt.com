#!/usr/bin/env python3
"""
Reachability audit for rehanbutt.com's stylesheet.

Answers one question per rule: does anything on the site match it?

    python3 _tools/css-audit.py              # the report, the data and the page
    python3 _tools/css-audit.py --no-html    # data only
    python3 _tools/css-audit.py --list       # every unreachable rule
    python3 _tools/css-audit.py --list-file _sass/home.scss

Outputs, both beside this script:
    css-audit.json           the dataset
    css-atlas.html           the viewer

How a negative is made safe
---------------------------
A wrong "dead" tells you to delete working code, so every selector this cannot
evaluate exactly is *relaxed* into a broader one first, and only reported dead
when even the broader form matches nothing:

    a > b       ->  a b      a child is also a descendant
    a + b       ->  b        a sibling rule can only match where its subject does
    .x:hover    ->  .x       state describes the same element at rest
    .x[open]    ->  .x       the attribute only narrows

Relaxing can only ever match more elements, never fewer. So "the relaxed form
matches nothing" is a sound proof that the real rule matches nothing, and the
errors all fall on the safe side: something live may be reported live, but
nothing live is reported dead.

Two things it cannot see, both reported separately rather than folded in:

    * classes a script adds at runtime. Every identifier in the site's
      JavaScript is collected, and a rule naming one is held back as
      "script-reachable" instead of dead.
    * pages that are not built. The audit only knows `_site`.

Stdlib only.
"""

import argparse
import json
import re
import sys
from collections import defaultdict

from cascade import (CSS, DOM, HERE, ROOT, SITE, SourceMap, compile_selector,
                     is_vendor, matches, parse_rules, strip_at_rules)


def relax(sel):
    """A selector that matches at least everything the real one does."""
    # a sibling rule can only match where its subject matches, so the left
    # side carries no information about reachability
    for comb in ("~", "+"):
        if comb in sel:
            sel = sel.rsplit(comb, 1)[1]
    sel = sel.replace(">", " ")                          # child -> descendant
    sel = re.sub(r'::?[\w-]+(\([^)]*\))?', '', sel)      # :state, ::part
    sel = re.sub(r'\[[^\]]*\]', '', sel)                 # [attr]
    return " ".join(p for p in sel.split() if p) or "*"


def selector_tokens(sel):
    """The class and id names a selector depends on."""
    return {t[1:] for t in re.findall(r'[.#][\w-]+', sel)}


def script_identifiers():
    """Every word in the site's JavaScript, inline scripts included.

    Deliberately crude. The question is only ever "could a script be talking
    about this class", and a false yes costs one line in a report while a
    false no would send you deleting a rule some handler depends on.
    """
    words = set()
    for path in list(SITE.rglob("*.js")) + list((ROOT / "js").rglob("*.js")):
        words |= set(re.findall(r'[\w-]+', path.read_text(errors="ignore")))
    for path in SITE.rglob("*.html"):
        text = path.read_text(errors="ignore")
        for m in re.finditer(r'<script[^>]*>(.*?)</script>', text, re.S):
            words |= set(re.findall(r'[\w-]+', m.group(1)))
        # onclick="easterEggMessage(this)" and friends
        for m in re.finditer(r'\son[a-z]+="([^"]*)"', text):
            words |= set(re.findall(r'[\w-]+', m.group(1)))
    return words


def active_includes():
    """The Foundation mixins `_sass/app.scss` currently switches on.

    Vendor rules are not deleted one at a time -- they are emitted by one of
    these, so this is the lever the report points at rather than inviting
    anyone to edit a Foundation partial.
    """
    app = ROOT / "_sass" / "app.scss"
    if not app.exists():
        return []
    out = []
    for n, line in enumerate(app.read_text().splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith("//"):
            continue
        m = re.match(r'@include\s+(foundation-[\w-]+)', stripped)
        if m:
            out.append(dict(name=m.group(1), file="_sass/app.scss", line=n))
    return out


def build(out_path, limit=None):
    if not CSS.exists():
        sys.exit(f"compiled CSS not found at {CSS}\nRun `bundle exec jekyll build` first.")

    raw = CSS.read_text()
    smap = SourceMap(CSS.with_suffix(".css.map"))
    smap.index(raw)
    # keep_all: a rule inside `max-width` still applies at some width, and a
    # rule that only ever applies on a phone is not dead
    css = strip_at_rules(raw, keep_all=True)

    rules = parse_rules(css, smap, keep_state=True)

    # group the flat (selector, ..., span) list back into rules: one rule can
    # carry a long selector list, and whether it is deletable is a property of
    # the whole list, not of any one selector in it
    by_span = defaultdict(list)
    for sel, _, _, _, span in rules:
        by_span[span].append(sel)

    sels = {}
    for span, group in by_span.items():
        origin = smap.lookup(span[0])
        for sel in group:
            e = sels.setdefault(sel, dict(origins=set()))
            if origin:
                e["origins"].add(origin)

    compiled, unevaluable = {}, set()
    for sel in sels:
        comps = compile_selector(relax(sel))
        if comps is None:
            unevaluable.add(sel)
        else:
            compiled[sel] = comps

    pages = sorted(SITE.rglob("*.html"))
    if limit:
        pages = pages[:limit]

    hits = set()
    pending = dict(compiled)
    for path in pages:
        if not pending:
            break                       # everything already accounted for
        dom = DOM()
        try:
            dom.feed(path.read_text(errors="ignore"))
        except Exception:
            continue
        found = [sel for sel, comps in pending.items()
                 if any(matches(n, comps) for n in dom.nodes)]
        # a selector only has to match once to be live; drop it from the sweep
        for sel in found:
            hits.add(sel)
            del pending[sel]

    js = script_identifiers()

    def verdict_of(sel):
        if sel in unevaluable:
            return "unevaluable"
        if sel in hits:
            return "live"
        if selector_tokens(sel) & js:
            return "script"
        return "dead"

    items = []
    for sel, e in sels.items():
        origins = sorted(e["origins"])
        items.append(dict(
            selector=sel,
            verdict=verdict_of(sel),
            files=sorted({f for f, _ in origins}),
            locations=[f"{f}:{ln}" for f, ln in origins][:8],
            vendor=all(is_vendor(f) for f, _ in origins) if origins else False,
        ))
    items.sort(key=lambda d: (d["verdict"], d["selector"]))

    # ---- rule level: what deleting would actually save -------------------
    rule_rows = []
    for span, group in by_span.items():
        vs = [verdict_of(s) for s in group]
        nbytes = span[1] - span[0]
        origin = smap.lookup(span[0])
        dead = sum(1 for v in vs if v == "dead")
        rule_rows.append(dict(
            selectors=group,
            verdicts=vs,
            dead=dead,
            total=len(group),
            bytes=nbytes,
            # a dead entry in a live list costs only its own selector text;
            # a rule reachable only through script is not proven waste, so it
            # is weighed at zero rather than counted as a saving
            waste=(nbytes if dead == len(group)
                   else 0 if set(vs) <= {"dead", "script"}
                   else sum(len(s) + 1 for s in group
                            if verdict_of(s) == "dead")),
            verdict=("dead" if dead == len(group)
                     # nothing in the markup matches, but a script names it
                     else "script" if set(vs) <= {"dead", "script"}
                     else "bloat" if dead else "live"),
            file=origin[0] if origin else None,
            line=origin[1] if origin else None,
            vendor=is_vendor(origin[0]) if origin else False,
        ))
    rule_rows.sort(key=lambda r: -r["waste"])

    by_verdict = defaultdict(lambda: dict(count=0, bytes=0))
    for i in items:
        by_verdict[i["verdict"]]["count"] += 1
    rule_totals = defaultdict(lambda: dict(count=0, bytes=0, waste=0))
    for r in rule_rows:
        e = rule_totals[r["verdict"]]
        e["count"] += 1
        e["bytes"] += r["bytes"]
        e["waste"] += r["waste"]

    dead_by_file = defaultdict(lambda: dict(rules=0, bytes=0, bloat=0,
                                            bloat_bytes=0,
                                            total_rules=0, total_bytes=0))
    for r in rule_rows:
        f = r["file"] or "?"
        e = dead_by_file[f]
        e["total_rules"] += 1
        e["total_bytes"] += r["bytes"]
        if r["verdict"] == "dead":
            e["rules"] += 1
            e["bytes"] += r["waste"]
        elif r["verdict"] == "bloat":
            e["bloat"] += r["dead"]
            e["bloat_bytes"] += r["waste"]

    data = dict(
        totals=dict(
            selectors=len(items),
            rules=len(rule_rows),
            pages=len(pages),
            stylesheet_bytes=len(raw),
            selector_verdicts={k: v["count"] for k, v in by_verdict.items()},
            rule_verdicts={k: dict(v) for k, v in rule_totals.items()},
            dead_rules_authored=sum(1 for r in rule_rows
                                    if r["verdict"] == "dead" and not r["vendor"]),
            dead_bytes_authored=sum(r["waste"] for r in rule_rows
                                    if r["verdict"] == "dead" and not r["vendor"]),
        ),
        by_file=[dict(file=f, **v) for f, v in
                 sorted(dead_by_file.items(),
                        key=lambda kv: -(kv[1]["bytes"] + kv[1]["bloat_bytes"]))],
        rules=[r for r in rule_rows if r["verdict"] != "live"],
        vendor_files=sorted({f for f in dead_by_file if is_vendor(f)}),
        includes=active_includes(),
        selectors=items,
    )
    out_path.write_text(json.dumps(data, indent=1))
    return data


def report(d, args):
    t = d["totals"]
    sv = t["selector_verdicts"]
    rv = t["rule_verdicts"]
    total_b = t["stylesheet_bytes"]
    dead = rv.get("dead", dict(count=0, waste=0))
    bloat = rv.get("bloat", dict(count=0, waste=0))

    print(f"stylesheet          : {total_b:,} bytes")
    print(f"pages walked        : {t['pages']}")
    print(f"rules / selectors   : {t['rules']:,} / {t['selectors']:,}\n")

    print("selectors")
    for k, label in (("live", "live"), ("dead", "unreachable"),
                     ("script", "script-reachable"), ("unevaluable", "unevaluable")):
        print(f"  {label:<18}{sv.get(k, 0):>6}")

    print("\nrules")
    print(f"  {'wholly dead':<18}{dead['count']:>6}"
          f"{dead['waste']:>9,} bytes{dead['waste'] / total_b * 100:>7.1f}%")
    print(f"  {'partly dead':<18}{bloat['count']:>6}"
          f"{bloat['waste']:>9,} bytes{bloat['waste'] / total_b * 100:>7.1f}%"
          "   (dead entries in a live selector list)")
    print(f"\n  of the wholly dead rules, {t['dead_rules_authored']} are authored"
          f" ({t['dead_bytes_authored']:,} bytes); the rest are Foundation.")

    if d["by_file"]:
        print(f"\n{'':<40}{'dead rules':>12}{'bytes':>9}{'bloat sel':>11}{'bytes':>9}")
        for r in d["by_file"]:
            if not r["rules"] and not r["bloat"]:
                continue
            mark = "" if is_vendor(r["file"]) else "  <- authored"
            print(f"  {r['file']:<38}{r['rules']:>12}{r['bytes']:>9,}"
                  f"{r['bloat']:>11}{r['bloat_bytes']:>9,}{mark}")

    if args.list or args.list_file:
        print("\nwholly dead rules")
        for r in d["rules"]:
            if r["verdict"] != "dead":
                continue
            if args.list_file and r["file"] != args.list_file:
                continue
            where = f"{r['file']}:{r['line']}" if r["file"] else "?"
            head = ", ".join(r["selectors"])
            print(f"  {head[:78]:<80}{where}")


TEMPLATE = HERE / "css-atlas.template.html"


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
    ap = argparse.ArgumentParser(description="CSS reachability audit")
    ap.add_argument("--out", default=str(HERE / "css-audit.json"))
    ap.add_argument("--html", default=str(HERE / "css-atlas.html"))
    ap.add_argument("--no-html", action="store_true")
    ap.add_argument("--pages", type=int, default=None)
    ap.add_argument("--list", action="store_true",
                    help="print every unreachable selector")
    ap.add_argument("--list-file", metavar="PATH",
                    help="print the unreachable selectors written in one file")
    args = ap.parse_args()

    import pathlib
    d = build(pathlib.Path(args.out), args.pages)
    report(d, args)
    print(f"\nwrote {args.out}")
    if not args.no_html:
        made = build_html(pathlib.Path(args.out), pathlib.Path(args.html))
        if made:
            print(f"wrote {made}  ({made.stat().st_size:,} bytes)")
