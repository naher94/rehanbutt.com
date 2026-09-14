#!/usr/bin/env python3
"""
The small cascade engine the audits share.

Both `type-audit.py` and `css-audit.py` need the same thing: the built pages
parsed into a DOM, the compiled stylesheet parsed into rules, and a way to ask
whether a rule matches an element. That is all this module is.

It is deliberately scoped to what this site uses -- descendant and compound
selectors, classes, ids, elements. Anything it cannot evaluate it says so about
rather than guessing, because both callers draw conclusions from a negative
("this rule matches nothing") and a wrong negative is worse than no answer.

Stdlib only.
"""

import bisect
import html.parser
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
SITE = ROOT / "_site"
CSS = SITE / "css" / "rehan.css"

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}
SKIP = {"script", "style", "head", "meta", "link", "title", "svg", "path", "g",
        "defs", "clippath", "lineargradient", "stop", "br"}


# --------------------------------------------------------------------------
# a very small DOM
# --------------------------------------------------------------------------

class Node:
    __slots__ = ("tag", "classes", "id", "parent", "children", "style",
                 "origin", "text", "line")

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
        self.line = 0


class DOM(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("[root]", {}, None)
        self.cur = self.root
        self.nodes = []

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        # the line in the built file, so a style can be pointed at rather than
        # only counted -- html.parser tracks this for free
        n.line = self.getpos()[0]
        self.cur.children.append(n)
        self.nodes.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        n.line = self.getpos()[0]
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

def strip_at_rules(css, keep_all=False):
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
            # Only conditional groups contain ordinary rules. @keyframes,
            # @font-face and friends hold something else entirely -- a
            # keyframes body looks like `from{...}to{...}`, and flattening it
            # would present `from` and `to` as element selectors.
            name = re.match(r'@([\w-]+)', at)
            conditional = bool(name) and name.group(1).lower() in (
                "media", "supports", "container", "layer", "scope")
            # reachability asks "could this ever apply", so every branch counts;
            # the type audit asks what renders at rest on a wide screen
            keep = conditional and (keep_all or
                   ("min-width" in at and "max-width" not in at) or
                   ("media" not in at and "supports" in at))
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
    """Column -> (source file, line), for a single-line (compressed) stylesheet."""

    def __init__(self, path):
        self.sources = []
        self.points = []                 # sorted [(generated_col, src_idx, src_line)]
        self.astral = []
        self.cols = []
        if not path.exists():
            return
        m = json.loads(path.read_text())
        self.sources = [normalise_source(s) for s in m["sources"]]
        gen_col = src_idx = src_line = 0
        for line in m["mappings"].split(";"):
            gen_col = 0                  # generated column resets each line
            for seg in line.split(","):
                if not seg:
                    continue
                f = vlq_decode(seg)
                gen_col += f[0]
                if len(f) >= 4:
                    src_idx += f[1]
                    src_line += f[2]
                    self.points.append((gen_col, src_idx, src_line))
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
        """-> (file, line) with line 1-based, or None."""
        if not self.points:
            return None
        col += bisect.bisect_right(self.astral, col)
        i = bisect.bisect_right(self.cols, col) - 1
        if i < 0:
            return None
        _, src_idx, src_line = self.points[i]
        return (self.sources[src_idx], src_line + 1)


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


def parse_rules(css, smap=None, props=None, keep_state=False):
    """Parse the stylesheet into rules.

    -> [(selector, {prop: value}, order, {prop: (file, line)}, (start, end))]

    `props` limits the declarations kept, and drops rules that end up with
    none; None keeps everything. `keep_state` keeps `:hover` / `::before`
    selectors, which describe interaction rather than resting state -- the type
    audit does not want them, the reachability audit does, because a rule for
    `.foo:hover` is a reason to keep `.foo`.

    The span is the rule's (start, end) in the compiled stylesheet, so a caller
    can weigh what deleting it would save.
    """
    rules = []
    for order, m in enumerate(re.finditer(r'([^{}]+)\{([^{}]*)\}', css)):
        body, base = m.group(2), m.start(2)
        decls, origin, at = {}, {}, 0
        for d in body.split(";"):
            start, at = at, at + len(d) + 1
            if ":" not in d:
                continue
            pr, _, v = d.partition(":")
            pr = pr.strip().lower()
            if props is None or pr in props:
                decls[pr] = v.strip()
                origin[pr] = smap.lookup(base + start) if smap else None
        if props is not None and not decls:
            continue
        span = (m.start(), m.end())
        for sel in m.group(1).split(","):
            sel = sel.strip()
            if not sel or sel.startswith("@"):
                continue
            if not keep_state:
                if "::" in sel:
                    continue
                if re.search(r':(hover|focus|active|visited|checked|disabled)', sel):
                    continue
            rules.append((sel, decls, order, origin, span))
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


