/**
 * Speaking Section Crossfade Carousel
 *
 * Two independent carousel slots that cycle through speaking event photos
 * with configurable transition effects. The slots are staggered so they
 * don't transition simultaneously.
 *
 * Change TRANSITION_EFFECT to switch between effects:
 *   crossfade | scale-fade | blur-crossfade | shuffle |
 *   slide-reveal | ken-burns | flip | drop-settle | drop-settle-card |
 *   drop-settle-stack | rotation-swap
 */
(function () {
  'use strict';

  // ── Configuration ──
  var TRANSITION_EFFECT = 'drop-settle-stack';
  var CYCLE_INTERVAL = 7000;
  var STAGGER_OFFSET = 2000;
  var CLEANUP_DELAY = 900;

  // Force simplest effect if user prefers reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    TRANSITION_EFFECT = 'crossfade';
  }

  var carousels = document.querySelectorAll('.speaking-carousel');
  if (!carousels.length) return;

  function shuffle(array) {
    var i, j, temp;
    for (i = array.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  var slots = [];

  for (var c = 0; c < carousels.length; c++) {
    var container = carousels[c];
    var slides = container.querySelectorAll('.carousel-slide');
    if (slides.length <= 1) continue;

    // Set transition effect attribute for CSS targeting
    container.setAttribute('data-transition', TRANSITION_EFFECT);

    var slideArray = Array.prototype.slice.call(slides);
    shuffle(slideArray);

    for (var s = 0; s < slideArray.length; s++) {
      container.appendChild(slideArray[s]);
    }

    var shuffledSlides = container.querySelectorAll('.carousel-slide');
    for (var k = 0; k < shuffledSlides.length; k++) {
      if (k === 0) {
        shuffledSlides[k].classList.add('is-visible');
      } else {
        shuffledSlides[k].classList.remove('is-visible');
      }
    }

    var label = container.querySelector('.image-label');
    var firstImg = shuffledSlides[0].querySelector('img');
    if (label && firstImg) {
      label.textContent = firstImg.getAttribute('data-label') || '';
    }

    // Read the parent container's base rotation for rotation-swap effect
    var parentEl = container.closest('.speaking-image-container');
    var baseRot = 0;
    if (parentEl) {
      var rotVal = getComputedStyle(parentEl).rotate;
      if (rotVal && rotVal !== 'none') {
        baseRot = parseFloat(rotVal) || 0;
      }
    }

    slots.push({
      container: container,
      parent: parentEl,
      slides: shuffledSlides,
      label: label,
      currentIndex: 0,
      intervalId: null,
      baseRotation: baseRot,
      currentRotation: baseRot,
      rotationDirection: 1
    });
  }

  function advanceSlot(slot) {
    var effect = slot.container.getAttribute('data-transition') || 'crossfade';
    var current = slot.slides[slot.currentIndex];
    slot.currentIndex = (slot.currentIndex + 1) % slot.slides.length;
    var next = slot.slides[slot.currentIndex];

    // ── Effect-specific pre-transition logic ──
    if (effect === 'shuffle') {
      current.style.zIndex = '1';
      next.style.zIndex = '2';
    }

    if (effect === 'rotation-swap' && slot.parent) {
      slot.currentRotation += (3 * slot.rotationDirection);
      if (Math.abs(slot.currentRotation - slot.baseRotation) > 9) {
        slot.rotationDirection *= -1;
      }
      slot.parent.style.rotate = slot.currentRotation + 'deg';
    }

    // ── Core transition ──
    current.classList.add('is-exiting');
    current.classList.remove('is-visible');
    next.classList.add('is-visible');

    if (effect === 'drop-settle' || effect === 'drop-settle-card' || effect === 'drop-settle-stack') {
      next.classList.add('is-entering');
    }

    // ── Cleanup after transition completes ──
    setTimeout(function () {
      current.classList.remove('is-exiting');
      if (effect === 'shuffle') {
        current.style.zIndex = '';
        next.style.zIndex = '';
      }
      if (effect === 'drop-settle' || effect === 'drop-settle-card' || effect === 'drop-settle-stack') {
        next.classList.remove('is-entering');
      }
    }, CLEANUP_DELAY);

    // ── Label update ──
    if (slot.label) {
      var nextImg = next.querySelector('img');
      var newText = nextImg ? nextImg.getAttribute('data-label') : '';
      if (newText !== slot.label.textContent) {
        slot.label.classList.add('label-fading');
        setTimeout(function () {
          slot.label.textContent = newText;
          slot.label.classList.remove('label-fading');
        }, 300);
      }
    }
  }

  function startSlot(slot) {
    if (slot.intervalId) return;
    slot.intervalId = setInterval(function () {
      advanceSlot(slot);
    }, CYCLE_INTERVAL);
  }

  function stopSlot(slot) {
    if (slot.intervalId) {
      clearInterval(slot.intervalId);
      slot.intervalId = null;
    }
  }

  function startAll() {
    for (var i = 0; i < slots.length; i++) {
      (function (index) {
        var delay = index * STAGGER_OFFSET;
        setTimeout(function () {
          startSlot(slots[index]);
        }, delay);
      })(i);
    }
  }

  function stopAll() {
    for (var i = 0; i < slots.length; i++) {
      stopSlot(slots[i]);
    }
  }

  if ('IntersectionObserver' in window) {
    var speakingSection = document.querySelector('.speaking-container');
    if (speakingSection) {
      var observer = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          if (entries[e].isIntersecting) {
            startAll();
          } else {
            stopAll();
          }
        }
      }, {
        threshold: 0.2
      });
      observer.observe(speakingSection);
    } else {
      startAll();
    }
  } else {
    startAll();
  }
})();
