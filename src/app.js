import { walkthroughSteps } from './components/constants.js';
import { getElements } from './components/elements.js';
import { createFocusController } from './components/focus.js';
import { createRestController } from './components/rest.js';
import { createScreenController } from './components/screens.js';
import { createSummaryController } from './components/summary.js';
import { createGameState } from './components/state.js';
import { createWalkthroughController } from './components/walkthrough.js';

const state = createGameState();
// need to load persisted mute setting before controllers initialize
const storedMute = localStorage.getItem('bgmMuted');
if (storedMute !== null) {
  state.isMuted = storedMute === 'true';
}

const els = getElements();
const screens = createScreenController(els);

/**
 * Writes a helper/debug message in the REST dialogue area.
 */
function setDialogue(text) {
  els.dialogueOutput.textContent = text;
}

/**
 * Refreshes top-level stats UI from current state.
 */
function updateStats() {
  els.coinsPill.textContent = `Coins: ${state.coins}`;
  els.streakPill.textContent = `Sessions: ${state.sessions}`;
}

/**
 * Produces a compact summary string for island status checks.
 */
function getIslandSummary() {
  return `${state.sessions} harvests complete, ${state.coins} coins stored, fields are growing.`;
}

const summaryController = createSummaryController(els, screens, setDialogue);
const focusController = createFocusController({
  els,
  state,
  screens,
  updateStats,
  setDialogue,
  onReap: (result) => summaryController.render(result),
});
const restController = createRestController({
  els,
  state,
  screens,
  setDialogue,
  getIslandSummary,
  onBack: () => focusController.resetFocusCycle(),
});
const walkthroughController = createWalkthroughController(els, walkthroughSteps);

/**
 * Boots app components and binds all UI interactions.
 */
function initApp() {
  screens.show('setup');
  updateStats();
  summaryController.init();
  focusController.init();
  restController.init();
  walkthroughController.init();
  restController.resetRestScreen();
}

initApp();
