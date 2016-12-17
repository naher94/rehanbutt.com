---
layout: post
title:  "Jasper the Color Bot"
tile-name: "Color Bot"
thumbnail: "/img/thumbnails/jasper.png"
date:   2016-12-4 12:00:00 -0500
categories: bot
permalink: colorBot
---

<div class="image-container"><img src="../img/colorBot/intro.svg" alt="Logo Equation" class="image-center"/></div>

Jasper is a color tool to expand your color vocabulary and provide a new form of inspiration for all.

Building on colors inspiration tools like [Adobe's Color](http://color.adobe.com), [Design Seeds](https://www.design-seeds.com/blog/) and [LOLColors](http://www.lolcolors.com). I want to give users daily color inspiration from Pantone's [color of the day](https://www.pantone.com/colorstrology). I would like to build a Slack bot to help users think about color in a new light (the Pantone light) and expand the user's color vocabulary. Additionally I would like users to have the option to request images that use that color for further inspiration. I plan to build this by pulling the color of the day from Pantone's [Colorstrology]( https://www.pantone.com/colorstrology) and using the color to search Dribbble or other such sites to surfaces images for the user.

For this iteration, I decided to build with an SMS bot using Twilio, to keep complexity down. I do plan to port Jasper to Slack as the interactions for a team will be far more compelling than that of an individual.

Sadnote: Pantone does not store a public list of all their daily colors :(

In this [Version (V1.0)]( https://github.com/naher94/rehanbutt.com/releases/tag/V1.0) Jasper can pull up today’s color of the day provide up to 4 images what use that color, pull up yesterday’s color with images and have a bit of fun with the responses. The color data is scraped from Pantone's [Colorstrology](https://www.pantone.com/colorstrology) site and stored a database which is made up of 2 tables as show below. After the color data is collected a secondary function runs that scrapes 4 images from Dribbble given the hex value of the color, which is then stored in the images table.


<div class="image-container" style="margin-top:50px;"><img src="../img/colorBot/conversation.png" alt="A full Conversation with Jasper"/></div>

<div>
<a target="_blank" href="https://github.com/naher94/jasper">
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

As part of the development process I created this matrix in order to prioritize my time and what the essentials of Jasper were.

<div class="image-container" style="margin-top:50px;"><img src="../img/colorBot/personality.svg" alt="Personality"/></div>

In order to create a better bot experience I wanted to make sure Jasper had some personality. I filled in a couple different traits to help create the right tone of Jasper. I wanted a colloquial voice in order for the user to easily connect with Jasper just like a close friend. Being fun, trendy and relevant. One example of this is using emojis in responses as an added personality tool.

<br>

### Jasper's Fun Phrases

#### "Awesome sauce! Give me one second." "Coming right up!" "Enjoy your Inspiration!" "You there? Wonderful colors await you!" "Happy coloring! 🎨🎉" "I'm Jasper your friendly neighborhood color master"

<div class="small-12 medium-6 large-6 columns image-container" style="margin-top:20px;"><img src="../img/colorBot/workflowDiagram.png" alt="Workflow Diagram"/></div>  

<div class="small-12 medium-6 large-6 columns image-container" style="margin-top:20px; margin-bottom:50px;"><img src="../img/colorBot/workflowDiagramUpdated.png" alt="Workflow Diagram Updated"/></div>

<div class="image-container" style="margin-top:20px; margin-bottom:50px;"><img src="../img/colorBot/workflowDiagramFinal.png" alt="Workflow Diagram Final"/></div>


I created this workflow diagram as a way to help me compartmentalize the interactions and the functions that needed to be created and as a way to user test before spending any time in development. From my Wizard of Oz testing I found I was missing error cases as well as cases of confirmation that were not explicitly “yes”. The other think I learned was I needed to create a way for the bot to help the user when the interaction is not super clear or the user would like answers outside of the created toolset.

<div class="image-container" style="margin-top:20px;"><img src="../img/colorBot/dataStructure.png" alt="Data Structure"/></div>

### A Couple Other Thoughts

For the next iteration of Jasper I would like to port him to Slack for an entire team to interact and add a couple more features. One of these features would be the ability to pull up images from several different sources in addition to Dribbble and be able to provide images that are more relevant to the project the user is working on. By providing photos for a presentation or UI images to help design a better UI feel in these color tones.Another feature I would like is to be able to pull images from a Slack conversation and create a potential color scheme given a wireframe and thematic words for example.
Looking back on this process I learned a fair bit about actually developing and deploying a bot, which will come in handy for any future development I do. I also learned about databases and how the best way to set up your tables are. From a creative aspect, I learned a bit more about all the aspects there are to consider when there is a human actor involved, people never do what you expect so you need to make sure to handle it in the best way possible while still having your application or bot staying in character, just as you would a stage production.

