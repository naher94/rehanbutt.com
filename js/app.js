// I see you snooping in the code 😉, trying to bypass the hunt of finding all the easter eggs? That's no fun, but on the flip side you found another easter egg, SO YAY!

// Create and set a localStorage variable "codeSnoopingEasterEgg" to new Date().toISOString() to claim your achievement

function snackbar(name) {
  var x = document.getElementById("easter-egg-snackbar-container");
	x.querySelector("#achievement-name").innerHTML = name;
  x.classList.add("show");
  
  setTimeout(function () {
    x.classList.remove("show");
  }, 3000);
}

// Easter egg code
var pattern = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
var current = 0;

var keyHandler = function (event) {
	// If the key isn't in the pattern, or isn't the current key in the pattern, reset
	if (pattern.indexOf(event.key) < 0 || event.key !== pattern[current]) {
		current = 0;
		return;
	}
	// Update how much of the pattern is complete
	current++;
	// If complete, alert and reset
	if (pattern.length === current) {
		current = 0;
    isEggVisable = true;
    localStorage.setItem("eggKey", isEggVisable);
		localStorage.setItem("behindTheScenesEasterEgg", new Date().toISOString());
    setBTS();
		gtag('event', 'Easter Eggs - Konami Code', {
			'event_category': 'Special',
			'event_label': 'Konami Code'
		});
		snackbar("Konami");
	}
};

function isEgg (){
  if (localStorage.getItem("eggKey") == "true") {
    setBTS();
  }
}

function setBTS(){
  // Create our stylesheet
  var elements = document.getElementsByClassName("behind-the-scenes-container");
  for (var i = 0; i < elements.length; i++) {
    elements[i].classList.add("force-flex");
  }

  var eggBanner = document.getElementById("egg-banner");
  eggBanner.classList.add("force-flex");
}

function unsetBTS(){
  //This function should remove or update the above CSS of display to NONE
  var elements = document.getElementsByClassName("behind-the-scenes-container");
  for (var i = 0; i < elements.length; i++) {
    elements[i].classList.remove("force-flex");
  }

  var eggBanner = document.getElementById("egg-banner");
  eggBanner.classList.remove("force-flex");

  isEggVisable = false;
  localStorage.setItem("eggKey", isEggVisable);

}

function carHorn(){
	var audio = new Audio('carhorn.mp3');
	audio.play();
	localStorage.setItem("carHornEasterEgg", new Date().toISOString());
	gtag('event', 'Easter Eggs - Tesla Carhorn', {
		'event_category': 'Special',
		'event_label': 'Carhorn'
	});
	snackbar("Car Horn");
}

function paddington(){
	localStorage.setItem("paddingtonEasterEgg", new Date().toISOString());
	gtag('event', 'Easter Eggs - Qulr Paddington Bear', {
		'event_category': 'Special',
		'event_label': 'Paddington'
	});
	snackbar("Paddington");
}

function isCodeSnoop(){
	if(localStorage.getItem("codeSnoopingEasterEgg") == "true" && localStorage.getItem("CodeSnoopEventTrigger") != "true"){
		gtag('event', 'Easter Eggs - Code Snoop', {
			'event_category': 'Special',
			'event_label': 'Code Snoop'
		});
	localStorage.setItem("CodeSnoopEventTrigger", true);
	}
}

function highFive(){
	localStorage.setItem("highFiveEasterEgg", new Date().toISOString());
	gtag('event', 'Easter Eggs - High Five', {
		'event_category': 'Special',
		'event_label': 'High Five'
	});
	snackbar("High Five");
}

function speedDemon(){
	localStorage.setItem("speedDemonEasterEgg", new Date().toISOString());
	gtag('event', 'Easter Eggs - Speed Demon', {
		'event_category': 'Special',
		'event_label': 'Speed Demon'
	});
	snackbar("Speed Demon");
}

///////////////////////////////////////////// Scroll Speedometer
// Speed is in screens per second so phones and big monitors trip at the same pace.
// Only visitor-driven scrolling counts: anchor jumps and scroll restoration have no input.
(function scrollSpeedometer() {
	var SPEED_LIMIT = 6;     // screens per second, smoothed; iOS flicks peak ~4 casual, 8–9 hard
	var SUSTAIN = 150;       // ms over the limit; a flick decays fast, so a hard one only just holds this
	var INPUT_WINDOW = 1000; // ms after input still counted, covers touch momentum

	var lastInput = -Infinity;
	var lastY = window.scrollY, lastTime = performance.now();
	var speed = 0, overSince = null, ticketed = false;
	var peak = 0, peakTimer; // TEMP calibration

	// Home/End are jumps, not sprints, even when the browser animates them.
	function markInput(event) {
		if (event.key === 'Home' || event.key === 'End') return;
		lastInput = performance.now();
	}
	['wheel', 'touchstart', 'touchmove', 'touchend', 'keydown', 'mousedown'].forEach(function (type) {
		window.addEventListener(type, markInput, { passive: true });
	});

	window.addEventListener('scroll', function () {
		var now = performance.now(), dt = now - lastTime;
		var y = window.scrollY, dy = Math.abs(y - lastY);
		lastY = y; lastTime = now;

		// A pause or scroll nobody drove ends the sprint and re-arms the ticket.
		if (dt > 100 || now - lastInput > INPUT_WINDOW) {
			speed = 0; overSince = null; ticketed = false;
			return;
		}
		if (dt <= 0 || !window.innerHeight) return;

		// Smoothed so one fast frame can't write a ticket alone.
		var alpha = 1 - Math.exp(-dt / 100);
		speed += alpha * ((dy / dt) * 1000 / window.innerHeight - speed);

		// TEMP calibration: remove before merging.
		peak = Math.max(peak, speed);
		clearTimeout(peakTimer);
		peakTimer = setTimeout(function () {
			if (peak > 1) console.log('[speedometer] peak ' + peak.toFixed(1) + ' screens/s');
			peak = 0;
		}, 300);

		if (speed < SPEED_LIMIT) {
			overSince = null; ticketed = false;
		} else if (overSince === null) {
			overSince = now;
		} else if (!ticketed && now - overSince >= SUSTAIN) {
			ticketed = true;
			speedDemon();
		}
	}, { passive: true });
})();
///////////////////////////////////////////// End of Scroll Speedometer

isEgg();
isCodeSnoop();

// Listen for keydown events
document.addEventListener('keydown', keyHandler, false);

///////////////////////////////////////////// Start of Checkbox Easter Egg Message on About Page
function easterEggMessage(clickedItem){
	var easterEgg = clickedItem.children[0];
	localStorage.setItem("todoChecklistEasterEgg", new Date().toISOString());
	gtag('event', 'Easter Eggs - ToDo Check List', {
		'event_category': 'Special',
		'event_label': 'ToDo Check List'
	});
	requestAnimationFrame(function(){
		requestAnimationFrame(function(){ easterEgg.classList.add('visible'); });
	});
	setTimeout(function(){ easterEgg.classList.remove('visible'); }, 1500);
	snackbar("To Dos");
}
///////////////////////////////////////////// End of Checkbox Easter Egg Message on About Page


///////////////////////////////////////////// Happy Day Label

// Returns date name array which works with getDay() function
function dayNames() {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
}

// Every greeting, in one place. How to add one: README → Holiday Greetings.
// When two land on the same day, the one higher in the list shows.
function holidays() {
  return [
    { on: onDate(1, 1), text: "Happy New Year!" },
    { on: onDate(1, 19), text: "Happy National Popcorn Day! 🍿" },
    { on: onDate(2, 14), text: "Happy Valentine's Day! ❤️" },
    { on: onDate(2, 15), text: "Happy National Hippo Day! 🦛" },
    { on: lunarNewYear, text: "Happy Lunar New Year!" },
    { on: onDate(2, 29), text: "Happy Leap Day!" },
    { on: onDate(4, 13), text: "Happy Songkran! 🇹🇭" },
    { on: onDate(5, 4), text: "May the 4th be with you!" },
    // 6/26, after Experiment 626.
    { on: onDate(6, 26), text: "Happy Stitch Day! 💙" },
    { on: onDate(7, 14), text: "Happy World Orca Day!" },
    { on: nthWeekday(3, 0, 7), text: "Happy National Ice Cream Day! 🍦" },
    { on: onDate(7, 22), text: "Happy Mango Day! 🥭" },
    { on: onDate(8, 18), text: "Happy World Photography Day! 📷" },
    { on: onDate(10, 31), text: "Happy Halloween! 🎃" },
    { on: nthWeekday(2, 4, 11), text: "Happy World Usability Day!" },
    { on: nthWeekday(4, 4, 11), text: "Happy Thanksgiving! 🦃" },
    // Above Hanukkah so it wins when the first candle falls on Dec 25 (2024).
    { on: onDate(12, 25), text: "Merry Christmas! 🎄" },
    // The evening before 25 Kislev, when the first candle is lit.
    { on: hebrewDate("Kislev", 25, -1), text: "Happy Hanukkah!" },
    { on: onDate(12, 26), text: "Happy Kwanzaa!" }
  ];
}

// Each rule below returns a check: given a date, is the holiday on that day?

// The same month and day every year. Feb 29 only matches in leap years.
function onDate(month, day) {
  return function (date) {
    return date.getMonth() + 1 === month && date.getDate() === day;
  };
}

// The nth `weekday` (0 = Sunday) of `month`, e.g. nthWeekday(4, 4, 11) is the
// fourth Thursday of November.
function nthWeekday(n, weekday, month) {
  return function (date) {
    return date.getMonth() + 1 === month && date.getDay() === weekday &&
      Math.ceil(date.getDate() / 7) === n;
  };
}

// A day in the Hebrew calendar, shifted by `offset` days. Month names are
// Intl's English ones ("Tishri", "Kislev", "Nisan"...). Leap years have no
// plain "Adar", so "Adar" means Adar II there, where Purim is kept.
function hebrewDate(monthName, day, offset) {
  return function (date) {
    const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (offset || 0));
    const parts = calendarParts(shifted, "hebrew", "long");
    return parts !== null && parts.day === String(day) &&
      (parts.month === monthName || (monthName === "Adar" && parts.month === "Adar II"));
  };
}

// Listed, not computed: Intl's Chinese calendar is a day off in 2027 and
// 2030, when the new moon falls within minutes of midnight in Beijing.
// Past the table it falls back to Intl, which matches HKO through 2100.
function lunarNewYear(date) {
  const known = {
    2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3],
    2031: [1, 23], 2032: [2, 11], 2033: [1, 31], 2034: [2, 19], 2035: [2, 8],
    2036: [1, 28], 2037: [2, 15], 2038: [2, 4], 2039: [1, 24], 2040: [2, 12],
    2041: [2, 1], 2042: [1, 22], 2043: [2, 10], 2044: [1, 30], 2045: [2, 17],
    2046: [2, 6], 2047: [1, 26], 2048: [2, 14], 2049: [2, 2], 2050: [1, 23]
  }[date.getFullYear()];
  if (known) { return onDate(known[0], known[1])(date); }
  const parts = calendarParts(date, "chinese", "numeric");
  return parts !== null && parts.month === "1" && parts.day === "1";
}

// `date`'s month and day in another calendar, or null when the browser lacks
// it: Intl falls back to Gregorian rather than throwing.
function calendarParts(date, calendar, monthStyle) {
  const format = new Intl.DateTimeFormat("en-u-ca-" + calendar, { month: monthStyle, day: "numeric" });
  if (format.resolvedOptions().calendar !== calendar) { return null; }
  const parts = {};
  format.formatToParts(date).forEach(function (p) { parts[p.type] = p.value; });
  return parts;
}

// Returns current date object
function currentDate() {
  return new Date();
}

function getMonth() {
  return currentDate().getMonth() + 1;
}

function getDate() {
  return currentDate().getDate();
}

function getDayNumber() {
  return currentDate().getDay();
}

// Returns current day of the week name
function getDayName() {
  return dayNames()[getDayNumber()];
}

// Calculates the number of milliseconds until the next day
function millisecondsToNextDay() {
  let hoursToNextDayInMillis = (23 - currentDate().getHours()) * 60 * 60 * 1000;
  let minutesToNextHourInMillis = ((59 - currentDate().getMinutes()) * 60) * 1000;
  let secondsToNextMinuteInMillis = (59 - currentDate().getSeconds()) * 1000;
  let millisecondsToNextSecond = (1000 - currentDate().getMilliseconds());
  
  return hoursToNextDayInMillis + minutesToNextHourInMillis + secondsToNextMinuteInMillis + millisecondsToNextSecond;
}

// Returns the holiday (if any) exists for today's date
function getHolidayString() {
  const date = currentDate();
  const today = holidays().find(function (holiday) { return holiday.on(date); });
  return today ? today.text : undefined;
}

// Saved at load so footer.html stays the only place the wording lives. A
// holiday replaces the #data-day span; restoring this brings it back.
const daySentence = document.getElementById("day-sentance");
const defaultDaySentence = daySentence.innerHTML;
let nextDayTimer;

// Updates happy day string based on a variety of parameters
function getHappyDayString() {
  let holidayString = getHolidayString();

  if (holidayString != undefined) {
    daySentence.innerHTML = holidayString;
  } else {
    daySentence.innerHTML = defaultDaySentence;
    document.getElementById("data-day").innerHTML = getDayName();
  }
  
  // Resubmit timeout for live date change. Cleared first so previews from
  // the console (README → Holiday Greetings) don't stack timers.
  clearTimeout(nextDayTimer);
  nextDayTimer = setTimeout(getHappyDayString, millisecondsToNextDay());
}

getHappyDayString();
///////////////////////////////////////////// End of Happy Day Label

///////////////////////////////////////////// Send It Easter Egg
function updateSendItLabel() {
  const isSpecialDay = getMonth() === 9 && getDate() === 7;
  const label = document.getElementById("ship-it-label");
  if (label) {
    label.innerHTML = isSpecialDay ? "🧗‍♀️ Send It!" : "⛵ Ship It!";
  }
}

updateSendItLabel();
///////////////////////////////////////////// End of Send It Easter Egg

///////////////////////////////////////////// Start of Copy to Clipboard
// Without the Clipboard API (or with it denied), emails are shown in the badge
// for longer and links are offered in a prompt, to copy by hand.
function copyToClipboard(text, clickedItem) {
  function showBadge(message, holdMs, keepOnScreen) {
    // The live region goes in empty and gets its text a frame later, so
    // screen readers see a change and announce it.
    var copyBadge = document.createElement("span");
    copyBadge.classList.add("copied");
    copyBadge.setAttribute("role", "status");
    clickedItem.appendChild(copyBadge);
    requestAnimationFrame(function () {
      copyBadge.innerText = message;
      if (keepOnScreen) {
        // The 16px margin leaves room for the tilt the badge gets when visible.
        var box = copyBadge.getBoundingClientRect();
        var centre = box.left + box.width / 2;
        var half = copyBadge.offsetWidth / 2;
        var maxRight = document.documentElement.clientWidth - 16;
        var shift = Math.max(16 - (centre - half), 0) + Math.min(maxRight - (centre + half), 0);
        if (shift) { copyBadge.style.translate = shift + "px 0"; }
      }
      requestAnimationFrame(function () { copyBadge.classList.add("visible"); });
    });
    setTimeout(function () { copyBadge.classList.remove("visible"); }, holdMs);
    setTimeout(function () { copyBadge.remove(); }, holdMs + 400);
  }
  function fallback() {
    if (/^[^\s@:\/]+@[^\s@]+$/.test(text)) {
      // Longer than "Copied!", so it is held for reading and kept on screen.
      showBadge(text, 5000, true);
    } else {
      window.prompt("Copy this link:", text);
    }
  }
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    fallback();
    return;
  }
  navigator.clipboard.writeText(text).then(function () {
    showBadge("Copied!", 1500);
  }, fallback);
}
///////////////////////////////////////////// End of Copy to Clipboard

///////////////////////////////////////////// Start of Mobile Menu
// The popover is an empty state machine, so the relationship `popovertarget`
// wires up points at a div with nothing in it. `aria-controls` in the markup
// names the list that actually expands; `aria-expanded` is kept in step here.
function mobileMenu() {
  const state = document.getElementById("mobile-menu-state");
  const button = document.querySelector("[popovertarget='mobile-menu-state']");
  const links = document.getElementById("menu-links");
  if (!state || !button) { return; }

  // Stated from here rather than the markup: an explicit aria-expanded outranks
  // the browser's own, so hardcoding one would leave it lying if this never ran.
  button.setAttribute("aria-expanded", "false");

  // The popover is manual (see header.html), so Esc and outside taps are ours.
  // Taps inside .menu-container are left alone so the links can navigate.
  const container = button.closest(".menu-container");
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && state.matches(":popover-open")) {
      state.hidePopover();
      button.focus();
    }
  });
  document.addEventListener("click", function (event) {
    if (state.matches(":popover-open") && container && !container.contains(event.target)) {
      state.hidePopover();
    }
  });

  state.addEventListener("toggle", function (event) {
    const isOpen = event.newState === "open";
    button.setAttribute("aria-expanded", isOpen);
    // The links sit outside the popover, so the browser won't hand focus back
    // the way it would for content the popover actually holds.
    if (!isOpen && links && links.contains(document.activeElement)) {
      button.focus();
    }
    // Open only: the useful number is how often the menu gets reached for,
    // which is what says whether the shortcut links are doing their job.
    if (isOpen) {
      gtag('event', 'Menu Open', {
        'event_category': 'Header',
        'event_label': 'Mobile Menu'
      });
    }
  });
}

mobileMenu();
///////////////////////////////////////////// End of Mobile Menu

///////////////////////////////////////////// Start of Loop Videos
// WCAG 2.2.2: anything looping past 5s needs a way to stop it. Under reduced
// motion they start stopped. State follows the video's own events, so a
// browser that blocks autoplay still shows Play rather than a stale Pause.
function loopVideos() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".loop-video").forEach(function (wrapper) {
    const video = wrapper.querySelector("video");
    const button = wrapper.querySelector(".loop-video-toggle");
    if (!video || !button) { return; }

    function sync() {
      wrapper.classList.toggle("is-paused", video.paused);
      button.setAttribute("aria-label", video.paused ? "Play animation" : "Pause animation");
    }
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    button.addEventListener("click", function () {
      if (video.paused) {
        video.play().catch(function () {});
      } else {
        video.pause();
      }
    });

    if (reduceMotion) {
      video.removeAttribute("autoplay");
      video.pause();
    }
    sync();
    button.hidden = false;
  });
}

loopVideos();
///////////////////////////////////////////// End of Loop Videos