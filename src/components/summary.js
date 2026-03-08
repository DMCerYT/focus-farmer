/**
 * Controls summary text rendering and REST navigation action.
 */
export function createSummaryController(els, screens, setDialogue, avatar) {
  /**
   * Builds summary output from reward breakdown.
   */
  function render(result) {
    if (result.endedEarly) {
      avatar?.showFocusDisappointed?.();
      if (els.summaryStatus) {
        els.summaryStatus.textContent = 'Your farmer is disappointed that the harvest ended early.';
      }
      els.summaryText.textContent = `Early harvest ended. Your plants were not ready, so you earned 0 coins this run.`;
      screens.show('summary');
      return;
    }

    avatar?.showFocusComplete?.();
    if (els.summaryStatus) {
      els.summaryStatus.textContent = 'Great focus. Your crops are ready for harvest!';
    }

    const theoryLine = result.hardMode
      ? 'Excellent job staying on task! It\'s not easy but you did it regardless. Strong effort, stronger reward.'
      : 'It\'s okay to get distracted every now and then. Consistent effort builds momentum. That is what matters most!';

    const parts = [`${result.baseCoins} base`];
    if (result.hardBonus) parts.push(`${result.hardBonus} hard bonus`);
    if (result.luckyBonus) parts.push(`${result.luckyBonus} lucky harvest`);

    els.summaryText.textContent = `${theoryLine} You earned ${result.earned} coins (${parts.join(' + ')}).`;
    screens.show('summary');
  }

  /**
   * Handles the REST action after the summary is read.
   */
  function onRestClick() {
    screens.show('rest');
    setDialogue('Step back, then return refreshed.');
  }

  /**
   * Wires the REST button event.
   */
  function init() {
    els.restBtn.addEventListener('click', onRestClick);
  }

  return { init, render };
}
