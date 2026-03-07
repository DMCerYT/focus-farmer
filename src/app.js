import { walkthroughSteps } from './components/constants.js';
import { getElements } from './components/elements.js';
import { createFocusController } from './components/focus.js';
import { createRestController } from './components/rest.js';
import { createScreenController } from './components/screens.js';
import { createSummaryController } from './components/summary.js';
import { createAvatarController } from './components/avatar.js';
import { createGameState } from './components/state.js';
import { createProgressStore } from './components/progress.js';
import { createWalkthroughController } from './components/walkthrough.js';

// Main app state used across all controllers.
// Feature work tip: add new top-level cross-screen values in `createGameState`.
const state = createGameState();
const progressStore = createProgressStore();
const savedProgress = progressStore.getProgress();
state.coins = savedProgress.totals.coins;
state.sessions = savedProgress.totals.sessions;
const els = getElements();
// Single place that controls which "page" is visible.
const screens = createScreenController(els);
const avatar = createAvatarController(els);

/**
 * Broadcasts timer state to the overlay host so it can paint the floating ring
 * even when the main game panel is hidden.
 */
function broadcastFocusState(timerState) {
  if (window.parent === window) {
    return;
  }

  window.parent.postMessage(
    {
      source: 'focus-farmer',
      type: 'timer-update',
      timerState,
    },
    '*'
  );
}

state.onFocusStateChange = broadcastFocusState;

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
  progressStore.saveTotals({ coins: state.coins, sessions: state.sessions });
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
  avatar,
  updateStats,
  setDialogue,
  onReap: (result) => {
    progressStore.addSession({
      endedAt: new Date().toISOString(),
      mode: result.hardMode ? 'hard' : 'regular',
      durationMinutes: result.focusMin,
      earned: result.earned,
      endedEarly: false,
    });
    summaryController.render(result);
  },
});
const restController = createRestController({
  els,
  state,
  screens,
  avatar,
  setDialogue,
  getIslandSummary,
  onBack: () => focusController.resetFocusCycle(),
});
const walkthroughController = createWalkthroughController(els, walkthroughSteps);

/**
 * Boots app components and binds all UI interactions.
 * Keep initialization order stable:
 * 1) base screen + stats
 * 2) controller event bindings
 * 3) view reset helpers
 *
 * This avoids race conditions when adding new modules that depend on
 * already-bound click handlers.
 */
function initApp() {
  screens.show('setup');
  updateStats();
  avatar.init();
  avatar.showSetupIdle();
  summaryController.init();
  focusController.init();
  restController.init();
  walkthroughController.init();
  restController.resetRestScreen();
}

initApp();
