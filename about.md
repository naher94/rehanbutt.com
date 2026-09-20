---
layout: blank
title: "About"
og-image: about.jpg
permalink: about
footer-main: true
sort-order: 2

header-visibility: show
header-sort-order: 2

footer-section: main
footer-sort-order: 2
---

<div class="about-intro">
  <div class="grid-container about-bio">
    <div class="grid-x cell bio-wrapper">
      <div class="small-12 large-8 cell grid-x">
        <section class="bio cell">
          <h1>Hi! I'm Rehan <span class="wave" onclick="highFive()">👋</span></h1>
          <p>I am a <span class="rainbow">devzgner</span> currently based in Los Angeles California, USA creating <span class="magic">magic</span> & filmmaking tools at Walt Disney Animation Studios, where I lead design across a broad range of tools used by artists and filmmakers. I am naturally curious and tend to think in systems, always drawn to understanding how products, people, and technology come together.</p>
          <p>Previously, I led design for the technology group at UPMC Enterprises, part of the University of Pittsburgh Medical Center. My work spanned care delivery platforms, research study tools, and a suite of imaging applications for the radiology field in collaboration with GE Healthcare.</p>
          <p>Earlier in my career, I worked in the sports industry, collaborating with organizations like the <span class="basketball">National Basketball Association</span> and <span class="football">National Football League</span> on both consumer and enterprise applications, from in-door wayfinding and advertising platforms to <a href="{% link _projects/deepintheq.markdown %}">augmented reality experiences.</a> I've also spent time in the consumer advocacy space building tools that help support a more transparent, consumer-driven marketplace.</p>
          <p>I've been very fortunate to have lived in various parts of the <span class="world">world</span>, and continue my love of travel. That global perspective continues to shape how I approach design, influenced by my observations and experiences from each culture and geography. My travels have also fueled a deep love of <a href="{% link photography.html %}"><span class="photography">photography</span></a>, and I have captured some incredible moments along the way.</p>
          <p>I've had the opportunity to share my perspective at events both big and small, from Figma's Config and Siggraph to university classrooms and high schools, speaking about topics like designing tools for expert users and navigating a career in design. I have also developed and taught courses on product and design as adjunct faculty at Duquesne University. I am always looking for opportunities to learn something new and inspire conversation, if that sounds like something you'd want to collaborate on, let's connect.</p>
          <!-- TODO add link to let's connect -->
          <p>I studied at Carnegie Mellon University, where I received a Master in Tangible Interaction Design and a Bachelor in Integrative Physical and Digital Media Studies, a multi-disciplinary combination of architecture, design, human-computer interaction and computer science.</p>
          <p>When I'm not devzgning filmmaking tools, you can find me playing with code, drawing <span class="penguin">cute illustrations</span>, pushing buttons to see what happens, and sometimes doing a bit of <span class="woodworking">woodworking.</span></p>
          <p>One day I'd like to:</p>
          <ul class="todos">
            <li>
              <div class="checkbox" onclick="easterEggMessage(this)">
                <div class="click-easter-egg">Ha! If only it was that easy 😊</div>
              </div>
              <span>publish a photo book</span>
            </li>
            <li>
              <div class="checkbox" onclick="easterEggMessage(this)">
                <div class="click-easter-egg">Ha! If only it was that easy 😊</div>
              </div>
              <span>design and ship a hardware product</span>
            </li>
            <li class="accomplished">
              <div class="checkbox">
                <i class="fas fa-check"></i>
              </div>
              <span>work in the animation industry</span>
            </li>
          </ul>
          <p>Curious what else I'm up to? Shoot me an <span onclick="copyToClipboard('me@rehanbutt.com',this)" class="email">email.</span>
          </p>
        </section>
        <div class="cell grid-x small-5 large-12 profile-2 grid-padding-x grid-padding-y">
          <div class="cell large-6">
            <img src="/img/rehan-profile2.jpg" alt="Photo of Rehan Butt">
          </div>
          <div class="cell large-6">
            <img src="/img/rehan-profile3.jpg" alt="Photo of Rehan Butt laughing">
          </div>
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
        <!-- Handle the grouping when many roles in 1 company -->
        {% if work_prev.company != work.company%}
          {% if work.logo %}
          <!-- Inlined so the mark's fill can be driven from CSS. Sources live in
               img/logos/ and must carry class="brand-logo" with no fill attribute,
               or the CSS colours won't apply. include_relative resolves from this
               file's own directory, which is why the path has no leading slash.
               speaking.html still uses <img> against img/ for its own set. -->
          {% capture logo_include %}img/logos/{{ work.logo }}-logo.svg{% endcapture %}
          <div class="brand-logo-container" id="{{work.logo}}" role="img" aria-label="{{work.company}} logo">
            {% include_relative {{ logo_include }} %}
          </div>
          {% endif %}
          <h3>{{work.company}}</h3>
        {% endif %}
        <!-- Collapsed state is set per role in its front matter -->
        {% if work.collapsed %}
          <details class="description-details">
            <summary>
              <div class="title-date grid-x align-justify">
                <h4 class="cell shrink">{{work.role}}{% if work.group %}・{{work.group}}{% endif %}</h4>
                <p class="date cell shrink">{{work.date-start | date: "%b %Y"}}・{{work.date-end | date: "%b %Y"}}</p>
              </div>
            </summary>
            <p class="description">{{work.description}}</p>
          </details>
        {% else %}
          <div class="title-date grid-x align-justify">
            <h4 class="cell shrink">{{work.role}}{% if work.group %}・{{work.group}}{% endif %}</h4>
            <!-- what happens when the date is present? -->
            <p class="date cell shrink">{{work.date-start | date: "%b %Y"}}・{{work.date-end | date: "%b %Y"}}</p>
          </div>
          <p class="description">{{work.description}}</p>
        {% endif %}
        {%- if work.company == "Walt Disney Animation Studios" -%}
          {{work.content}}
        {%- endif -%}
      </div>
      {% assign work_prev = work %}
    {% endfor %}
  </section>
  <section class="education" id="education">
    <div class="cell grid-x align-middle">
      <h2 class="cell small-12 medium-shrink">Education</h2>
      <div class="cell small-12 medium-auto divider"></div>
    </div>
    <div class="education-item">
      <div class="brand-logo-container" id="cmu" role="img" aria-label="Carnegie Mellon University logo">
        {% include_relative img/logos/cmu-logo.svg %}
      </div>
      <h3>Carnegie Mellon University</h3>
      <p class="description">Masters in Tangible Interaction Design</p>
    </div>
    <div class="education-item">
      <h3>Carnegie Mellon University</h3>
      <p class="description">Bachelors in the Integrative Physical and Digital Media Studies</p>
    </div>
    <div class="education-item">
      <div class="brand-logo-container" id="nus" role="img" aria-label="National University of Singapore logo">
        {% include_relative img/logos/nus-logo.svg %}
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
      <div class="skills-item">Systems Design</div>
      <div class="skills-item">Product Management</div>
      <div class="skills-item">Project Management</div>
      <div class="skills-item">Problem Solving</div>
      <div class="skills-item">Team Management</div>
      <div class="skills-item">Interaction Design</div>
      <div class="skills-item">Design Ops</div>
      <div class="skills-item">Information Architecture</div>
      <div class="skills-item">UX Writing</div>
      <div class="skills-item">3D Modeling</div>
      <div class="skills-item">Animation</div>
      <div class="skills-item">Photography</div>
      <div class="skills-item">Hand & Technical Drawing</div>
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
      <div class="skills-item">Photoshop</div>
      <div class="skills-item">Illustrator</div>
      <div class="skills-item">InDesign</div>
      <div class="skills-item">Blender</div>
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