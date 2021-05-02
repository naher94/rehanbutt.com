---
layout: blank
title: "About"
permalink: about
footer-main: true
---
<div class="about-intro">
  <div class="grid-container">
    <div class="grid-x cell bio-wrapper">
      <div class="small-12 large-8 cell grid-x grid-padding-x">
        <section class="bio cell">
          <h1>Hi! I'm Rehan <span class="wave">👋</span></h1>
          <p>I am a <span class="rainbow">devzgner</span> 
          <!-- <code>/devzīnər/</code> -->
          currently based in Pittsburgh, PA, USA working on healthcare technology at UPMC Enterprises. Currently I lead design for our technology solutions group exploring telemedicine tools. During my time at UPMC I have led design across many products ranging from care delivery to research study tools and worked with GE Healthcare on advancing a suite of imaging tools for the radiology field. Prior to joining the healthcare world, I worked in the sports industry, collaborating with organizations like the NBA and NFL on consumer and enterprise applications, such as in-door wayfinding, an ads platform, and AR experiences! I have also spent time in the consumer advocacy space building tools that help to prioritize the interests of the consumer in order to shape a truly consumer-driven marketplace.</p>
          <p>I have been very fortunate to live all over the world and continue my love for travel. 🌏 Bringing my observations and experiences from unique aspects of each culture and geography into my design philosophy. During my travels I have had the opportunity to grow my love of photography 📷 and have captured some amazing images along the way.</p>
          <p>I attended Carnegie Mellon University where I received a Masters in Tangible Interaction Design and a Bachelors (BA) in Integrative Physical and Digital Media Studies. I’m always looking for opportunities to learn something new and share what I know with others. Sentence about learning something new. Check out some of my fun finds over here. And sometimes I get a chance to share what I know on stage.</p>
          <p>When I’m not devzgning healthcare solutions, you can also find me playing with code, drawing cute illustrations 🐧, pushing buttons and sometimes doing a bit of wood working. One day I’d like to publish a photo book, design and ship a hardware product and work in the animation industry.</p>
          <p>Curious what else I’m up to? Shoot me an <a href="mailto:me@rehanbutt.com">email</a>. ✉️</p>
        </section>
        <div class="cell medium-6">
          <img src="/img/rehan-profile2.jpg" alt="">
        </div>
        <div class="cell medium-6">
          <img src="/img/rehan-profile3.jpg" alt="">
        </div>
      </div>
    </div>
    <div class="profile-container">
      <img src="/img/rehan-profile1.jpg" alt="Photo of Rehan Butt">
    </div>
  </div>
</div>

<div class="grid-container grid-x">
  <div class="small-12 large-8 large-offset-4 cell">
  <section class="work-experience" id="work-experience">
    <div class="cell grid-x align-middle">
      <h2 class="cell small-12 medium-shrink">Work Experience</h2>
      <div class="cell small-12 medium-auto divider"></div>
    </div>
    {% assign work_order = site.work-experience | sort: 'sort-order' %}
    {% assign work_prev = "hello" %}
    {% for work in work_order %}
      <div class="work-item">
        <!-- Logo thing here -->
        {% if work.logo %}
        <div class="brand-logo-container" id="{{work.logo}}">
          <img class="brand-logo" src="/img/{{work.logo}}-logo.svg" alt="{{work.logo}} Logo">
        </div>
        {% endif %}
        <!-- how to handle the grouping thing many roles in 1 company?? -->
        {% if work_prev.company != work.company%}
          <h3>{{work.company}}</h3>
        {% endif %}
        <h4>{{work.role}}{% if work.group %}・{{work.group}}{% endif %}</h4>
        <!-- what happens when the date is present? -->
        <p class="date">{{work.date-start | date: "%B %Y"}}・{{work.date-end | date: "%B %Y"}}</p>
        <p class="description">{{work.description}}</p>
      </div>
      {% assign work_prev = work %}
    {% endfor %}
  </section>
  <section class="speaking-events" id="speaking-events">
    <div class="cell grid-x align-middle">
      <h2 class="cell small-12 medium-shrink">Speaking Events</h2>
      <div class="cell small-12 medium-auto divider"></div>
    </div>
    {% assign event_order = site.speaking | sort: 'date' | reverse %}
    {% for event in event_order %}
    {% assign current_date = 'now' | date: "%s" %}
    {% assign event_date = event.date | date: "%s" %}
    <div class="speaking-item
      {% if event_date > current_date %}
        future-event
      {% endif %}
    "> <!-- adding future-event class -->
      {% if event.logo %}
      <div class="brand-logo-container" id="{{event.logo}}">
        <img class="brand-logo" src="/img/{{event.logo}}-logo.svg" alt="{{event.logo}} Logo">
      </div>
      {% endif %}
      {% if event.link %}
        <a href="{{event.link}}" target="_blank" rel="noopener">
      {% endif %}
      <h3>
        {{event.title}}
        <!-- Add a if for future event -->
        {% if event_date > current_date %}
        <span>Upcoming</span>
        {% endif %}
        {% if event.link %}
          <i class="fas fa-link"></i>
        {% endif %}
      </h3>
      <p class="date">{{event.date| date: "%B %Y" }}
        {% if event.location %}
        ・ {{event.location}}
        {% endif %}
      </p>
      <p class="description">{{event.description}}</p>
      {% if event.link %}
        </a>
      {% endif %}
    </div>
    {% endfor %}
  </section>
  <section class="education" id="education">
    <div class="cell grid-x align-middle">
      <h2 class="cell small-12 medium-shrink">Education</h2>
      <div class="cell small-12 medium-auto divider"></div>
    </div>
    <div class="education-item">
      <div class="brand-logo-container" id="cmu">
        <img class="brand-logo" src="/img/cmu-logo.svg" alt="Carnegie Mellon University Logo">
      </div>
      <h3>Carnegie Mellon University</h3>
      <p class="description">Masters in Tangible Interaction Design</p>
    </div>
    <div class="education-item">
      <h3>Carnegie Mellon University</h3>
      <p class="description">Bachelors in the Integrative Physical and Digital Media Studies</p>
    </div>
    <div class="education-item">
      <div class="brand-logo-container" id="nus">
        <img class="brand-logo" src="/img/nus-logo.svg" alt="National University of Singapore Logo">
      </div>
      <h3>National University of Singapore</h3>
      <p class="description">Design Certificate Program - Designing for Active Aging</p>
    </div>
  </section>
  <section class="skills" id="skills">
    <div class="cell grid-x align-middle">
      <h2 class="cell small-12 medium-shrink">Skills</h2>
      <div class="cell small-12 medium-auto divider"></div>
    </div>
    <h3>Some of the things I do well</h3>
    <div class="skills-container">
      <div class="skills-item">Design Thinking</div>
      <div class="skills-item">Project Management</div>
      <div class="skills-item">Problem Solving</div>
      <div class="skills-item">Team Management</div>
      <div class="skills-item">Systems Design</div>
      <div class="skills-item">Interaction Design</div>
      <div class="skills-item">Information Architecture</div>
      <div class="skills-item">UX Writing</div>
      <div class="skills-item">Design Ops</div>
      <div class="skills-item">3D Modeling</div>
      <div class="skills-item">Animation</div>
      <div class="skills-item">Hand & Technical Drawing</div>
      <div class="skills-item">Photography</div>
      <div class="skills-item">Gif Curation 😝</div>
    </div>
  </section>
  <section class="tools" id="tools">
    <div class="cell grid-x align-middle">
      <h2 class="cell small-12 medium-shrink">Tools</h2>
      <div class="cell small-12 medium-auto divider"></div>
    </div>
    <h3>Some of the toolsets I am quite familiar with</h3>
    <div class="skills-container">
      <div class="skills-item">Figma</div>
      <div class="skills-item">Sketch</div>
      <div class="skills-item">Framer</div>
      <div class="skills-item">Photoshop</div>
      <div class="skills-item">Illustrator</div>
      <div class="skills-item">InDesign</div>
      <div class="skills-item">Adobe XD</div>
      <div class="skills-item">HTML</div>
      <div class="skills-item">CSS</div>
      <div class="skills-item">Javascript</div>
      <div class="skills-item">Rhino</div>
      <div class="skills-item">Arduino</div>
      <div class="skills-item">Ruby</div>
      <div class="skills-item">RAPID</div>
      <div class="skills-item">RhinoCAM</div>
      <div class="skills-item">Vray</div>
      <div class="skills-item">AutoCAD</div>
      <div class="skills-item">CNC Routing</div>
      <div class="skills-item">Laser Cutting</div>
    </div>
  </section>
</div>
</div>