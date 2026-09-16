// State management
let isEnabled = true;
let blurAds = true;
let hideAiButton = true;
let sellerOnTop = true;
let rozetkaSellerOnly = false;
let hideTopBanner = true;
let hideMainSlider = true;
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

// Stylesheet rule that beats the page's inline order (Angular rewrites inline styles on hydration)
const SELLER_TOP_ATTR = 'data-promo-price-hider-top';
function ensureSellerTopStyle() {
  if (document.getElementById('promo-price-hider-style')) return;
  const style = document.createElement('style');
  style.id = 'promo-price-hider-style';
  style.textContent = `[${SELLER_TOP_ATTR}] { order: -100 !important; }`;
  (document.head || document.documentElement).appendChild(style);
}

// Move an element to the top of a grid/flex container by marking it for the stylesheet rule above
function moveToTop(element) {
  ensureSellerTopStyle();
  if (element.hasAttribute(SELLER_TOP_ATTR)) return false;
  element.setAttribute(SELLER_TOP_ATTR, 'true');
  hiddenElements.add(element);
  return true;
}

// Find the "Продавець" (seller) filter block in the catalog sidebar, if present in this session
function findSellerFilter() {
  for (const details of document.querySelectorAll('details[data-testid="filter"]')) {
    const summary = details.querySelector('summary');
    if (summary && summary.textContent.trim().startsWith('Продавець')) return details;
  }
  return null;
}

// Identify the seller-filter scope of the current page: a catalog category or a search query
function getSellerScope() {
  const category = location.pathname.match(/\/c(\d+)\//);
  if (category) return 'category:' + category[1];
  if (/^\/(?:ua\/)?search\/?$/.test(location.pathname)) {
    return 'search:' + (new URL(location.href).searchParams.get('text') || '');
  }
  return null;
}

// Build the current page URL with seller=rozetka_only added (add=true) or removed (add=false).
// Catalog pages keep filters in a ";"-joined path segment after /c<id>/; search pages use query params.
function buildSellerUrl(url, add) {
  const parsed = new URL(url);
  if (/^\/(?:ua\/)?search\/?$/.test(parsed.pathname)) {
    const has = parsed.searchParams.get('seller') === 'rozetka_only';
    if (add === has) return null;
    if (add) parsed.searchParams.set('seller', 'rozetka_only');
    else parsed.searchParams.delete('seller');
    return parsed.href;
  }
  const match = url.match(/^(https?:\/\/[^/]+\/(?:ua\/)?[^/]+\/c\d+\/)([^/?#]*=[^/?#]*\/)?(.*)$/);
  if (!match) return null;
  let filters = match[2] ? match[2].slice(0, -1).split(';') : [];
  const has = filters.includes('seller=rozetka_only');
  if (add) {
    if (filters.some(f => f.startsWith('seller='))) return null;
    filters.push('seller=rozetka_only');
    filters.sort();
  } else {
    if (!has) return null;
    filters = filters.filter(f => f !== 'seller=rozetka_only');
  }
  const segment = filters.length ? filters.join(';') + '/' : '';
  return match[1] + segment + match[3];
}

function sellerAppliedKey(scope) {
  return 'promoPriceHider.sellerApplied.' + scope;
}

// Redirect to the Rozetka-only seller view once per scope per tab, so manual changes are respected
function applyRozetkaSellerOnly(sellerFilter) {
  if (sellerFilter.querySelector('.rz-checkbox--checked, .rz-checkbox--intermediate')) return;
  const scope = getSellerScope();
  if (!scope) return;
  const key = sellerAppliedKey(scope);
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch (e) {
    return;
  }
  const target = buildSellerUrl(location.href, true);
  if (target && target !== location.href) {
    console.log('Promo Price Hider: Applying Rozetka-only seller filter');
    location.assign(target);
  }
}

// Forget that the filter was applied for the current scope, so it can be applied again
function resetRozetkaSellerGuard() {
  const scope = getSellerScope();
  if (!scope) return;
  try { sessionStorage.removeItem(sellerAppliedKey(scope)); } catch (e) { /* ignore */ }
}

// If the extension added seller=rozetka_only to this page, remove it and navigate back
function undoRozetkaSellerOnly() {
  const scope = getSellerScope();
  if (!scope) return;
  let applied = false;
  try { applied = !!sessionStorage.getItem(sellerAppliedKey(scope)); } catch (e) { return; }
  if (!applied) return;
  resetRozetkaSellerGuard();
  const target = buildSellerUrl(location.href, false);
  if (target && target !== location.href) {
    console.log('Promo Price Hider: Removing Rozetka-only seller filter');
    location.assign(target);
  }
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

  // Top page banner strip above the header (main page)
  if (hideTopBanner) {
    document.querySelectorAll('rz-top-page-banner').forEach(element => {
      if (hideElement(element)) hiddenCount++;
    });
  }

  // Main promo slider next to the catalog menu (main page)
  if (hideMainSlider) {
    document.querySelectorAll('rz-top-slider').forEach(element => {
      if (hideElement(element)) hiddenCount++;
    });
  }

  // Rozetka AI chat bot button + consultation placeholder
  if (hideAiButton) {
    document.querySelectorAll('rz-chat-bot-button-assist, rz-chat-bot-button-placeholder').forEach(element => {
      if (hideElement(element)) hiddenCount++;
    });
  }

  // Seller filter block: move to top and/or auto-select Rozetka as seller
  if (sellerOnTop || rozetkaSellerOnly) {
    const sellerFilter = findSellerFilter();
    if (sellerFilter) {
      if (sellerOnTop && moveToTop(sellerFilter)) hiddenCount++;
      if (rozetkaSellerOnly) applyRozetkaSellerOnly(sellerFilter);
    }
  }

  if (hiddenCount > 0) {
    console.log(`Promo Price Hider: Hidden ${hiddenCount} new promo price elements`);
  }
}

// Restore one inline style property only if the extension saved it
function restoreStyle(element, property, attribute) {
  if (!element.hasAttribute(attribute)) return;
  const original = element.getAttribute(attribute);
  if (original) {
    element.style.setProperty(property, original);
  } else {
    element.style.removeProperty(property);
  }
}

// Function to show all previously hidden elements
function showPromoPrice() {
  hiddenElements.forEach(element => {
    element.removeAttribute(SELLER_TOP_ATTR);
    if (element.hasAttribute('data-hidden-by-extension')) {
      restoreStyle(element, 'display', 'data-original-display');
      restoreStyle(element, 'filter', 'data-original-filter');
      restoreStyle(element, 'opacity', 'data-original-opacity');
      if (element.hasAttribute('data-original-filter')) {
        element.style.pointerEvents = '';
        element.style.userSelect = '';
      }

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
browser.storage.local.get(['enabled', 'blurAds', 'hideAiButton', 'sellerOnTop', 'rozetkaSellerOnly', 'hideTopBanner', 'hideMainSlider']).then((result) => {
  isEnabled = result.enabled !== false;
  blurAds = result.blurAds !== false;
  hideAiButton = result.hideAiButton !== false;
  sellerOnTop = result.sellerOnTop !== false;
  rozetkaSellerOnly = result.rozetkaSellerOnly === true;
  hideTopBanner = result.hideTopBanner !== false;
  hideMainSlider = result.hideMainSlider !== false;
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
      if (rozetkaSellerOnly) undoRozetkaSellerOnly();
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
  if (changes.hideTopBanner) {
    hideTopBanner = changes.hideTopBanner.newValue !== false;
    needsReapply = true;
  }
  if (changes.hideMainSlider) {
    hideMainSlider = changes.hideMainSlider.newValue !== false;
    needsReapply = true;
  }
  if (changes.sellerOnTop) {
    sellerOnTop = changes.sellerOnTop.newValue !== false;
    needsReapply = true;
  }
  if (changes.rozetkaSellerOnly) {
    rozetkaSellerOnly = changes.rozetkaSellerOnly.newValue === true;
    if (rozetkaSellerOnly) {
      resetRozetkaSellerGuard();
    } else {
      undoRozetkaSellerOnly();
    }
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
