/**
 * Controls the intro walkthrough overlay and step progression.
 */
export function createWalkthroughController(els, steps) {
  let stepIndex = 0;

  /**
   * Renders the current walkthrough step title/body/button text.
   */
  function renderStep() {
    const step = steps[stepIndex];
    els.walkthroughTitle.textContent = step.title;
    els.walkthroughBody.textContent = step.body;
    els.walkthroughNext.textContent = stepIndex === steps.length - 1 ? 'Start' : 'Next';
  }

  /**
   * Handles clicks on Next/Start and closes overlay after final step.
   */
  function onNext() {
    stepIndex += 1;
    if (stepIndex >= steps.length) {
      els.walkthrough.classList.add('hidden');
      return;
    }
    renderStep();
  }

  /**
   * Wires up events and paints the first walkthrough step.
   */
  function init() {
    els.walkthroughNext.addEventListener('click', onNext);
    renderStep();
  }

  return { init };
}
