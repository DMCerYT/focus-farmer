/**
 * Opens or toggles the Focus Farmer overlay in the active tab.
 * Flow:
 * 1) Try messaging an already-injected overlay script.
 * 2) If not present, inject the overlay script once.
 */
async function toggleOverlay(tab) {
  if (!tab?.id) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'FOCUS_FARMER_TOGGLE' });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-overlay.js'],
      });
    } catch {
      // Some pages (for example chrome:// URLs) do not allow script injection.
    }
  }
}

chrome.action.onClicked.addListener(toggleOverlay);
