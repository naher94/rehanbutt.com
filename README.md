# Hello & Welcome! 👋

You have found the `readme` for the [rehanbutt.com](https://rehanbutt.com) codebase. Feel free to explore the code and see how my site is built.

I use [Jekyll](https://jekyllrb.com) as my static site templating engine and [Foundation for Site](https://get.foundation/sites.html) as my CSS and JS framework.

Curious how the site has evolved over time? Check out the [releases](https://github.com/naher94/rehanbutt.com/releases) over the years. Pretty fun to time travel! Like my own personal [waybackmachine](http://web.archive.org). 😉

## Production Notes

### Content Notes

#### Projects

* When a project is featured an additional tile image is needed
* Tile Titles should be _____________
* Tile Descriptions should say something along the lines of ___________
* Page Titles should be very similar to Tile Titles with _________ as an exception

#### Dribbble Share Links

```
<a href="https://rehanbutt.com">My Website</a> | <a href="https://twitter.com/naher94/">Twitter</a> | <a href="https://instagram.com/naher94">Instagram</a> | <a href="https://500px.com/naher94">500px</a> | <a href="https://www.pinterest.com/naher94/">Pinterest</a> | <a href="https://github.com/naher94">Github</a>
```

### Development Notes

#### General

* Foundation Grid XY reference for centering and other special properties: https://zurb.com/university/lessons/176

* Internal links using custom collections `<a href="{% link _projects/file.markdown %}">click here</a>`

#### `_projects` Frontmatter Tags

Tag | Use | Data Type
:--- | :--- | :---
layout | The template for structural reference | `.html`
title | The `h1` that shows at the top of the project page | `string`
tile-name | The project name that shows on `index` on hover | `string`
thumbnail | thumbnail file name | `image` `.png` or `.jpg` when featured project
flag | Notification style tag generally reads `New` and `In Progress` | `string`
date | `YYYY-MM-DD` | `date`
tag | For reference at a later date possibly for filtering | `string`
published | whether it renders in the portfolio  | `bool`
featured | whether it renders in as featured (bigger tiles)  | `bool`

#### `_resources` Frontmatter Tags

Tag | Use | Data Type
:--- | :--- | :---
layout | The template for structural reference | `.html`
title | The main name that references the resource in each tile | `string`
link | The external `url` to the resource | `string`
description | A short explaination of the resource | `string`
tags | an array of related topics for the resource `[film,games,tools]` | comma seperated `string`

#### `_work-experience` Frontmatter Tags

Tag | Use | Data Type
:--- | :--- | :---
role | The job title | `string`
date-start | `YYYY-MM-DD` | `date`
date-end | `YYYY-MM-DD` or "Present" if current experience | `date` or `string` of "Present"
company | Name of the orgnaization | `string`
description | Explanation of the role | `string`
logo | A logo representing the job for visual context | `.svg`
sort-order | Order in which the experiences are sorted and grouped `1` being the top | `int`

#### `_speaking` Frontmatter Tags

Tag | Use | Data Type
:--- | :--- | :---
title | The name of the event | `string`
date | `YYYY-MM-DD` If the date is a future date an "Upcoming" badge will be shown | `date`
location | The conference where the speaking event took place | `string`
description | A short explaination of the speaking event | `string`
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
http://interchange.soa.cmu.edu | yes | person page & footer logo
https://twitter.com/naher94 | yes | header image
https://dribbble.com/rehanbutt | no
https://society6.com/rehanbutt/about | yes | header image
https://www.youtube.com/c/RehanButt1994 | yes | header image
https://www.linkedin.com/in/rehan-butt/ | yes | header image
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
