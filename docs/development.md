# Development Notes

Working notes on Jekyll, Liquid and the collections, plus the front matter each content type expects. Typography lives in [type-system.md](type-system.md).

## General

* Foundation Grid XY reference for centering and other special properties: 
  - https://get.foundation/sites/docs/flexbox-utilities.html
  - https://zurb.com/university/lessons/176

* Internal links using custom collections `<a href="{% link _projects/file.markdown %}">click here</a>`
* To fix a whitespace issue when using a Jekyll includes remove the `-` on either end of the tag. `{% include external-link.html  %}` instead of `{%- include external-link.html  -%}`

Code Snippets are helpful in populating common sections such as a resource's frontmatter. For information on available option within a VSCode Snippets reference their [development documentation](https://code.visualstudio.com/docs/editor/userdefinedsnippets).

## External Links
* External links should use the `external-link` component via `{{% include external-link.html %}}` which includes a non-visual tag noting it goes external for enhanced accessibility `<a target="_blank" href="https://rehanbutt.com/">Rehan Butt<span class="visually-hidden">Opens a new window</span></a>`

## 2D Array Hack
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

## `_projects` Frontmatter Tags

### Type `post`

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

### Type `post-hero`

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

## Type `post-photo`

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

## Type `post-article`

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

## `_resources` Frontmatter Tags

Tag | Use | Data Type
:--- | :--- | :---
layout | The template for structural reference | `.html`
title | The main name that references the resource in each tile | `string`
link | The external `url` to the resource | `string`
description | A short explanation of the resource | `string`
tags | an array of related topics for the resource `[film,games,tools]` | comma separated `string`
content-type | The media type such as reference, tool, interactive, video, my content, reading, publication, portfolio, article, blog. | `string`

## `_work-experience` Frontmatter Tags

Tag | Use | Data Type
:--- | :--- | :---
role | The job title | `string`
date-start | `YYYY-MM-DD` | `date`
date-end | `YYYY-MM-DD` or "Present" if current experience | `date` or `string` of "Present"
company | Name of the organization | `string`
description | Explanation of the role | `string`
logo | A logo representing the job for visual context | `.svg`
sort-order | Order in which the experiences are sorted and grouped `1` being the top | `int`

## `_speaking` Frontmatter Tags

Tag | Use | Data Type
:--- | :--- | :---
title | The name of the event | `string`
date | `YYYY-MM-DD` If the date is a future date an "Upcoming" badge will be shown | `date`
location | The conference where the speaking event took place | `string`
description | A short explanation of the speaking event | `string`
link | `url` to the event's recording or related materials | `string`
logo | A logo representing the event for visual context | `.svg`
