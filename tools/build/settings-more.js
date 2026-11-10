/* Two Settings pages written by hand, drawn with the app's Polaris markup (tools/build/pl.js):
   - Search redirect (search-redirect.html): send shoppers to a page when they search for certain keywords (exact match). Each rule is saved from its window.
   - Separated variant products (separated-variants.html): show each variant as its own product, split by the chosen options. Edits are a draft until the contextual save bar's Save.
   Everything is stored in localStorage (the real app: per shop). */
(() => {
  'use strict';
  if (!window.FindterUI || !window.FindterPL) return;
  const { $, store, toast, openModal, saveBar } = window.FindterUI;
  const P = window.FindterPL, esc = P.esc;

  /* ======================================== Search redirect ======================================== */
  const sr = document.getElementById('sr-root');
  if (sr) {
    const KEY = 'findter.searchRedirect.v1';
    const SEED = [{ id: 1, terms: ['sale', 'deals'], url: '/collections/sale' }, { id: 2, terms: ['shoes', 'footwear'], url: '/collections/footwear' }];
    let list = store.json(KEY, null); if (!Array.isArray(list)) list = JSON.parse(JSON.stringify(SEED));
    const commit = () => store.set(KEY, JSON.stringify(list));
    const render = focus => {
      sr.innerHTML = list.length
        ? P.card(P.head('Search redirects', P.button('Add redirect', 'add'), `${list.length} rule${list.length === 1 ? '' : 's'}. A search that matches a term exactly opens the page you choose.`)
          + P.table({ heads: ['Search terms', 'Redirect to', 'Actions'], label: 'Search redirects', min: 560, rows: list.map(r => ({ cells: [`<div class="pl-tagcell">${r.terms.map(t => `<div class="ft-collection-tag">${esc(t)}</div>`).join('')}</div>`, P.text(esc(r.url)), `<div class="pl-actions">${P.iconButton('edit', 'Edit redirect for ' + r.terms.join(', '), 'edit')}${P.iconButton('delete', 'Delete redirect for ' + r.terms.join(', '), 'delete')}</div>`], cls: 'pl-row', attrs: `data-id="${r.id}"`, noHeaderCell: true })) }))
        : P.empty({ title: 'Send shoppers to a page when they search', body: 'Add a redirect to open a page when a shopper searches for a certain keyword, for example a sale or a policy page.', actions: P.button('Add redirect', 'add') });
      const f = focus && $(focus, sr); if (f) f.focus({ preventScroll: true });
    };
    const parseTerms = raw => { const out = []; raw.split(',').map(s => s.trim()).filter(Boolean).forEach(t => { if (!out.some(x => x.toLowerCase() === t.toLowerCase())) out.push(t); }); return out; };
    function openForm(id) {
      const cur = id ? list.find(r => r.id == id) : null;
      const body = P.field({ id: 'sr-terms', label: 'Search terms (required)', control: P.textField({ id: 'sr-terms', value: cur ? cur.terms.join(', ') : '', placeholder: 'e.g. sale, discount, offers' }), helpText: 'Separate several keywords with commas. A search must match a term exactly.', errKey: 'srterms' })
        + P.field({ id: 'sr-url', label: 'Redirect to (required)', control: P.textField({ id: 'sr-url', value: cur ? cur.url : '', placeholder: 'https://… or /collections/sale' }), helpText: 'A full URL, or a path on your store that starts with /.', errKey: 'srurl' });
      openModal({
        title: cur ? 'Edit search redirect' : 'Add search redirect', content: body, ok: 'Save', cancel: 'Cancel',
        onOk: scrim => {
          const tInp = $('#sr-terms', scrim), uInp = $('#sr-url', scrim);
          const terms = parseTerms(tInp.value), url = uInp.value.trim();
          let te = '', ue = '';
          if (!terms.length) te = 'Enter at least one search term.';
          else { const clash = terms.find(t => list.some(r => r.id !== (cur && cur.id) && r.terms.some(x => x.toLowerCase() === t.toLowerCase()))); if (clash) te = `“${clash}” already redirects somewhere else. Use each term once.`; }
          if (!url) ue = 'Enter a page to send shoppers to.'; else if (!/^(https?:\/\/\S+|\/\S*)$/.test(url)) ue = 'Enter a full URL that starts with https://, or a path that starts with /.';
          [[tInp, 'srterms', te], [uInp, 'srurl', ue]].forEach(([i, k, m]) => { const e = $('#err-' + k, scrim); e.hidden = !m; $('[data-msg]', e).textContent = m; i.closest('.Polaris-TextField').classList.toggle('Polaris-TextField--error', !!m); m ? i.setAttribute('aria-invalid', 'true') : i.removeAttribute('aria-invalid'); });
          if (te || ue) { (te ? tInp : uInp).focus(); return false; }
          if (cur) { cur.terms = terms; cur.url = url; } else list.push({ id: Math.max(0, ...list.map(r => r.id)) + 1, terms, url });
          commit(); render(); toast('Redirect saved');
        },
      });
    }
    sr.addEventListener('click', e => {
      const t = e.target.closest('[data-act]'); if (!t) return;
      const id = t.closest('tr') && t.closest('tr').dataset.id;
      if (t.dataset.act === 'add') openForm(null);
      else if (t.dataset.act === 'edit') openForm(id);
      else if (t.dataset.act === 'delete') { const r = list.find(x => x.id == id); openModal({ title: 'Delete this redirect?', content: `<p class="mf-modal__text">Searches for ${esc(r.terms.join(', '))} will no longer open ${esc(r.url)}.</p>`, ok: 'Delete', okClass: 'mf-btn--critical', onOk: () => { list = list.filter(x => x.id != id); commit(); render(); toast('Redirect deleted'); } }); }
    });
    render();
  }

  /* ======================================== Separated variant products ======================================== */
  const sv = document.getElementById('sv-root');
  if (sv) {
    const KEY = 'findter.separatedVariants.v1';
    const OPTIONS = ['Color', 'Size', 'Title', 'Material', 'Style', 'Pattern', 'Finish', 'Fit', 'Flavor', 'Length', 'Scent', 'Weight'];
    const clone = o => JSON.parse(JSON.stringify(o));
    let saved = store.json(KEY, null); if (!saved || !Array.isArray(saved.options)) saved = { enabled: true, options: ['Color'] };
    let draft = clone(saved), show = false, open = false, query = '', active = 0, refocus = false;     // refocus: a script put the focus back, the list must not open by itself
    const isEdited = () => JSON.stringify(draft) !== JSON.stringify(saved);
    const filtered = () => OPTIONS.filter(o => o.toLowerCase().includes(query.trim().toLowerCase()));
    const err = () => draft.enabled && !draft.options.length ? 'Select at least one option to split products by.' : '';
    function render(focus) {
      const dis = !draft.enabled, f = filtered(), bad = show && !!err();
      const sw = `<div class="pl-switchrow"><div class="Polaris-BlockStack" style="--pc-block-stack-order:column;--pc-block-stack-gap-xs:var(--p-space-100)"><h2 class="Polaris-Text--root Polaris-Text--headingMd" id="sv-sw-t">Show each variant as a separate product</h2><p class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued" id="sv-sw-d">When this is on, each variant appears as its own product in collections.</p></div><input type="checkbox" class="pg-switch" role="switch" id="sv-switch" aria-labelledby="sv-sw-t" aria-describedby="sv-sw-d"${draft.enabled ? ' checked' : ''}></div>`;
      const list = open ? `<ul class="Polaris-Listbox" id="sv-list" role="listbox" aria-multiselectable="true" aria-label="Variant options">${f.length ? f.map((o, i) => { const on = draft.options.includes(o); return `<li role="option" id="sv-o-${i}" class="Polaris-Listbox-Option${i === active ? ' Polaris-Listbox-Option--active' : ''}" aria-selected="${on}" data-opt="${esc(o)}"><span class="Polaris-Choice__Control"><span class="Polaris-Checkbox"><input type="checkbox" class="Polaris-Checkbox__Input" tabindex="-1" aria-hidden="true"${on ? ' checked' : ''} readonly><span class="Polaris-Checkbox__Backdrop"></span><span class="Polaris-Checkbox__Icon Polaris-Checkbox--animated"><span class="Polaris-Icon">${P.tick}</span></span></span></span>${esc(o)}</li>`; }).join('') : '<li class="Polaris-Listbox-Option Polaris-Listbox-Option--empty" role="presentation">No options match.</li>'}</ul>` : '';
      const control = `<div class="pl-combo">${P.textField({ id: 'sv-input', value: query, placeholder: 'Search variant options', prefix: P.icon('search'), label: 'Search variant options', error: bad, attrs: `role="combobox" aria-expanded="${open}" aria-controls="sv-list" aria-autocomplete="list"${dis ? ' disabled' : ''}` })}${list}</div>`;
      const tags = draft.options.length ? `<div class="pl-tags" aria-label="Selected options">${draft.options.map(o => P.tag(esc(o), 'rm', `data-rm="${esc(o)}"${dis ? ' disabled' : ''}`, 'Remove ' + o)).join('')}</div>` : '';
      sv.innerHTML = `<div class="pl-stack">${P.card(sw)}${P.card(P.head('Separate products by options', null, 'Choose which variant options split a product into separate products.') + P.field({ id: 'sv-input', control, errKey: 'svopt', error: bad ? err() : '' }) + tags, { cls: dis ? 'pl-dim' : '', visible: true })}</div>`;
      const el = focus && $(focus, sv); if (el) { refocus = true; el.focus({ preventScroll: true }); refocus = false; if (el.setSelectionRange && el.value) { const n = el.value.length; el.setSelectionRange(n, n); } }
      bar.sync();
    }
    function save() { show = true; if (err()) { open = false; render('#sv-input'); return false; } saved = clone(draft); store.set(KEY, JSON.stringify(saved)); show = false; render(); toast('Saved'); return true; }
    const bar = saveBar({ isEdited, onSave: save, onDiscard: () => { draft = clone(saved); show = false; open = false; query = ''; render(); } });
    const toggleOpt = o => { const i = draft.options.indexOf(o); if (i < 0) draft.options.push(o); else draft.options.splice(i, 1); };
    sv.addEventListener('change', e => { if (e.target.id === 'sv-switch') { draft.enabled = e.target.checked; if (!draft.enabled) { open = false; show = false; } render('#sv-switch'); } });
    sv.addEventListener('input', e => { if (e.target.id === 'sv-input') { query = e.target.value; open = true; active = 0; render('#sv-input'); } });
    sv.addEventListener('focusin', e => { if (e.target.id === 'sv-input' && !open && !refocus && !e.target.disabled) { open = true; render('#sv-input'); } });
    sv.addEventListener('mousedown', e => { if (e.target.closest('.Polaris-Listbox')) e.preventDefault(); });          // keep the focus in the field while an option is picked
    sv.addEventListener('click', e => {
      if (e.target.id === 'sv-input' && !open && !e.target.disabled) { open = true; render('#sv-input'); return; }
      const o = e.target.closest('[data-opt]'); if (o) { toggleOpt(o.dataset.opt); render('#sv-input'); return; }
      const rm = e.target.closest('[data-rm]'); if (rm) { toggleOpt(rm.dataset.rm); render(); }
    });
    sv.addEventListener('keydown', e => {
      if (e.target.id !== 'sv-input') return;
      const f = filtered();
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) { open = true; } else active = Math.min(active + 1, f.length - 1); render('#sv-input'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); render('#sv-input'); }
      else if (e.key === 'Enter' && open && f[active]) { e.preventDefault(); toggleOpt(f[active]); render('#sv-input'); }
      else if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); open = false; render('#sv-input'); }
    });
    document.addEventListener('mousedown', e => { if (open && !e.target.closest('.pl-combo')) { open = false; render(); } });
    render();
  }
})();
