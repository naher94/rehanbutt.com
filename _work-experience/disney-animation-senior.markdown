---
role: "Senior Product Designer"
date-start: 2022-08-22
date-end: Present
company: Walt Disney Animation Studios
description: "As part of the technology department, I lead the design of a wide range of tools used by artists and filmmakers. I collaborate closely with both artists and engineers to translate cutting-edge computer graphics technology into intuitive, artist-centric tools. As a design generalist, I’m involved throughout the entire product lifecycle, from concept and development to launch and ongoing refinement, while advocating for best practices in user experience across the Studio."
logo: disney-animation
sort-order: -2
collapsed: false
---

<!-- year|poster|title — year leads so `sort` keys on it; `reverse` puts newest
     first, so rows can be added in any order. Alt text is derived from the title. -->
{% assign film-list = "(2025|zootopia2-poster.jpg|Zootopia 2),(2024|moana2-poster.jpg|Moana 2),(2023|wish-poster.jpg|Wish)" | remove: "(" | remove: ")" | split: ',' | sort | reverse %}
<p class="film-credit-label">Credited Projects</p>
<div class="film-credit-container">
  {% for film in film-list %}
  {% assign each = film | split: '|' %}
  <div class="film-credit">
    <div class="film-poster">
      <img src="/img/film-posters/{{ each[1] }}" alt="Disney's {{ each[2] }} movie poster">
    </div>
    <div class="text-container">
        <p class="film-name">{{ each[2] }}</p>
    </div>
  </div>
  {% endfor %}
</div>
