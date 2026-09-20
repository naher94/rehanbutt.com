# Hello & Welcome! 👋

You have found the `readme` for the [rehanbutt.com](https://rehanbutt.com) codebase. Feel free to explore the code and see how my site is built.

I use [Jekyll](https://jekyllrb.com) as my static site templating engine and [Foundation for Site](https://get.foundation/sites.html) as my CSS and JS framework. Current using Version 6.6.3

Curious how the site has evolved over time? Check out the [releases](https://github.com/naher94/rehanbutt.com/releases) over the years. Pretty fun to time travel! Like my own personal [waybackmachine](http://web.archive.org). 😉

## Production Notes

Run Jekyll with `--livereload` automatically refresh the page with each change you make to the source files `jekyll s --livereload` or `--port 4500` to run a couple Jekyll sites in parallel. When using `--livereload` for concurrent sites make sure to set a port for `--livereload` like `jekyll s --livereload --livereload-port 8080 --port 4001`

Jekyll uses the `Kramdown` markdown parser allowing for extended functionality, such as adding classes to elements.
- [Styling Jekyll Markdown](https://digitaldrummerj.me/styling-jekyll-markdown/)
- [Kramdown - Quick Reference](https://kramdown.gettalong.org/quickref.html)

Jekyll also uses the `Liquid` language as its templating language. Here are a couple great references:
- [Shopify Cheat Sheet](https://www.shopify.com/partners/shopify-cheat-sheet)
- [Liquid Cheat Sheet](https://shopify.github.io/liquid/)
- [Jekyll Cheat Sheet](https://learn.cloudcannon.com/jekyll-cheat-sheet/)
- [Liquid for Designs Wiki](https://github.com/Shopify/liquid/wiki/Liquid-for-Designers)
- [cloudcannon Tutorial Directory](https://learn.cloudcannon.com/jekyll-liquid/#list)
- [Generating an array with Liquid](https://heliumdev.com/blog/create-an-array-in-shopifys-liquid)

### Content Notes

#### Projects

* When a project is featured an additional tile image is needed
* Tile Titles should be the project name followed by a brief descriptor of the work type (e.g. "CMU NYC Brand & Web Presence", "Esporre Portfolio Tool")
* Tile Descriptions should say something along the lines of a one-liner around the central theme of the project
* Page Titles should be very similar to Tile Titles with but may be a longer phrase of the project

#### Photography

* Hero images for photosets should be `2x1` in aspect ratio
* Map View should follow the Figma template
* Detailed map should be exported as 1x1 and tightly bound
  * [https://www.amcharts.com/svg-maps/](https://www.amcharts.com/svg-maps/)
* Images should be at max 1400px wide and size less then 1mb
* Flag SVG template in Figma

#### Dribbble Share Links

```
<a href="https://rehanbutt.com">My Website</a> | <a href="https://twitter.com/naher94/">Twitter</a> | <a href="https://instagram.com/naher94">Instagram</a> | <a href="https://500px.com/naher94">500px</a> | <a href="https://www.pinterest.com/naher94/">Pinterest</a> | <a href="https://github.com/naher94">Github</a>
```

#### .MOV to .MP4

`ffmpeg -i demo.mov -vcodec h264 demo.mp4`
[Convert .mov to .mp4 on a Mac](https://medium.com/macoclock/convert-mov-to-mp4-on-a-mac-c9c93b730d84)

### Development Notes

#### General

* Foundation Grid XY reference for centering and other special properties: 
  - https://get.foundation/sites/docs/flexbox-utilities.html
  - https://zurb.com/university/lessons/176

* Internal links using custom collections `<a href="{% link _projects/file.markdown %}">click here</a>`
* To fix a whitespace issue when using a Jekyll includes remove the `-` on either end of the tag. `{% include external-link.html  %}` instead of `{%- include external-link.html  -%}`

Code Snippets are helpful in populating common sections such as a resource's frontmatter. For information on available option within a VSCode Snippets reference their [development documentation](https://code.visualstudio.com/docs/editor/userdefinedsnippets).

#### External Links
* External links should use the `external-link` component via `{{% include external-link.html %}}` which includes a non-visual tag noting it goes external for enhanced accessibility `<a target="_blank" href="https://rehanbutt.com/">Rehan Butt<span class="visually-hidden">Opens a new window</span></a>`

#### 2D Array Hack
In some cases using a 2D array is cleaner and easier than setting up a collection. Even though its not formally supported in Liquid it is possible with this hack.
1. Create a string with 2 sets of unique dividing characters in the case below `,` and `|`
2. Assign and split that string to generate an array
3. Loop through that array to generate the 2nd degree element
4. Use that content of the 2nd degree element!
5. Done!
```
{% assign array-list = "(A|B|C),(D|E|F),(H|I|J)" | remove: "(" | remove: ")" | split: ',' %}
{% for item in array-list %}
{% assign each = item | split: '|' %}
  <p>{{each[0]}}</p>
  <p>{{each[1]}}</p>
  <p>{{each[2]}}</p>
{% endfor %}
```

```
<!-- example from 2020.rehanbutt.com -->
<!-- devices -->
<div class="devices cell grid-x">
  <div class="cell">
    <h3>Device breakdown</h3>
  </div>
  {% assign device-list = "(🇺🇸|73%|Desktop),(🇨🇳|26%|Mobile),(🇩🇪|1%|Tablet)" | remove: "(" | remove: ")" | split: ',' %}

  {% for device in device-list %}
  {% assign each = device | split: '|' %}
  <div class="cell small-6 medium-4 device-container">
    <div class="device-wrapper">
      <p class="flag">{{each[0]}}</p>
      <p class="percentage">{{each[1]}}</p>
      <p class="device-type">{{each[2]}}</p>
    </div>
  </div>
  {% endfor %}
</div>
```

#### `_projects` Frontmatter Tags

##### Type `post`

Tag | Use | Data Type
:--- | :--- | :---
layout | The template for structural reference | `.html`
title | The `h1` that shows at the top of the project page | `string`
tile-name | The project name that shows on `index` on hover | `string`
thumbnail | thumbnail file name | `image` `.png` or `.jpg` when featured project
flag | Notification style tag generally reads `New` and `In Progress` | `string`
date | `YYYY-MM-DD` | `date`
tag | For reference at a later date possibly for filtering | `string`
published | Whether it renders in the portfolio  | `bool`
featured | Whether it renders in as featured (bigger tiles)  | `bool`
tile-description | Description of the project that shows on a featured tile | `string`

##### Type `post-hero`

Some additional Frontmatter Tags when using the `post-hero` template

Tag | Use | Data Type
:--- | :--- | :---
hero-background-color | The background color of the hero section and branded header/nav | `string` eg. `#FFFFFF`
hero-background-color-dark | The background color of the hero section and branded header/nav when in dark mode | `string` eg. `#CCCCCC`
hero-accent-color | Used to update the nav items and logo in the header | `string` eg. `#1f2937`
hero-accent-color-dark | Used to update the nav items and logo in the header in dark mode | `string` eg. `#1f2937`
hero-image | The image that loads into the hero section | `path` as a `string` eg. `fashion/lustre-hero.jpg`; File should be an `.png` 1600 x 861
hero-image-alt | The `alt` text for the hero image | `string` eg. `2 outfits in studio lighting`
hero-background | The image that acts as a brand or vibe element in the hero section | `path` as a `string` eg. `shineregistry/shine-hero-background.svg`; File should be an `.svg` 780 x 448

#### Type `post-photo`

Tag | Use | Data Type
:--- | :--- | :---
layout | The template for structural reference | `.html`
title | The `h1` that shows at the top of the project page | `string`
thumbnail | thumbnail file name | `image` `.png` or `.jpg` when featured project
thumbnail-alt | The `alt` text for the thumbnail image | `string` eg. `Burj Al Arab Atrium`
hero-image | The image that loads into the hero section | `path` as a `string` eg. `dubai-expo/dubai-hero.jpg`; File should be an `.jpg` aspect ratio 2x1
hero-image-alt | The `alt` text for the hero image | `string` eg. `Dubai Expo Center Dome`
featured | Whether it renders on `/`  | `bool`
big-tile | Whether it renders as a big tile on `/photography` | `bool` eg. `true`
date | `YYYY-MM-DD` | `date`
display-date | Use in the case of multiple dates | `string` eg. `Winter 2012 & Spring 2022`

#### Type `post-article`

note that there is a separate file for article styling `articles.scss`

Tag | Use | Data Type
:--- | :--- | :---
layout | The template for structural reference | `.html`
article | Should always be `true` as it helps set the link type across the site | `bool` eg. `true`
title | The name of the article | `string`
description | A short explanation of the article | `string`
hero-image | The image that loads into the hero section | `path` as a `string` eg. `product-principles-strategies/hero.jpg`; File should be an `.jpg` aspect ratio 2x1
hero-image-alt | The `alt` text for the hero image | `string` eg. `Illustration of Pepper the Product Panda excited to showcase product principles and strategies`
tags | an array of related topics for the resource `[leadership,product development]` | comma separated `string`
content-type | The media type such as reference, tool, interactive, video, my content, reading, publication, portfolio, article, blog. | `string`
date | `YYYY-MM-DD` | `date`

#### `_resources` Frontmatter Tags

Tag | Use | Data Type
:--- | :--- | :---
layout | The template for structural reference | `.html`
title | The main name that references the resource in each tile | `string`
link | The external `url` to the resource | `string`
description | A short explanation of the resource | `string`
tags | an array of related topics for the resource `[film,games,tools]` | comma separated `string`
content-type | The media type such as reference, tool, interactive, video, my content, reading, publication, portfolio, article, blog. | `string`

#### `_work-experience` Frontmatter Tags

Tag | Use | Data Type
:--- | :--- | :---
role | The job title | `string`
date-start | `YYYY-MM-DD` | `date`
date-end | `YYYY-MM-DD` or "Present" if current experience | `date` or `string` of "Present"
company | Name of the organization | `string`
description | Explanation of the role | `string`
logo | A logo representing the job for visual context | `.svg`
sort-order | Order in which the experiences are sorted and grouped `1` being the top | `int`

#### `_speaking` Frontmatter Tags

Tag | Use | Data Type
:--- | :--- | :---
title | The name of the event | `string`
date | `YYYY-MM-DD` If the date is a future date an "Upcoming" badge will be shown | `date`
location | The conference where the speaking event took place | `string`
description | A short explanation of the speaking event | `string`
link | `url` to the event's recording or related materials | `string`
logo | A logo representing the event for visual context | `.svg`

### Type System

`_sass/variables.scss` holds the type vocabulary beside `$semantic-colors`. It is
two maps and one mixin, and the register is named at the call site:

```scss
h2            { @include type-style(product, section-title); }
.count .value { @include type-style(expressive, counter); }
```

#### The two registers

**Product** type is engineered for consistency across many pages, which makes it
right for the templated work that carries most of the site — project pages,
resource collections, articles. One decision here lands on seventy-odd pages, so
it has to be systematic and sit on the scale.

**Expressive** type is set for a single moment, to carry a graphic idea that
appears nowhere else — a hero, a statement over an image, a standalone numeral.
It answers to that moment and to nothing else, and it is free to be hand-tuned
because there is no second instance to stay consistent with.

The axis is **repetition, not volume**. Loud is not expressive: the post callouts
run across eleven case studies and the tag headings repeat sixty times down one
page, so both are product however large they are set. The useful test is how many
places a style has to keep working in, which is why `$expressive-type` is the
short map and should stay that way — a style that turns up on a second page has
stopped being expressive and belongs in `$product-type`.

The register sits in the call rather than on the entry on purpose. Moving a style
between registers is exactly the kind of change that should make you look at
every place it is used.

##### Borrowed from Carbon, and where it diverges

The names come from [IBM Carbon's productive/expressive
split](https://carbondesignsystem.com/elements/typography/style-strategies/), but
the axis underneath is not the same one, and it is worth being explicit about
that rather than letting the borrowed name imply more than it should.

Carbon's split is about **user intent** — productive for someone completing a
task through forms and controls, expressive for someone exploring and reading.
That distinction earns its keep on a system spanning a product and a marketing
site. This site is editorial end to end, so that axis would have one value nearly
everywhere. Ours is about **repetition**, which is the thing that actually varies
here.

Two further differences follow from that:

* In Carbon, expressive is a **parallel set** with its own full hierarchy,
  including its own body styles. Here it is a short list of one-offs, and there
  is no expectation that a product entry has an expressive counterpart. The two
  maps are not symmetric and are not meant to be.
* Carbon blends the two **by region** — an expressive moment spans a full page or
  banner, and type stays consistent within any one component. That guidance still
  holds and is worth keeping: mixing registers inside a single card or list is
  how hierarchy gets muddled.

#### The two families

**Zilla Slab is the display face**: it names things — headings, titles, nav.
**Lato is the text face**: it is read — sentences, labels, metadata, UI. For
anything ambiguous the test is whether you are *naming* it or *saying* it. A
section header names. A pull-quote says.

Product type follows that rule. **Expressive type is exempt**, which is the point
of it: `counter` is Lato Black at 90px, a text face doing display work, and it is
the most distinctive type on the site precisely because of that.

Zilla has **no size floor**. It is the display face by role rather than by size,
so the nav stays Zilla at every width.

Caveat is the third face and has one job — handwritten annotation on photo
captions. Consolas appears only in code blocks. Neither is in the maps.

#### Naming

The name is the job the type does, never a tag and never a rank. A section
heading is `section-title` whether it is marked up as an `h2` or an `h3`, which
is the point: `class="h1"` on an `<h2>` is what this vocabulary exists to avoid.
There are deliberately no numbered names, since `title-1` / `title-2`
reintroduces the same confusion one layer down.

Size lives in the value rather than the name, so `nav-link` can move off 37.5px
onto the scale without anything being renamed.

#### Values

`$product-type` is in two halves. **Hierarchy** — `section-title`, `page-title`,
`body`, `body-strong`, `body-sm` — describes rank on the page. **Component
styles** — `nav-link`, `card-title`, `ui`, `eyebrow` — name the thing they are,
and sit apart because nothing is "one step below" a nav link.

`$expressive-type` holds `counter` and `statement`.

Values are the site's current computed values to the pixel, so adopting a style
changes nothing on screen — with one exception. **`statement` is aspirational**:
nothing on the site is set that way yet, and it is commented as such. It is the
slot for a hero line or a statement over an image, set tighter than a heading on
both axes because large type reads loose at settings that suit 16px.

Two recorded facts rather than quiet corrections:

* `section-title` (70px) is **larger** than `page-title` (60px). That inversion is
  real on the site today, so fixing it stays a deliberate edit.
* `counter` is the only style that holds its scale against the body copy beside
  it at every width — 4.5× on desktop and still 2.7× at 375px. Everything else
  that reads as display on desktop compresses toward the body size on mobile,
  because the body itself grows from 20px to 26.4px there while display type
  shrinks.

Sizes are `px` rather than `em` on purpose — an `em` resolves against whichever
parent it lands in, which is how one declaration ended up rendering at six
different sizes.

#### API

```scss
@include type-style($register, $style-key);   // emits the whole style
type-value($register, $style-key, $prop);     // reads one property
```

Optional properties (`letter-spacing`, `text-transform`, `font-style`) are only
written when the style defines them, so a rule never carries a
`letter-spacing: normal` it did not ask for — that would override an inherited
value rather than leave it alone.

A style may also carry `at`, a map of Foundation breakpoint expressions to the
properties that change there:

```scss
callout-lg: (family: $lato, size: 3.125rem, font-weight: $lato-regular, line-height: 1.3,
             at: (small only: (size: 2.5rem))),
```

`size` stays the desktop value and `at` holds the exceptions — a desktop base
with `small only` corrections, matching how the rest of the site is written
rather than mobile-first. The mixin emits one media query per entry, identical
to writing it by hand. Keys are unquoted: Foundation reads the direction
keyword as the second item of a list, so `'small only'` in quotes collapses to
one string and loses it.

The three `.post-callout-*` classes are the reason it exists. Each declared its
mobile size as a hand-written `font-size` beside the `@include`, which put half
the style out of the map's sight — the audit could name the token at 1024px and
not at 375px, and deleting the override silently rendered a 50px pull-quote on a
phone. `body` and `page-title` had the same split and now carry `at` too.

Moving an override into the map changes its specificity, which is the one thing
to check before doing it. `page-title`'s 48px lived on a bare `h1` selector, so
two h1s ignored it — the 404 title and the about hero, both re-applying
`page-title` from a class-specificity rule that outranked the media query. From
the map the query is emitted inside each call site, so those two now shrink with
everything else. That was a deliberate call; a style whose mobile step is
genuinely meant for only some of its call sites wants a separate entry instead.

All of it fails the build on an unknown name, with the valid ones listed:

```
Unknown product type style `nosuchstyle`.
Known: section-title, page-title, body, body-strong, body-sm, nav-link, card-title, ui, eyebrow.

Unknown type register `productive`. Known: product, expressive.

Unknown breakpoint `smal` on product/callout-lg. Known: small, medium, large, xlarge, xxlarge.

product/callout-lg has no `size`. A base style must set both family and size.
```

#### Migrating onto it

Little is migrated yet. The type atlas and specimen sheet in
[Tooling](#tooling) show what each rule currently resolves to, which is the
input for doing that a rule at a time — in particular the **Across widths** view,
which groups a single element's type across every breakpoint instead of listing
each breakpoint's result as a separate style. Most of what looks like two styles
is one declaration seen at two widths.

### Tooling

#### Color Audit

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

#### Type Audit

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

#### CSS Reachability

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

#### Shared Cascade

All three audits sit on `_tools/cascade.py` — the built pages parsed into a DOM, the compiled stylesheet parsed into rules, selector matching, and the Sass source map that maps any byte of the output back to the partial and line that wrote it. It is not run directly.

### Reference

#### Places that Link to Me

Links | Logo? | Location? | Bio? | Notes
:------------ | :------------- | :------------- | :------------- | :-------------
https://www.linkedin.com/in/rehan-butt/ | ✅ header image|✅|✅
https://instagram.com/naher94 |✖️|✖️|✅|
https://www.threads.net/@naher94 |✖️|✖️|✅|
https://github.com/naher94 |✖️|✖️|✅| Twitter link
https://twitter.com/naher94 |✅ header image|✅|✅
https://codepen.io/rehanbutt | ✖️|✖️|✖️| Twitter link
https://www.pinterest.com/naher94/ | ✖️|✖️|✖️
https://500px.com/p/rehan_butt |✖️|✅|✅| Twitter & Instagram links
https://dribbble.com/rehanbutt |✖️|✅|✅|social links
https://www.imdb.com/name/nm15449795/ |✖️|✖️|✖️| rehanbutt.com & Linkedin links
https://adplist.org/mentors/rehan-butt |✅ header image|✅|✅| Twitter link 
https://wellfound.com/u/rehan-butt | ✖️|✅|✅| social links
https://medium.com/@rehan-butt | ✖️|✖️|✅
https://www.youtube.com/c/RehanButt1994 | ✅ header image|✖️|✖️| social links
https://www.clubhouse.com/@rehanbutt |✖️|✅|✅|Twitter link
https://letterboxd.com/rehanbutt |✖️|✖️|✅|
https://www.stickermule.com/u/rehanbutt | ✖️|✖️|✖️ 
http://BRND.life | ✅ footer |✖️|✖️
http://QULR.life | ✅ footer |✖️|✖️
http://naher94.github.io/esporre/ |✖️|✖️|✖️
https://stackoverflow.com/users/12394272/rehan-butt |✖️|✖️|✅|social links
https://community.cmu.edu/s/ | |
https://saes.alumnifire.com | ✖️|✖️|✅| bio & photo
https://jekyllrb.com/showcase/ |✅|✖️|✖️| Full screen shot of the home page v4.0.0
https://dl.acm.org/profile/99661657353 |✖️|✖️|✅|
https://devzgn.com |✖️|✖️|✖️|just a link
