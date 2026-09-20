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
import hashlib
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
               "font-weight": "font-weight", "line-height": "line-height",
               "letter-spacing": "letter-spacing",
               "text-transform": "text-transform",
               "font-style": "font-style"}


def balanced(text, open_at):
    """The body between the `(` at `open_at` and its matching `)`.

    A style may hold an `at` map, and that map holds one map per breakpoint, so
    an entry is no longer flat enough for a regex: `\\)\\s*,` would end the
    match at the first nested query rather than at the end of the style.
    """
    depth = 0
    for i in range(open_at, len(text)):
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                return text[open_at + 1:i]
    raise ValueError("unbalanced `(` at %d in variables.scss" % open_at)


def split_top_level(body):
    """`body` split on the commas that are not inside a nested map."""
    parts, depth, cur = [], 0, ""
    for ch in body:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    return [p.strip() for p in parts if p.strip()]


def type_style_map():
    """`$product-type` / `$expressive-type` from variables.scss, as
    {(register, key): {css-prop: {rendered-value, ...}}}.

    Read rather than restated, for the same reason the breakpoints are. The
    values are compared against compiled CSS, so they are normalised the way
    the compiler writes them: `0.625rem` loses its leading zero, `$zilla`
    resolves to its stack, weights to their numbers.

    A property maps to the *set* of values the style can render, not one value:
    an entry with `at: (small only: (size: 2.5rem))` is 50px on desktop and
    40px on a phone, and both are that token. The audit resolves each page at
    every breakpoint, so a single value would leave the token unidentifiable at
    all but one width -- which is what used to happen to the three callouts.
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

    def collect(body, entry):
        """Fold one map body's own properties into `entry`, recursing into `at`.

        Nested queries are flattened deliberately: which breakpoint a value
        belongs to is not the question here. `token_for` asks whether a
        rendered value is one this token can produce, and the resolver has
        already established the width.
        """
        for part in split_top_level(body):
            key, _, value = part.partition(":")
            key, value = key.strip(), value.strip()
            if key == "at":
                for query in split_top_level(balanced(value, value.index("("))):
                    _, _, nested = query.partition(":")
                    nested = nested.strip()
                    collect(balanced(nested, nested.index("(")), entry)
            elif key in TOKEN_PROPS:
                entry.setdefault(TOKEN_PROPS[key], set()).add(norm(value))

    # Comments are stripped first: several carry unbalanced or comma-bearing
    # prose (`(50/40/30 -> 40/32/24)`) that the scanners would read as syntax.
    stripped = re.sub(r'//[^\n]*', '', text)
    out = {}
    for register in ("product", "expressive"):
        head = re.search(r'\$%s-type:\s*\(' % register, stripped)
        if not head:
            continue
        block = balanced(stripped, head.end() - 1)
        for m in re.finditer(r'^\s{2}([-\w]+):\s*\(', block, re.M):
            entry = {}
            collect(balanced(block, m.end() - 1), entry)
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

    Only mixin-emitted declarations can name a token. A style aggregates the
    declarations of every element that renders as it, so folding a literal
    written somewhere else into that intersection would empty it and lose a
    name that was right. Where the mixin's own properties leave two entries
    standing, though, a literal can still rule one of them out -- see the
    second pass.
    """
    global _TYPE_STYLES
    if _TYPE_STYLES is None:
        _TYPE_STYLES = type_style_map()
    hits, sized = None, False
    for prop, value, rel, line in decls:
        if not from_mixin(rel, line, prop):
            continue
        cands = {k for k, e in _TYPE_STYLES.items() if value in e.get(prop, ())}
        hits = cands if hits is None else (hits & cands)
        if not hits:
            return None
        sized = sized or prop == "font-size"

    # `body` and `body-strong` are both Lato at 1.25rem, so an element that
    # inherits its size from `body` and takes its weight from a rule of its own
    # ends the first pass holding both. The weight is the thing that separates
    # them and it is right there in the source -- it just cannot be the thing
    # that *names* the token, only the thing that eliminates the other one.
    #
    # Gated on the mixin having supplied a size. Family alone leaves nine Lato
    # entries standing, and narrowing that on a literal picks a name out of a
    # crowd on one property: it read a 72px easter-egg numeral as `counter` for
    # sharing weight 900, and a 24px heading as `callout-sm` for sharing 1.5rem.
    # A size from the mixin means the set is already small and specific, and the
    # literal is breaking a tie rather than choosing a winner.
    #
    # Eliminating is done on contradiction alone: an entry silent on a property
    # stays in, because saying nothing is not the same as disagreeing. `body`
    # declares no line-height, so it survives whatever leading the element
    # inherits, while `body-strong`'s 700 cannot survive a rendered 400. A
    # literal that contradicts every remaining candidate is ignored rather than
    # allowed to empty the set -- that is the aggregation problem again, and an
    # honest `type-style()` beats a wrong name.
    if sized and hits and len(hits) > 1:
        for prop, value, rel, line in decls:
            if from_mixin(rel, line, prop):
                continue
            narrowed = {k for k in hits
                        if not _TYPE_STYLES[k].get(prop)
                        or value in _TYPE_STYLES[k][prop]}
            if narrowed:
                hits = narrowed
            if len(hits) == 1:
                break

    return "%s/%s" % sorted(hits)[0] if hits and len(hits) == 1 else None


# Returned when the source cannot be read, as distinct from read and found to
# be a literal. Conflating the two reported 54 declarations as hand-written
# literals on the strength of a line that said something else entirely -- which
# is a finding someone acts on, so the tool has to be able to say it does not
# know.
UNVERIFIED = "(unverified)"

# The trailing-comment strip requires whitespace before the `//`, so a value
# holding a URL keeps its `https://`. Without it an inline comment is read as
# part of the value, and one mentioning a `$variable` makes a literal look
# like a token.
DECL_COMMENT = re.compile(r'\s+//.*$')
DECL_LINE = re.compile(r'([-\w]+)\s*:\s*(.+?)\s*;?\s*$')

# How far to look for the declaration when the mapped line is not it. The
# offset observed here is a consistent +3, and a tight window is what keeps the
# match unambiguous: widening it to 10 turns 5 clean hits into ambiguous ones.
DECL_SEARCH = 3


def declaring_line(rel, line, prop):
    """The line that actually declares `prop`, near the one the map gave.

    The source map lands on the enclosing rule rather than the declaration
    often enough to matter. Rather than trust it or give up, look either side
    for a line declaring this property, and accept the answer only when exactly
    one candidate exists -- two would be a guess, and a guess here invents an
    attribution.

    -> (line, expression), or None when it cannot be pinned down.
    """
    def read(n):
        return DECL_LINE.match(DECL_COMMENT.sub("", source_line(rel, n).strip()))

    m = read(line)
    if m and m.group(1) == prop:
        return line, m.group(2)
    found = []
    for off in range(-DECL_SEARCH, DECL_SEARCH + 1):
        if off == 0:
            continue
        m2 = read(line + off)
        if m2 and m2.group(1) == prop:
            found.append((line + off, m2.group(2)))
    return found[0] if len(found) == 1 else None


def authored_as(rel, line, prop, value, token=None):
    """What the declaration says in the source, when that is not the value.

    `font-weight: 900` in the output is `$lato-black` in the source, and the
    name is the useful half -- it says which decision produced the number.
    Returns None for a plain literal, where the source adds nothing, and
    UNVERIFIED when the source line could not be identified at all.
    """
    if not rel or not line:
        return UNVERIFIED
    text = source_line(rel, line).strip()
    if MIXIN_EMIT.match(text):
        # An interpolated emit names no property, so the usual guard below
        # cannot confirm it. `token_for` still has to match the value against
        # the map to name an entry, so a wrong line degrades to `type-style()`
        # rather than inventing an attribution.
        return token or "type-style()"
    hit = declaring_line(rel, line, prop)
    if hit is None:
        return UNVERIFIED
    expr = hit[1]
    if expr == value:
        return None                       # written exactly as it renders
    if "map-get($style" in expr:
        # emitted by the mixin; name the entry when it can be identified
        return token or "type-style()"
    return expr if ("$" in expr or "(" in expr) else None


def provenance(via):
    """token | variable | literal | unverified -- how the value got there.

    `$zilla` is a name but not the design system, which is the distinction
    that matters when asking how much of the site renders from the type map.
    `unverified` is not a fourth kind of source; it is the absence of an
    answer, and it is kept apart from `literal` because "written by hand" is a
    claim and "could not tell" is not.
    """
    if via == UNVERIFIED:
        return "unverified"
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
# the cascade tree
# --------------------------------------------------------------------------

def node_sig(node):
    """How an element is named when trees from ninety pages are merged."""
    cls = ".".join(sorted(node.classes))
    return f"{node.tag}.{cls}" if cls else node.tag


def decl_digest(origin):
    """A short stamp for the set of rules that won on an element.

    Tag and classes alone are not an identity. A bare `<p>` inside `.cta-bar`
    and one inside `.home` are both `p`, but they are matched by different
    descendant selectors and end up with different type -- merging them put
    seven distinct styles on one node and recorded whichever page was walked
    last. Folding the winning declarations' source lines into the key keeps
    them apart.

    Taken at the widest width and reused at every other, so an element keeps
    one identity across the tree: a `small only` rule is a correction to the
    same element, not a different one.
    """
    if not origin:
        return ""
    stamp = ";".join(f"{p}@{v[0]}:{v[1]}" for p, v in sorted(origin.items()))
    return hashlib.md5(stamp.encode()).hexdigest()[:6]


class CascadeTree:
    """The site's type as one tree of the places that change it.

    A node is an element that declares a type property. Ancestors that declare
    none are skipped: an element that changes nothing is not a branch point,
    and keeping them buries five real decisions under forty structural divs.
    Collapsing them takes 6,970 elements down to fewer than 200 nodes.

    Identity is the chain of tag-and-class signatures from the root, so the
    same path on ninety pages is one node carrying a count of ninety. That
    makes the tree a synthesis rather than any one page's DOM -- which is the
    point, since the question it answers is where the site decides its type,
    not what one document happens to contain.

    Every text element lands on exactly one node: the nearest ancestor-or-self
    that sets something. `src` then says, per property, which node in the chain
    supplied the value that survived to the leaf -- the part the specimen sheet
    could not show, where a card's size comes from `body` four levels up while
    its weight was set on the element itself.
    """

    def __init__(self):
        self.nodes = {}

    def at(self, chain):
        n = self.nodes.get(chain)
        if n is None:
            n = self.nodes[chain] = dict(
                sig=(chain[-1].split("#")[0] if chain else "(root)"),
                depth=len(chain),
                sets=defaultdict(dict),      # bp -> prop -> [value, file, line]
                src=defaultdict(dict),       # bp -> prop -> depth of the setter
                leaves=defaultdict(int),     # bp -> text elements resting here
                own=defaultdict(int),        # bp -> of those, ones that set type
                px=defaultdict(float),       # bp -> computed font-size
                tags=defaultdict(int), pages=set(),
                # per width: the same element resolves to a different card at
                # 375 than at 1024, and collapsing the two reads as two
                # elements rather than one that changes
                styles=defaultdict(lambda: defaultdict(int)),
                samples=[],
            )
        return n

    def declare(self, chain, bp, files, own_props):
        """Record what this node sets, with where each value was written."""
        n = self.at(chain)
        for prop in own_props:
            entry = files.get(prop)
            if entry:
                n["sets"][bp][prop] = list(entry)

    def rest(self, chain, bp, rel, node, src, size_px, style_id, own):
        """Record a text element coming to rest on this node.

        `own` is the question the sheet could not answer: did this element
        decide any of its own type, or is every value on it inherited? An
        element that sets nothing rests on an ancestor's node, and the two
        counts kept apart here are what make that legible.
        """
        n = self.at(chain)
        n["leaves"][bp] += 1
        n["own"][bp] += 1 if own else 0
        n["px"][bp] = round(size_px, 2)
        n["pages"].add(rel)
        n["styles"][bp][style_id] += 1
        if bp == WIDEST:                      # one DOM; counting it five times
            n["tags"][node.tag] += 1          # would multiply every tally by five
        for prop, setter in src.items():
            n["src"][bp][prop] = len(setter)
        if bp == WIDEST and len(n["samples"]) < 4 and node.text:
            n["samples"].append(node.text[:80])

    def export(self):
        """-> a flat list, parents before children, JSON-ready.

        Each declaration is annotated with how it was written -- the map entry,
        the Sass variable, or nothing when it is a bare literal -- using the
        same reading the specimen sheet uses, so a value means the same thing
        in both tools.

        `through` counts every text element in a node's whole subtree, per
        width, against `leaves` for the ones that stop there. The pair is what
        makes a branch readable at a glance: `body` carries 6,970 through and
        rests 39, so almost everything below it is inheriting rather than
        redeciding.
        """
        def annotate(decls):
            listed = [(p, v[0], v[1], v[2]) for p, v in decls.items()]
            token = token_for(listed)
            return {p: [v[0], v[1], v[2],
                        authored_as(v[1], v[2], p, v[0], token)]
                    for p, v in decls.items()}

        subtree = defaultdict(lambda: defaultdict(int))
        for chain, n in self.nodes.items():
            for i in range(len(chain) + 1):
                for bp, c in n["leaves"].items():
                    subtree[chain[:i]][bp] += c

        out = []
        for chain in sorted(self.nodes, key=lambda c: (len(c), c)):
            n = self.nodes[chain]
            through = dict(subtree[chain])
            out.append(dict(
                id="/".join(chain) or "(root)",
                parent="/".join(chain[:-1]) if len(chain) > 1 else None,
                sig=n["sig"], depth=n["depth"],
                sets={b: annotate(m) for b, m in n["sets"].items()},
                src={b: dict(m) for b, m in n["src"].items()},
                leaves=dict(n["leaves"]), own=dict(n["own"]),
                px=dict(n["px"]),
                through=through,
                tags=dict(sorted(n["tags"].items(), key=lambda kv: -kv[1])),
                pages=sorted(n["pages"]), page_count=len(n["pages"]),
                styles={b: dict(sorted(m.items(), key=lambda kv: -kv[1]))
                        for b, m in n["styles"].items()},
                samples=n["samples"],
            ))
        return out


# --------------------------------------------------------------------------
# the walk
# --------------------------------------------------------------------------

def style_page(path, compiled_sets, tree=None, rel=None):
    """Resting type for every text-bearing element, at each breakpoint.

    -> {breakpoint: [element, ...]}, the lists aligned index for index because
    the same DOM is walked each time. Parsing once and matching several rule
    sets against it keeps the cost in the matching, where it belongs.

    `tree`, when given, is filled during the same walk -- the cascade view
    needs the ancestry the walk already holds and nothing more, so paying for
    a second traversal of ninety DOMs at five widths would buy nothing.
    """
    dom = DOM()
    try:
        dom.feed(path.read_text(errors="ignore"))
    except Exception:
        return {name: [] for name in compiled_sets}
    # The widest width runs first and stamps each element's identity; every
    # other width reuses it, so one element is one node across the whole tree.
    ident, out = {}, {}
    for name in [WIDEST] + [n for n in compiled_sets if n != WIDEST]:
        out[name] = _resolve(dom, compiled_sets[name], tree, name, rel,
                             ident, seed=not ident)
    return out


def _resolve(dom, compiled, tree=None, bp=None, rel=None,
             ident=None, seed=False):
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
        if seed and ident is not None:
            ident[id(node)] = decl_digest(from_file)

    out = []

    def walk(node, inherited, inherited_files, chain=(), src=None):
        if node.tag in SKIP:
            return
        computed = dict(inherited)
        files = dict(inherited_files)
        src = dict(src or {})
        own = node.style
        # Which of this element's own declarations actually take effect. The
        # `inherit`/`unset` filtering below is repeated here rather than read
        # off `files` afterwards, because `files` cannot say whether a value
        # arrived from this element or was carried down to it.
        own_props = {p for p, v in own.items()
                     if p in TYPE_PROPS
                     and v.strip().lower() not in ("inherit", "unset")}
        if own_props:
            stamp = (ident or {}).get(id(node), "")
            chain = chain + (node_sig(node) + ("#" + stamp if stamp else ""),)
            for p in own_props:
                src[p] = chain
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
        if tree is not None and own_props:
            tree.declare(chain, bp, files, own_props)
        if node.tag not in ("html", "[root]") and node.text:
            el = dict(
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
            )
            out.append(el)
            if tree is not None:
                tree.rest(chain, bp, rel, node, src, size_px,
                          "%s|%s|%s|%s|%s|%s|%s" % (
                              el["family"], el["size"], el["weight"],
                              el["style"], el["lh"], el["spacing"],
                              el["transform"]),
                          bool(own_props))
        for c in node.children:
            walk(c, computed, files, chain, src)

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

    tree = CascadeTree()
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
        per_bp = style_page(p, compiled_sets, tree, rel)
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

    # The cascade view ships its own file. It needs the tree plus enough of
    # each style to label a card, and nothing else -- folding it into
    # type-audit.json would put 200KB of ancestry inside two pages that never
    # ask for it.
    cascade = dict(
        totals=data["totals"],
        styles=[{k: s[k] for k in ("id", "count", "family", "size", "weight",
                                   "style", "line_height", "letter_spacing",
                                   "text_transform", "on_scale")}
                for s in items],
        tree=tree.export(),
    )
    cascade_path = out_path.with_name("type-cascade.json")
    cascade_path.write_text(json.dumps(cascade, indent=1))
    data["_cascade_path"] = str(cascade_path)
    data["_tree_nodes"] = len(cascade["tree"])
    return data


TEMPLATE = HERE / "type-atlas.template.html"
SPECIMEN_TEMPLATE = HERE / "type-specimens.template.html"
CASCADE_TEMPLATE = HERE / "type-cascade.template.html"


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
    ap.add_argument("--cascade", default=str(HERE / "type-cascade.html"))
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
    print(f"cascade tree nodes  : {d['_tree_nodes']}")
    if not args.no_html:
        # three views of one walk: the atlas lists distinct styles, the specimen
        # sheet draws each property's values at their real size, and the cascade
        # shows where those values were decided. The first two read
        # type-audit.json; the cascade reads its own file, so the ancestry does
        # not ride along in two pages that never ask for it.
        for html, template, src in (
                (args.html, TEMPLATE, args.out),
                (args.specimens, SPECIMEN_TEMPLATE, args.out),
                (args.cascade, CASCADE_TEMPLATE, d["_cascade_path"])):
            made = build_html(pathlib.Path(src), pathlib.Path(html), template)
            if made:
                print(f"wrote {made}  ({made.stat().st_size:,} bytes)")
