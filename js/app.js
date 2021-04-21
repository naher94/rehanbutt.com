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



const planeEmoji = document.getElementById("plane-emoji");

planeEmoji.addEventListener("mouseover", event => {
  console.log("Mouse in");
	var element = document.getElementById("plane-effect");
  element.classList.add("intro-swipe-effect");
});

planeEmoji.addEventListener("mouseout", event => {
  console.log("Mouse out");
	var element = document.getElementById("plane-effect");
  element.classList.remove("intro-swipe-effect");
});


const worldEmoji = document.getElementById("world-emoji");

worldEmoji.addEventListener("mouseover", event => {
  console.log("Mouse in");
	var element = document.getElementById("world-effect");
  element.classList.add("intro-swipe-effect");
});

worldEmoji.addEventListener("mouseout", event => {
  console.log("Mouse out");
	var element = document.getElementById("world-effect");
  element.classList.remove("intro-swipe-effect");
});


const cameraEmoji = document.getElementById("camera-emoji");

cameraEmoji.addEventListener("mouseover", event => {
  console.log("Mouse in");
	var element = document.getElementById("camera-effect");
  element.classList.add("intro-swipe-effect");
});

cameraEmoji.addEventListener("mouseout", event => {
  console.log("Mouse out");
	var element = document.getElementById("camera-effect");
  element.classList.remove("intro-swipe-effect");
});


const penguinEmoji = document.getElementById("penguin-emoji");

penguinEmoji.addEventListener("mouseover", event => {
  console.log("Mouse in");
	var element = document.getElementById("penguin-effect");
  element.classList.add("intro-swipe-effect");
});

penguinEmoji.addEventListener("mouseout", event => {
  console.log("Mouse out");
	var element = document.getElementById("penguin-effect");
  element.classList.remove("intro-swipe-effect");
});