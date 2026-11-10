  /* ======================================================================================================
     Master -> Features: same page as the real app, with the "Powered by Findter badge" container added under "Recommended Apps"
       - Features and Recommended Apps are static copies of what the real tab shows (nothing in them works here)
       - the badge container has one thing only: "Remove or restore for one store" - a CSE types a store's domain and removes the badge for it (the store could not find the Remove row) or restores it (testing). It acts at once, no chat, no Save.
       - there is no switch for everyone, no shop-type list and no link field: those are in the theme extension code (a change is a deploy). The badge is a flag per store, see build/watermark.js.
     This file is spliced into app.js at build time (tools/build.js), so it shares that file's scope.
     ====================================================================================================== */
  const WM = window.FindterWatermark;
  const FT_FEATURES = [['ymm', 'Year Make Model'], ['grouped_filter', 'Merged values group'], ['synonym_search', 'Synonym search'], ['custom_sort', 'Custom sort options'], ['advanced_search', 'Advanced search options'], ['translation', 'Multi-language filter & search'], ['advanced_variant_filter', 'Hide out-of-stock variant products'], ['variant_filter', 'Boost in-stock variant products'], ['sale_filter', 'Sale filter'], ['swatch_image', 'Image swatches filter'], ['market_currency', 'Local currency adaption'], ['multi_source', 'Multi-filters by one source'], ['filter_count_value', 'Filter value count'], ['collection_search', 'Search in collection'], ['search_within_filter', 'Search in filter']];
  const ftActs = label => `<span class="ft-acts"><button type="button" class="ft-ico" data-ft-static aria-label="Edit ${label}">${PEN_ICON}</button><button type="button" class="ft-ico" data-ft-static aria-label="Delete ${label}">${BIN_ICON}</button></span>`;
  const ftSave = `<div class="prm-foot"><button type="button" class="${BTN1} Polaris-Button--disabled" disabled>${btnText('Save')}</button></div>`;
  const ftFeaturesCard = () => `<div class="prm-card"><div class="ft-head"><h2>Features</h2><button type="button" class="${BTN1}" data-ft-static>${btnText('Add new feature')}</button></div>`
    + `<div class="prm-scroll"><div class="ft-table ft-table--features"><div class="ft-thead" aria-hidden="true"><span></span><span>Status</span><span>Thumbnail</span><span>Code</span><span>Name</span><span>Action</span></div>`
    + FT_FEATURES.map(([code, name]) => `<div class="ft-row"><span class="prm-handle" aria-hidden="true">${DRAG_ICON}</span><span><input type="checkbox" class="ft-switch" role="switch" data-ft-static aria-label="${name}" checked></span><span><span class="ft-thumb"></span></span><span>${code}</span><span>${name}</span>${ftActs(name)}</div>`).join('')
    + `</div></div>${ftSave}</div>`;
  const ftAppsCard = () => `<div class="prm-card"><div class="ft-head"><h2>Recommended Apps</h2><button type="button" class="${BTN1}" data-ft-static>${btnText('Add new app')}</button></div>`
    + `<div class="ft-box"><h3>Live Storefront Preview</h3><div class="ft-app"><span class="ft-thumb"></span><div><strong>Sample app</strong><span class="prm-chip">Sample</span></div><p>A sample recommended app</p><button type="button" class="${BTN2}" data-ft-static>${btnText('View app')}</button></div></div>`
    + `<h3 class="ft-sub">Manage Apps</h3><div class="prm-scroll"><div class="ft-table ft-table--apps"><div class="ft-thead" aria-hidden="true"><span></span><span>Thumbnail</span><span>Name</span><span>Badge</span><span>Description</span><span>Action</span></div>`
    + `<div class="ft-row"><span class="prm-handle" aria-hidden="true">${DRAG_ICON}</span><span><span class="ft-thumb"></span></span><span>Sample app</span><span>Sample</span><span>A sample recommended app</span>${ftActs('Sample app')}</div></div></div>${ftSave}</div>`;
  function renderWatermarkMaster() {
    panelFeat.innerHTML = ftFeaturesCard() + ftAppsCard()
      + `<div class="prm-card" data-wm-master><h2>Powered by Findter badge</h2>`
      + `<div class="wm-shop" data-wm-shop-box><h3>Remove or restore for one store</h3><p class="prm-hint">Enter the store's domain. Remove: the store counts as removed. Restore: the badge is on again. Clear: the store has no badge setting at all (like a store that was paying at the release), for testing.</p>`
      + `<div class="prm-field" data-wm-domain-field><label class="prm-label" for="wm-domain">Store domain</label><div class="prm-input"><input id="wm-domain" type="text" data-wm-domain placeholder="abc-store.myshopify.com" autocomplete="off" spellcheck="false"></div>`
      + `<span class="prm-err" data-wm-domain-err>Enter a domain like abc-store.myshopify.com</span><span class="prm-hint" data-wm-domain-status></span></div>`
      + `<div class="prm-foot wm-shop__acts"><button type="button" class="${BTN2} Polaris-Button--disabled" data-wm-shop="remove" disabled>${btnText('Remove badge')}</button><button type="button" class="${BTN2} Polaris-Button--disabled" data-wm-shop="restore" disabled>${btnText('Restore badge')}</button><button type="button" class="${BTN2} Polaris-Button--disabled" data-wm-shop="none" disabled>${btnText('Clear badge')}</button></div></div></div>`;
    syncShopBox(false);
  }
  const wmDomain = () => $('[data-wm-domain]', panelFeat).value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const wmDomainOk = d => /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(d);
  function syncShopBox(touched) {                                           // the field + the two buttons follow the domain and that store's current state
    const inp = $('[data-wm-domain]', panelFeat); if (!inp) return;
    const d = wmDomain(), ok = wmDomainOk(d), st = ok ? WM.shopState(d) : '';
    $('[data-wm-domain-field]', panelFeat).classList.toggle('is-error', !!inp.value.trim() && !ok && touched);
    $('[data-wm-domain-status]', panelFeat).textContent = ok ? 'Badge on the storefront: ' + st : '';
    setBtn($('[data-wm-shop=remove]', panelFeat), !ok || st === 'Removed'); setBtn($('[data-wm-shop=restore]', panelFeat), !ok || st === 'Shown'); setBtn($('[data-wm-shop=none]', panelFeat), !ok || st === 'Not set');
  }
  panelFeat.addEventListener('input', e => { if (e.target.matches('[data-wm-domain]')) syncShopBox(false); });
  panelFeat.addEventListener('focusout', e => { if (e.target.matches('[data-wm-domain]')) syncShopBox(true); });
  WM.onChange(() => syncShopBox(false));                                       // the demo bar or the Filter design row changed this store
  panelFeat.addEventListener('click', e => {
    if (e.target.closest('[data-ft-static]')) { e.preventDefault(); toast('Only the Powered by Findter badge setting works in this copy'); return; }
    const sb = e.target.closest('[data-wm-shop]');
    if (sb) { if (sb.disabled) return; const d = wmDomain(), act = sb.dataset.wmShop; WM.setShopState(d, act === 'remove' ? 'removed' : act === 'none' ? 'none' : 'shown'); syncShopBox(false); toast('Badge ' + (act === 'remove' ? 'removed' : act === 'none' ? 'cleared' : 'restored') + ' for ' + d); return; }
  });
