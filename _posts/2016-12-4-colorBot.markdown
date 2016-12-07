---
layout: post
title:  "Jasper the Color Bot"
tile-name: "Color Bot"
thumbnail: "/img/thumbnails/jasper.png"
banner: In Process
date:   2016-12-4 12:00:00 -0500
categories: bot
permalink: colorBot
---

<div class="image-container"><img src="../img/colorBot/intro.svg" alt="Logo Equation" class="image-center"/></div>

Jasper is a color tool to expand your color vocabulary and provide a new form of inspiration for all.

Building on colors inspiration tools like [Adobe's Color](http://color.adobe.com), [Design Seeds](https://www.design-seeds.com/blog/) and [LOLColors](http://www.lolcolors.com). I want to give users daily color inspiration from Pantone's [color of the day](https://www.pantone.com/colorstrology). I would like to build a Slack bot to help users think about color in a new light (the Pantone light) and expand the user's color vocabulary. Additionally I would like users to have the option to request images that use that color for further inspiration. I plan to build this by pulling the color of the day from Pantone's [Twitter](https://twitter.com/PANTONE) account as all of their "colors of the day" use the hashtag *coloroftheday*. In the case there is not a color of the day a 404 style tweet will be provided on request and no Slack message will be sent for that day.

Sadnote: Pantone does not store a list of all there daily colors, only the name of the color on twitter but the link provided only displays the most current day :(

<div>
<a href="http://nyc.dzgn.io">
    <div class="colorBotButton contentButton"> Check out the code
    </div>
</a>
</div>

<br><br>

## Process

<br>

| Effort/Priority | High   | Medium    | Low |
| --------------- | ------ | -------   | --- |
| **Low**         | Pull Tweets with #coloroftheday | clear formating | Creative error handling |
| **Medium**      | Store a list of requested colors from the user   |   Upload image of the color swatch | ... |
| **High**        | ...  | Include the Hex value (pull from CSS styling) | Pull images that use the color |

As part of the development process I created this matrix in order to prioritize my time and what are the essentials of the bot.

<div class="image-container" style="margin-top:50px;"><img src="../img/colorBot/personality.svg" alt="Personality"/></div>

In order to create a better bot experiance I wanted to make sure Jasper had some personailty. I filled in a couple differant traits to help create the right tone of Jasper. I wanted a colloquial voice in order for the user to easily connect with Jasper just like a close friend. Being fun, trendy and relevant. One example of this is using emojis in responses as an added personality tool. 

<br>

### Jasper's Fun Phrases
#### "Awesome sauce! Give me one second." "Coming right up!" "Enjoy your Inspiration!" "You there? Wonderful colors await you!"

<div class="image-container" style="margin-top:50px;"><img src="../img/colorBot/workflowDiagram.png" alt="Workflow Diagram"/></div>

I created this workflow diagram as a way to help me compartmentalize the interactions and the functions that needed to be created and as a way to user test before spending any time in development. From my Wizard of Oz testing I found I was missing error cases as well as cases of confirmation that were not explicitly “yes”. The other think I learned was I needed to create a way for the bot to help the user when the interaction is not super clear or the user would like answers outside of the created toolset.  

<div class="image-container" style="margin-top:20px;"><img src="../img/colorBot/workflowDiagramUpdated.png" alt="Workflow Diagram Updated"/></div>

<div class="image-container" style="margin-top:20px;"><img src="../img/colorBot/dataStructure.png" alt="Data Structure"/></div>

