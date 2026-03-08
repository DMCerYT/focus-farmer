import { formatMMSS } from './utils.js';

/**
 * Focus session controller.
 * Owns FARM/REAP interactions, focus timer updates, and reward calculation.
 */
export function createFocusController({ els, state, screens, avatar, updateStats, setDialogue, onReap }) {
  const BGM_VOLUME_KEY = 'bgmVolume';
  const TRACKS = [
    './assets/focus_music.mp3',
    './assets/Azure_Archipelago_SunsetMusic.mp3',
    './assets/Azure_Horizon_Zen.mp3',
    './assets/Azure_Isle_Thinking.mp3',
    './assets/Midnight_Rain_JPN.mp3',
    './assets/Upbeat_Focus_Investigation.mp3',
    './assets/Rainy_Day_Orchestral_Study_Session.mp3',
  ];
  let currentTrack = '';
  const bgm = new Audio(TRACKS[0]);
  bgm.loop = false;
  bgm.preload = 'auto';
  bgm.muted = !!state.isMuted;
  const savedVolume = Number(localStorage.getItem(BGM_VOLUME_KEY));
  bgm.volume = Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : 0.6;

  function emitFocusState(payload) {
    if (typeof state.onFocusStateChange === 'function') {
      state.onFocusStateChange(payload);
    }
  }

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

  function updateVolumeUI() {
    const volumePercent = Math.round(bgm.volume * 100);
    if (els.volumeSlider) {
      els.volumeSlider.value = String(volumePercent);
    }
    if (els.volumeValue) {
      els.volumeValue.textContent = `${volumePercent}%`;
    }
  }

  /**
   * Toggles mute state, persists preference, and adjusts audio.
   */
  function toggleMute() {
    state.isMuted = !state.isMuted;
    bgm.muted = state.isMuted;
    localStorage.setItem('bgmMuted', String(state.isMuted));
    updateMuteButton();

    if (!state.isMuted && state.currentFocus && !state.currentFocus.completed) {
      bgm.play().catch(() => {});
    }
  }

  function setVolumeFromInput() {
    if (!els.volumeSlider) {
      return;
    }
    const parsed = Number(els.volumeSlider.value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const nextVolume = Math.max(0, Math.min(1, parsed / 100));
    bgm.volume = nextVolume;
    localStorage.setItem(BGM_VOLUME_KEY, String(nextVolume));
    updateVolumeUI();
  }

  /**
   * Stops music and resets playback position.
   */
  function stopBgm() {
    bgm.pause();
    bgm.currentTime = 0;
  }

  function pickRandomTrack(exclude = '') {
    const candidates = TRACKS.filter((track) => track !== exclude);
    if (candidates.length === 0) {
      return TRACKS[0];
    }
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  }

  function playRandomTrack(options = {}) {
    const keepCurrent = Boolean(options.keepCurrent);
    const selected = keepCurrent && currentTrack ? currentTrack : pickRandomTrack(currentTrack);
    currentTrack = selected;

    const shouldResume = Boolean(state.currentFocus && !state.currentFocus.completed && !state.isMuted);
    bgm.src = selected;
    bgm.currentTime = 0;
    if (shouldResume) {
      bgm.play().catch(() => {});
    }
  }

  /**
   * Validates and normalizes focus minutes input.
   */
  function readFocusMinutes() {
    const value = Number(els.focusMinutes?.value);
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
    const mode = els.modeStyle?.value || 'regular';
    const timerStyle = els.timerStyle?.value || 'down';

    if (state.focusTimerId) {
      clearInterval(state.focusTimerId);
      state.focusTimerId = null;
    }

    const now = Date.now();
    state.currentFocus = {
      startedAt: now,
      endsAt: now + durationMs,
      durationMs,
      mode,
      timerStyle,
      completed: false,
    };

    if (els.reapBtn) {
      els.reapBtn.disabled = false;
    }
    avatar.showFocusWalk();
    if (els.focusStatus) {
      els.focusStatus.textContent = 'Your farmer is working the fields. Stay with your task.';
    }
    if (els.focusModeText) {
      els.focusModeText.textContent = `${mode.toUpperCase()} • ${timerStyle === 'down' ? 'Count Down' : 'Count Up'} • ${focusMin} min`;
    }

    playRandomTrack();

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

    if (els.focusTimer) {
      if (state.currentFocus.timerStyle === 'down') {
        els.focusTimer.textContent = formatMMSS(remaining);
      } else {
        els.focusTimer.textContent = formatMMSS(Math.min(elapsed, state.currentFocus.durationMs));
      }
    }

    if (remaining <= 0 && !state.currentFocus.completed) {
      state.currentFocus.completed = true;
      if (els.focusStatus) {
        els.focusStatus.textContent = 'Focus window complete. I am ready for a water break. Press REAP to end focus.';
      }
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

      stopBgm();
      state.currentFocus = null;
      avatar.showFocusDisappointed();
      if (els.focusStatus) {
        els.focusStatus.textContent = 'You ended the focus window early. No rewards for this time.';
      }
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
    stopBgm();

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

    state.currentFocus = null;
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
    if (els.reapBtn) {
      els.reapBtn.disabled = false;
    }
    if (els.focusTimer) {
      els.focusTimer.textContent = '00:00';
    }
    avatar.showSetupIdle();
    if (els.focusStatus) {
      els.focusStatus.textContent = 'Farming in progress...';
    }
    if (els.focusModeText) {
      els.focusModeText.textContent = '';
    }
    stopBgm();
    emitFocusState({
      status: 'idle',
      remainingMs: 0,
      durationMs: 0,
    });
  }

  function init() {
    bgm.addEventListener('ended', () => {
      if (!state.currentFocus || state.currentFocus.completed) {
        return;
      }
      playRandomTrack();
    });

    els.farmBtn?.addEventListener('click', startFocus);
    els.reapBtn?.addEventListener('click', reapFocus);
    els.muteBtn?.addEventListener('click', toggleMute);
    els.volumeSlider?.addEventListener('input', setVolumeFromInput);
    updateMuteButton();
    updateVolumeUI();
  }

  return {
    init,
    resetFocusCycle,
  };
}
