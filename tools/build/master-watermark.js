  /* ======================================================================================================
     Master -> Features: the "Powered by Findter" badge setting
       - turns the badge on or off for everyone, and picks the shop types it applies to
       - a draft until Save (like Master -> Home); Discard goes back to what is saved
     The saved config is read by the Search settings card ("Remove “Powered by Findter” badge") and by the sample storefront (build/watermark.js).
     This file is spliced into app.js at build time (tools/build.js), so it shares that file's scope.
     ====================================================================================================== */
  const WM = window.FindterWatermark;
  let wmDraft = WM.config();
  const wmSame = (a, b) => a.enabled === b.enabled && a.types.length === b.types.length && a.types.every(t => b.types.includes(t));
  function wmDirty() { return !wmSame(wmDraft, WM.config()); }
  const wmCheck = (attrs, label, hint, on, off) => `<div class="prm-check"><label><input type="checkbox" ${attrs}${on ? ' checked' : ''}${off ? ' disabled' : ''}> <span>${label}</span></label>${hint ? `<span class="prm-hint">${hint}</span>` : ''}</div>`;
  function renderWatermarkMaster() {
    wmDraft = WM.config();
    panelFeat.innerHTML = `<div class="prm-edit" data-wm-master><div class="prm-card"><div class="hl-head"><div><h2>Powered by Findter badge</h2><p class="prm-note" style="margin:0">A small “Powered by Findter” text under the search suggestions on the storefront. A shop that is not in a ticked type below never sees the setting in its app and never gets the badge. Everything you change here is a draft until you click Save.</p></div><div class="hl-head__side"><span class="hl-status" hidden>Unsaved changes</span></div></div></div>`
      + `<div class="prm-card"><h2>Feature</h2>${wmCheck('data-wm="enabled"', 'Enable the badge', 'Turn off to hide the badge and the setting for every shop.', wmDraft.enabled)}</div>`
      + `<div class="prm-card" data-wm-types><h2>Apply to</h2><div class="prm-label">Shop types</div>`
      + WM.SHOP_TYPES.map(([n, d]) => wmCheck(`data-wm-type="${escHtml(n)}"`, n, d, wmDraft.types.includes(n), !wmDraft.enabled)).join('')
      + `<span class="pm-err prm-err" data-wm-err></span><p class="prm-note">Each shop counts as exactly one type, checked in the order above. A shop with a paid plan is always “Subscription”. Every ticked type sees the same switch; turning it on opens the chat for a “Yes, remove it” answer, except a paid shop while no CSE is online, whose badge is removed at once. Keep “Development store” unticked so Shopify’s reviewers and testers do not see the setting.</p></div>`
      + `<div class="prm-actions"><button type="button" class="${BTN2} Polaris-Button--disabled" data-wm-act="discard" disabled>${btnText('Discard changes')}</button><button type="button" class="${BTN1} Polaris-Button--disabled" data-wm-act="save" disabled>${btnText('Save')}</button></div></div>`;
    syncWatermarkMaster();
  }
  function syncWatermarkMaster() {
    const dirty = wmDirty(), bad = wmDraft.enabled && !wmDraft.types.length;
    const err = $('[data-wm-err]', panelFeat); err.textContent = bad ? 'Pick at least one shop type' : ''; err.classList.toggle('is-shown', bad);
    $$('[data-wm-type]', panelFeat).forEach(i => { i.disabled = !wmDraft.enabled; });
    $('.hl-status', panelFeat).hidden = !dirty;
    const save = $('[data-wm-act=save]', panelFeat), disc = $('[data-wm-act=discard]', panelFeat);
    setBtn(save, !dirty || bad); setBtn(disc, !dirty);
    const tab = $('.mt-tab[data-tab=features]'); if (tab) tab.classList.toggle('has-changes', dirty);
  }
  panelFeat.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-wm=enabled]')) wmDraft.enabled = t.checked;
    else if (t.matches('[data-wm-type]')) { const n = t.dataset.wmType; wmDraft.types = t.checked ? [...new Set([...wmDraft.types, n])] : wmDraft.types.filter(x => x !== n); }
    syncWatermarkMaster();
  });
  panelFeat.addEventListener('click', e => {
    const b = e.target.closest('[data-wm-act]'); if (!b || b.disabled) return;
    if (b.dataset.wmAct === 'save') { WM.saveConfig(wmDraft); syncWatermarkMaster(); toast('Saved. The setting and the badge follow this now'); }
    else { wmDraft = WM.config(); renderWatermarkMaster(); }
  });
