// $(document).foundation();

// Easter egg code
var pattern = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
var current = 0;

// var isEggVisable = false;
// localStorage.setItem("eggKey", isEggVisable);

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
    console.log("Konami Happened");

    isEggVisable = true;
    localStorage.setItem("eggKey", isEggVisable);
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
  var style = document.createElement('style');
  style.innerHTML =
    '.behind-the-scenes-container {' +
      'display:flex;' +
    '}';
  // Get the first script tag
  var ref = document.querySelector('script');
  // Insert our new styles before the first script tag
  ref.parentNode.insertBefore(style, ref);
}

isEgg();

// Listen for keydown events
document.addEventListener('keydown', keyHandler, false);


// Need to be able to unset the the eggKey value
