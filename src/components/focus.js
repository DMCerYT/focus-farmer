import { formatMMSS } from './utils.js';

/**
 * Focus session controller.
 * Owns FARM/REAP interactions, focus timer updates, and reward calculation.
 */
export function createFocusController({ els, state, screens, updateStats, setDialogue, onReap }) {
  function emitFocusState(payload) {
    if (typeof state.onFocusStateChange === 'function') {
      state.onFocusStateChange(payload);
    }
  }

  /**
   * Validates and normalizes focus minutes input.
   */
  function readFocusMinutes() {
    const value = Number(els.focusMinutes.value);
    if (!Number.isFinite(value) || value < 1) {
      return null;
    }
    return Math.min(180, Math.max(1, Math.floor(value)));
  }

  /**
   * Starts a new focus session and begins ticking timer UI.
   */
  function startFocus() {
    const focusMin = readFocusMinutes();
    if (!focusMin) {
      setDialogue('Please enter a valid focus timer (1-180 minutes).');
      return;
    }

    const durationMs = focusMin * 60 * 1000;
    const mode = els.modeStyle.value;
    const timerStyle = els.timerStyle.value;

    if (state.focusTimerId) {
      clearInterval(state.focusTimerId);
    }

    state.currentFocus = {
      startedAt: Date.now(),
      endsAt: Date.now() + durationMs,
      durationMs,
      mode,
      timerStyle,
      completed: false,
    };

    // Keep REAP clickable so early presses can show guidance instead of silently failing.
    els.reapBtn.disabled = false;
    els.focusCharacter.textContent = mode === 'hard' ? '🧑‍🌾🔥' : '🧑‍🌾';
    els.focusCharacter.style.animation = 'farm 0.9s ease-in-out infinite';
    els.focusStatus.textContent = 'Your farmer is working the fields. Stay with the task.';
    els.focusModeText.textContent = `${mode.toUpperCase()} • ${timerStyle === 'down' ? 'Count Down' : 'Count Up'} • ${focusMin} min`;

    emitFocusState({
      status: 'running',
      remainingMs: durationMs,
      durationMs,
    });

    screens.show('focus');
    state.focusTimerId = setInterval(tickFocus, 250);
    tickFocus();
  }

  /**
   * Timer tick callback that updates clock text and marks completion state.
   */
  function tickFocus() {
    if (!state.currentFocus) {
      return;
    }

    const now = Date.now();
    const elapsed = now - state.currentFocus.startedAt;
    const remaining = state.currentFocus.endsAt - now;

    if (state.currentFocus.timerStyle === 'down') {
      els.focusTimer.textContent = formatMMSS(remaining);
    } else {
      els.focusTimer.textContent = formatMMSS(Math.min(elapsed, state.currentFocus.durationMs));
    }

    if (remaining <= 0 && !state.currentFocus.completed) {
      state.currentFocus.completed = true;
      els.focusStatus.textContent = 'Window complete. Press REAP to end focus.';
      els.focusCharacter.textContent = '🌾';
      els.focusCharacter.style.animation = 'idle 1.2s ease-in-out infinite';
      emitFocusState({
        status: 'complete',
        remainingMs: 0,
        durationMs: state.currentFocus.durationMs,
      });
      return;
    }

    emitFocusState({
      status: 'running',
      remainingMs: Math.max(0, remaining),
      durationMs: state.currentFocus.durationMs,
    });
  }

  /**
   * Converts completed focus run into rewards and forwards result to summary.
   */
  function reapFocus() {
    if (!state.currentFocus) {
      return;
    }

    if (!state.currentFocus.completed) {
      const msLeft = Math.max(0, state.currentFocus.endsAt - Date.now());
      els.focusStatus.textContent = "Your plants haven't grown as much yet and aren't ready for harvest.";
      setDialogue(
        `Early REAP warning: your plants haven't grown as much and aren't ready for harvest (${formatMMSS(msLeft)} remaining).`
      );
      return;
    }

    if (state.focusTimerId) {
      clearInterval(state.focusTimerId);
      state.focusTimerId = null;
    }

    const focusMin = Math.round(state.currentFocus.durationMs / 60000);
    const hardMode = state.currentFocus.mode === 'hard';
    const baseCoins = focusMin * 10;
    const hardBonus = hardMode ? Math.floor(baseCoins * 0.5) : 0;
    const luckyBonus = hardMode && Math.random() < 0.3 ? 30 : 0;
    const earned = baseCoins + hardBonus + luckyBonus;

    state.coins += earned;
    state.sessions += 1;
    updateStats();

    onReap({
      hardMode,
      focusMin,
      baseCoins,
      hardBonus,
      luckyBonus,
      earned,
    });

    emitFocusState({
      status: 'idle',
      remainingMs: 0,
      durationMs: 0,
    });
  }

  /**
   * Resets focus runtime state when user begins another cycle.
   */
  function resetFocusCycle() {
    if (state.focusTimerId) {
      clearInterval(state.focusTimerId);
      state.focusTimerId = null;
    }
    state.currentFocus = null;
    els.reapBtn.disabled = false;
    els.focusTimer.textContent = '00:00';
    els.focusCharacter.textContent = '🧑‍🌾';
    els.focusCharacter.style.animation = 'idle 1.4s ease-in-out infinite';
    els.focusStatus.textContent = 'Farming in progress...';
    els.focusModeText.textContent = '';
    emitFocusState({
      status: 'idle',
      remainingMs: 0,
      durationMs: 0,
    });
  }

  /**
   * Wires button events for FARM and REAP actions.
   */
  function init() {
    els.farmBtn.addEventListener('click', startFocus);
    els.reapBtn.addEventListener('click', reapFocus);
  }

  return {
    init,
    resetFocusCycle,
  };
}
