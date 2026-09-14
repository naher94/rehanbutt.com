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