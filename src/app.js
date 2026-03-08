import { walkthroughSteps } from './components/constants.js';
import { getElements } from './components/elements.js';
import { createFocusController } from './components/focus.js';
import { createRestController } from './components/rest.js';
import { createScreenController } from './components/screens.js';
import { createSummaryController } from './components/summary.js';
import { createGameState } from './components/state.js';
import { createWalkthroughController } from './components/walkthrough.js';

import { supabase } from '../supabaseclient.js';


const state = createGameState();
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


export async function loadPlayerState(state) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData?.session?.user) return;

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
      .from('playerstats')
      .select('coins, session_count')
      .eq('auth_id', userId)
      .single();

    if (error) {
      console.error('Error loading player stats:', error);
      return;
    }

    if (data) {
      state.coins = data.coins;
      console.log(state.coins)
      state.sessions = data.session_count;
      console.log(state.sessions)
    }
  } catch (err) {
    console.error('Failed to load player state:', err);
  }
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
async function initApp() {
  screens.show('setup');

  await loadPlayerState(state);
  updateStats();
  summaryController.init();
  focusController.init();
  restController.init();
  walkthroughController.init();
  restController.resetRestScreen();
}

initApp();
