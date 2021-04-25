
//Intro Section Emoji Hover Effect
const planeEmoji = document.getElementById("plane-emoji");

planeEmoji.addEventListener("mouseover", event => {
	var element = document.getElementById("plane-effect");
  element.classList.add("intro-swipe-effect");
});

planeEmoji.addEventListener("mouseout", event => {
	var element = document.getElementById("plane-effect");
  element.classList.remove("intro-swipe-effect");
});


const worldEmoji = document.getElementById("world-emoji");

worldEmoji.addEventListener("mouseover", event => {
	var element = document.getElementById("world-effect");
  element.classList.add("intro-swipe-effect");
});

worldEmoji.addEventListener("mouseout", event => {
	var element = document.getElementById("world-effect");
  element.classList.remove("intro-swipe-effect");
});


const cameraEmoji = document.getElementById("camera-emoji");

cameraEmoji.addEventListener("mouseover", event => {
	var element = document.getElementById("camera-effect");
  element.classList.add("intro-swipe-effect");
});

cameraEmoji.addEventListener("mouseout", event => {
	var element = document.getElementById("camera-effect");
  element.classList.remove("intro-swipe-effect");
});


const penguinEmoji = document.getElementById("penguin-emoji");

penguinEmoji.addEventListener("mouseover", event => {
	var element = document.getElementById("penguin-effect");
  element.classList.add("intro-swipe-effect");
});

penguinEmoji.addEventListener("mouseout", event => {
	var element = document.getElementById("penguin-effect");
  element.classList.remove("intro-swipe-effect");
});
//End of Intro Section Emoji Hover Effect