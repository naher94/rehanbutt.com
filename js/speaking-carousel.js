/**
 * Speaking Section Drop-Settle-Stack Carousel
 *
 * Two independent carousel slots that cycle through speaking event photos
 * with a drop-settle-stack transition. The slots are staggered so they
 * don't transition simultaneously.
 */
(function () {
  'use strict';

  // ── Configuration ──
  var CYCLE_INTERVAL = 7000;
  var STAGGER_OFFSET = 2000;
  var CLEANUP_DELAY = 900;

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
    container.setAttribute('data-transition', 'drop-settle-stack');

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

    slots.push({
      container: container,
      slides: shuffledSlides,
      label: label,
      currentIndex: 0,
      timerId: null,
      running: false
    });
  }

  function advanceSlot(slot) {
    var current = slot.slides[slot.currentIndex];
    slot.currentIndex = (slot.currentIndex + 1) % slot.slides.length;
    var next = slot.slides[slot.currentIndex];

    // ── Core transition ──
    current.classList.add('is-exiting');
    current.classList.remove('is-visible');
    next.classList.add('is-visible');
    next.classList.add('is-entering');

    // ── Cleanup after transition completes ──
    setTimeout(function () {
      current.classList.remove('is-exiting');
      next.classList.remove('is-entering');
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

  function scheduleNext(slot) {
    slot.timerId = setTimeout(function () {
      advanceSlot(slot);
      if (slot.running) scheduleNext(slot);
    }, CYCLE_INTERVAL);
  }

  function startSlot(slot, delay) {
    if (slot.running) return;
    slot.running = true;
    slot.timerId = setTimeout(function () {
      advanceSlot(slot);
      if (slot.running) scheduleNext(slot);
    }, delay);
  }

  function stopSlot(slot) {
    slot.running = false;
    if (slot.timerId) {
      clearTimeout(slot.timerId);
      slot.timerId = null;
    }
  }

  function startAll() {
    for (var i = 0; i < slots.length; i++) {
      startSlot(slots[i], CYCLE_INTERVAL + (i * STAGGER_OFFSET));
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
