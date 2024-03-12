//If the local storage value for each badge is true show the badge in the footer tray
function isAchievementUnlocked() {
	var achievementContainer = document.getElementById("easter-egg-achievement-container");
	let achievementUnlockCount = 0;

	if (localStorage.getItem("behindTheScenesEasterEgg") == "true") {
		achievementContainer.querySelector("#konami").classList.add("konami-unlocked");
		achievementUnlockCount++;
	}
	if (localStorage.getItem("carHornEasterEgg") == "true") {
		achievementContainer.querySelector("#car-horn").classList.add("car-horn-unlocked");
		achievementUnlockCount++;
	}
	if (localStorage.getItem("codeSnoopingEasterEgg") == "true") {
		achievementContainer.querySelector("#code-snoop").classList.add("code-snoop-unlocked");
		achievementUnlockCount++;
	}
	if (localStorage.getItem("paddingtonEasterEgg") == "true") {
		achievementContainer.querySelector("#paddington").classList.add("paddington-unlocked");
		achievementUnlockCount++;
	}
	if (localStorage.getItem("todoChecklistEasterEgg") == "true") {
		achievementContainer.querySelector("#to-dos").classList.add("todos-unlocked");
		achievementUnlockCount++;
	}
	document.getElementById("easter-egg-unlocked-value").innerHTML = achievementUnlockCount;
}

isAchievementUnlocked();