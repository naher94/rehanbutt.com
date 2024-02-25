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
* Tile Titles should be _____________
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
featured | Whether it renders in as featured (bigger tiles)  | `bool`
date | `YYYY-MM-DD` | `date`


#### `_resources` Frontmatter Tags

Tag | Use | Data Type
:--- | :--- | :---
layout | The template for structural reference | `.html`
title | The main name that references the resource in each tile | `string`
link | The external `url` to the resource | `string`
description | A short explanation of the resource | `string`
tags | an array of related topics for the resource `[film,games,tools]` | comma separated `string`

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


### Reference

#### Places that Link to Me

Links | Logo? | Location? | Bio? | Notes
:------------ | :------------- | :------------- | :------------- | :-------------
https://www.linkedin.com/in/rehan-butt/ | ✅ header image|✅|✅
https://instagram.com/naher94 |✖️|✖️|✅|
https://www.threads.net/@naher94 |✖️|✖️|✅|
https://github.com/naher94 |✖️|✖️|✅| Twitter link
https://twitter.com/naher94 |✅ header image|✅|✅
https://codepen.io/naher94 | ✖️|✖️|✖️| Twitter link
https://www.pinterest.com/naher94/ | ✖️|✖️|✖️
https://500px.com/p/naher94 |✖️|✅|✅| Twitter & Instagram links
https://dribbble.com/rehanbutt |✖️|✅|✅|social links
https://www.imdb.com/name/nm15449795/ |✖️|✖️|✖️| rehanbutt.com & Linkedin links
https://adplist.org/mentors/rehan-butt |✅ header image|✅|✅| Twitter link 
https://angel.co/rehan-butt | ✖️|✅|✅| social links
https://medium.com/@rehan-butt | ✖️|✖️|✅
https://society6.com/rehanbutt/about |✅ header image|✖️|✖️
https://www.youtube.com/c/RehanButt1994 | ✅ header image|✖️|✖️| social links
https://www.clubhouse.com/@rehanbutt |✖️|✅|✅|Twitter link
https://letterboxd.com/naher94/ |✖️|✖️|✅|
http://interchange.soa.cmu.edu | ✅ footer | ✖️|✖️
https://www.stickermule.com/u/rehanbutt | ✖️|✖️|✖️ 
http://BRND.life | ✅ footer |✖️|✖️
http://QULR.life | ✅ footer |✖️|✖️
http://naher94.github.io/esporre/ |✖️|✖️|✖️
https://yasmeenalmuhanna.com | ✖️|✖️|✖️
https://stackoverflow.com/users/12394272/rehan-butt |✖️|✖️|✅|social links
https://community.cmu.edu/s/ | |
https://saes.alumnifire.com | ✖️|✖️|✅| bio & photo
https://jekyllrb.com/showcase/ |✅|✖️|✖️| Full screen shot of the home page v4.0.0
~http://dianaconnolly.me~ | ~yes~ ||| ~footer~
~https://soa.cmu.edu/design/~ | ~no~ ||| ~showing fashion work~
~https://soa.cmu.edu/alumni/~ |~yes~ ||| ~SHOULD BE UPDATED~
~http://soa.cmu.edu/students/~ | ~yes~ ||| ~Graduate Student Section~
~http://ideate.xsead.cmu.edu/profiles/profiles/naher94~ | ~no~ |
~https://scottylabs.org/portfolio/~ |~✅~|✖️|✖️|
~http://tech.soa.cmu.edu~ | ~✅ footer~ |✖️|✖️
~http://snwg.eddyman.kim~ | ~✅ footer~ |✖️|✖️
~https://dzgn.io/team/rehan.html~ |✖️|✖️|~✅~
