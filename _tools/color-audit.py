#!/usr/bin/env python3
"""
Colour audit for rehanbutt.com.

Scans the SCSS source and the compiled stylesheet and emits a single JSON
dataset describing every colour the site uses: how often, where it is authored,
what it renders as, and whether it belongs to the design system or escaped it.

    python3 _tools/color-audit.py              # writes the JSON and the page
    python3 _tools/color-audit.py --no-html    # data only
    python3 _tools/color-audit.py --out other.json

Outputs, both beside this script:
    color-audit.json          the dataset
    color-atlas.html          the viewer, with the dataset baked in

The page is a snapshot rather than a live view, because a published artifact
cannot fetch a local file. Rerun this after `bundle exec jekyll build`, then
republish color-atlas.html.

Two views come out of this, because the two sources disagree in useful ways:

  authored  - what is written in _sass/ and css/, grouped by token where one
              exists. Answers "what decisions did I make, and where do I edit?"
  rendered  - what the browser actually receives after Sass runs, flattened to
              literal values. Includes colours produced by mix() that appear in
              no source file.

Origins are marked so vendor noise can be told apart from real findings:
  authored  - written by hand in project SCSS
  derived   - produced by Sass from the project palette (mix(), rgba(), darken())
  vendor    - Foundation defaults, usually declared with !default
"""

import argparse
import json
import pathlib
import re
import sys
from collections import defaultdict

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent

# Third-party stylesheets: their palettes are not decisions made here.
VENDOR_FILES = {"_settings.scss", "foundation.scss", "app.scss", "monokai.css"}
VENDOR_DIRS = {"xy-grid"}

COMPILED = ROOT / "_site" / "css" / "rehan.css"

HEX = r"#[0-9a-fA-F]{3,8}\b"
FUNC = r"rgba?\([^()]*\)"
COLOR_PROPS = (
    "color", "background", "background-color", "background-image", "border",
    "border-color", "border-top", "border-bottom", "border-left", "border-right",
    "border-top-color", "border-bottom-color", "border-left-color",
    "border-right-color", "fill", "stroke", "box-shadow", "text-shadow",
    "outline", "outline-color", "text-decoration-color", "caret-color",
    "-webkit-text-fill-color", "column-rule-color", "text-decoration",
)


# --------------------------------------------------------------------------
# colour normalisation
# --------------------------------------------------------------------------

def norm_hex(h):
    """#FFF and #ffffff are the same colour; count them as one."""
    h = h.lower().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) == 4:                       # #rgba
        h = "".join(c * 2 for c in h)
    return "#" + h[:6] if len(h) >= 6 else "#" + h


GRADIENT_FN = re.compile(r"(?:repeating-)?(?:linear|radial|conic)-gradient\(", re.I)


def find_gradients(text):
    """(start, end, source) for each gradient call, matching parens properly.

    A simple [^)]* pattern breaks here: nearly every gradient in this codebase
    contains rgba(), so the first ')' is the wrong one.
    """
    out = []
    for m in GRADIENT_FN.finditer(text):
        depth, i = 0, m.end() - 1
        while i < len(text):
            if text[i] == "(":
                depth += 1
            elif text[i] == ")":
                depth -= 1
                if depth == 0:
                    out.append((m.start(), i + 1, text[m.start():i + 1]))
                    break
            i += 1
    return out


def gradient_key(src):
    """Whitespace and case normalised, so the same gradient written twice groups."""
    return re.sub(r"\s+", " ", src.strip().lower()).replace(", ", ",")


def gradient_stops(src):
    """Colour stops in order. Skips the leading angle/shape arguments.

    Covers all four forms a stop takes here: a hex, an rgba(), a Sass variable
    (often inside #{} interpolation), and a var(--color-*) token reference.
    """
    inner = src[src.index("(") + 1:-1]
    stops = []
    for m in re.finditer(rf"var\(\s*--color-[\w-]+\s*\)|{HEX}|{FUNC}|\$[\w-]+", inner):
        stops.append(m.group(0))
    return stops


def to_rgb(value):
    """Best-effort RGB tuple for sorting/grouping. None if not resolvable."""
    v = value.strip().lower()
    m = re.match(r"^#([0-9a-f]{6})", norm_hex(v)) if v.startswith("#") else None
    if m:
        s = m.group(1)
        return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    m = re.match(r"^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)", v)
    if m:
        return tuple(int(float(g)) for g in m.groups())
    return None


def hsl(rgb):
    r, g, b = (c / 255 for c in rgb)
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        return 0.0, 0.0, l
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        h = ((g - b) / d) % 6
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60, s, l


def hue_family(rgb):
    """Cluster name, mirroring how the eye groups a palette."""
    if rgb is None:
        return "unknown"
    h, s, l = hsl(rgb)
    if s < 0.12 or l < 0.06 or l > 0.96:
        return "neutral"
    # Very dark, weakly saturated colours read as near-black even when their
    # hue is technically blue — $navy-black (#1f2937) is the obvious case.
    # Cluster them with the neutrals, which is where the eye puts them.
    if l < 0.22 and s < 0.45:
        return "neutral"
    if h < 15 or h >= 345:
        return "red"
    if h < 45:
        return "orange"
    if h < 70:
        return "yellow"
    if h < 160:
        return "green"
    if h < 200:
        return "teal"
    if h < 250:
        return "blue"
    if h < 290:
        return "purple"
    return "pink"


# --------------------------------------------------------------------------
# Sass variable resolution
# --------------------------------------------------------------------------

def sass_mix(c1, c2, weight):
    """Sass mix($c1, $c2, $weight): weight is how much of c1."""
    w = weight / 100.0
    return tuple(round(a * w + b * (1 - w)) for a, b in zip(c1, c2))


def resolve_variables(text):
    """Build $name -> '#rrggbb' for the project palette, including mix()."""
    vals = {}
    simple = re.findall(r"^\$([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;", text, re.M)
    for name, hexv in simple:
        vals[name] = norm_hex(hexv)

    # mix() chains off the simple values, and occasionally off other mixes,
    # so run a few passes until nothing new resolves
    pattern = re.compile(
        r"^\$([\w-]+)\s*:\s*mix\(\s*\$([\w-]+)\s*,\s*\$([\w-]+)\s*,\s*([\d.]+)%\s*\)",
        re.M,
    )
    for _ in range(5):
        before = len(vals)
        for m in pattern.finditer(text):
            name, a, b, pct = m.group(1), m.group(2), m.group(3), float(m.group(4))
            if name in vals:
                continue
            ca, cb = to_rgb(vals.get(a, "")), to_rgb(vals.get(b, ""))
            if ca and cb:
                r, g, bl = sass_mix(ca, cb, pct)
                vals[name] = "#%02x%02x%02x" % (r, g, bl)
        if len(vals) == before:
            break
    return vals


# --------------------------------------------------------------------------
# token map from the compiled :root blocks
# --------------------------------------------------------------------------

def token_map(css):
    """--color-x -> {light, dark}. The dark block redefines a subset."""
    tokens = defaultdict(dict)
    root_blocks = re.findall(r":root\s*\{(.*?)\n?\}", css, re.S)
    # first :root is light; the dark values live in a media query inside it
    for block in root_blocks:
        dark_part = ""
        m = re.search(r"@media\s*\(prefers-color-scheme:\s*dark\)\s*\{(.*?)\}", block, re.S)
        if m:
            dark_part = m.group(1)
            light_part = block[: m.start()]
        else:
            light_part = block
        for name, val in re.findall(r"--color-([\w-]+)\s*:\s*([^;]+)", light_part):
            tokens[name]["light"] = val.strip()
        for name, val in re.findall(r"--color-([\w-]+)\s*:\s*([^;]+)", dark_part):
            tokens[name]["dark"] = val.strip()
    # values defined only in light apply to both themes
    for name, pair in tokens.items():
        pair.setdefault("dark", pair.get("light"))
        pair.setdefault("light", pair.get("dark"))
    return dict(tokens)


# --------------------------------------------------------------------------
# scanners
# --------------------------------------------------------------------------

def scan_source(varmap):
    """Colours as authored: file, line, property, declaration, token reference."""
    hits = []
    # .css as well as .scss: css/monokai.css is a real stylesheet the site
    # loads, and Sass passes `@import "monokai.css"` through as a runtime
    # import rather than inlining it, so it appears in no compiled output.
    files = sorted(ROOT.glob("_sass/*.scss")) + sorted(ROOT.glob("_sass/*.css"))
    files += sorted(ROOT.glob("css/*.scss")) + sorted(ROOT.glob("css/*.css"))
    files += sorted(ROOT.glob("_sass/xy-grid/*.scss"))
    for path in files:
        rel = str(path.relative_to(ROOT))
        is_vendor = path.name in VENDOR_FILES or path.parent.name in VENDOR_DIRS
        text = path.read_text()

        # Gradients are found across the whole file first, because a gradient
        # can be written over several lines. They are then blanked out (newlines
        # kept, so line numbers still line up) before the per-line scan, which
        # is what stops their stops being counted as standalone colours.
        whole = []
        for s0, e0, src in find_gradients(text):
            line_no = text.count("\n", 0, s0) + 1
            whole.append((line_no, src))
            text = text[:s0] + "".join(
                "\n" if c == "\n" else " " for c in text[s0:e0]
            ) + text[e0:]
        for line_no, src in whole:
            decl = src.split("\n")[0].strip()[:160]
            prop = None
            pm = re.match(r"\s*([-\w]+)\s*:", decl)
            if pm and pm.group(1) in COLOR_PROPS:
                prop = pm.group(1)
            hits.append(dict(kind="gradient", value=gradient_key(src), raw=src,
                             stops=gradient_stops(src),
                             file=rel, line=line_no, prop=prop, decl=decl,
                             origin="vendor" if is_vendor else "authored"))

        for i, line in enumerate(text.splitlines(), 1):
            if line.strip().startswith("//"):
                continue
            vendor_line = is_vendor or "!default" in line
            prop = None
            pm = re.match(r"\s*([-\w]+)\s*:", line)
            if pm and pm.group(1) in COLOR_PROPS:
                prop = pm.group(1)

            scan_line = line

            for raw in re.findall(HEX, scan_line):
                hits.append(dict(kind="literal", value=norm_hex(raw), raw=raw,
                                 file=rel, line=i, prop=prop,
                                 decl=line.strip()[:160],
                                 origin="vendor" if vendor_line else "authored"))
            for raw in re.findall(FUNC, scan_line):
                if "var(" in raw:
                    continue
                hits.append(dict(kind="literal", value=raw.strip(), raw=raw,
                                 file=rel, line=i, prop=prop,
                                 decl=line.strip()[:160],
                                 origin="vendor" if vendor_line else "authored"))
            for tok in re.findall(r"semantic-color\(\s*([\w-]+)\s*\)", scan_line):
                hits.append(dict(kind="token", value=tok, raw=f"semantic-color({tok})",
                                 file=rel, line=i, prop=prop,
                                 decl=line.strip()[:160],
                                 origin="vendor" if vendor_line else "authored"))
            for var in re.findall(r"\$([\w-]+)", scan_line):
                if var in varmap and prop:
                    hits.append(dict(kind="palette", value=varmap[var], raw="$" + var,
                                     file=rel, line=i, prop=prop,
                                     decl=line.strip()[:160],
                                     origin="vendor" if vendor_line else "authored"))
    return hits


def split_rules(css):
    """(selector, body) for every rule, ignoring at-rule wrappers."""
    out = []
    depth = 0
    buf = ""
    sel = ""
    i = 0
    while i < len(css):
        ch = css[i]
        if ch == "{":
            if depth == 0:
                sel = buf.strip()
                buf = ""
            else:
                buf += ch
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                if not sel.startswith("@"):
                    out.append((sel, buf))
                else:
                    out.extend(split_rules(buf))
                buf = ""
                sel = ""
            else:
                buf += ch
        else:
            buf += ch
        i += 1
    return out


def scan_compiled(css):
    """Colours as rendered: selector + property, from the built stylesheet."""
    hits = []
    for sel, body in split_rules(css):
        if sel.startswith(":root"):
            continue
        for decl in body.split(";"):
            if ":" not in decl:
                continue
            prop, _, val = decl.partition(":")
            prop = prop.strip()
            if prop.startswith("--"):
                continue
            grads = find_gradients(val)
            for _s, _e, src in grads:
                hits.append(dict(value=None, gradient=gradient_key(src), raw=src,
                                 stops=gradient_stops(src),
                                 selector=sel[:220], prop=prop))
            scan_val = val
            for s, e, _src in reversed(grads):
                scan_val = scan_val[:s] + (" " * (e - s)) + scan_val[e:]

            for raw in re.findall(HEX, scan_val):
                hits.append(dict(value=norm_hex(raw), selector=sel[:220], prop=prop))
            for raw in re.findall(FUNC, scan_val):
                if "var(" in raw:
                    continue
                hits.append(dict(value=raw.strip(), selector=sel[:220], prop=prop))
            for tok in re.findall(r"var\(\s*--color-([\w-]+)", scan_val):
                hits.append(dict(value=None, token=tok, selector=sel[:220], prop=prop))
    return hits


# --------------------------------------------------------------------------
# assembly
# --------------------------------------------------------------------------

def build(out_path):
    if not COMPILED.exists():
        sys.exit(f"compiled CSS not found at {COMPILED}\nRun `bundle exec jekyll build` first.")

    css = COMPILED.read_text()
    varmap = resolve_variables((ROOT / "_sass" / "variables.scss").read_text())
    tokens = token_map(css)
    src_hits = scan_source(varmap)
    cmp_hits = scan_compiled(css)

    # ---- rendered view: flat literal values -------------------------------
    rendered = defaultdict(lambda: dict(count=0, selectors=[], props=set()))
    for h in cmp_hits:
        if h.get("gradient"):                # handled separately, below
            continue
        val = h["value"]
        if val is None:                      # var() reference -> resolve per theme
            pair = tokens.get(h["token"], {})
            val = pair.get("light")
            if not val:
                continue
            val = norm_hex(val) if val.startswith("#") else val
        e = rendered[val]
        e["count"] += 1
        e["props"].add(h["prop"])
        if len(e["selectors"]) < 60:
            e["selectors"].append(dict(selector=h["selector"], prop=h["prop"]))

    # ---- authored view: tokens first, then loose literals ------------------
    authored = {}
    for name, pair in tokens.items():
        authored["token:" + name] = dict(
            kind="token", token=name,
            light=pair.get("light"), dark=pair.get("dark"),
            count=0, origin="authored", source=[], selectors=[], props=set(),
            files=defaultdict(int),
        )
    for h in src_hits:
        if h["kind"] == "gradient":          # handled separately, below
            continue
        if h["kind"] == "token":
            key = "token:" + h["value"]
            if key not in authored:
                continue
        else:
            key = "literal:" + h["value"]
            if key not in authored:
                authored[key] = dict(kind="literal", value=h["value"], count=0,
                                     origin=h["origin"], source=[], selectors=[],
                                     props=set(), files=defaultdict(int))
            if h["origin"] == "vendor":
                authored[key]["origin"] = "vendor"
        e = authored[key]
        e["count"] += 1
        e["files"][h["file"]] += 1
        if h["prop"]:
            e["props"].add(h["prop"])
        if len(e["source"]) < 60:
            e["source"].append(dict(file=h["file"], line=h["line"],
                                    prop=h["prop"], decl=h["decl"], via=h["raw"]))

    # attach compiled selectors to tokens
    for h in cmp_hits:
        if h["value"] is None and not h.get("gradient"):
            key = "token:" + h["token"]
            if key in authored and len(authored[key]["selectors"]) < 60:
                authored[key]["selectors"].append(
                    dict(selector=h["selector"], prop=h["prop"]))
                authored[key]["count"] += 1

    source_text = "".join(
        p.read_text() for p in
        list(ROOT.glob("_sass/*.scss")) + list(ROOT.glob("_sass/*.css"))
        + list(ROOT.glob("css/*.scss")) + list(ROOT.glob("css/*.css"))
    ).lower()

    def pack(key, e):
        if e.get("kind") == "token":
            rgb = to_rgb(e.get("light") or "")
            display = e.get("light")
            label = "--color-" + e["token"]
        else:
            rgb = to_rgb(e.get("value") or "")
            display = e.get("value")
            label = e.get("value")
        return dict(
            id=key, kind=e.get("kind", "literal"), label=label, display=display,
            light=e.get("light"), dark=e.get("dark"),
            count=e["count"], origin=e.get("origin", "authored"),
            family=hue_family(rgb), rgb=rgb,
            props=sorted(p for p in e["props"] if p),
            files=dict(e.get("files", {})),
            source=e.get("source", []), selectors=e.get("selectors", []),
        )

    # Not every token holds a colour — media-filter and speaking-logo-filter
    # are theme-varying values too, but they have no swatch to draw.
    authored_list = [
        pack(k, v) for k, v in authored.items()
        if v["count"] > 0 and pack(k, v)["rgb"] is not None
    ]
    non_colour_tokens = sorted(
        v["token"] for k, v in authored.items()
        if v.get("kind") == "token" and v["count"] > 0 and pack(k, v)["rgb"] is None
    )

    rendered_list = []
    for val, e in rendered.items():
        in_source = val.lower() in source_text
        rendered_list.append(dict(
            id="r:" + val, kind="literal", label=val, display=val,
            count=e["count"],
            origin="authored" if in_source else "derived",
            family=hue_family(to_rgb(val)), rgb=to_rgb(val),
            props=sorted(p for p in e["props"] if p),
            files={}, source=[], selectors=e["selectors"],
        ))

    # ---- gradients: one entry per distinct gradient, in both views ---------
    def resolve_stop(s):
        if s.startswith("$"):
            return varmap.get(s[1:], s)
        if s.startswith("var("):
            name = re.search(r"--color-([\w-]+)", s).group(1)
            return tokens.get(name, {}).get("light", s)
        # rgba($navy-black-d9, 0.4) — a palette variable wrapped in rgba()
        m = re.match(r"^rgba?\(\s*\$([\w-]+)\s*,\s*([\d.]+)\s*\)$", s)
        if m and m.group(1) in varmap:
            rgb = to_rgb(varmap[m.group(1)])
            if rgb:
                return "rgba(%d, %d, %d, %s)" % (rgb[0], rgb[1], rgb[2], m.group(2))
        return norm_hex(s) if s.startswith("#") else s

    def collect_gradients(hits, is_source):
        found = {}
        for h in hits:
            key = h["value"] if is_source else h.get("gradient")
            if is_source and h.get("kind") != "gradient":
                continue
            if not is_source and not h.get("gradient"):
                continue
            g = found.setdefault(key, dict(
                id="grad:" + ("a:" if is_source else "r:") + key[:120],
                kind="gradient", label=h["raw"][:120], display=None,
                stops=[resolve_stop(s) for s in h["stops"]],
                count=0, origin=h.get("origin", "derived"),
                family=None, rgb=None, anchor=None, props=set(),
                files=defaultdict(int), source=[], selectors=[],
            ))
            g["count"] += 1
            if is_source:
                g["files"][h["file"]] += 1
            if h.get("prop"):
                g["props"].add(h["prop"])
            if is_source and len(g["source"]) < 40:
                g["source"].append(dict(file=h["file"], line=h["line"],
                                        prop=h["prop"], decl=h["decl"], via=h["raw"][:120]))
            if not is_source and len(g["selectors"]) < 40:
                g["selectors"].append(dict(selector=h["selector"], prop=h["prop"]))
        for g in found.values():
            g["props"] = sorted(p for p in g["props"] if p)
            g["files"] = dict(g["files"])
            # A gradient packs with the hue it reads as, so it sits among the
            # colours it belongs to rather than in a bin of its own. The anchor
            # is the most saturated stop — the one that gives the gradient its
            # character — with ties going to whichever comes first.
            best, best_s = None, -1.0
            for s in g["stops"]:
                rgb = to_rgb(s)
                if not rgb:
                    continue
                _h, sat, _l = hsl(rgb)
                if sat > best_s:
                    best, best_s = s, sat
            if best is None:
                g["family"], g["rgb"] = "unknown", None
            else:
                g["anchor"] = best
                g["rgb"] = to_rgb(best)
                g["family"] = hue_family(g["rgb"])
        return list(found.values())

    grad_authored = collect_gradients(src_hits, True)
    grad_rendered = collect_gradients(cmp_hits, False)

    # colours that only ever appear inside a gradient never became standalone
    # entries, because the gradient spans were masked before scanning. Report
    # which ones those are, so the exclusion is visible rather than silent.
    standalone = {e["display"] for e in authored_list if e.get("display")}
    grad_only = sorted({
        s for g in grad_authored for s in g["stops"]
        if to_rgb(s) and s not in standalone
    })

    # notation drift: same colour written more than one way in source
    notation = defaultdict(set)
    for h in src_hits:
        if h["kind"] == "literal" and h["raw"].startswith("#"):
            notation[norm_hex(h["raw"])].add(h["raw"])
    drift = {k: sorted(v) for k, v in notation.items() if len(v) > 1}

    data = dict(
        generated="static snapshot",
        totals=dict(
            authored=len(authored_list) + len(grad_authored),
            rendered=len(rendered_list) + len(grad_rendered),
            gradients=len(grad_authored),
            tokens=len(tokens),
            source_files=len(set(h["file"] for h in src_hits)),
            css_bytes=len(css),
        ),
        notation_drift=drift,
        non_colour_tokens=non_colour_tokens,
        gradient_only_colours=grad_only,
        authored=sorted(authored_list + grad_authored, key=lambda d: -d["count"]),
        rendered=sorted(rendered_list + grad_rendered, key=lambda d: -d["count"]),
    )

    out_path.write_text(json.dumps(data, indent=1))
    return data


TEMPLATE = HERE / "color-atlas.template.html"


def build_html(json_path, html_path):
    """Bake the dataset into the viewer template.

    The JSON is embedded in a <script type="application/json">, so any literal
    </script> inside it would close that element early — escape it.
    """
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
    ap = argparse.ArgumentParser(description="Colour audit for rehanbutt.com")
    ap.add_argument("--out", default=str(HERE / "color-audit.json"))
    ap.add_argument("--html", default=str(HERE / "color-atlas.html"))
    ap.add_argument("--no-html", action="store_true", help="write the dataset only")
    args = ap.parse_args()
    d = build(pathlib.Path(args.out))
    t = d["totals"]
    print(f"tokens defined      : {t['tokens']}")
    print(f"authored entries    : {t['authored']}")
    print(f"rendered entries    : {t['rendered']}")
    print(f"gradients           : {t.get('gradients', 0)}")
    print(f"gradient-only       : {len(d['gradient_only_colours'])} colours that appear in no standalone declaration")
    print(f"notation drift      : {len(d['notation_drift'])} colours written more than one way")
    print(f"\nwrote {args.out}")
    if not args.no_html:
        made = build_html(pathlib.Path(args.out), pathlib.Path(args.html))
        if made:
            print(f"wrote {made}  ({made.stat().st_size:,} bytes)")
