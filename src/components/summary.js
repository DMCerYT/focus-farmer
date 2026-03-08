/**
 * Controls summary text rendering and REST navigation action.
 */
export function createSummaryController(els, screens, setDialogue) {
  /**
   * Builds summary output from reward breakdown.
   */
  function render(result) {
    if (result.endedEarly) {
      els.summaryText.textContent = `Early harvest ended. Your plants were not ready, so you earned 0 coins this run.`;
      screens.show('summary');
      return;
    }

    const theoryLine = result.hardMode
      ? 'Flow + autonomy achieved in hard mode. Strong effort, stronger reward.'
      : 'Flow + autonomy achieved in regular mode. Consistent effort builds momentum.';

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
    setDialogue('Attention Restoration Theory: step back, then return refreshed.');
  }

  /**
   * Wires the REST button event.
   */
  function init() {
    els.restBtn.addEventListener('click', onRestClick);
  }

  return { init, render };
}
