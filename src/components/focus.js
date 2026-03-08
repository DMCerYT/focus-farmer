import { formatMMSS } from './utils.js';

/**
 * Focus session controller.
 * Owns FARM/REAP interactions, focus timer updates, and reward calculation.
 */
export function createFocusController({ els, state, screens, updateStats, setDialogue, onReap }) {

  const bgm = new Audio('/assets/focus_music.mp3');
  bgm.loop = true;
  bgm.preload = 'auto';
  bgm.muted = !!state.isMuted;

  /**
   * Updates the mute button label to match current state.
   */
  function updateMuteButton() {
    if (!els.muteBtn) return;
    els.muteBtn.textContent = state.isMuted ? '🔇' : '🔊';
    const label = state.isMuted ? 'Unmute background music' : 'Mute background music';
    els.muteBtn.setAttribute('aria-label', label);
    els.muteBtn.title = state.isMuted ? 'Unmute' : 'Mute';
  }

  /**
   * Toggles mute state, persist preference, and adjust audio.
   */
  function toggleMute() {
    state.isMuted = !state.isMuted;
    bgm.muted = state.isMuted;
    localStorage.setItem('bgmMuted', state.isMuted);
    updateMuteButton();

    if (!state.isMuted && state.currentFocus && !state.currentFocus.completed) {
      bgm.play().catch(() => {});
    }
  }

  /**
   * Stops the music and reset to beginning.
   */
  function stopBgm() {
    bgm.pause();
    bgm.currentTime = 0;
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

    els.reapBtn.disabled = true;
    els.focusCharacter.textContent = mode === 'hard' ? '🧑‍🌾🔥' : '🧑‍🌾';
    els.focusCharacter.style.animation = 'farm 0.9s ease-in-out infinite';
    els.focusStatus.textContent = 'Your farmer is working the fields. Stay with the task.';
    els.focusModeText.textContent = `${mode.toUpperCase()} • ${timerStyle === 'down' ? 'Count Down' : 'Count Up'} • ${focusMin} min`;

    stopBgm();
    if (!state.isMuted) {
      bgm.play().catch(() => {});
    }

    screens.show('focus');
    state.focusTimerId = setInterval(tickFocus, 250);
    tickFocus();
  }

  /**
   * Timer tick callback that updates clock text and unlocks REAP when done.
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
      els.reapBtn.disabled = false;
      els.focusStatus.textContent = 'Window complete. Press REAP to end focus.';
      els.focusCharacter.textContent = '🌾';
      els.focusCharacter.style.animation = 'idle 1.2s ease-in-out infinite';
    }
  }

  /**
   * Converts completed focus run into rewards and forwards result to summary.
   */
  function reapFocus() {
    if (!state.currentFocus || !state.currentFocus.completed) {
      return;
    }

    if (state.focusTimerId) {
      clearInterval(state.focusTimerId);
      state.focusTimerId = null;
    }
    stopBgm();

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
      baseCoins,
      hardBonus,
      luckyBonus,
      earned,
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
    els.reapBtn.disabled = true;
    els.focusTimer.textContent = '00:00';
    els.focusCharacter.textContent = '🧑‍🌾';
    els.focusCharacter.style.animation = 'idle 1.4s ease-in-out infinite';
    els.focusStatus.textContent = 'Farming in progress...';
    els.focusModeText.textContent = '';
    stopBgm();
  }

  /**
   * Wires button events for FARM and REAP actions.
   */
  function init() {
    els.farmBtn.addEventListener('click', startFocus);
    els.reapBtn.addEventListener('click', reapFocus);
    if (els.muteBtn) {
      els.muteBtn.addEventListener('click', toggleMute);
    }

    updateMuteButton();
  }

  return {
    init,
    resetFocusCycle,
  };
}
