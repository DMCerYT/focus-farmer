# Focus Farmer Chrome Extension Notes

This branch packages the existing game as a Chrome Extension (Manifest V3)
with an in-page overlay panel.

## Files Added
- `manifest.json`: Extension metadata and entry points.
- `background.js`: Injects/toggles an overlay in the active tab when the icon is clicked.
- `content-overlay.js`: Mounts a fixed panel above site content and hosts the game iframe.
- `game.html`: Extension-hosted page loaded inside the overlay iframe.
- `src/components/progress.js`: Local session tracking store with account-ready API hooks.

## Why Overlay Instead Of Tab/Popup
A popup closes when Chrome loses focus, and a separate tab interrupts browsing.
The overlay stays on top of the current site so gameplay can run in-context.

## Iteration Guide
- Add new UI screens in `game.html` and map their elements in `src/components/elements.js`.
- Add new screen routing in `src/components/screens.js`.
- Add feature state in `src/components/state.js`.
- Account integration path:
  - Keep `createProgressStore` method names stable.
  - Replace localStorage internals in `src/components/progress.js` with backend API calls.
- Add feature logic as a focused controller in `src/components/` and wire it in `src/app.js`.

## Load Locally In Chrome
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `/Users/dmcer/Documents/gamedev/based`.
5. Click the extension icon to show/hide the game overlay on the current page.
