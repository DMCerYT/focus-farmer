/**
 * Creates a tiny screen router by toggling visibility classes.
 */
export function createScreenController(els) {
  /**
   * Shows one screen and hides the others.
   */
  function show(name) {
    els.focusSetupScreen.classList.toggle('hidden', name !== 'setup');
    els.focusRunScreen.classList.toggle('hidden', name !== 'focus');
    els.summaryScreen.classList.toggle('hidden', name !== 'summary');
    els.restScreen.classList.toggle('hidden', name !== 'rest');
  }

  return { show };
}
