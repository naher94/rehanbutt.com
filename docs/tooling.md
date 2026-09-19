# Tooling

Three audits and the cascade engine they share. All of them read `_site`, so build before you run them.

## Color Audit

`_tools/color-audit.py` scans the SCSS and CSS sources alongside the compiled stylesheet and reports every colour the site uses — how often, which file it is authored in, which selectors it renders on, and whether it comes from a design token, a hand-written literal, Sass (`mix()`, `rgba()`, `darken()`) or a vendor stylesheet. Gradients are counted as single entries rather than as their individual stops.

Rendered colours are traced through the Sass source map back to the partial and line that produced them, so a compiled value is judged by the declaration that actually made it. A colour reached through a token is judged by how the token was written rather than by the rule that used it, since the rule only says `var(--color-x)`.

```
bundle exec jekyll build && python3 _tools/color-audit.py
```

The build must come first — the script reads `_site/css/rehan.css` for the rendered side, so skipping it compares new source against stale output.

It writes two files beside itself, both gitignored:

* `color-audit.json` — the dataset
* `color-atlas.html` — a standalone page that plots the palette as circles sized by usage, clustered by hue or by file, with a panel for each colour's source lines and selectors. Open it directly in a browser.

Use `--no-html` for the data only, or `--out` / `--html` to redirect either output.

Colours can be checked off as you work through them. **Mark reviewed** in the detail panel takes a colour off the grid, the Reviewed filter brings them back or clears them, and the state lives in `localStorage` so it survives regenerating the page. It is keyed by the entry's id with the colour's value stored alongside — so if a colour changes after you reviewed it, the tick is dropped and the colour reappears with a note saying why. Reviews are tracked separately for the authored and rendered views, and the key is namespaced because browsers treat every `file://` page as one storage origin.

## Type Audit

`_tools/type-audit.py` is the typography equivalent. It walks every built page in `_site`, matches the compiled CSS rules to each element, sorts them by specificity and carries font-size down the tree — so it reports what type actually renders as, not what the stylesheet declares. That distinction matters here: more than half the font-sizes in the compiled stylesheet are still `em`, and Sass never resolves those, so a declaration on its own says nothing about the size on screen.

```
bundle exec jekyll build && python3 _tools/type-audit.py
```

Each distinct combination of family, size, weight, style, line-height, tracking and case counts as one style. File attribution comes from the Sass source map (`_site/css/rehan.css.map`), so every style knows which partial wrote it.

It writes two files beside itself, both gitignored:

* `type-audit.json` — the dataset
* `type-atlas.html` — a standalone page listing each style as a specimen rendered at its true size. Open it directly in a browser.
* `type-specimens.html` — a second view of the same data, drawn as cards at the size they render and counted by elements. It opens on the combined view (a card per style, largest first); switching to **By property** breaks it into font-sizes, weights and families, each section showable or hideable.

Both pages resolve the stylesheet **at each of the project's breakpoints**, read from `$breakpoints` in `_settings.scss` rather than restated. **Width** is a multi-select filter alongside Family and Weight, all widths on by default, and selecting several shows every style present at any of them. A style that covers only part of the current selection carries a badge naming the widths it does cover; one that holds across all of them carries none, since a badge on every row says nothing.

No figure anywhere is a sum across widths — the same paragraph counted at three widths would inflate a 6,970-element site to 12,055. Totals report the busiest single width, and the atlas's count column lists one figure per selected width rather than adding them. Breakpoints that resolve to identical type are collapsed and not offered as separate choices: this site defines five, but `xlarge` and `xxlarge` render exactly as `large` does, so three are shown.

This matters more than it sounds. The body font-size drops to 16px on small, so most `em`-derived type shifts with it: **728 off-scale elements at desktop, 3,594 at 375px**. Before this, `small only` rules were dropped entirely and mobile type went unreported — which is how the mobile menu came to be listed at a size no phone renders. A style is flagged on a row only when it exists at one width and no other; the panel's `widths` row carries the full picture.

Both pages carry a third column, **Rendered at**, listing the actual occurrences of whatever is selected — `about.html:312 · Work Experience · h2.cell.small-12.medium-shrink` — grouped by page and sorted by line. It samples up to 60 per style and always states the true total, so a truncated list never reads as the whole picture.

Each occurrence expands onto the declarations that produced *that one element*, with the partial and line for every property, and the Sass name beside the value where there is one — `font-weight: 900 ($lato-black)`, `line-height: 1.6 ($paragraph-lineheight)`. The name says which decision produced the number, which the number alone cannot. It is read back from the source line and only shown when that line actually declares the property, since the source map occasionally points at the rule rather than the declaration. Elements of a style nearly always resolve through the same rules, so the sets are stored once and referenced — which is what makes the difference visible when they don't: the four Work Experience headings resolve through `about.scss`, the Speaking one through a duplicate block in `speaking.scss`.

Every card carries a short id — `S4`, `W2`, `F3`, `DS7` in Declared, `C1` in the combined view — so a specimen can be named in conversation. The ids are fixed to the value rather than to render order, so they survive re-sorting.

The specimen sheet has a **Computed / Declared** switch. Computed draws each card at its real rendered size and the panel says which authored spellings feed it. Declared shows what was typed — 23 spellings against 19 computed values — and the panel says what each one computes to. Declared sizes are drawn *nominally* against a 16px base and the page says so: `1em` on this site renders anywhere from 10px to 70px, so those cards show the spelling, not the rendering.

The page exists to answer whether the site needs everything it currently has, so it is built around merging:

* **By role** groups styles by everything except their line-height. Rows inside a group render identically apart from their leading, so they are the merge candidates; the header says how many elements collapsing them would move, and each row is marked `keep` or `-> <target>`.
* The detail panel states the recommendation in words for any style, in any grouping: keep it, merge it into a named line-height, or nothing to merge. Where it says merge, it names the cost in elements and pages and the file and line the line-height is written at. The named target and every other leading in the role are links, so a recommendation can be reviewed rather than taken on trust — they work regardless of the current filters.
* **Matrix** plots size against weight per family. Adjacent rows with small counts are near-duplicates; clicking a cell opens its styles.
* **Narrow to** isolates either the styles that share a role with another, or the long tail under 25 uses.
* The detail panel shows the authored declaration and source line behind every property — `font-size: 1em → _sass/header.scss:48` — so a row can be acted on without going hunting.

Grouping by family or by file, and filters for family, weight, source and on/off scale are all there too. Sort by uses, size or pages; clicking the active sort reverses it, and the direction applies to the groups as well as the rows inside them.

The scale it reports against is the `SCALE` tuple at the top of the script. It is fitted to real usage rather than to a formula, and it describes the site as it is — edit it when the scale is decided.

Same flags as the colour audit, plus `--pages N` to sample the first N pages for a quick look.

## CSS Reachability

`_tools/css-audit.py` asks one question of every rule in the compiled stylesheet: does anything on the site match it?

```
bundle exec jekyll build && python3 _tools/css-audit.py
```

It reports rules rather than selectors, because a rule is only deletable when its whole selector list is dead. A live rule carrying dead entries in its list is counted separately as bloat — that is usually an `@extend` emitting combinations the markup never produces, and the fix is in the Sass rather than in deleting a line.

A wrong "dead" would send you deleting working code, so anything the matcher cannot evaluate exactly is widened first — `a > b` to `a b`, `a + b` to `b`, `.x:hover` to `.x`, `.x[open]` to `.x` — and reported dead only when even the wider form matches nothing. Widening can only match more, never less, so every error falls on the safe side. Two blind spots are reported separately instead of being folded in: classes a script adds at runtime (every identifier in the site's JavaScript is collected, and a rule naming one is held back as script-reachable) and pages that are not built, since the audit only knows `_site`.

It writes two files beside itself, both gitignored:

* `css-audit.json` — the dataset
* `css-atlas.html` — a standalone page built around deciding what to remove. It opens with the whole stylesheet's weight split into unreachable, dead list entries, script-reachable and matched, then explains each verdict and what it asks you to do. Rules are split into two lanes, because they need different actions: **yours** are deleted one at a time, ordered by how much compiled CSS each removal saves, while **Foundation's** are emitted wholesale by the includes in `_sass/app.scss` — a partial flagged `whole file` is telling you its include is not earning its place. Group by file or verdict, mark dead entries inside their selector list, and the panel names the file and line with the specific next step. Open it directly in a browser.

Byte figures are compiled output before gzip, not the size of the source edit — a few lines of nested Sass can emit a kilobyte of selectors.

`--list` prints every dead rule with its source line; `--list-file _sass/home.scss` narrows that to one file; `--no-html` skips the page.

## Shared Cascade

All three audits sit on `_tools/cascade.py` — the built pages parsed into a DOM, the compiled stylesheet parsed into rules, selector matching, and the Sass source map that maps any byte of the output back to the partial and line that wrote it. It is not run directly.
