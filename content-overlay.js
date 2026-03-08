const OVERLAY_ROOT_ID = 'focus-farmer-overlay-root';
const PANEL_ID = 'focus-farmer-overlay-panel';
const BADGE_ID = 'focus-farmer-badge';
const RING_RADIUS = 22;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const GAME_PAGE_URL = chrome.runtime.getURL('game.html');

let panelEl = null;
let badgeEl = null;
let badgeRingEl = null;
let badgeTimeEl = null;
let gameFrameEl = null;

function formatMMSS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Paints the floating circle with the latest timer state.
 */
function updateBadge(timerState) {
  if (!badgeEl || !badgeRingEl || !badgeTimeEl) {
    return;
  }

  const status = timerState?.status ?? 'idle';
  const remainingMs = Math.max(0, Number(timerState?.remainingMs || 0));
  const durationMs = Math.max(0, Number(timerState?.durationMs || 0));

  let ratio = 1;
  if (status === 'running' || status === 'complete') {
    ratio = durationMs > 0 ? remainingMs / durationMs : 0;
  }

  ratio = Math.max(0, Math.min(1, ratio));
  const dashOffset = RING_CIRCUMFERENCE * (1 - ratio);

  badgeRingEl.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  badgeRingEl.style.strokeDashoffset = String(dashOffset);

  if (status === 'running') {
    badgeEl.dataset.status = 'running';
    badgeTimeEl.textContent = formatMMSS(remainingMs);
    return;
  }

  if (status === 'complete') {
    badgeEl.dataset.status = 'complete';
    badgeTimeEl.textContent = '00:00';
    return;
  }

  badgeEl.dataset.status = 'idle';
  badgeTimeEl.textContent = 'Ready';
  badgeRingEl.style.strokeDashoffset = '0';
}

function setPanelVisible(visible) {
  if (!panelEl) {
    return;
  }
  panelEl.classList.toggle('hidden', !visible);
}

function togglePanel() {
  if (!panelEl) {
    return;
  }
  panelEl.classList.toggle('hidden');
}

/**
 * Renders a fixed panel in a Shadow DOM to avoid host CSS collisions.
 */
function mountOverlay() {
  const existing = document.getElementById(OVERLAY_ROOT_ID);
  if (existing) {
    togglePanel();
    return;
  }

  const root = document.createElement('div');
  root.id = OVERLAY_ROOT_ID;
  document.documentElement.appendChild(root);

  const shadow = root.attachShadow({ mode: 'open' });
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <style>
      :host { all: initial; }
      .panel {
        position: fixed;
        top: 12px;
        right: 12px;
        width: min(430px, calc(100vw - 24px));
        height: min(760px, calc(100vh - 24px));
        z-index: 2147483647;
        border: 1px solid #d8c5a8;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 14px 40px rgba(19, 16, 11, 0.28);
        background: #fffaf2;
        display: grid;
        grid-template-rows: auto 1fr;
      }
      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        background: #f3e7d3;
        border-bottom: 1px solid #dec8a4;
        font: 600 13px/1.2 "Avenir Next", "Trebuchet MS", sans-serif;
        color: #2d261f;
      }
      .toolbar button {
        border: 1px solid #d2b68a;
        background: #fff7ea;
        color: #2d261f;
        border-radius: 8px;
        padding: 4px 8px;
        cursor: pointer;
        font: 600 12px/1 "Avenir Next", "Trebuchet MS", sans-serif;
      }
      iframe {
        width: 100%;
        height: 100%;
        border: 0;
        background: #fffaf2;
      }
      .hidden {
        display: none;
      }
      .badge {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483647;
        width: 76px;
        height: 76px;
        border: 0;
        border-radius: 999px;
        background: #fff8ec;
        box-shadow: 0 12px 30px rgba(19, 16, 11, 0.24);
        color: #2d261f;
        cursor: pointer;
        display: grid;
        place-items: center;
        padding: 0;
      }
      .badge[data-status="running"] {
        box-shadow: 0 12px 30px rgba(47, 122, 63, 0.28);
      }
      .badge[data-status="complete"] {
        box-shadow: 0 12px 30px rgba(212, 107, 31, 0.3);
      }
      .badge svg {
        width: 60px;
        height: 60px;
      }
      .track {
        fill: none;
        stroke: #e9d9bc;
        stroke-width: 5;
      }
      .progress {
        fill: none;
        stroke: #2f7a3f;
        stroke-width: 5;
        stroke-linecap: round;
        transform-origin: 50% 50%;
        transform: rotate(-90deg);
        transition: stroke-dashoffset 180ms linear, stroke 180ms ease;
      }
      .badge[data-status="complete"] .progress {
        stroke: #d46b1f;
      }
      .time {
        position: absolute;
        font: 700 10px/1 "Avenir Next", "Trebuchet MS", sans-serif;
        max-width: 64px;
        text-align: center;
      }
    </style>

    <section class="panel" id="${PANEL_ID}">
      <header class="toolbar">
        <span>Focus Farmer</span>
        <button id="focus-farmer-close" type="button">Hide</button>
      </header>
      <iframe id="focus-farmer-frame" src="${GAME_PAGE_URL}" title="Focus Farmer"></iframe>
    </section>

    <button class="badge" id="${BADGE_ID}" data-status="idle" title="Toggle Focus Farmer">
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle class="track" cx="30" cy="30" r="${RING_RADIUS}"></circle>
        <circle class="progress" id="focus-farmer-badge-progress" cx="30" cy="30" r="${RING_RADIUS}"></circle>
      </svg>
      <span class="time" id="focus-farmer-badge-time">Ready</span>
    </button>
  `;

  shadow.appendChild(wrapper);

  panelEl = shadow.getElementById(PANEL_ID);
  badgeEl = shadow.getElementById(BADGE_ID);
  badgeRingEl = shadow.getElementById('focus-farmer-badge-progress');
  badgeTimeEl = shadow.getElementById('focus-farmer-badge-time');
  gameFrameEl = shadow.getElementById('focus-farmer-frame');

  const closeBtn = shadow.getElementById('focus-farmer-close');
  closeBtn.addEventListener('click', () => setPanelVisible(false));
  badgeEl.addEventListener('click', () => togglePanel());

  updateBadge({ status: 'idle', remainingMs: 0, durationMs: 0 });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'FOCUS_FARMER_TOGGLE') {
    return;
  }

  const root = document.getElementById(OVERLAY_ROOT_ID);
  if (!root) {
    mountOverlay();
    return;
  }

  togglePanel();
});

window.addEventListener('message', (event) => {
  if (event.data?.source !== 'focus-farmer' || event.data?.type !== 'timer-update') {
    return;
  }

  if (gameFrameEl && event.source !== gameFrameEl.contentWindow) {
    return;
  }

  updateBadge(event.data.timerState);
});

mountOverlay();
