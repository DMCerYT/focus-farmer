/**
 * Grabs and returns all DOM nodes used by the app.
 * Keeping selectors in one place makes UI refactors easier.
 */
export function getElements() {
  return {
    coinsPill: document.getElementById('coins-pill'),
    streakPill: document.getElementById('streak-pill'),

    focusSetupScreen: document.getElementById('focus-setup-screen'),
    focusRunScreen: document.getElementById('focus-run-screen'),
    summaryScreen: document.getElementById('summary-screen'),
    restScreen: document.getElementById('rest-screen'),
    setupCharacter: document.getElementById('setup-character'),

    focusMinutes: document.getElementById('focus-minutes'),
    timerStyle: document.getElementById('timer-style'),
    modeStyle: document.getElementById('mode-style'),
    outfitColor: document.getElementById('outfit-color'),

    farmBtn: document.getElementById('farm-btn'),
    focusModeText: document.getElementById('focus-mode-text'),
    focusCharacter: document.getElementById('focus-character'),
    focusStatus: document.getElementById('focus-status'),
    focusTimer: document.getElementById('focus-timer'),
    reapBtn: document.getElementById('reap-btn'),
    muteBtn: document.getElementById('mute-btn'),

    summaryText: document.getElementById('summary-text'),
    restBtn: document.getElementById('rest-btn'),

    breakMinutes: document.getElementById('break-minutes'),
    restCharacter: document.getElementById('rest-character'),
    restStatus: document.getElementById('rest-status'),
    restTimer: document.getElementById('rest-timer'),
    startRestBtn: document.getElementById('start-rest-btn'),
    adviceBtn: document.getElementById('advice-btn'),
    jokeBtn: document.getElementById('joke-btn'),
    islandBtn: document.getElementById('island-btn'),
    backToFocusBtn: document.getElementById('back-to-focus-btn'),
    dialogueOutput: document.getElementById('dialogue-output'),
    viewPenguinsBtn: document.getElementById('view-penguins-btn'),
    pullBtn: document.getElementById('pull-btn'),
    openGachaBtn: document.getElementById('open-gacha-btn'),
    closeGachaBtn: document.getElementById('close-gacha-btn'),
    closePenguinsBtn: document.getElementById('close-penguins-btn'),
    closePenguinsXBtn: document.getElementById('close-penguins-x-btn'),
    gachaModal: document.getElementById('gacha-modal'),
    penguinModal: document.getElementById('penguin-modal'),
    gachaCoinCount: document.getElementById('gacha-coin-count'),
    gachaResult: document.getElementById('gacha-result'),
    hatchEgg: document.getElementById('hatch-egg'),
    hatchPenguin: document.getElementById('hatch-penguin'),
    petList: document.getElementById('pet-list'),

    walkthrough: document.getElementById('walkthrough'),
    walkthroughTitle: document.getElementById('walkthrough-title'),
    walkthroughBody: document.getElementById('walkthrough-body'),
    walkthroughNext: document.getElementById('walkthrough-next'),
  };
}
