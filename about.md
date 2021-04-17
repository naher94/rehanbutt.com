---
layout: default
title: "About"
permalink: about
footer-main: true
---

<div class="grid-x align-center cell">
  <div class="small-8 medium-4 cell profile-photo-container">
    <img src="/img/rehan-full.png" alt="Photo of Rehan Butt">
  </div>


<div class="small-12 medium-12 large-8 cell">
  <section class="bio">
    <h1>Hi! I'm Rehan <span class="wave">👋</span></h1>
    <p>I am a <span class="rainbow">devzgner</span> <code>/devzīnər/</code>, designer + developer, currently based in Pittsburgh, PA, USA working on healthcare technology previously working with organizations like GE Healthcare & the NBA on consumer and enterprise applications.</p>
    <p>I love to travel ✈️, and have been fortunate enough to live all over the world. 🌏 Every day trying to bring the unique aspects of each culture into my work. In my free time, I enjoy photography 📷 and creating cute digital illustrations 🐧. Want to hear more about what I’m up to? Shoot me an <a href="mailto:me@rehanbutt.com">email</a> to connect. ✉️</p>
  </section>

  <section class="work-experience" id="work-experience">
    <h2>Work Experience</h2>

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
    <h2>Speaking Events</h2>

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
    <h2>Education</h2>
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
    <h2>Skills</h2>
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
    <h2>Tools</h2>
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
