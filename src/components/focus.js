import { formatMMSS } from './utils.js';
import { supabase } from '../../supabaseclient.js';
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

  /**
   * Validates and normalizes focus minutes input.
   */
  function readFocusMinutes() {
    const value = Number(els.focusMinutes.value);
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    // Allow decimals, but clamp between 0.1 min and 180 min
    return Math.min(180, Math.max(0.1, value));
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
    avatar.showFocusWalk(mode);
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

  /**
   * Converts completed focus run into rewards and forwards result to summary.
   */
  async function reapFocus() {
    if (!state.currentFocus || !state.currentFocus.completed) {
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

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData?.session?.user) {
        await supabase
          .from('playerstats')
          .upsert({
            auth_id: sessionData.session.user.id,
            coins: state.coins,
            session_count: state.sessions,
            last_session: new Date().toISOString(),
          }, { onConflict: 'auth_id' });
      }
    } catch (err) {
      console.error('Supabase update error:', err);
    }
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
    avatar.showFocusIdle();
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
