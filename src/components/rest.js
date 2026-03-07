import { adviceLines, jokeLines } from './constants.js';
import { formatMMSS, randomFrom } from './utils.js';

/**
 * Rest controller.
 * Manages break timer, dialogue actions, and transition back to setup screen.
 */
export function createRestController({ els, state, screens, setDialogue, getIslandSummary, onBack }) {
  /**
   * Starts the break countdown timer and updates rest UI state.
   */
  function startRest() {
    const restMin = Number(els.breakMinutes.value);
    if (!Number.isFinite(restMin) || restMin < 1) {
      setDialogue('Please enter a valid break timer (1-60 minutes).');
      return;
    }

    const clampedMin = Math.min(60, Math.max(1, Math.floor(restMin)));
    state.restEndsAt = Date.now() + clampedMin * 60 * 1000;

    if (state.restTimerId) {
      clearInterval(state.restTimerId);
    }

    els.restCharacter.textContent = '😴';
    els.restCharacter.style.animation = 'rest 1.8s ease-in-out infinite';
    els.restStatus.textContent = 'Break active. Let your attention recover.';

    state.restTimerId = setInterval(tickRest, 250);
    tickRest();
  }

  /**
   * Timer tick callback for the rest screen countdown.
   */
  function tickRest() {
    const remaining = (state.restEndsAt || Date.now()) - Date.now();
    els.restTimer.textContent = formatMMSS(remaining);

    if (remaining <= 0 && state.restTimerId) {
      clearInterval(state.restTimerId);
      state.restTimerId = null;
      els.restStatus.textContent = 'Break done. You are ready to FARM again.';
      els.restCharacter.textContent = '🙂';
      els.restCharacter.style.animation = 'idle 1.2s ease-in-out infinite';
      els.restTimer.textContent = '00:00';
    }
  }

  /**
   * Stops any active break timer and resets rest display widgets.
   */
  function resetRestScreen() {
    if (state.restTimerId) {
      clearInterval(state.restTimerId);
      state.restTimerId = null;
    }
    state.restEndsAt = null;
    els.restTimer.textContent = '00:00';
    els.restStatus.textContent = 'Short rest available.';
    els.restCharacter.textContent = '😴';
    els.restCharacter.style.animation = 'idle 1.4s ease-in-out infinite';
  }

  /**
   * Returns the user to focus setup after rest actions.
   */
  function backToFocus() {
    resetRestScreen();
    screens.show('setup');
    setDialogue('');
    onBack();
  }

  /**
   * Wires all rest actions to UI buttons.
   */
  function init() {
    els.startRestBtn.addEventListener('click', startRest);
    els.adviceBtn.addEventListener('click', () => {
      setDialogue(`Advice: ${randomFrom(adviceLines)}`);
    });
    els.jokeBtn.addEventListener('click', () => {
      setDialogue(`Joke: ${randomFrom(jokeLines)}`);
    });
    els.islandBtn.addEventListener('click', () => {
      setDialogue(`Island Check: ${getIslandSummary()}`);
    });
    els.backToFocusBtn.addEventListener('click', backToFocus);
  }

  return {
    init,
    resetRestScreen,
  };
}
