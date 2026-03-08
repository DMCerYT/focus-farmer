/**
 * Controls the intro walkthrough overlay and step progression.
 */
export function createWalkthroughController(els, steps) {
  const WALKTHROUGH_SEEN_KEY = 'focus-farmer-walkthrough-seen-v1';
  let stepIndex = 0;
  let advancedThisFrame = false;

  /**
   * Renders the current walkthrough step title/body/button text.
   */
  function renderStep() {
    if (!Array.isArray(steps) || steps.length === 0) {
      els.walkthrough?.classList.add('hidden');
      return;
    }

    const step = steps[stepIndex];
    if (!step) {
      els.walkthrough.classList.add('hidden');
      localStorage.setItem(WALKTHROUGH_SEEN_KEY, '1');
      return;
    }

    els.walkthroughTitle.textContent = step.title;
    els.walkthroughBody.textContent = step.body;
    els.walkthroughNext.textContent = stepIndex === steps.length - 1 ? 'Start' : 'Next';
  }

  /**
   * Handles clicks on Next/Start and closes overlay after final step.
   */
  function onNext(event) {
    event?.preventDefault?.();
    if (advancedThisFrame) {
      return;
    }
    advancedThisFrame = true;
    requestAnimationFrame(() => {
      advancedThisFrame = false;
    });

    stepIndex += 1;
    if (stepIndex >= steps.length) {
      els.walkthrough.classList.add('hidden');
      localStorage.setItem(WALKTHROUGH_SEEN_KEY, '1');
      return;
    }
    renderStep();
  }

  /**
   * Wires up events and paints the first walkthrough step.
   */
  function init() {
    if (!els.walkthrough || !els.walkthroughNext || !els.walkthroughTitle || !els.walkthroughBody) {
      return;
    }

    if (localStorage.getItem(WALKTHROUGH_SEEN_KEY) === '1') {
      els.walkthrough.classList.add('hidden');
      return;
    }

    els.walkthrough.classList.remove('hidden');
    stepIndex = 0;
    els.walkthroughNext.addEventListener('click', onNext);
    els.walkthroughNext.addEventListener('touchend', onNext, { passive: false });
    els.walkthroughNext.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        onNext(event);
      }
    });
    renderStep();
  }

  return { init };
}
