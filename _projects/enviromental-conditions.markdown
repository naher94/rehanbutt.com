---
layout: post-hero
title:  "Environmental Conditions"
tile-name: "Design Tool"
thumbnail: "enviro"
flag:
date: 2021-10-01
hero-background-color: "#EAF8EC"
hero-background-color-dark: "#124626"
hero-accent-color: "#28B53D"
hero-accent-color-dark: "#448D3D"
hero-image: "environmental-conditions/enviro-hero.png"
hero-image-alt: ""
hero-background: "environmental-conditions/enviro-hero-background.svg"
tags: digital UI UX
published: true
---

{:.post-callout-medium}
What if design tools helped reflect some of the common scenarios that exist in the real world?

The environmental conditions feature explores what one possible solution to this problem might be. Better accounting for user conditions such as internationalization, dark environments and reduced network speeds for starters!

1 key aspect of this project was to build on existing design tools rather then exploring what an entirely new tool might look like. Not only because much of the design projects we all work on are around improving existing products but it may help design tools teams more easily bring some of these ideas to life! If you are curious about my thoughts on a ground up design tool check out <a target="_blank" rel="noopener" href="https://fluiddesign.rehanbutt.com">Fluid Design<span class="visually-hidden">Opens a new window</span></a>.

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell">
    <img src="../img/environmental-conditions/hero.jpg" alt="">
  </div>
</div>
{% capture bts-title %} Behind the Scenes {% endcapture %}
{% capture bts-description %} To the keen eye you may recognize the leaf icon that I am using for the branding of this project, its from Wall-E! You may also see a couple A113 references through out this project as well, another classic Pixar easter egg! {% endcapture %}
{% include behind-the-scenes.html %}

One Possible solution could be the Environmental Conditions feature. Where you design with added layers of context considering your user’s environment. Thinking beyond static visuals but experiences that are effected by the user's surroundings. Working at night or in a dark room? Constrained by reduced network speeds? Building for an international market? All these considerations can more easily be made earlier in the design process that nicely blends into the Figma UI we know and love.

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell">
    <img src="../img/environmental-conditions/overall-default.jpg" alt="">
  </div>
</div>

At the top of the Design Sidebar on the right you notice the new Environmental Conditions control. Allowing you, the designer, to add another dimension to your designs.

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell">
    <img src="../img/environmental-conditions/internationalization-detailed.jpg" alt="">
  </div>
</div>

Exploring the internationalization case, you will noticed in the above image that the Environmental Conditions control now selects the international dimension. Allowing for cascading changes through out the application specifically for your internationalization considerations. In this case thinking about the region specific needs of a movie theatre application, exploring right to left languages and the different rating systems that would need to be applied around the world. As you proceed through your design process the Environmental Conditions Leaf anchors itself into the layers panel, informing you that there are additional dimensions added to these objects.

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell">
    <img src="../img/environmental-conditions/darkmode-detailed.jpg" alt="">
  </div>
</div>

Similarly in the case of a dark environment the Environmental Conditions control updates and so does the layers panel. Though in this case of a dark mode likely you would like to update existing global color styles rather then applying the correct color to each and every object in your design.

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell medium-6">
    <img src="../img/environmental-conditions/styles-panel.jpg" alt="">
  </div>
  <div class="cell medium-6">
    <img src="../img/environmental-conditions/inspect-code.jpg" alt="">
  </div>
</div>
Our styles have updated to reflect these global changes! Shown above the `primary-red` color style now also has an added 'Dark Environment' property that will reflect everywhere the `primary-red` style is applied when the Dark Environment is set.

Likewise we can’t forget about our engineers. the code panel has been updated to show media queries in this case the `prefers-color-scheme`. But could be expanded to a include several other media queries such as `prefers-contrast`, `prefers-reduced-motion`, and `prefers-reduced-data` creating a more streamlined collaboration process between design and development.

{:.post-callout-medium}
This project is in no way complete, but an exercise is what something could start to look like.

This project is in no way complete, but an exercise is what something could start to look like. As such if I were to continue on with this work I would want to focus on 3 main things. First, exploring interaction details and how the Environmental Conditional feature interacts with the rest of Figma. Thinking about such as the relationship to pages, linked layers, and showcasing a state where multiple environments are enabled. Second, user testing and seeing what works and doesn't within others design processes. And third, the technical feasibility, is this something that could be build given public APIs assuming it was not built and realized by the Figma team themselves.

## Process

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell medium-12">
    <p class="post-callout-small">“I find <strong>frames</strong> with their different formatting treatments <strong>tricky</strong> like when I would steal components from you there would be <strong>invisible</strong> stuff going on that I found hard to decode” <span class="byline">- Designer (Figma User)</span>
    </p>
  </div>
  <div class="cell medium-6">
    <p class="post-callout-small">“Well currently the prototyping function on Figma is my least favorite part. I wish it was a bit <strong>more flexible, more intuitive</strong> and more fluid on the animations (always laggy or jittery)” <span class="byline">- Designer (Figma User)</span>
    </p>
  </div>
  <div class="cell medium-6">
    <p class="post-callout-small">“Hmmmm we’ve been having <strong>issues with the pathing</strong> for presentation mode. If you delete something it breaks instead of being like ‘hey let me <strong>just connect</strong> to the one that after it then’” <span class="byline">- Designer (Figma User)</span>
    </p>
  </div>
</div>

1 of the first parts of my research and discovery process involved asking my design friends what some of the issues they experienced with design tools are and these quotes were a couple of those thoughts.

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell">
    <img src="../img/environmental-conditions/feature-request-list.jpg" alt="Feature Request Lists from Figma and Framer">
  </div>
</div>
The other things I did was explore the publicly available feature request lists for Figma and Framer, getting a sense for what the general design community is looking for next in their tools.You will notice many of these requests have to do with design tools more closely reflecting to the developed end product. "Adding support for RTL languages", "Wrap elements in Auto Layout to multiple lines" and "Design Token support" to name a few.

{:.post-callout-medium}
Many of the requests and comments were about bringing more real world conditions and scenarios 
into the design tools and thus earlier into the design process. 

Through out this process a bunch of questions came to mind from here. All exploring the relationship between the designed interface and the end product that ends up in the user's hands. Here are some of those questions:

- Referencing real data?
- Creating responsive interfaces?
- How do you make the design tool act more like the real world without jumping to implementation details?
- What parts of the real world are important to translate?
- Is it about fidelity or things forgotten?
- Abstracting out a user flow from the interface?

<!-- <div class="grid-x grid-margin-x grid-margin-y">
  <div class="cell small-6 medium-4 quote-color-block square-block">
    <p class="post-callout-small">How do you make the design tool act more like the real world without jumping to implementation details?</p>
  </div>
  <div class="cell small-6 medium-4 quote-color-block square-block">
    <p class="post-callout-small">What parts of the real world are important to translate?</p>
  </div>
  <div class="cell small-6 medium-4 quote-color-block square-block">
    <p class="post-callout-small">Is it about fidelity or things forgotten?</p>
  </div>
  <div class="cell small-6 medium-4 quote-color-block square-block">
    <p class="post-callout-small">Abstracting out a user flow from the interface?</p>
  </div>
  <div class="cell small-6 medium-4 quote-color-block square-block">
    <p class="post-callout-small">Referencing real data?</p>
  </div>
  <div class="cell small-6 medium-4 quote-color-block square-block">
    <p class="post-callout-small">Creating responsive interfaces?</p>
  </div>
</div> -->

<!-- TODO issue with grid-margin-x here with the parent 1 and mobile display -->
<div class="grid-x grid-margin-x grid-margin-y"> 
  <div class="cell medium-6 quote-color-block">
    <p class="post-callout-small">“Team up with your dev during, not after design” <span class="byline">- Developer</span></p>
  </div>
  <div class="cell medium-6 quote-color-block">
    <p class="post-callout-small">“Consider error cases and non-standard flows” <span class="byline">- Developer</span></p>
  </div>
  <div class="cell medium-6 quote-color-block">
    <p class="post-callout-small">“Work to build a shared language” <span class="byline">- Developer</span></p>
  </div>
  <div class="cell medium-6 quote-color-block">
    <p class="post-callout-small">“Think about things like performance and auditing” <span class="byline">- Developer</span></p>
  </div>
</div>

I also chatted with several of my engineering partners as they play a key role in my design process and any software product. Here are a couple of the things they said in relation to working with designers and the design processes they have been a part of.


{:.post-callout-medium}
The research helped solidify a focus area around the idea of bringing real world conditions into the design tools specifically around non-ideal conditions or user environmental situations


<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell">
    <img src="../img/environmental-conditions/design-process.jpg" alt="Current design process workflow diagram">
  </div>
</div>

Created a workflow diagram illustrating the design I currently follow on my team. Looking at what parts of this process would be modified and improved with this solution.

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell">
    <img src="../img/environmental-conditions/design-process-broken.jpg" alt="Design process workflow diagram calling out broken steps">
  </div>
</div>

This workflow diagram highlights the situation I wanted to improve with this project. Looking at where in the process missed or overlooked considerations ended up being caught and what would happen when those item needed to be resolved in short order. These items tend to get caught when a larger number of folks thing through the problem and get missed when they are not considered from the beginning.

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell medium-6">
    <img src="../img/environmental-conditions/fidelity-switcher.svg" alt="Fidelity Switcher: abstracting out a user flow from the interface">
  </div>
  <div class="cell medium-6">
    <img src="../img/environmental-conditions/context-layering.svg" alt="Context Layering: layering in user context/environment conditions">
  </div>
</div>

2 ideas came to mind the idea of a "Fidelity Switcher" where the user flow is abstracted out from the interface layer and the idea of "Context layering" layering in user context and environmental conditions. 

For the "Fidelity Switcher" concept think about a multi-modal experience, one where you might start the experience through voice and then handoff to a screen based interface. Abstracting that interaction flow from the voice or screen interface would lead to clearer articulation of the user flow regardless of the interface. This idea also lead to back to by work on <a target="_blank" rel="noopener" href="https://fluiddesign.rehanbutt.com">Fluid Design<span class="visually-hidden">Opens a new window</span></a>, as such as decided to explore the other route for this exercise. But you should definitely check out that work!

The "Context Layering" idea explores layering in context such as a taking into consideration dark environments, slow network speeds, internationalization or a dedicated interface when used in a car. This new dimension more closely mimics the real world scenarios that may otherwise be missed in a typical design process. And aids in the collaboration between the design and the implementation. Throughout the rest of this project I explore the idea of bringing forward user environmental considerations.

<!-- Temporal dimension is already handled in design tools, through a sequence of steps or through interactive prototypes.
Why not add another dimension around the users environmental context. -->


<!-- ### Ideation -->

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell">
    <img src="../img/environmental-conditions/sketches.jpg" alt="">
  </div>
</div>
These were some of my initial sketches. Exploring what this feature might look like within Figma.
Where it might live in the application's hierarchy and how it plays with the existing toolset.

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell">
    <img src="../img/environmental-conditions/figma-ui.jpg" alt="">
  </div>
</div>

Figma happens to publicly share the design system for Figma and I referenced it to see if I could gain insights in how they go about tackling this feature with the rules they have set up in the app today. Looking at where it might fit naturally into the product. I knew it had to be a global tool and wanted to make sure it followed existing conventions and information architecture where it made sense, another benefit to having access to the Figma design system.

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell medium-6">
    <img src="../img/environmental-conditions/analogous-inspo-ecotech.jpg" alt="">
  </div>
  <div class="cell medium-6">
    <img src="../img/environmental-conditions/analogous-inspo-render.jpg" alt="">
  </div>
  <div class="cell">
    <img src="../img/environmental-conditions/analogous-inspo-webdev.jpg" alt="">
  </div>
</div>
Analogous inspiration is one of my favorite research methods, looking at other contexts and industries to see how they may have solved a similar problem or even the same one. And that's no exception for this project either! I looked at a couple architectural tools to start one that focused on weather conditions, another that explores physics based environments and lastly a more traditional rendering scenario.

And of course look at software development tools, exploring browser  overrides like "Force dark appearance" and networking throttling and even what environment conventions are used in CSS today.


<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell">
    <img src="../img/environmental-conditions/design-process.jpg" alt="Current design process workflow diagram">
  </div>
</div>
Lets revisit the initial design process workflow without the proposed solution.

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell">
    <img src="../img/environmental-conditions/design-process-enviro.jpg" alt="Design process workflow diagram with Environmental Conditions feature">
  </div>
</div>
And now looking at a design process adding in the Environmental Conditions feature can help front load these, sometimes forgotten, conditions and reduce gaps in the final experience!

<div class="grid-x grid-padding-x grid-margin-y">
  <div class="cell">
    <img src="../img/environmental-conditions/hero.jpg" alt="">
  </div>
</div>
To recap the Environmental Conditions feature solves the problem of bringing more real world conditions into the design tool and earlier into the design process by helping you and your team remember to consider the user’s environmental context that may otherwise be missed.