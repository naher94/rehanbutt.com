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
    { on: onDate(2, 14), text: "Happy Valentine's Day ❤️" },
    { on: onDate(2, 15), text: "Happy National Hippo Day 🦛" },
    { on: lunarNewYear, text: "Happy Lunar New Year!" },
    { on: onDate(2, 23), text: "Happy 'Day I Wrote This Code' Day!" },
    { on: onDate(2, 29), text: "Happy Leap Day!" },
    { on: onDate(4, 13), text: "Happy Songkran! 🇹🇭" },
    { on: onDate(5, 4), text: "May the 4th be with you!" },
    { on: onDate(7, 14), text: "Happy World Orca Day!" },
    { on: onDate(7, 22), text: "Happy Mango Day! 🥭" },
    { on: onDate(8, 18), text: "Happy World Photography Day! 📷" },
    { on: onDate(10, 31), text: "Happy Halloween! 🎃" },
    { on: nthWeekday(4, 4, 11), text: "Happy Thanksgiving! 🦃" },
    // The evening before 25 Kislev, when the first candle is lit.
    { on: hebrewDate("Kislev", 25, -1), text: "Happy Hanukkah!" },
    { on: onDate(12, 25), text: "Merry Christmas! 🎄" },
    { on: onDate(12, 26), text: "Happy Kwanzaa!" }
  ];
}

// The same month and day every year. Null when the year doesn't have it, or
// Feb 29 would roll over and greet Leap Day on Mar 1.
function onDate(month, day) {
  return function (year) {
    const date = new Date(year, month - 1, day);
    return date.getMonth() === month - 1 ? date : null;
  };
}

// The nth `weekday` (0 = Sunday) of `month`, e.g. nthWeekday(4, 4, 11) is the
// fourth Thursday of November.
function nthWeekday(n, weekday, month) {
  return function (year) {
    const first = 1 + (weekday - new Date(year, month - 1, 1).getDay() + 7) % 7;
    return new Date(year, month - 1, first + (n - 1) * 7);
  };
}

// A day in the Hebrew calendar, shifted by `offset` days. Month names are
// Intl's English ones ("Tishri", "Kislev", "Nisan"...).
function hebrewDate(monthName, day, offset) {
  return function (year) {
    const date = findCalendarDate(year, "hebrew", monthName, day);
    if (date) { date.setDate(date.getDate() + (offset || 0)); }
    return date;
  };
}

// Listed, not computed: Intl's Chinese calendar is a day late in 2027 and
// 2030, when the new moon falls within minutes of midnight in Beijing.
// Past the table it falls back to Intl, which is right most years.
function lunarNewYear(year) {
  const known = {
    2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3],
    2031: [1, 23], 2032: [2, 11], 2033: [1, 31], 2034: [2, 19], 2035: [2, 8],
    2036: [1, 28], 2037: [2, 15], 2038: [2, 4], 2039: [1, 24], 2040: [2, 12],
    2041: [2, 1], 2042: [1, 22], 2043: [2, 10], 2044: [1, 30], 2045: [2, 17],
    2046: [2, 6], 2047: [1, 26], 2048: [2, 14], 2049: [2, 2], 2050: [1, 23]
  }[year];
  return known ? new Date(year, known[0] - 1, known[1]) : findCalendarDate(year, "chinese", 1, 1);
}

// The date in `year` whose `calendar` month and day match, or null. Also null
// when the browser lacks the calendar: Intl falls back to Gregorian rather
// than throwing. Numeric months are compared as numbers, named ones by name.
function findCalendarDate(year, calendar, month, day) {
  const format = new Intl.DateTimeFormat("en-u-ca-" + calendar, { month: typeof month === "number" ? "numeric" : "long", day: "numeric" });
  if (format.resolvedOptions().calendar !== calendar) { return null; }
  // Noon, so a DST change can't push the date across midnight.
  for (let d = new Date(year, 0, 1, 12); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
    const parts = {};
    format.formatToParts(d).forEach(function (p) { parts[p.type] = p.value; });
    if (parts.month === String(month) && parts.day === String(day)) { return new Date(year, d.getMonth(), d.getDate()); }
  }
  return null;
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
  const year = currentDate().getFullYear();
  const today = holidays().find(function (holiday) {
    const date = holiday.on(year);
    return date && date.getMonth() + 1 === getMonth() && date.getDate() === getDate();
  });
  return today ? today.text : undefined;
}

// Updates happy day string based on a variety of parameters
function getHappyDayString() {
  let holidayString = getHolidayString();
  
  if (holidayString != undefined) {
    document.getElementById("day-sentance").innerHTML = holidayString;
  } else {
    document.getElementById("data-day").innerHTML = getDayName();
  }
  
  // Resubmit timeout for live date change
  setTimeout(getHappyDayString, millisecondsToNextDay());
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
function copyToClipboard(link,clickedItem) {
	if (navigator && navigator.clipboard && navigator.clipboard.writeText){
		var copyBadge = document.createElement("span");
		copyBadge.classList.add("copied");
		copyBadge.setAttribute("id", "copy-confirmation");
		copyBadge.innerText = "Copied!";
		clickedItem.appendChild(copyBadge);

    navigator.clipboard.writeText(link);
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ copyBadge.classList.add('visible'); });
    });
    setTimeout(function(){ copyBadge.classList.remove('visible'); }, 1500);
		setTimeout(function(){ copyBadge.remove(); }, 1900);
    return;
	}
  return Promise.reject('The Clipboard API is not available.');
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