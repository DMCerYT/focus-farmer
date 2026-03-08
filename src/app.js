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

import { supabase } from '../supabaseclient.js';


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
const REMOTE_PROGRESS_TABLE = 'focus_farmer_progress';
const OUTFIT_COLOR_KEY = 'focus-farmer-outfit-color';
let currentUserId = null;
let suppressRemoteSync = false;

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
  els.coinsPill.textContent = String(state.coins);
  els.streakPill.textContent = String(state.sessions);
  progressStore.saveTotals({ coins: state.coins, sessions: state.sessions });

  if (!suppressRemoteSync) {
    void pushRemoteTotals();
  }
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
  avatar,
  updateStats,
  setDialogue,
  onReap: (result) => {
    progressStore.addSession({
      endedAt: new Date().toISOString(),
      mode: result.hardMode ? 'hard' : 'regular',
      durationMinutes: result.focusMin,
      earned: result.earned,
      endedEarly: Boolean(result.endedEarly),
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

function getSupabaseClient() {
  return window.focusFarmerSupabase || null;
}

async function pullRemoteTotals(userId) {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from(REMOTE_PROGRESS_TABLE)
    .select('coins,sessions')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    coins: Number(data.coins || 0),
    sessions: Number(data.sessions || 0),
  };
}

async function pushRemoteTotals() {
  const supabase = getSupabaseClient();
  if (!supabase || !currentUserId) {
    return;
  }

  const { error } = await supabase.from(REMOTE_PROGRESS_TABLE).upsert(
    {
      user_id: currentUserId,
      coins: state.coins,
      sessions: state.sessions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    return;
  }
}

async function applySession(session) {
  currentUserId = session?.user?.id ?? null;
  if (!currentUserId) {
    return;
  }

  const remoteTotals = await pullRemoteTotals(currentUserId);
  if (!remoteTotals) {
    await pushRemoteTotals();
    return;
  }

  suppressRemoteSync = true;
  state.coins = remoteTotals.coins;
  state.sessions = remoteTotals.sessions;
  updateStats();
  suppressRemoteSync = false;
}

window.addEventListener('focusfarmer:auth-changed', (event) => {
  void applySession(event.detail?.session || null);
});

async function bootstrapRemoteSync() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const { data } = await supabase.auth.getSession();
  await applySession(data?.session || null);
}

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
  const savedOutfitColor = localStorage.getItem(OUTFIT_COLOR_KEY) || 'blue';
  avatar.setOutfitColor(savedOutfitColor);
  if (els.outfitColor) {
    els.outfitColor.value = savedOutfitColor;
    els.outfitColor.addEventListener('change', () => {
      const nextColor = els.outfitColor.value;
      avatar.setOutfitColor(nextColor);
      localStorage.setItem(OUTFIT_COLOR_KEY, nextColor);
    });
  }

async function initApp() {
  screens.show('setup');

  await loadPlayerState(state);
  updateStats();
  void bootstrapRemoteSync();
  avatar.init();
  avatar.showSetupIdle();
  summaryController.init();
  focusController.init();
  restController.init();
  walkthroughController.init();
  restController.resetRestScreen();
}

initApp();
