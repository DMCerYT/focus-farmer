import { formatMMSS } from './utils.js';

/**
 * Focus session controller.
 * Owns FARM/REAP interactions, focus timer updates, and reward calculation.
 */
export function createFocusController({ els, state, screens, avatar, updateStats, setDialogue, onReap }) {
  function emitFocusState(payload) {
    if (typeof state.onFocusStateChange === 'function') {
      state.onFocusStateChange(payload);
    }
  }

  function readFocusMinutes() {
    const value = Number(els.focusMinutes.value);
    if (!Number.isFinite(value) || value < 0.1) {
      return null;
    }
    return Math.min(180, Math.max(0.1, value));
  }

  function startFocus() {
    const focusMin = readFocusMinutes();
    if (!focusMin) {
      setDialogue('Please enter a valid focus timer (0.1-180 minutes).');
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

    els.reapBtn.disabled = false;
    avatar.showFocusWalk();
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
      avatar.showFocusComplete();
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

  function reapFocus() {
    if (!state.currentFocus) {
      return;
    }

    if (!state.currentFocus.completed) {
      const msLeft = Math.max(0, state.currentFocus.endsAt - Date.now());
      const hardMode = state.currentFocus.mode === 'hard';
      const focusMin = Number((state.currentFocus.durationMs / 60000).toFixed(1));

      if (state.focusTimerId) {
        clearInterval(state.focusTimerId);
        state.focusTimerId = null;
      }

      state.currentFocus = null;
      avatar.showFocusIdle();
      els.focusStatus.textContent = 'You ended focus early. No rewards this run.';
      setDialogue(`Early REAP warning: ${formatMMSS(msLeft)} remaining. No rewards were earned.`);

      onReap({
        endedEarly: true,
        hardMode,
        focusMin,
        baseCoins: 0,
        hardBonus: 0,
        luckyBonus: 0,
        earned: 0,
      });

      emitFocusState({
        status: 'idle',
        remainingMs: 0,
        durationMs: 0,
      });
      return;
    }

    if (state.focusTimerId) {
      clearInterval(state.focusTimerId);
      state.focusTimerId = null;
    }

    const focusMin = state.currentFocus.durationMs / 60000;
    const hardMode = state.currentFocus.mode === 'hard';
    const baseCoins = Math.round(focusMin * 10);
    const hardBonus = hardMode ? Math.floor(baseCoins * 0.5) : 0;
    const luckyBonus = hardMode && Math.random() < 0.3 ? 30 : 0;
    const earned = baseCoins + hardBonus + luckyBonus;

    state.coins += earned;
    state.sessions += 1;
    updateStats();

    onReap({
      endedEarly: false,
      hardMode,
      focusMin: Number(focusMin.toFixed(1)),
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

  function resetFocusCycle() {
    if (state.focusTimerId) {
      clearInterval(state.focusTimerId);
      state.focusTimerId = null;
    }
    state.currentFocus = null;
    els.reapBtn.disabled = false;
    els.focusTimer.textContent = '00:00';
    avatar.showSetupIdle();
    els.focusStatus.textContent = 'Farming in progress...';
    els.focusModeText.textContent = '';
    emitFocusState({
      status: 'idle',
      remainingMs: 0,
      durationMs: 0,
    });
  }

  function init() {
    els.farmBtn.addEventListener('click', startFocus);
    els.reapBtn.addEventListener('click', reapFocus);
  }

  return {
    init,
    resetFocusCycle,
  };
}
