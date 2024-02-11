---
layout: post
title:  "Jasper the Color Bot"
tile-name: "Color Bot"
thumbnail: "jasper"
date:   2016-12-4
tags: bot color
---

<div class="image-container"><img src="../img/colorBot/intro.svg" alt="Logo Equation"/></div>

Jasper is a color tool to expand your color vocabulary and provide a new form of inspiration.

Building on colors inspiration tools like [Adobe's Color](http://color.adobe.com), [Design Seeds](https://www.design-seeds.com/blog/) and [LOLColors](http://www.lolcolors.com). I want to give users daily color inspiration from Pantone's [color of the day](https://www.pantone.com/colorstrology). I would like to build a Slack bot to help users think about color in a new light (the Pantone light) and expand the user's color vocabulary. Additionally, I would like users to have the option to request images that use that color for further inspiration. I plan to build this by pulling the color of the day from Pantone's [Colorstrology](https://www.pantone.com/colorstrology) and using that color to search Dribbble or other similar sites to surface images for the user.

For this iteration, I decided to build Jasper as an SMS bot using Twilio, to keep development. I plan to port Jasper to Slack as the interactions for a team will be far more compelling than that of an individual.

Sadnote: Pantone does not store a public list of all their daily colors :(

In [Version (V1.0)](https://github.com/naher94/jasper/releases/tag/V1.0) Jasper can pull up today’s color of the day and provide up to 4 images using that color. Jasper can also pull up yesterday’s color with images and have a bit of fun with the responses. The color data is scraped from Pantone's [Colorstrology](https://www.pantone.com/colorstrology) site and stored in the Swatch Table of the database. After the color data is collected a secondary function runs that scrapes 4 images from Dribbble given the hex value of the color, and stores it in the Image Table.


<div class="image-container" style="margin-top:50px;"><img src="../img/colorBot/conversation.png" alt="A full Conversation with Jasper"/></div>

## Process

| Effort/Priority | High   | Medium    | Low |
| --------------- | ------ | -------   | --- |
| **Low**         | Pull Tweets with #coloroftheday | clear formating | Creative error handling |
| **Medium**      | Store a list of requested colors from the user   |   Upload image of the color swatch | ... |
| **High**        | ...  | Include the Hex value (pull from CSS styling) | Pull images that use the color |

As part of the development process I created the above matrix to help prioritize my time the essentials of app.

<div class="image-container" style="margin-top:50px;"><img src="../img/colorBot/personality.svg" alt="Personality"/></div>

In order to create a better bot experience, I wanted to make sure Jasper had some personality. I defined different traits to help create the right tone for Jasper. I wanted a colloquial voice in order for the user to easily connect with Jasper just like a close friend, being fun, trendy and relevant. One example of this is using emojis in responses as an added personality tool.

<br>

### Jasper's Fun Phrases

#### "Awesome sauce! Give me one second." "Coming right up!" "Enjoy your Inspiration!" "You there? Wonderful colors await you!" "Happy coloring! 🎨🎉" "I'm Jasper your friendly neighborhood color master"

<div class="small-12 medium-6 large-6 columns image-container" style="margin-top:20px;"><img src="../img/colorBot/workflowDiagram.png" alt="Workflow Diagram"/></div>

<div class="small-12 medium-6 large-6 columns image-container" style="margin-top:20px; margin-bottom:50px;"><img src="../img/colorBot/workflowDiagramUpdated.png" alt="Workflow Diagram Updated"/></div>

<div class="image-container" style="margin-top:20px; margin-bottom:50px;"><img src="../img/colorBot/workflowDiagramFinal.png" alt="Workflow Diagram Final"/></div>


I created this workflow diagram as a way to help me compartmentalize the interactions and the functions that needed to be created and as a way to user test before spending any time in development. From my Wizard of Oz testing I found I was missing error cases as well as cases of confirmation that were not explicitly “yes”. The other thing I learnt was to create a way for the bot to help the user when the interaction is not super clear or the user would like answers outside of the created toolset.

<div class="image-container" style="margin-top:20px;"><img src="../img/colorBot/dataStructure.png" alt="Data Structure"/></div>

### A Couple of Other Thoughts

For the next iteration of Jasper, I would like to port him to Slack for an entire team to interact and add additional features. One of these features will be the ability to pull up images from several different sources in addition to Dribbble and be able to provide images that are more relevant to the project the user is working on. It will provide photos for a presentation or UI images to help design a better UI feel using these color tones. Another feature I would like to incorporate is the ability to pull images from a Slack conversation and create a potential color scheme given a wireframe and thematic words.

Looking back on this process I learnt a fair bit about developing and deploying a bot, which will come in handy for any future developments. I also learnt about databases and the best way to set up the tables. From a creative aspect, I further learnt about various aspects involving human interaction.  People never do what’s expected of them, requiring development of simple and seamless interactions, while maintaining character of your application or bot, much like a stage production.
