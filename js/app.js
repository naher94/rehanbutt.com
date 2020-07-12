// $(document).foundation();

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
	if (pattern.length === current || window.isEggVisable == true) {
		current = 0;
		// window.alert('You found it!');
    window.isEggVisable = true;
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

};

// Listen for keydown events
document.addEventListener('keydown', keyHandler, false);
