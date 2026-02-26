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
				const date = new Date(value);
				const dateEl = card.querySelector(".easter-egg-unlock-date");
				if (dateEl) {
					dateEl.textContent = "Unlocked " + date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
				}
			}
		}
	});

	document.getElementById("easter-egg-unlocked-value").innerHTML = achievementUnlockCount;
}

isAchievementUnlocked();
