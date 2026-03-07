const SHEETS = {
  front: {
    url: './assets/jojo_blue_front.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 5,
  },
  walk: {
    url: './assets/jojo_blue_walk.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 4,
  },
};

const SCALE = 3;

/**
 * Centralized sprite controller so UI screens share one animation system.
 */
export function createAvatarController(els) {
  const timers = new Map();

  function stop(el) {
    const timer = timers.get(el);
    if (timer) {
      clearInterval(timer);
      timers.delete(el);
    }
  }

  function setFrame(el, sheet, frame) {
    const frameIndex = Math.max(0, Math.min(sheet.frameCount - 1, frame));
    const frameSize = sheet.frameWidth * SCALE;
    const sheetWidth = sheet.frameWidth * sheet.frameCount * SCALE;
    const sheetHeight = sheet.frameHeight * SCALE;

    el.style.width = `${frameSize}px`;
    el.style.height = `${sheet.frameHeight * SCALE}px`;
    el.style.backgroundImage = `url(${sheet.url})`;
    el.style.backgroundSize = `${sheetWidth}px ${sheetHeight}px`;
    el.style.backgroundPosition = `-${frameIndex * frameSize}px 0px`;
  }

  function play(el, sheet, fps = 8) {
    stop(el);
    let frame = 0;
    setFrame(el, sheet, frame);
    const stepMs = Math.max(60, Math.floor(1000 / fps));

    const timer = setInterval(() => {
      frame = (frame + 1) % sheet.frameCount;
      setFrame(el, sheet, frame);
    }, stepMs);

    timers.set(el, timer);
  }

  function still(el, sheet, frame = 0) {
    stop(el);
    setFrame(el, sheet, frame);
  }

  function init() {
    still(els.setupCharacter, SHEETS.front, 0);
    still(els.focusCharacter, SHEETS.front, 0);
    still(els.restCharacter, SHEETS.front, 2);
  }

  function showSetupIdle() {
    still(els.setupCharacter, SHEETS.front, 0);
  }

  function showFocusWalk() {
    play(els.focusCharacter, SHEETS.walk, 9);
  }

  function showFocusComplete() {
    still(els.focusCharacter, SHEETS.front, 4);
  }

  function showFocusIdle() {
    still(els.focusCharacter, SHEETS.front, 0);
  }

  function showRestIdle() {
    still(els.restCharacter, SHEETS.front, 2);
  }

  function showRestDone() {
    still(els.restCharacter, SHEETS.front, 1);
  }

  return {
    init,
    showSetupIdle,
    showFocusWalk,
    showFocusComplete,
    showFocusIdle,
    showRestIdle,
    showRestDone,
  };
}
