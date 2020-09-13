---
layout: default
title: "About"
permalink: about

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

  <section class="work-experience">
    <h2>Work Experience</h2>

    <div class="work-item">
      <div class="brand-logo-container" id="upmc">
        <img class="brand-logo" src="/img/upmc-logo.svg" alt="GE & UPMC Logo">
      </div>
      <h3>Senior Product Designer・UPMC Enterprises</h3>
      <p class="date">December 2019・Present</p>
      <p class="description">Leading the hcOS (Healthcare Operating System) design efforts to identify and build applications that take advantage of an integrated healthcare data platform. Also, continuing to lead the design efforts for Vincent Payment Solutions and supporting design efforts for our Pharmacy team.</p>
    </div>
    <div class="work-item">
      <h3>Product Designer・UPMC Enterprises</h3>
      <p class="date">July 2018・December 2019</p>
      <p class="description">Worked with GE Healthcare on creating next generation enterprise imaging products for radiology field, including work prioritization, image viewers, and reporting applications. Led native PACs reporting project while building out a design system for use across GE Healthcare. I also led the design efforts for Vincent Payment Solutions, a payment application addressing the difficulty of institutional payments for short term engagements such as research studies and class projects.</p>
    </div>

    <div class="work-item">
      <div class="brand-logo-container" id="processly">
        <img class="brand-logo" src="/img/processly-logo.svg" alt="Processly Logo">
      </div>
      <h3>Co-Founder & CXO・Processly</h3>
      <p class="date">May 2016・Present</p>
      <p class="description">A web application making it easy for students to document, discuss, and reflect upon their work. It allows teachers to work alongside students as they foster a collaborative learning environment.</p>
    </div>
    <div class="work-item">
      <div class="brand-logo-container" id="dio">
        <img class="brand-logo" src="/img/dio-logo.svg" alt="DzgnIO Logo">
      </div>
      <h3>Co-Founder・DzgnIO</h3>
      <p class="date">April 2015・Present</p>
      <p class="description">We design and create with an approach of playful pragmatism. A group with the goal to deliver design services incorporating holistic values of aesthetics, experience, and communication.</p>
    </div>
    <div class="work-item">
      <h3>Teaching Assistant・Spactial Narratives via Web Graphics</h3>
      <p class="date">August 2017・December 2017</p>
      <p class="description">Taught students web technologies in relation to creating great web experiences. Creating and maintaining good code practices and how to design delightful experiences with entry level software development skills.</p>
    </div>
    <div class="work-item">
      <h3>Lab Manager・CodeLab</h3>
      <p class="date">August 2016・August 2017</p>
      <p class="description">Worked to expand the lab's digital presence in order to create growth for the lab.  I also launched a student showcase in partnership with the career development office to share the broad range of skills presented by the students of the school of architecture with industry professionals.</p>
    </div>
    <div class="work-item">
      <div class="brand-logo-container" id="yinzcam">
        <img class="brand-logo" src="/img/yinzcam-logo.svg" alt="AFL, NBA, NFL, NRL, Telstra and Apple Logo">
      </div>
      <h3>Experience Designer・YinzCam</h3>
      <p class="date">May 2016・May 2017</p>
      <p class="description">Lead new product efforts for better fan engagement, worked with clients such as the NBA and NFL pushing their missions forward. Lead both consumer and enterprise applications for use by the NBA, NFL & AFL including project with an AR and VR focus and in-stadium wayfinding.</p>
    </div>
    <div class="work-item">
      <h3>UI/UX Design Intern・YinzCam</h3>
      <p class="date">November 2015・May 2016</p>
      <p class="description">Evaluated the current app experiences and designed enhancements across consumer facing products and enterprise applications.</p>
    </div>
    <div class="work-item">
      <h3>Head Teaching Assistant・Intro to Digital Media</h3>
      <p class="date">September 2015・April 2016</p>
      <p class="description">Taught students a variety of software tools for use in their design work and the workflows around them.</p>
    </div>
    <div class="work-item">
      <h3>Lab Manager・IDeATe Digital Fabrication Lab</h3>
      <p class="date">September 2015・September 2016</p>
      <p class="description">Taught students digital preparation & machining techniques in laser cutting, 3D printing & CNC milling. Best practices for production and sustainable material use.</p>
    </div>
    <div class="work-item">
      <div class="brand-logo-container" id="cr">
        <img class="brand-logo" src="/img/cr-logo.svg" alt="Consumer Reports Logo">
      </div>
      <h3>User Experience Design Intern・Consumer Reports</h3>
      <p class="date">May 2015・August 2015</p>
      <p class="description">Worked with the UX team to redesign consumerreports.org with an emphasis on data visualization, better conveying complex data to the large user base.</p>
    </div>
    <div class="work-item">
      <h3>Designer & Developer・Human Behavior Computing Lab</h3>
      <p class="date">June 2014・November 2014</p>
      <p class="description">Designed and created a web presence for the lab to showcase its projects and members.</p>
    </div>
    <div class="work-item">
      <h3>Design Intern・Architrave</h3>
      <p class="date">May 2013・July 2013</p>
      <p class="description">Helped to expand the in-house materials and standards libraries while gaining familiarity with industry standard tools such as 3dsMax, Revit and AutoCAD.</p>
    </div>
  </section>

  <section class="speaking-events">
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
      {% if event.link %}
        </a>
      {% endif %}

      <p class="date">{{event.date| date: "%B %Y" }}
        {% if event.location %}
        ・ {{event.location}}
        {% endif %}
      </p>
      <p class="description">{{event.description}}</p>
    </div>
    {% endfor %}
  </section>

  <section class="education">
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
  <section class="skills">
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
  <section class="tools">
    <h2>Tools</h2>
    <h3>Some of the toolsets I am quite familiar with</h3>
    <div class="skills-container">
      <div class="skills-item">Sketch</div>
      <div class="skills-item">Framer</div>
      <div class="skills-item">Photoshop</div>
      <div class="skills-item">Illustrator</div>
      <div class="skills-item">InDesign</div>
      <div class="skills-item">Adobe XD</div>
      <div class="skills-item">HTML</div>
      <div class="skills-item">CSS</div>
      <div class="skills-item">Javascript</div>
      <div class="skills-item">Ruby</div>
      <div class="skills-item">RAPID</div>
      <div class="skills-item">Arduino</div>
      <div class="skills-item">Rhino</div>
      <div class="skills-item">RhinoCAM</div>
      <div class="skills-item">Vray</div>
      <div class="skills-item">AutoCAD</div>
      <div class="skills-item">CNC Routing</div>
      <div class="skills-item">Laser Cutting</div>
    </div>
  </section>
</div>

</div>
