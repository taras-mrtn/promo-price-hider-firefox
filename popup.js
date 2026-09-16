const toggleSwitch = document.getElementById('toggleSwitch');
const statusDiv = document.getElementById('status');
const blurAdsCheckbox = document.getElementById('blurAds');
const hideAiButtonCheckbox = document.getElementById('hideAiButton');
const hideTopBannerCheckbox = document.getElementById('hideTopBanner');
const hideMainSliderCheckbox = document.getElementById('hideMainSlider');
const sellerOnTopCheckbox = document.getElementById('sellerOnTop');
const rozetkaSellerOnlyCheckbox = document.getElementById('rozetkaSellerOnly');

function updateUI(enabled) {
  toggleSwitch.checked = enabled;
  blurAdsCheckbox.disabled = !enabled;
  hideAiButtonCheckbox.disabled = !enabled;
  hideTopBannerCheckbox.disabled = !enabled;
  hideMainSliderCheckbox.disabled = !enabled;
  sellerOnTopCheckbox.disabled = !enabled;
  rozetkaSellerOnlyCheckbox.disabled = !enabled;
  if (enabled) {
    statusDiv.textContent = '✓ Активно — промо ціни приховано';
    statusDiv.className = 'status enabled';
  } else {
    statusDiv.textContent = '✗ Вимкнено — промо ціни видимі';
    statusDiv.className = 'status disabled';
  }
}

// Load current state when popup opens
browser.storage.local.get(['enabled', 'blurAds', 'hideAiButton', 'sellerOnTop', 'rozetkaSellerOnly', 'hideTopBanner', 'hideMainSlider']).then((result) => {
  blurAdsCheckbox.checked = result.blurAds !== false;
  hideAiButtonCheckbox.checked = result.hideAiButton !== false;
  hideTopBannerCheckbox.checked = result.hideTopBanner !== false;
  hideMainSliderCheckbox.checked = result.hideMainSlider !== false;
  sellerOnTopCheckbox.checked = result.sellerOnTop !== false;
  rozetkaSellerOnlyCheckbox.checked = result.rozetkaSellerOnly === true;
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

// Handle seller filter on top checkbox
sellerOnTopCheckbox.addEventListener('change', () => {
  browser.storage.local.set({ sellerOnTop: sellerOnTopCheckbox.checked });
});

// Handle Rozetka-only seller checkbox
rozetkaSellerOnlyCheckbox.addEventListener('change', () => {
  browser.storage.local.set({ rozetkaSellerOnly: rozetkaSellerOnlyCheckbox.checked });
});

// Handle top banner checkbox
hideTopBannerCheckbox.addEventListener('change', () => {
  browser.storage.local.set({ hideTopBanner: hideTopBannerCheckbox.checked });
});

// Handle main slider checkbox
hideMainSliderCheckbox.addEventListener('change', () => {
  browser.storage.local.set({ hideMainSlider: hideMainSliderCheckbox.checked });
});
