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
const levelTwoScenarios = [
	{
		question: 'How should you dispose of leftover household chemicals?',
		options: [
			{ letter: 'A', text: 'Pour them down a storm drain.' },
			{ letter: 'B', text: 'Take them to an appropriate hazardous-waste collection facility.' }
		],
		correctAnswer: 'B',
		correctFeedback: 'Correct! A hazardous-waste collection facility can handle chemicals safely and help keep them out of waterways.',
		incorrectFeedback: 'Not quite. Storm drains can carry chemicals into waterways. Take leftover chemicals to an appropriate hazardous-waste collection facility.'
	},
	{
		question: 'How can you conserve water while brushing your teeth?',
		options: [
			{ letter: 'A', text: 'Turn off the faucet while brushing.' },
			{ letter: 'B', text: 'Leave the faucet running.' }
		],
		correctAnswer: 'A',
		correctFeedback: 'Correct! Turning off the faucet while brushing helps avoid wasting clean water.',
		incorrectFeedback: 'Not quite. Leaving the faucet running wastes clean water. Turn it off while you brush.'
	},
	{
		question: 'What should you do with litter near a storm drain?',
		options: [
			{ letter: 'A', text: 'Leave it there because it will wash away.' },
			{ letter: 'B', text: 'Dispose of it properly so it cannot wash into waterways.' }
		],
		correctAnswer: 'B',
		correctFeedback: 'Correct! Properly disposing of litter helps keep it from washing through storm drains into waterways.',
		incorrectFeedback: 'Not quite. Litter can wash through storm drains into waterways. Dispose of it properly instead.'
	}
];
let currentScenarioIndex = 0;
let currentScenarioAnswered = false;
let levelTwoComplete = false;

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
	currentScenarioIndex = 0;
	currentScenarioAnswered = false;
	levelTwoComplete = false;
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

// Draw the current Level 2 question and its two answer buttons.
function showLevelTwoScenario() {
	const scenario = levelTwoScenarios[currentScenarioIndex];
	const scenarioContent = document.createElement('div');
	scenarioContent.className = 'scenario-content';

	const question = document.createElement('h4');
	question.className = 'scenario-question';
	question.textContent = `Scenario ${currentScenarioIndex + 1} of ${levelTwoScenarios.length}: ${scenario.question}`;
	scenarioContent.appendChild(question);

	const answerOptions = document.createElement('div');
	answerOptions.className = 'answer-options';

	for (const option of scenario.options) {
		const answerButton = document.createElement('button');
		answerButton.type = 'button';
		answerButton.className = 'answer-button';
		answerButton.dataset.answer = option.letter;
		answerButton.textContent = `${option.letter}: ${option.text}`;
		answerOptions.appendChild(answerButton);
	}

	scenarioContent.appendChild(answerOptions);
	activityContent.replaceChildren(scenarioContent);
	currentScenarioAnswered = false;
}

// Start Level 2 only after all of the Level 1 drops have been collected.
function startLevelTwo() {
	if (currentLevel !== 1 || dropsCollected !== totalDrops) {
		return;
	}

	currentLevel = 2;
	currentLevelName.textContent = 'Level 2: Save the Drop';
	levelInstructions.textContent = 'Make choices that help protect clean water.';
	currentScenarioIndex = 0;
	currentScenarioAnswered = false;
	levelTwoComplete = false;
	feedbackMessage.textContent = '';
	nextLevelButton.hidden = true;
	nextLevelButton.disabled = true;
	showLevelTwoScenario();
}

// Check each answer, explain the result, and award one point for a correct choice.
function answerLevelTwoScenario(event) {
	const answerButton = event.target.closest('.answer-button');

	if (currentLevel !== 2 || !answerButton || currentScenarioAnswered || levelTwoComplete) {
		return;
	}

	const scenario = levelTwoScenarios[currentScenarioIndex];

	if (answerButton.dataset.answer !== scenario.correctAnswer) {
		feedbackMessage.textContent = scenario.incorrectFeedback;
		return;
	}

	currentScenarioAnswered = true;
	score += 1;
	scoreDisplay.textContent = score;

	if (currentScenarioIndex === levelTwoScenarios.length - 1) {
		levelTwoComplete = true;
		feedbackMessage.textContent = `${scenario.correctFeedback} Congratulations! You completed Level 2.`;
		nextLevelButton.hidden = false;
		nextLevelButton.disabled = false;
		return;
	}

	feedbackMessage.textContent = scenario.correctFeedback;
	currentScenarioIndex += 1;
	showLevelTwoScenario();
}

// Show a Level 3 placeholder after Level 2 is complete.
function startLevelThree() {
	if (currentLevel !== 2 || !levelTwoComplete) {
		return;
	}

	currentLevel = 3;
	currentLevelName.textContent = 'Level 3: Water Crisis Trivia';
	levelInstructions.textContent = 'Level 3 is coming soon.';
	activityContent.textContent = 'Level 3 activity coming next!';
	feedbackMessage.textContent = '';
	nextLevelButton.hidden = true;
	nextLevelButton.disabled = true;
}

// Use the same Continue button to move one level at a time.
function continueToNextLevel() {
	if (currentLevel === 1) {
		startLevelTwo();
	} else if (currentLevel === 2) {
		startLevelThree();
	}
}

// Send activity clicks to the handler for the current level.
function handleActivityClick(event) {
	if (currentLevel === 1) {
		collectWaterDrop(event);
	} else if (currentLevel === 2) {
		answerLevelTwoScenario(event);
	}
}

// Attach each listener once so restarting the level cannot duplicate listeners.
startGameButton.addEventListener('click', startLevelOne);
activityContent.addEventListener('click', handleActivityClick);
nextLevelButton.addEventListener('click', continueToNextLevel);
