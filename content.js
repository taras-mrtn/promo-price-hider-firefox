// State management
let isEnabled = true;
let blurAds = true;
let hideAiButton = true;
let hiddenElements = new Set();

// Hide an element with display:none, saving original value for restoration
function hideElement(element) {
  if (element.hasAttribute('data-hidden-by-extension')) return false;
  element.setAttribute('data-hidden-by-extension', 'true');
  element.setAttribute('data-original-display', element.style.display || '');
  element.style.setProperty('display', 'none', 'important');
  hiddenElements.add(element);
  return true;
}

// Blur an element (used for ad tiles)
function blurElement(element) {
  if (element.hasAttribute('data-hidden-by-extension')) return false;
  element.setAttribute('data-hidden-by-extension', 'true');
  element.setAttribute('data-original-filter', element.style.filter || '');
  element.setAttribute('data-original-opacity', element.style.opacity || '');
  element.style.filter = 'blur(15px)';
  element.style.opacity = '0.5';
  element.style.pointerEvents = 'none';
  element.style.userSelect = 'none';
  hiddenElements.add(element);
  return true;
}

// Prune detached DOM nodes from the Set to prevent memory leaks during SPA navigation
function pruneDetachedElements() {
  for (const element of hiddenElements) {
    if (!document.contains(element)) {
      hiddenElements.delete(element);
    }
  }
}

// Function to hide promo price elements
function hidePromoPrice() {
  if (!isEnabled) return;

  let hiddenCount = 0;

  // Promo prices with data-testid
  document.querySelectorAll('[data-testid="promo-price"]').forEach(element => {
    if (hideElement(element)) hiddenCount++;
  });

  // Red label buttons (contains promo price + red card image)
  document.querySelectorAll('button.red-label, button[title*="Картка Rozetka"]').forEach(button => {
    if (hideElement(button)) hiddenCount++;
  });

  // Red card images
  document.querySelectorAll('img.red-card').forEach(img => {
    if (hideElement(img)) hiddenCount++;
  });

  // <rz-red-price> component on product detail pages
  document.querySelectorAll('rz-red-price').forEach(component => {
    if (hideElement(component)) hiddenCount++;
  });

  // "Ціна при оплаті Карткою Rozetka" text
  document.querySelectorAll('rz-red-price span, .red-label span, button[title*="Картка"] span').forEach(span => {
    if (span.textContent.includes('Ціна при оплаті Карткою Rozetka')) {
      if (hideElement(span)) hiddenCount++;
    }
  });

  // Blur advertisement tiles (by "Реклама" label)
  if (blurAds) {
    document.querySelectorAll('rz-tile-info').forEach(element => {
      const span = element.querySelector('span.text-base.color-black-60');
      if (span && span.textContent.trim() === 'Реклама') {
        const adTile = element.closest('rz-product-tile, rz-goods-tile, rz-catalog-tile');
        if (adTile && blurElement(adTile)) hiddenCount++;
      }
    });
  }

  // Red bonus blocks ("+bonus for Kartka Rozetka")
  document.querySelectorAll('rz-tile-bonus').forEach(element => {
    if (element.querySelector('.bonus__red, .red-icon')) {
      if (hideElement(element)) hiddenCount++;
    }
  });
  document.querySelectorAll('rz-product-red-bonus').forEach(element => {
    if (hideElement(element)) hiddenCount++;
  });

  // Product banners
  document.querySelectorAll('rz-product-banner').forEach(element => {
    if (hideElement(element)) hiddenCount++;
  });

  // "Картка Rozetka" promo banner on main page
  document.querySelectorAll('rz-red-card-link').forEach(element => {
    if (hideElement(element)) hiddenCount++;
  });

  // Blur advertisement tiles
  if (blurAds) {
    // Sponsored links (by attribute)
    document.querySelectorAll("rz-product-tile a[rel~='sponsored'], rz-product-tile a[href*='advToken='], rz-product-tile a[href*='advSource=']").forEach(link => {
      const adTile = link.closest('rz-product-tile');
      if (adTile && blurElement(adTile)) hiddenCount++;
    });

    // Advertising carousels
    document.querySelectorAll('rz-section-slider[data-testid="advertising-slider"], rz-section-slider.advertising-slider-theme').forEach(element => {
      if (hideElement(element)) hiddenCount++;
    });
  }

  // Rozetka AI chat bot button + consultation placeholder
  if (hideAiButton) {
    document.querySelectorAll('rz-chat-bot-button-assist, rz-chat-bot-button-placeholder').forEach(element => {
      if (hideElement(element)) hiddenCount++;
    });
  }

  if (hiddenCount > 0) {
    console.log(`Promo Price Hider: Hidden ${hiddenCount} new promo price elements`);
  }
}

// Function to show all previously hidden elements
function showPromoPrice() {
  hiddenElements.forEach(element => {
    if (element.hasAttribute('data-hidden-by-extension')) {
      const originalDisplay = element.getAttribute('data-original-display');
      if (originalDisplay) {
        element.style.display = originalDisplay;
      } else {
        element.style.removeProperty('display');
      }
      element.style.filter = element.getAttribute('data-original-filter') || '';
      element.style.opacity = element.getAttribute('data-original-opacity') || '';
      element.style.pointerEvents = '';
      element.style.userSelect = '';

      element.removeAttribute('data-hidden-by-extension');
      element.removeAttribute('data-original-display');
      element.removeAttribute('data-original-filter');
      element.removeAttribute('data-original-opacity');
    }
  });
  hiddenElements.clear();
  console.log('Promo Price Hider: Showed all hidden promo prices');
}

// Get initial state from storage
browser.storage.local.get(['enabled', 'blurAds', 'hideAiButton']).then((result) => {
  isEnabled = result.enabled !== false;
  blurAds = result.blurAds !== false;
  hideAiButton = result.hideAiButton !== false;
  if (isEnabled) {
    initializeHiding();
  }
});

// Listen for state changes via storage (reliable across all contexts)
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  let needsReapply = false;

  if (changes.enabled) {
    isEnabled = changes.enabled.newValue !== false;
    if (!isEnabled) {
      showPromoPrice();
      return;
    }
    needsReapply = true;
  }
  if (changes.blurAds) {
    blurAds = changes.blurAds.newValue !== false;
    needsReapply = true;
  }
  if (changes.hideAiButton) {
    hideAiButton = changes.hideAiButton.newValue !== false;
    needsReapply = true;
  }

  if (needsReapply) {
    showPromoPrice();
    if (isEnabled) hidePromoPrice();
  }
});

// Initialize hiding functionality
function initializeHiding() {
  hidePromoPrice();

  // Catch dynamically loaded content
  setTimeout(hidePromoPrice, 1000);
  setTimeout(hidePromoPrice, 3000);

  // MutationObserver with debounce for dynamically loaded content
  let mutationTimeout;
  const observer = new MutationObserver(() => {
    if (isEnabled) {
      clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(hidePromoPrice, 100);
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hidePromoPrice);
  } else {
    hidePromoPrice();
  }

  // Debounced scroll handler for lazy loaded content
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (isEnabled) {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(hidePromoPrice, 300);
    }
  }, { passive: true });

  // Periodically prune detached nodes to prevent memory leaks
  setInterval(pruneDetachedElements, 30000);
}
