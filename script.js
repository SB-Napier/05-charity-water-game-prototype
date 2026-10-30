// Find the page elements that the Start Game button needs to update.
const startGameButton = document.querySelector('#start-game-button');
const welcomeScreen = document.querySelector('#welcome-screen');
const gameArea = document.querySelector('#game-area');
const currentLevelName = document.querySelector('#current-level-name');
const levelInstructions = document.querySelector('#level-instructions');
const scoreDisplay = document.querySelector('#score');
const activityContent = document.querySelector('#activity-content');
const feedbackMessage = document.querySelector('#feedback-message');
const nextLevelButton = document.querySelector('#next-level-button');

// Keep track of which level the player is on.
let currentLevel = 0;
let score = 0;
let dropsCollected = 0;
const totalDrops = 10;

// Level 2 "Save the Drop" settings and state.
const cleanDropsNeeded = 5;     // clean drops to catch to finish the level
const dropSize = 32;            // drop width/height in pixels (matches the CSS)
const bucketHeight = 40;        // bucket height in pixels (matches the CSS)
const bucketSpeed = 6;          // pixels the bucket moves each tick while a control is held
const dropSpeed = 4;            // pixels a drop falls each tick
const tickMilliseconds = 30;    // how often the game loop runs
const spawnEveryTicks = 30;     // a new drop appears about every 0.9 seconds
let cleanDropsCaught = 0;
let bucketX = 0;                // left edge of the bucket in pixels
let bucketDirection = 0;        // -1 = moving left, 0 = still, 1 = moving right
let fallingDrops = [];          // each item: { element, x, y, type }
let ticksSinceSpawn = 0;
let levelTwoTimer = null;       // the ONE game loop timer (null when not running)
let levelTwoComplete = false;

// Level 3 trivia questions, each with three answer options.
const levelThreeQuestions = [
	{
		question: 'Approximately how many people globally lacked safely managed drinking water in 2022?',
		options: [
			{ letter: 'A', text: 'About 1 in 10 people' },
			{ letter: 'B', text: 'About 1 in 4 people' },
			{ letter: 'C', text: 'About 1 in 2 people' }
		],
		correctAnswer: 'B',
		feedback: 'Approximately 2.2 billion people lacked safely managed drinking water in 2022, roughly one in four people worldwide.'
	},
	{
		question: 'Which action can help communities gain more reliable access to clean water?',
		options: [
			{ letter: 'A', text: 'Investing in sustainable water infrastructure' },
			{ letter: 'B', text: 'Ignoring damaged water systems' },
			{ letter: 'C', text: 'Allowing water sources to become polluted' }
		],
		correctAnswer: 'A',
		feedback: 'Reliable water services depend on infrastructure, maintenance, and effective management.'
	},
	{
		question: 'Why is access to safe drinking water important?',
		options: [
			{ letter: 'A', text: 'It only matters in rural communities' },
			{ letter: 'B', text: 'It supports health, hygiene, and well-being' },
			{ letter: 'C', text: 'It eliminates the need for sanitation services' }
		],
		correctAnswer: 'B',
		feedback: 'Safe drinking water is essential for health and supports effective hygiene and sanitation.'
	}
];
let currentQuestionIndex = 0;
let currentQuestionAnswered = false;
let levelThreeComplete = false;

// Level 4 water-management settings.
const totalWaterSupply = 20;
const levelFourNeeds = [
	{ id: 'drinking', label: 'Drinking', minimum: 6 },
	{ id: 'cooking', label: 'Cooking', minimum: 4 },
	{ id: 'cleaning', label: 'Cleaning', minimum: 4 }
];
// How many units the player has given to each need so far.
let levelFourAllocations = { drinking: 0, cooking: 0, cleaning: 0 };
let levelFourComplete = false;

// Keep the next-level button hidden until the player collects every drop.
nextLevelButton.hidden = true;
nextLevelButton.disabled = true;

// Create a fresh set of drops and reset Level 1's score and feedback.
function startLevelOne() {
	welcomeScreen.hidden = true;
	gameArea.hidden = false;

	currentLevel = 1;
	currentLevelName.textContent = 'Collect the Drop';
	levelInstructions.textContent = 'Click the water drops to collect points and help bring clean water within reach.';
	score = 0;
	dropsCollected = 0;
	stopLevelTwoGame();
	levelTwoComplete = false;
	// Restarting the game also resets Level 3 progress.
	currentQuestionIndex = 0;
	currentQuestionAnswered = false;
	levelThreeComplete = false;
	levelFourAllocations = { drinking: 0, cooking: 0, cleaning: 0 };
	levelFourComplete = false;
	scoreDisplay.textContent = '0';
	feedbackMessage.textContent = '';
	nextLevelButton.hidden = true;
	nextLevelButton.disabled = true;
	activityContent.replaceChildren();

	for (let dropNumber = 1; dropNumber <= totalDrops; dropNumber++) {
		const dropButton = document.createElement('button');
		dropButton.type = 'button';
		dropButton.textContent = '💧';
		dropButton.setAttribute('aria-label', `Collect water drop ${dropNumber}`);
		activityContent.appendChild(dropButton);
	}
}

// Collect a drop once, update the score, and finish the level at ten drops.
function collectWaterDrop(event) {
	const clickedDrop = event.target.closest('button');

	if (currentLevel !== 1 || !clickedDrop || clickedDrop.disabled || dropsCollected >= totalDrops) {
		return;
	}

	clickedDrop.disabled = true;
	dropsCollected += 1;
	score += 1;
	scoreDisplay.textContent = score;

	if (dropsCollected === totalDrops) {
		feedbackMessage.textContent = 'Congratulations! You collected all 10 water drops and completed Level 1.';
		nextLevelButton.hidden = false;
		nextLevelButton.disabled = false;
	}
}

// Stop the Level 2 loop and remove the keyboard listeners. Safe to call at any time.
function stopLevelTwoGame() {
	clearInterval(levelTwoTimer);
	levelTwoTimer = null;
	bucketDirection = 0;
	fallingDrops = [];
	document.removeEventListener('keydown', handleLevelTwoKeyDown);
	document.removeEventListener('keyup', handleLevelTwoKeyUp);
}

// Arrow keys set the direction the bucket moves.
function handleLevelTwoKeyDown(event) {
	if (event.key === 'ArrowLeft') {
		bucketDirection = -1;
		event.preventDefault();
	} else if (event.key === 'ArrowRight') {
		bucketDirection = 1;
		event.preventDefault();
	}
}

// Letting go of an arrow key stops the bucket.
function handleLevelTwoKeyUp(event) {
	if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
		bucketDirection = 0;
	}
}

// Move the bucket, but keep it inside the play area.
function moveBucket(amount) {
	const playArea = document.querySelector('#play-area');
	const bucket = document.querySelector('#bucket');

	if (!playArea || !bucket) {
		return;
	}

	const farRight = playArea.clientWidth - bucket.offsetWidth;
	bucketX = Math.min(Math.max(bucketX + amount, 0), farRight);
	bucket.style.left = `${bucketX}px`;
}

// Create one clean or contaminated drop at a random horizontal position.
function spawnDrop() {
	const playArea = document.querySelector('#play-area');
	const type = Math.random() < 0.6 ? 'clean' : 'contaminated';
	const element = document.createElement('div');
	element.className = `falling-drop ${type}-drop`;
	element.textContent = type === 'clean' ? '💧' : '☠️';
	const x = Math.random() * (playArea.clientWidth - dropSize);
	element.style.left = `${x}px`;
	element.style.top = '0px';
	playArea.appendChild(element);
	fallingDrops.push({ element: element, x: x, y: 0, type: type });
}

// Remove a drop from the screen and from our list so it can never score twice.
function removeDrop(drop) {
	drop.element.remove();
	fallingDrops = fallingDrops.filter(function (item) {
		return item !== drop;
	});
}

// How many clean drops finish the catching game (Level 5 uses a shorter version).
function getCleanDropGoal() {
	return currentLevel === 5 ? levelFiveCatchGoal : cleanDropsNeeded;
}

// Apply the result of catching one drop.
function catchDrop(drop) {
	removeDrop(drop);

	if (drop.type === 'clean') {
		cleanDropsCaught += 1;
		score += 1;
		scoreDisplay.textContent = score;
		document.querySelector('#clean-drop-count').textContent = `Clean drops: ${cleanDropsCaught}/${getCleanDropGoal()}`;
		feedbackMessage.textContent = 'Nice catch! Clean water saved.';

		if (cleanDropsCaught >= getCleanDropGoal()) {
			if (currentLevel === 5) {
				finishLevelFiveCatching();
			} else {
				finishLevelTwo();
			}
		}
	} else {
		// Math.max keeps the score from going below zero.
		score = Math.max(0, score - 1);
		scoreDisplay.textContent = score;
		feedbackMessage.textContent = 'Oops! That was contaminated water. Avoid it and catch only the clean drops.';
	}
}

// One step of the game: move the bucket, spawn drops, move drops, check for catches and misses.
function levelTwoTick() {
	const playArea = document.querySelector('#play-area');

	// The loop only runs in Level 2, or in Level 5 stage 2 until that stage is done.
	const loopAllowed = (currentLevel === 2 && !levelTwoComplete) || (currentLevel === 5 && levelFiveStage === 2 && !levelFiveStageDone);

	if (!loopAllowed || !playArea) {
		stopLevelTwoGame();
		return;
	}

	moveBucket(bucketDirection * bucketSpeed);

	ticksSinceSpawn += 1;
	if (ticksSinceSpawn >= spawnEveryTicks) {
		ticksSinceSpawn = 0;
		spawnDrop();
	}

	const bucketTop = playArea.clientHeight - bucketHeight;
	const bucketWidth = document.querySelector('#bucket').offsetWidth;

	// Loop over a copy because drops are removed while we loop.
	for (const drop of fallingDrops.slice()) {
		drop.y += dropSpeed;
		drop.element.style.top = `${drop.y}px`;

		const touchesBucketHeight = drop.y + dropSize >= bucketTop;
		const overlapsBucket = drop.x + dropSize > bucketX && drop.x < bucketX + bucketWidth;

		if (touchesBucketHeight && overlapsBucket) {
			catchDrop(drop);
			// Stop checking if that catch finished the level or stage.
			if (levelTwoComplete || levelFiveStageDone) {
				return;
			}
		} else if (drop.y > playArea.clientHeight) {
			// Missed: just remove it.
			removeDrop(drop);
		}
	}
}

// Finish Level 5 stage 2: stop the loop, clear drops, then give the stage result.
function finishLevelFiveCatching() {
	if (levelFiveStageDone) {
		return;
	}

	stopLevelTwoGame();
	for (const drop of document.querySelectorAll('.falling-drop')) {
		drop.remove();
	}
	// Points were already awarded per clean drop, so the stage bonus is 0.
	completeLevelFiveStage(0, 'You caught all the clean water.');
}

// End the level once, stop all gameplay, and unlock Continue.
function finishLevelTwo() {
	if (levelTwoComplete) {
		return;
	}

	levelTwoComplete = true;
	stopLevelTwoGame();
	for (const drop of document.querySelectorAll('.falling-drop')) {
		drop.remove();
	}
	feedbackMessage.textContent = 'Great job! You caught 5 clean drops and completed Level 2.';
	nextLevelButton.hidden = false;
	nextLevelButton.disabled = false;
}

// Build the play area, bucket, and left/right buttons.
function showLevelTwoGame(container = activityContent) {
	const content = document.createElement('div');
	content.className = 'scenario-content';
	content.innerHTML = `
		<p class="question-counter" id="clean-drop-count" role="status">Clean drops: 0/${getCleanDropGoal()}</p>
		<div id="play-area" class="play-area">
			<div id="bucket" class="bucket" role="img" aria-label="Water bucket">🪣</div>
		</div>
		<div class="bucket-controls">
			<button type="button" id="move-left-button" aria-label="Move bucket left">◀</button>
			<button type="button" id="move-right-button" aria-label="Move bucket right">▶</button>
		</div>
	`;
	container.replaceChildren(content);

	// Start the bucket in the middle of the play area.
	const playArea = document.querySelector('#play-area');
	const bucket = document.querySelector('#bucket');
	bucketX = (playArea.clientWidth - bucket.offsetWidth) / 2;
	bucket.style.left = `${bucketX}px`;

	// Holding a touch/mouse button moves the bucket; letting go stops it.
	for (const [id, direction] of [['#move-left-button', -1], ['#move-right-button', 1]]) {
		const button = document.querySelector(id);
		button.addEventListener('pointerdown', function () {
			bucketDirection = direction;
		});
		for (const stopEvent of ['pointerup', 'pointerleave', 'pointercancel']) {
			button.addEventListener(stopEvent, function () {
				bucketDirection = 0;
			});
		}
		// Keyboard activation (Enter/Space) has no pointer events, so move one step.
		button.addEventListener('click', function (event) {
			if (event.detail === 0) {
				moveBucket(direction * bucketSpeed * 5);
			}
		});
	}
}

// Start Level 2 only after all of the Level 1 drops have been collected.
function startLevelTwo() {
	if (currentLevel !== 1 || dropsCollected !== totalDrops) {
		return;
	}

	currentLevel = 2;
	currentLevelName.textContent = 'Level 2: Save the Drop';
	levelInstructions.textContent = 'Catch 5 clean water drops 💧 and avoid contaminated water ☠️. Move the bucket with the left and right arrow keys or the buttons.';
	levelTwoComplete = false;
	cleanDropsCaught = 0;
	ticksSinceSpawn = 0;
	feedbackMessage.textContent = '';
	nextLevelButton.hidden = true;
	nextLevelButton.disabled = true;

	startCatchingGame(activityContent);
}

// Draw the catching game and start its single loop (used by Level 2 and Level 5 stage 2).
function startCatchingGame(container) {
	// Clear any old loop first so two loops can never run at once.
	stopLevelTwoGame();
	showLevelTwoGame(container);
	document.addEventListener('keydown', handleLevelTwoKeyDown);
	document.addEventListener('keyup', handleLevelTwoKeyUp);
	levelTwoTimer = setInterval(levelTwoTick, tickMilliseconds);
}

// Draw the current trivia question, the question counter, and the answer buttons.
function showLevelThreeQuestion() {
	const triviaQuestion = levelThreeQuestions[currentQuestionIndex];
	const questionContent = document.createElement('div');
	questionContent.className = 'scenario-content';

	const counter = document.createElement('p');
	counter.className = 'question-counter';
	counter.textContent = `Question ${currentQuestionIndex + 1} of ${levelThreeQuestions.length}`;
	questionContent.appendChild(counter);

	const question = document.createElement('h4');
	question.className = 'scenario-question';
	question.textContent = triviaQuestion.question;
	questionContent.appendChild(question);

	const answerOptions = document.createElement('div');
	answerOptions.className = 'answer-options';

	for (const option of triviaQuestion.options) {
		const answerButton = document.createElement('button');
		answerButton.type = 'button';
		answerButton.className = 'answer-button';
		answerButton.dataset.answer = option.letter;
		answerButton.textContent = `${option.letter}: ${option.text}`;
		answerOptions.appendChild(answerButton);
	}

	questionContent.appendChild(answerOptions);
	activityContent.replaceChildren(questionContent);
	currentQuestionAnswered = false;
}

// Start Level 3 (keeps the existing score) after Level 2 is complete.
function startLevelThree() {
	if (currentLevel !== 2 || !levelTwoComplete) {
		return;
	}

	currentLevel = 3;
	currentLevelName.textContent = 'Level 3: Water Crisis Trivia';
	levelInstructions.textContent = 'Answer each trivia question to learn more about the global water crisis.';
	currentQuestionIndex = 0;
	currentQuestionAnswered = false;
	levelThreeComplete = false;
	feedbackMessage.textContent = '';
	nextLevelButton.hidden = true;
	nextLevelButton.disabled = true;
	showLevelThreeQuestion();
}

// Check an answer: wrong answers can be retried, right answers earn 1 point once.
function answerLevelThreeQuestion(event) {
	const answerButton = event.target.closest('.answer-button');

	if (currentLevel !== 3 || !answerButton || currentQuestionAnswered || levelThreeComplete) {
		return;
	}

	const triviaQuestion = levelThreeQuestions[currentQuestionIndex];

	if (answerButton.dataset.answer !== triviaQuestion.correctAnswer) {
		// No points are lost, and the same question stays on screen.
		feedbackMessage.textContent = `Not quite. ${triviaQuestion.feedback} Try again!`;
		return;
	}

	// Lock the question first so it can never award a second point.
	currentQuestionAnswered = true;
	score += 1;
	scoreDisplay.textContent = score;

	if (currentQuestionIndex === levelThreeQuestions.length - 1) {
		levelThreeComplete = true;
		feedbackMessage.textContent = `Correct! ${triviaQuestion.feedback} Congratulations! You completed Level 3.`;
		nextLevelButton.hidden = false;
		nextLevelButton.disabled = false;
		return;
	}

	feedbackMessage.textContent = `Correct! ${triviaQuestion.feedback}`;
	currentQuestionIndex += 1;
	showLevelThreeQuestion();
}

// Add up all of the units the player has allocated so far.
function getTotalAllocated() {
	return levelFourAllocations.drinking + levelFourAllocations.cooking + levelFourAllocations.cleaning;
}

// Level 4 locks when it is complete; Level 5 stage 4 locks when that stage is complete.
function isAllocationLocked() {
	return currentLevel === 5 ? levelFiveStageDone : levelFourComplete;
}

// Refresh every number on screen and enable or disable the +/- buttons.
function updateLevelFourDisplay() {
	const remaining = totalWaterSupply - getTotalAllocated();
	document.querySelector('#remaining-water').textContent = remaining;

	for (const need of levelFourNeeds) {
		const amount = levelFourAllocations[need.id];
		document.querySelector(`#allocation-${need.id}`).textContent = amount;
		// Cannot go below 0, and cannot add when no water is left or the level is done.
		document.querySelector(`[data-need="${need.id}"][data-change="-1"]`).disabled = amount === 0 || isAllocationLocked();
		document.querySelector(`[data-need="${need.id}"][data-change="1"]`).disabled = remaining === 0 || isAllocationLocked();
	}

	document.querySelector('#submit-allocation-button').disabled = isAllocationLocked();
}

// Build the Level 4 controls once, then show the starting allocations.
// The container is where the controls are drawn (Level 4 uses the whole activity area).
function showLevelFourActivity(container = activityContent) {
	const content = document.createElement('div');
	content.className = 'scenario-content';

	const supply = document.createElement('p');
	supply.className = 'water-summary';
	supply.innerHTML = `Starting water supply: <strong>${totalWaterSupply} units</strong>. Remaining: <strong id="remaining-water"></strong> units.`;
	content.appendChild(supply);

	for (const need of levelFourNeeds) {
		const row = document.createElement('div');
		row.className = 'allocation-row';

		const label = document.createElement('span');
		label.className = 'allocation-label';
		label.textContent = `${need.label} (minimum ${need.minimum})`;

		const minusButton = document.createElement('button');
		minusButton.type = 'button';
		minusButton.className = 'allocation-button';
		minusButton.dataset.need = need.id;
		minusButton.dataset.change = '-1';
		minusButton.textContent = '−';
		minusButton.setAttribute('aria-label', `Decrease ${need.label.toLowerCase()} water`);

		const amount = document.createElement('output');
		amount.id = `allocation-${need.id}`;
		amount.className = 'allocation-amount';

		const plusButton = document.createElement('button');
		plusButton.type = 'button';
		plusButton.className = 'allocation-button';
		plusButton.dataset.need = need.id;
		plusButton.dataset.change = '1';
		plusButton.textContent = '+';
		plusButton.setAttribute('aria-label', `Increase ${need.label.toLowerCase()} water`);

		row.append(label, minusButton, amount, plusButton);
		content.appendChild(row);
	}

	const submitButton = document.createElement('button');
	submitButton.type = 'button';
	submitButton.id = 'submit-allocation-button';
	submitButton.textContent = 'Submit Allocation';
	content.appendChild(submitButton);

	container.replaceChildren(content);
	updateLevelFourDisplay();
}

// Start Level 4 (keeps the existing score) after Level 3 is complete.
function startLevelFour() {
	if (currentLevel !== 3 || !levelThreeComplete) {
		return;
	}

	currentLevel = 4;
	currentLevelName.textContent = 'Level 4: Every Drop Counts';
	levelInstructions.textContent = 'Share the community\'s 20 units of water. Use + and - to set each allocation, then submit.';
	// Starting (or restarting) the level always begins with empty allocations.
	levelFourAllocations = { drinking: 0, cooking: 0, cleaning: 0 };
	levelFourComplete = false;
	feedbackMessage.textContent = '';
	nextLevelButton.hidden = true;
	nextLevelButton.disabled = true;
	showLevelFourActivity();
}

// Handle clicks on the + / - buttons and on Submit Allocation.
function handleLevelFourClick(event) {
	const clickedButton = event.target.closest('button');

	if ((currentLevel !== 4 && currentLevel !== 5) || !clickedButton || isAllocationLocked()) {
		return;
	}

	if (clickedButton.id === 'submit-allocation-button') {
		submitAllocation();
		return;
	}

	if (!clickedButton.dataset.need) {
		return;
	}

	const need = clickedButton.dataset.need;
	const change = Number(clickedButton.dataset.change);
	const newAmount = levelFourAllocations[need] + change;

	// Never go below 0 and never let the total pass the water supply.
	if (newAmount < 0 || getTotalAllocated() + change > totalWaterSupply) {
		return;
	}

	levelFourAllocations[need] = newAmount;
	feedbackMessage.textContent = '';
	updateLevelFourDisplay();
}

// Check the minimums. Success awards 3 points once; otherwise explain what is missing.
function submitAllocation() {
	const missing = [];

	for (const need of levelFourNeeds) {
		const shortage = need.minimum - levelFourAllocations[need.id];
		if (shortage > 0) {
			missing.push(`${need.label} needs ${shortage} more unit${shortage === 1 ? '' : 's'} (minimum ${need.minimum})`);
		}
	}

	if (missing.length > 0) {
		feedbackMessage.textContent = `Not yet. ${missing.join('; ')}. Adjust your allocations and submit again.`;
		return;
	}

	// In Level 5 the stage handles its own bonus and wave growth.
	if (currentLevel === 5) {
		completeLevelFiveStage(3, 'You met all the minimum needs for drinking, cooking, and cleaning.');
		return;
	}

	// Lock the level first so the points can only be awarded once.
	levelFourComplete = true;
	score += 3;
	scoreDisplay.textContent = score;
	feedbackMessage.textContent = 'Success! You met the community\'s essential water needs for drinking, cooking, and cleaning. Congratulations! You completed Level 4.';
	updateLevelFourDisplay();
	nextLevelButton.hidden = false;
	nextLevelButton.disabled = false;
}

// Level 5 settings and progress.
// Stage 3 uses a new question (not one already used in Level 3).
const levelFiveQuestion = {
	question: 'How does having safe drinking water close to home help a community?',
	options: [
		{ letter: 'A', text: 'People can spend less time collecting water and more time on school, work, and health.' },
		{ letter: 'B', text: 'It makes clean water unnecessary for cooking.' },
		{ letter: 'C', text: 'It only helps people who live in big cities.' }
	],
	correctAnswer: 'A',
	feedback: 'Safe water close to home saves time, improves health, and gives people more opportunity.'
};
// Stage 2 drops: clean water is safe to catch, contaminated water is not.
const levelFiveStageNames = ['Collect the Drop', 'Save the Drop', 'Water Crisis Trivia', 'Every Drop Counts'];
let levelFiveStage = 1;          // which stage (1-4) the player is on
let levelFiveStageDone = false;  // true once the current stage is finished (blocks repeat points)
let levelFiveDropsCollected = 0; // stage 1 progress
const levelFiveCatchGoal = 3;    // clean drops to catch in stage 2

// Build the Level 5 layout once: wave, stage tracker, and an area for the current stage.
function startLevelFive() {
	if (currentLevel !== 4 || !levelFourComplete) {
		return;
	}

	currentLevel = 5;
	currentLevelName.textContent = 'Level 5: Make Waves';
	levelInstructions.textContent = 'Small actions combine into a bigger wave of change. Complete all four stages!';
	levelFiveStage = 1;
	levelFiveStageDone = false;
	levelFiveDropsCollected = 0;
	feedbackMessage.textContent = '';
	nextLevelButton.hidden = true;
	nextLevelButton.disabled = true;

	const layout = document.createElement('div');
	layout.className = 'scenario-content';
	layout.innerHTML = `
		<div id="wave-visual" class="wave-visual" role="img" aria-label="Wave progress: 0 of 4 stages complete">
			<div id="wave-water" class="wave-water"></div>
		</div>
		<p id="stage-progress" class="question-counter"></p>
		<div id="stage-area"></div>
	`;
	activityContent.replaceChildren(layout);
	showLevelFiveStage();
}

// Make the wave taller after every completed stage (CSS transitions animate the change).
function updateWave() {
	const completed = levelFiveStageDone ? levelFiveStage : levelFiveStage - 1;
	const wave = document.querySelector('#wave-visual');
	const water = document.querySelector('#wave-water');
	water.style.height = `${completed * 25}%`;
	wave.setAttribute('aria-label', `Wave progress: ${completed} of 4 stages complete`);
	// The final wave gets an extra celebration style.
	wave.classList.toggle('wave-final', completed === 4);
}

// Draw the current stage's activity.
function showLevelFiveStage() {
	const stageArea = document.querySelector('#stage-area');
	levelFiveStageDone = false;
	document.querySelector('#stage-progress').textContent = `Stage ${levelFiveStage} of 4: ${levelFiveStageNames[levelFiveStage - 1]}`;
	updateWave();

	if (levelFiveStage === 1) {
		// Stage 1: three clickable drops, like Level 1.
		levelFiveDropsCollected = 0;
		feedbackMessage.textContent = 'Click the 3 clean water drops to collect them.';
		const drops = document.createElement('div');
		drops.className = 'stage-drops';
		for (let dropNumber = 1; dropNumber <= 3; dropNumber++) {
			const dropButton = document.createElement('button');
			dropButton.type = 'button';
			dropButton.dataset.stageDrop = 'clean';
			dropButton.textContent = '💧';
			dropButton.setAttribute('aria-label', `Collect clean water drop ${dropNumber}`);
			drops.appendChild(dropButton);
		}
		stageArea.replaceChildren(drops);
	} else if (levelFiveStage === 2) {
		// Stage 2: the real Level 2 catching game, with a smaller goal.
		cleanDropsCaught = 0;
		ticksSinceSpawn = 0;
		feedbackMessage.textContent = 'Move the bucket with the arrow keys or buttons. Catch 3 clean drops and avoid contaminated water!';
		const gameContainer = document.createElement('div');
		stageArea.replaceChildren(gameContainer);
		startCatchingGame(gameContainer);
		// Make sure the whole play area, including the bucket, is on screen.
		document.querySelector('#play-area').scrollIntoView({ block: 'center' });
	} else if (levelFiveStage === 3) {
		// Stage 3: one multiple-choice question, like Level 3.
		feedbackMessage.textContent = '';
		const question = document.createElement('h4');
		question.className = 'scenario-question';
		question.textContent = levelFiveQuestion.question;
		const answerOptions = document.createElement('div');
		answerOptions.className = 'answer-options';
		for (const option of levelFiveQuestion.options) {
			const answerButton = document.createElement('button');
			answerButton.type = 'button';
			answerButton.className = 'answer-button';
			answerButton.dataset.answer = option.letter;
			answerButton.textContent = `${option.letter}: ${option.text}`;
			answerOptions.appendChild(answerButton);
		}
		stageArea.replaceChildren(question, answerOptions);
	} else {
		// Stage 4: the same allocation controls as Level 4.
		levelFourAllocations = { drinking: 0, cooking: 0, cleaning: 0 };
		feedbackMessage.textContent = 'Share the 20 units of water so every need meets its minimum, then submit.';
		showLevelFourActivity(stageArea);
	}
}

// Finish the current stage once: award the points, grow the wave, and show what comes next.
function completeLevelFiveStage(points, message) {
	if (levelFiveStageDone) {
		return;
	}

	levelFiveStageDone = true;
	score += points;
	scoreDisplay.textContent = score;
	updateWave();
	// Stages 1 and 2 already awarded points per drop, so they pass 0 here.
	const pointsText = points > 0 ? ` +${points} points!` : '';
	feedbackMessage.textContent = `${message}${pointsText} Your wave is growing.`;

	if (levelFiveStage < 4) {
		const nextStageButton = document.createElement('button');
		nextStageButton.type = 'button';
		nextStageButton.id = 'next-stage-button';
		nextStageButton.textContent = 'Next Stage';
		document.querySelector('#stage-area').appendChild(nextStageButton);
		nextStageButton.focus();
		return;
	}

	showFinalResults();
}

// Confetti: pieces are added to one container and removed after a few seconds.
let confettiTimer = null;

// Remove all confetti and cancel its removal timer. Safe to call at any time.
function stopConfetti() {
	clearTimeout(confettiTimer);
	confettiTimer = null;
	const container = document.querySelector('#confetti-container');
	if (container) {
		container.remove();
	}
}

// Create a short confetti celebration in the game's yellow and blue colors.
function startConfetti() {
	// Clear any old confetti first so celebrations never stack.
	stopConfetti();

	const colors = ['#ffc907', '#2e9df7', '#ffffff', '#8bd1cb'];
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const container = document.createElement('div');
	container.id = 'confetti-container';
	container.setAttribute('aria-hidden', 'true');

	for (let i = 0; i < 60; i++) {
		const piece = document.createElement('span');
		piece.className = 'confetti-piece';
		piece.style.left = `${Math.random() * 100}%`;
		piece.style.backgroundColor = colors[i % colors.length];
		if (reduceMotion) {
			// Simple version: pieces just appear in place, with no movement.
			piece.style.top = `${Math.random() * 60}%`;
		} else {
			piece.classList.add('confetti-falling');
			piece.style.animationDelay = `${Math.random() * 0.8}s`;
			piece.style.animationDuration = `${2 + Math.random() * 1.5}s`;
		}
		container.appendChild(piece);
	}

	document.body.appendChild(container);
	// Remove the confetti after a few seconds so nothing keeps running.
	confettiTimer = setTimeout(stopConfetti, reduceMotion ? 2500 : 4500);
}

// Show the final results with a Play Again button (no Continue button here).
function showFinalResults() {
	currentLevelName.textContent = 'Waves of Change: Complete!';
	levelInstructions.textContent = 'You completed all five levels.';
	document.querySelector('#stage-progress').textContent = 'All 4 stages complete!';

	const results = document.createElement('div');
	results.className = 'final-results';
	results.innerHTML = `
		<h4>🌊 You made a big wave!</h4>
		<p>Final score: <strong>${score}</strong></p>
		<p>You completed all five levels of Waves of Change.</p>
		<p>
			Every drop you collected, protected, and shared shows how small actions add up.
			Millions of people still lack safe water, and charity: water works to bring
			clean, safe drinking water to people in need.
		</p>
	`;
	const playAgainButton = document.createElement('button');
	playAgainButton.type = 'button';
	playAgainButton.id = 'play-again-button';
	playAgainButton.textContent = 'Play Again';
	results.appendChild(playAgainButton);
	document.querySelector('#stage-area').replaceChildren(results);
	feedbackMessage.textContent = 'Congratulations! You completed Make Waves!';
	playAgainButton.focus();
	startConfetti();
}

// Reset everything and go back to the welcome screen (used by Play Again and Reset Game).
function playAgain() {
	stopConfetti();
	currentLevel = 0;
	score = 0;
	dropsCollected = 0;
	stopLevelTwoGame();
	levelTwoComplete = false;
	currentQuestionIndex = 0;
	currentQuestionAnswered = false;
	levelThreeComplete = false;
	levelFourAllocations = { drinking: 0, cooking: 0, cleaning: 0 };
	levelFourComplete = false;
	levelFiveStage = 1;
	levelFiveStageDone = false;
	levelFiveDropsCollected = 0;
	cleanDropsCaught = 0;
	ticksSinceSpawn = 0;
	scoreDisplay.textContent = '0';
	feedbackMessage.textContent = '';
	activityContent.replaceChildren();
	nextLevelButton.hidden = true;
	nextLevelButton.disabled = true;
	gameArea.hidden = true;
	welcomeScreen.hidden = false;
	startGameButton.focus();
}

// Handle every click inside Level 5.
function handleLevelFiveClick(event) {
	const clicked = event.target.closest('button');

	if (currentLevel !== 5 || !clicked) {
		return;
	}

	if (clicked.id === 'play-again-button') {
		playAgain();
	} else if (clicked.id === 'next-stage-button') {
		// Only move on after the current stage is finished.
		if (levelFiveStageDone && levelFiveStage < 4) {
			levelFiveStage += 1;
			showLevelFiveStage();
		}
	} else if (levelFiveStage === 1 && clicked.dataset.stageDrop) {
		// Stage 1: each drop is disabled after it is collected, so it scores once.
		if (levelFiveStageDone || clicked.disabled) {
			return;
		}
		clicked.disabled = true;
		levelFiveDropsCollected += 1;
		score += 1;
		scoreDisplay.textContent = score;
		feedbackMessage.textContent = `Collected ${levelFiveDropsCollected} of 3 drops.`;
		if (levelFiveDropsCollected === 3) {
			completeLevelFiveStage(0, levelFiveStage === 1 ? 'You collected all 3 clean drops.' : 'You caught all the clean water.');
		}
	} else if (levelFiveStage === 3 && clicked.classList.contains('answer-button')) {
		if (levelFiveStageDone) {
			return;
		}
		if (clicked.dataset.answer !== levelFiveQuestion.correctAnswer) {
			feedbackMessage.textContent = `Not quite. ${levelFiveQuestion.feedback} Try again!`;
			return;
		}
		completeLevelFiveStage(2, `Correct! ${levelFiveQuestion.feedback}`);
	} else if (levelFiveStage === 4) {
		// Stage 4 reuses the Level 4 allocation click handler.
		handleLevelFourClick(event);
	}
}

// Use the same Continue button to move one level at a time.
function continueToNextLevel() {
	if (currentLevel === 1) {
		startLevelTwo();
	} else if (currentLevel === 2) {
		startLevelThree();
	} else if (currentLevel === 3) {
		startLevelFour();
	} else if (currentLevel === 4) {
		startLevelFive();
	}
}

// Send activity clicks to the handler for the current level.
function handleActivityClick(event) {
	if (currentLevel === 1) {
		collectWaterDrop(event);
	} else if (currentLevel === 3) {
		answerLevelThreeQuestion(event);
	} else if (currentLevel === 4) {
		handleLevelFourClick(event);
	} else if (currentLevel === 5) {
		handleLevelFiveClick(event);
	}
}

// Attach each listener once so restarting the level cannot duplicate listeners.
startGameButton.addEventListener('click', startLevelOne);
activityContent.addEventListener('click', handleActivityClick);
nextLevelButton.addEventListener('click', continueToNextLevel);
document.querySelector('#reset-game-button').addEventListener('click', playAgain);
