const SHEETS = {
  blue: {
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
  },
  green: {
    front: {
      url: './assets/jojo_green_front.png',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 5,
    },
    walk: {
      url: './assets/jojo_green_walk.png',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
    },
  },
  red: {
    front: {
      url: './assets/jojo_red_front.png',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 5,
    },
    walk: {
      url: './assets/jojo_red_walk.png',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
    },
  },
};

const SCALE = 3;

/**
 * Centralized sprite controller so UI screens share one animation system.
 */
export function createAvatarController(els) {
  const timers = new Map();
  let outfitColor = 'blue';
  let currentPose = 'setupIdle';

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

  function currentSheets() {
    return SHEETS[outfitColor] || SHEETS.blue;
  }

  function applyPose(pose) {
    const sheets = currentSheets();
    currentPose = pose;
    // Keep setup preview synced to the selected outfit at all times.
    still(els.setupCharacter, sheets.front, 0);

    if (pose === 'focusWalk') {
      play(els.focusCharacter, sheets.walk, 9);
      return;
    }

    if (pose === 'focusComplete') {
      still(els.focusCharacter, sheets.front, 4);
      return;
    }

    if (pose === 'focusIdle') {
      still(els.focusCharacter, sheets.front, 0);
      return;
    }

    if (pose === 'restIdle') {
      still(els.restCharacter, sheets.front, 2);
      return;
    }

    if (pose === 'restDone') {
      still(els.restCharacter, sheets.front, 1);
      return;
    }

    still(els.focusCharacter, sheets.front, 0);
    still(els.restCharacter, sheets.front, 2);
  }

  function init() {
    applyPose('setupIdle');
  }

  function setOutfitColor(color) {
    if (!SHEETS[color]) {
      return;
    }
    outfitColor = color;
    applyPose(currentPose);
  }

  function showSetupIdle() {
    applyPose('setupIdle');
  }

  function showFocusWalk() {
    applyPose('focusWalk');
  }

  function showFocusComplete() {
    applyPose('focusComplete');
  }

  function showFocusIdle() {
    applyPose('focusIdle');
  }

  function showRestIdle() {
    applyPose('restIdle');
  }

  function showRestDone() {
    applyPose('restDone');
  }

  return {
    init,
    setOutfitColor,
    showSetupIdle,
    showFocusWalk,
    showFocusComplete,
    showFocusIdle,
    showRestIdle,
    showRestDone,
  };
}
