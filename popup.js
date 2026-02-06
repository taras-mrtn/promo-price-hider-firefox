const toggleSwitch = document.getElementById('toggleSwitch');
const statusDiv = document.getElementById('status');
const blurAdsCheckbox = document.getElementById('blurAds');
const hideAiButtonCheckbox = document.getElementById('hideAiButton');

function updateUI(enabled) {
  toggleSwitch.checked = enabled;
  blurAdsCheckbox.disabled = !enabled;
  hideAiButtonCheckbox.disabled = !enabled;
  if (enabled) {
    statusDiv.textContent = '✓ Активно — промо ціни приховано';
    statusDiv.className = 'status enabled';
  } else {
    statusDiv.textContent = '✗ Вимкнено — промо ціни видимі';
    statusDiv.className = 'status disabled';
  }
}

// Load current state when popup opens
browser.storage.local.get(['enabled', 'blurAds', 'hideAiButton']).then((result) => {
  blurAdsCheckbox.checked = result.blurAds !== false;
  hideAiButtonCheckbox.checked = result.hideAiButton !== false;
  updateUI(result.enabled !== false);
});

// Handle toggle switch change
toggleSwitch.addEventListener('change', () => {
  browser.runtime.sendMessage({ action: 'toggleState' }).then((response) => {
    updateUI(response.enabled);
  });
});

// Handle blur ads checkbox
blurAdsCheckbox.addEventListener('change', () => {
  browser.storage.local.set({ blurAds: blurAdsCheckbox.checked });
});

// Handle hide AI button checkbox
hideAiButtonCheckbox.addEventListener('change', () => {
  browser.storage.local.set({ hideAiButton: hideAiButtonCheckbox.checked });
});
