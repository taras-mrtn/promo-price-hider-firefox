// Initialize extension state on installation
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.set({ enabled: true });
  console.log('Promo Price Hider installed and enabled');
});

// Listen for messages from popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getState') {
    browser.storage.local.get('enabled').then((result) => {
      sendResponse({ enabled: result.enabled !== false });
    });
    return true;
  } else if (message.action === 'toggleState') {
    browser.storage.local.get('enabled').then((result) => {
      const newState = !(result.enabled !== false);
      browser.storage.local.set({ enabled: newState });
      sendResponse({ enabled: newState });
    });
    return true;
  }
});

// Update icon badge based on state
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled) {
    const enabled = changes.enabled.newValue;
    browser.browserAction.setBadgeText({
      text: enabled ? '' : 'OFF'
    });
    browser.browserAction.setBadgeBackgroundColor({
      color: '#f44336'
    });
  }
});

// Initialize badge on startup
browser.storage.local.get('enabled').then((result) => {
  const enabled = result.enabled !== false;
  if (!enabled) {
    browser.browserAction.setBadgeText({ text: 'OFF' });
    browser.browserAction.setBadgeBackgroundColor({ color: '#f44336' });
  }
});
