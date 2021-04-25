// $(document).foundation();

// I see you snooping in the code 😉, trying to bypass the hunt of finding all the easter eggs? That's no fun, on the flip side you found another easter egg.. SO YAY!

// Create and set a localStorage variable "codeSnoopingEasterEgg" to true to claim your badge



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
		localStorage.setItem("behindTheScenesEasterEgg", true);
    setBTS();
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
	localStorage.setItem("carHornEasterEgg", true);
}

function paddington(){
	paddingtonAdd()
	//reveal all paddington bears

	//Set this when all Paddingtons are clicked
	if (localStorage.getItem("paddingtonCounter") >= 6) {
		localStorage.setItem("paddingtonEasterEgg", true);
	}
}

function paddingtonAdd(){
	console.log("in the add paddington function");
	var count = localStorage.getItem("paddingtonCounter")
	var newCount = parseInt(count) + 1;
	console.log(newCount);
	localStorage.setItem("paddingtonCounter", newCount);
}

function showPaddingtons(){
	//this will show all the paddington bears across the site
}

function isBadge() {
	var badgeContainerElement = document.getElementById("badge-container");
	//If the local storage value for each badge is true show the badge in the footer tray
	if (localStorage.getItem("behindTheScenesEasterEgg") == "true") {
		let string_of_html = `
			<div class="cell small-4 large-2">
				<img src="../img/badges/behindthescenes.png" alt="Behind the Scenes Badge">
				<p>Behind the Scenes Easter Egg</p>
			</div>
		`;
		badgeContainerElement.innerHTML += string_of_html;
  }
	if (localStorage.getItem("carHornEasterEgg") == "true") {
		let string_of_html = `
			<div class="cell small-4 large-2">
				<img src="../img/badges/carhorn.png" alt="Car Horn Badge">
				<p>Car Horn Easter Egg</p>
			</div>
		`;
		badgeContainerElement.innerHTML += string_of_html;
  }
	if (localStorage.getItem("paddingtonEasterEgg") == "true") {
		let string_of_html = `
			<div class="cell small-4 large-2">
				<img src="../img/badges/paddington.png" alt="Paddington Badge">
				<p>Paddington Bear Easter Egg</p>
			</div>
		`;
		badgeContainerElement.innerHTML += string_of_html;
  }
	if (localStorage.getItem("codeSnoopingEasterEgg") == "true") {
		let string_of_html = `
			<div class="cell small-4 large-2">
				<img src="../img/badges/code.png" alt="Code Snooping Badge">
				<p>Code Snooping Easter Egg</p>
			</div>
		`;
		badgeContainerElement.innerHTML += string_of_html;
  }
}

isEgg();
isBadge();

// Listen for keydown events
document.addEventListener('keydown', keyHandler, false);




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
    "2:23": "Happy 'Day I Wrote This Code' Day!",
    "2:29": "Happy Leap Day!",
		"7:22": "Happy Mango Day! 🥭",
    "12:25": "Merry Christmas!"
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