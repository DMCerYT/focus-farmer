import { walkthroughSteps } from './components/constants.js';
import { getElements } from './components/elements.js';
import { createFocusController } from './components/focus.js';
import { createRestController } from './components/rest.js';
import { createScreenController } from './components/screens.js';
import { createSummaryController } from './components/summary.js';
import { createAvatarController } from './components/avatar.js';
import { createGachaController } from './components/gacha.js';
import { createGameState } from './components/state.js';
import { createProgressStore } from './components/progress.js';
import { createWalkthroughController } from './components/walkthrough.js';

const REMOTE_PROGRESS_TABLE = 'focus_farmer_progress';
const OUTFIT_COLOR_KEY = 'focus-farmer-outfit-color';
const FLOW_STATE_UNLOCKED_KEY = 'focus-farmer-flow-state-unlocked-v1';

const state = createGameState();
const progressStore = createProgressStore();
const savedProgress = progressStore.getProgress();

state.coins = savedProgress.totals.coins;
state.sessions = savedProgress.totals.sessions;

const els = getElements();
const screens = createScreenController(els);
const avatar = createAvatarController(els);

let currentUserId = null;
let suppressRemoteSync = false;
let gachaController = null;
let coinAnimTimerId = null;

function setFlowStateBackground(active) {
  document.body.classList.toggle('flow-state', Boolean(active));
}

function unlockFlowStateBackground() {
  localStorage.setItem(FLOW_STATE_UNLOCKED_KEY, '1');
  setFlowStateBackground(true);
}

function getSupabaseClient() {
  return window.focusFarmerSupabase || null;
}

async function initCoinAnimation() {
  const icons = Array.from(document.querySelectorAll('.coin-icon'));
  if (icons.length === 0) {
    return;
  }

  if (coinAnimTimerId) {
    clearTimeout(coinAnimTimerId);
    coinAnimTimerId = null;
  }

  try {
    const response = await fetch('./assets/coin_anim.json');
    const data = await response.json();
    const frames = Object.values(data.frames || {})
      .map((frame) => ({
        x: Number(frame?.frame?.x || 0),
        duration: Number(frame?.duration || 100),
      }))
      .sort((a, b) => a.x - b.x);

    if (frames.length === 0) {
      return;
    }

    const frameWidth = Number(data?.meta?.size?.w || 160) / frames.length;
    const sheetWidth = Number(data?.meta?.size?.w || frameWidth * frames.length);
    const sheetHeight = Number(data?.meta?.size?.h || 16);
    const maxX = Math.max(0, sheetWidth - frameWidth);
    let frameIndex = 0;

    const paintFrame = () => {
      const frame = frames[frameIndex];
      const x = Math.max(0, Math.min(maxX, frame.x));

      icons.forEach((icon) => {
        icon.style.backgroundImage = 'url("./assets/coin_anim.png")';
        icon.style.backgroundRepeat = 'no-repeat';
        icon.style.backgroundSize = `${sheetWidth}px ${sheetHeight}px`;
        icon.style.backgroundPosition = `-${x}px 0`;
      });

      frameIndex = (frameIndex + 1) % frames.length;
      coinAnimTimerId = setTimeout(paintFrame, Math.max(16, frame.duration));
    };

    paintFrame();
  } catch {
    // Keep static icon if animation metadata fails to load.
  }
}

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

function setDialogue(text) {
  els.dialogueOutput.textContent = text;
}

function updateStats() {
  els.coinsPill.textContent = String(state.coins);
  els.streakPill.textContent = String(state.sessions);
  progressStore.saveTotals({ coins: state.coins, sessions: state.sessions });

  if (!suppressRemoteSync) {
    void pushRemoteTotals();
  }

  gachaController?.syncCoins();
}

function getIslandSummary() {
  return `${state.sessions} harvests complete, ${state.coins} coins stored, fields are growing.`;
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

  await supabase.from(REMOTE_PROGRESS_TABLE).upsert(
    {
      user_id: currentUserId,
      coins: state.coins,
      sessions: state.sessions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
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
  if (state.sessions > 0) {
    unlockFlowStateBackground();
  }
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
    if (!result.endedEarly && state.sessions > 0) {
      unlockFlowStateBackground();
    }
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
gachaController = createGachaController({
  els,
  state,
  updateStats,
  getSupabaseClient,
});

function initApp() {
  const hasUnlockedFlowState = localStorage.getItem(FLOW_STATE_UNLOCKED_KEY) === '1' || state.sessions > 0;
  setFlowStateBackground(hasUnlockedFlowState);

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

  screens.show('setup');
  updateStats();
  void bootstrapRemoteSync();
  avatar.init();
  avatar.showSetupIdle();
  summaryController.init();
  focusController.init();
  restController.init();
  gachaController.init();
  walkthroughController.init();
  restController.resetRestScreen();
  void initCoinAnimation();
}

initApp();
