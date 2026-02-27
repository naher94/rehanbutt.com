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

// TODO: Very simple and needs to be reworked
// Doesn't handle holidays that are the "third Thursday of every November" type
function holidays() {
  return {
    "1:1": "Happy New Year!",
		"1:19": "Happy National Popcorn Day! 🍿",
		"2:17": "Happy Lunar New Year!",
		"2:14": "Happy Valentine's Day ❤️",
		"2:15": "Happy National Hippo Day 🦛",
    "2:23": "Happy 'Day I Wrote This Code' Day!",
    "2:29": "Happy Leap Day!",
		"4:13": "Happy Songkran! 🇹🇭",
		"5:4": "May the 4th be with you!",
		"7:14": "Happy World Orca Day!",
		"7:22": "Happy Mango Day! 🥭",
		"8:18": "Happy World Photography Day! 📷",
		"10:31": "Happy Halloween! 🎃",
		"11:26": "Happy Thanksgiving! 🦃",
		"12:4": "Happy Hanukkah!",
    "12:25": "Merry Christmas! 🎄",
		"12:26": "Happy Kwanzaa!"
  }
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
  return holidays()[`${getMonth()}:${getDate()}`];
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