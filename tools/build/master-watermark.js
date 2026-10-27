  /* ======================================================================================================
     Master -> Features: same page as the real app, with the "Powered by Findter" badge container added under "Recommended Apps"
       - Features and Recommended Apps are static copies of what the real tab shows (nothing in them works here)
       - the badge container: title, "Enable the badge" tickbox, "Apply to" shop types (each with its note, like Promotion), and its own Save button at the bottom of the container
       - a draft until Save; the tab gets the orange dot while there is something unsaved
     The saved config is read by the Search settings card ("Remove “Powered by Findter” badge") and by the sample storefront (build/watermark.js).
     This file is spliced into app.js at build time (tools/build.js), so it shares that file's scope.
     ====================================================================================================== */
  const WM = window.FindterWatermark;
  let wmDraft = WM.config();
  const wmSame = (a, b) => a.enabled === b.enabled && a.types.length === b.types.length && a.types.every(t => b.types.includes(t));
  function wmDirty() { return !wmSame(wmDraft, WM.config()); }
  const wmCheck = (attrs, label, hint, on, off) => `<div class="prm-check"><label><input type="checkbox" ${attrs}${on ? ' checked' : ''}${off ? ' disabled' : ''}> <span>${label}</span></label>${hint ? `<span class="prm-hint">${hint}</span>` : ''}</div>`;
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
    wmDraft = WM.config();
    panelFeat.innerHTML = ftFeaturesCard() + ftAppsCard()
      + `<div class="prm-card" data-wm-master><h2>Powered by Findter badge</h2>${wmCheck('data-wm="enabled"', 'Enable the badge', '', wmDraft.enabled)}`
      + `<div data-wm-types><div class="prm-label ft-apply">Apply to</div>`
      + WM.SHOP_TYPES.map(([n, d]) => wmCheck(`data-wm-type="${escHtml(n)}"`, n, d, wmDraft.types.includes(n), !wmDraft.enabled)).join('')
      + `<span class="pm-err prm-err" data-wm-err></span></div>`
      + `<div class="prm-foot"><button type="button" class="${BTN1} Polaris-Button--disabled" data-wm-act="save" disabled>${btnText('Save')}</button></div></div>`;
    syncWatermarkMaster();
  }
  function syncWatermarkMaster() {
    const dirty = wmDirty(), bad = wmDraft.enabled && !wmDraft.types.length;
    const err = $('[data-wm-err]', panelFeat); err.textContent = bad ? 'Pick at least one shop type' : ''; err.classList.toggle('is-shown', bad);
    $$('[data-wm-type]', panelFeat).forEach(i => { i.disabled = !wmDraft.enabled; });
    setBtn($('[data-wm-act=save]', panelFeat), !dirty || bad);
    const tab = $('.mt-tab[data-tab=features]'); if (tab) tab.classList.toggle('has-changes', dirty);
  }
  panelFeat.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-wm=enabled]')) wmDraft.enabled = t.checked;
    else if (t.matches('[data-wm-type]')) { const n = t.dataset.wmType; wmDraft.types = t.checked ? [...new Set([...wmDraft.types, n])] : wmDraft.types.filter(x => x !== n); }
    syncWatermarkMaster();
  });
  panelFeat.addEventListener('click', e => {
    if (e.target.closest('[data-ft-static]')) { e.preventDefault(); toast('Only the Powered by Findter badge setting works in this copy'); return; }
    const b = e.target.closest('[data-wm-act]'); if (!b || b.disabled) return;
    WM.saveConfig(wmDraft); syncWatermarkMaster(); toast('Saved. The setting and the badge follow this now');
  });
