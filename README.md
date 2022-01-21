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
- [Jekyll Cheat Sheet](https://learn.cloudcannon.com/jekyll-cheat-sheet/)
- [Liquid for Designs Wiki](https://github.com/Shopify/liquid/wiki/Liquid-for-Designers)
- [Generating an array with Liquid](https://heliumdev.com/blog/create-an-array-in-shopifys-liquid)

### Content Notes

#### Projects

* When a project is featured an additional tile image is needed
* Tile Titles should be _____________
* Tile Descriptions should say something along the lines of a one-liner around the central theme of the project
* Page Titles should be very similar to Tile Titles with but may be a longer phrase of the project

#### Dribbble Share Links

```
<a href="https://rehanbutt.com">My Website</a> | <a href="https://twitter.com/naher94/">Twitter</a> | <a href="https://instagram.com/naher94">Instagram</a> | <a href="https://500px.com/naher94">500px</a> | <a href="https://www.pinterest.com/naher94/">Pinterest</a> | <a href="https://github.com/naher94">Github</a>
```

### Development Notes

#### General

* Foundation Grid XY reference for centering and other special properties: 
  - https://get.foundation/sites/docs/flexbox-utilities.html
  - https://zurb.com/university/lessons/176

* Internal links using custom collections `<a href="{% link _projects/file.markdown %}">click here</a>`

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

Links | Logo Used | Notes
:------------ | :------------- | :-------------
https://scottylabs.org/portfolio/ | yes
~https://soa.cmu.edu/design/~ | ~no~ | ~showing fashion work~
~https://soa.cmu.edu/alumni/~ |~yes~ | ~SHOULD BE UPDATED~
https://dzgn.io/team/rehan.html | no
http://interchange.soa.cmu.edu | yes | ~person page &~ footer logo
https://twitter.com/naher94 | yes | header image
https://dribbble.com/rehanbutt | no |
https://adplist.org/mentors/rehan-butt | yes | header image
https://society6.com/rehanbutt/about | yes | header image
https://www.youtube.com/c/RehanButt1994 | yes | header image
https://www.linkedin.com/in/rehan-butt/ | yes | header image and full bio in about section
https://www.pinterest.com/naher94/ | no
~http://dianaconnolly.me~ | ~yes~ | ~footer~
http://tech.soa.cmu.edu | yes | footer
~http://soa.cmu.edu/students/~ | ~yes~ | ~Graduate Student Section~
https://www.stickermule.com/user/1070655211/stickers | no | link to twitter & site
http://BRND.life | yes | footer
http://QULR.life | yes | footer
http://snwg.eddyman.kim | yes | footer
http://ideate.xsead.cmu.edu/profiles/profiles/naher94 | no |
http://naher94.github.io/esporre/ | no |
https://angel.co/rehan-butt | no |
https://medium.com/@Naher94 | no |
https://yasmeenalmuhanna.com | no |
https://stackoverflow.com/users/12394272/rehan-butt | |
https://community.cmu.edu/s/ | |
alumnifire | |
https://jekyllrb.com/showcase/ | yes | Full screen shot of the home page
https://codepen.io/naher94 | no | link to twitter & site
