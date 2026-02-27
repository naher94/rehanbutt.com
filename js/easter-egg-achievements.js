//If the local storage value for each badge is true show the badge in the footer tray
function isAchievementUnlocked() {
	var achievementContainer = document.getElementById("easter-egg-achievement-container");
	let achievementUnlockCount = 0;

	const eggs = [
		{ id: "konami", key: "behindTheScenesEasterEgg", className: "konami-unlocked" },
		{ id: "car-horn", key: "carHornEasterEgg", className: "car-horn-unlocked" },
		{ id: "code-snoop", key: "codeSnoopingEasterEgg", className: "code-snoop-unlocked" },
		{ id: "paddington", key: "paddingtonEasterEgg", className: "paddington-unlocked" },
		{ id: "to-dos", key: "todoChecklistEasterEgg", className: "todos-unlocked" },
		{ id: "high-five", key: "highFiveEasterEgg", className: "high-five-unlocked" }
	];

	eggs.forEach(function(egg) {
		const value = localStorage.getItem(egg.key);
		if (value != null) {
			const card = achievementContainer.querySelector("#" + egg.id);
			card.classList.add(egg.className);
			achievementUnlockCount++;

			if (value !== "true") {
				card.classList.add("has-date");
				const date = new Date(value);
				const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase().replace(",", "");
				const arcText = card.querySelector(".arc-date-text");
				if (arcText) {
					arcText.textContent = formattedDate;
				}
			}
		}
	});

	document.getElementById("easter-egg-unlocked-value").innerHTML = achievementUnlockCount;
}

isAchievementUnlocked();
