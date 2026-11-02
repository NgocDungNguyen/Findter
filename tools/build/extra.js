/* Search > Translations, Search > Synonyms Search and Filter set > Translate pages (search-translation.html, search-synonym.html, filter-translate.html).
   Ports of the real app's pages/search/locales.jsx, components/Synonym/SynonymSet.jsx + SynonymEditForm.jsx and
   components/ManageFilter/FilterSet/Translation/TranslationEditor.jsx (same texts, rules and states). Sample data only; state lives in localStorage. */
(() => {
  'use strict';
  const body = document.getElementById('ex-body');
  if (!body) return;
  const page = body.dataset.page;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = x => JSON.parse(JSON.stringify(x));
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: keep going */ } },
  };
  const load = (k, fallback) => { try { const v = JSON.parse(store.get(k) || 'null'); return v == null ? clone(fallback) : v; } catch (e) { return clone(fallback); } };
  const showToast = (msg, isError) => { const t = $('#toast'); if (t) t.classList.toggle('is-error', !!isError); if (window.__shell) window.__shell.toast(msg); };

  const ICON = {
    edit: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path fill-rule="evenodd" d="M15.655 4.344a2.695 2.695 0 0 0-3.81 0l-.599.599-.009-.009-1.06 1.06.008.01-5.88 5.88a2.75 2.75 0 0 0-.805 1.944v1.922a.75.75 0 0 0 .75.75h1.922a2.75 2.75 0 0 0 1.944-.806l7.54-7.539a2.695 2.695 0 0 0 0-3.81Zm-4.409 2.72-5.88 5.88a1.25 1.25 0 0 0-.366.884v1.172h1.172c.331 0 .65-.132.883-.366l5.88-5.88-1.689-1.69Zm2.75.629.599-.599a1.195 1.195 0 1 0-1.69-1.689l-.598.599 1.69 1.689Z"></path></svg>',
    del: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M11.5 8.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0v-4.25a.75.75 0 0 1 .75-.75Z"></path><path d="M9.25 9a.75.75 0 0 0-1.5 0v4.25a.75.75 0 0 0 1.5 0v-4.25Z"></path><path fill-rule="evenodd" d="M7.25 5.25a2.75 2.75 0 0 1 5.5 0h3a.75.75 0 0 1 0 1.5h-.75v5.45c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311c-.642.327-1.482.327-3.162.327h-.4c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311c-.327-.642-.327-1.482-.327-3.162v-5.45h-.75a.75.75 0 0 1 0-1.5h3Zm1.5 0a1.25 1.25 0 1 1 2.5 0h-2.5Zm-2.25 1.5h7v5.45c0 .865-.001 1.423-.036 1.848-.033.408-.09.559-.128.633a1.5 1.5 0 0 1-.655.655c-.074.038-.225.095-.633.128-.425.035-.983.036-1.848.036h-.4c-.865 0-1.423-.001-1.848-.036-.408-.033-.559-.09-.633-.128a1.5 1.5 0 0 1-.656-.655c-.037-.074-.094-.225-.127-.633-.035-.425-.036-.983-.036-1.848v-5.45Z"></path></svg>',
    info: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M10 14a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-.75.75Z"></path><path d="M9 7a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"></path><path fill-rule="evenodd" d="M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-1.5 0a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"></path></svg>',
    close: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94z"></path></svg>',
    down: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M5.72 8.47a.75.75 0 0 1 1.06 0l3.47 3.47 3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z"></path></svg>',
    search: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path fill-rule="evenodd" d="M12.323 13.383a5.5 5.5 0 1 1 1.06-1.06l2.897 2.897a.75.75 0 1 1-1.06 1.06zm1.677-4.883a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"></path></svg>',
    back: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M17 10a.75.75 0 0 1-.75.75H6.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 1 1 1.06 1.06L6.56 9.25h9.69A.75.75 0 0 1 17 10Z"></path></svg>',
    reset: '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M10 4.5a5.5 5.5 0 1 0 5.2 7.3.75.75 0 1 1 1.42.48A7 7 0 1 1 10 3v-1.1a.4.4 0 0 1 .64-.32l2.4 1.8a.4.4 0 0 1 0 .64l-2.4 1.8a.4.4 0 0 1-.64-.32z"></path></svg>',
  };
  const icon = (n, cls = '') => `<span class="Polaris-Icon ex-ic ${cls}">${ICON[n]}</span>`;

  /* ---------- Filter set options (shared by the filter set page and its Translate page) ---------- */
  const FO_KEY = 'findter.filterSetOptions.v1';
  const FO_GUIDE = 'https://flintverse.gitbook.io/docs/findter-custom-filter-search/user-guide/create-and-set-up-filters/add-filter-options';
  const FO_DISPLAY = { checklist: 'Checklist', box: 'Box', slider: 'Slider', swatch: 'Swatch' };
  const FO_LOGIC = { single: 'Single', multiple: 'Multiple' };
  const FO_TYPE = { standard: 'Standard', variant: 'Product variant', metafield: 'Product metafield' };
  const FO_SWATCH = { Dawn: '#f4c7a1', Electric: '#2f6bff', Ice: '#cfe8f7', Powder: '#e9d9f4', Sunset: '#f08a5d' };
  // The sources the real app offers (DataProvider.getOptionSources). `fixed` values are owned by the app; `sample` values come from the store's products.
  // "Discount %" is the proposed source: slider only, computed from each variant's Compare-at price and Price.
  const FO_SOURCES = [
    { source: 'availability', name: 'Availability', type: 'standard', display: ['checklist', 'box'], fixed: ['In Stock', 'Out of Stock'] },
    { source: 'collection', name: 'Collection', type: 'standard', display: ['checklist', 'box'], sample: ['Hydrogen', 'Snowboards', 'Accessories'] },
    { source: 'product_category', name: 'Product category', type: 'standard', display: ['checklist', 'box'], sample: ['Sporting Goods', 'Apparel & Accessories', 'Gift Cards'] },
    { source: 'priceRange', name: 'Price', type: 'standard', display: ['slider', 'checklist'], fixed: ['0-10', 'Above 10'], range: { min: 30, max: 225, unit: '' }, help: 'Automatically display the lowest and highest prices on storefront.' },
    { source: 'tags', name: 'Tag', type: 'standard', display: ['checklist', 'box'], sample: ['New', 'Winter', 'Premium'] },
    { source: 'vendor', name: 'Vendor', type: 'standard', display: ['checklist', 'box'], sample: ['Hydrogen Vendor', 'Snowboard Vendor', 'Partners'] },
    { source: 'productType', name: 'Product type', type: 'standard', display: ['checklist', 'box'], sample: ['Snowboard', 'Accessory', 'Gift card'] },
    { source: 'onSale', name: 'Sale', type: 'standard', display: ['checklist', 'box'], fixed: ['On sale', 'Not on sale'] },
    { source: 'discount_percent', name: 'Discount %', type: 'standard', display: ['slider'], range: { min: 5, max: 60, unit: '%' }, help: 'Automatically display the lowest and highest discounts on storefront.', note: 'Uses each variant’s Compare-at price and Price. A product matches when any available variant is in the range.' },
    { source: 'option_label_Color', name: 'Color', type: 'variant', display: ['checklist', 'box', 'swatch'], sample: ['Dawn', 'Electric', 'Ice', 'Powder', 'Sunset', 'Special Selling Plans Ski Wax Special Selling Plans Ski Wax'] },
    { source: 'option_label_Size', name: 'Size', type: 'variant', display: ['checklist', 'box'], sample: ['154cm', '158cm', '160cm'] },
  ];
  // the Default filter set of the demo store (filterSetOptionDefault in the real app)
  const FO_DEFAULT = [
    { id: 'o1', source: 'availability', label: 'Availability', display: 'checklist', logic: 'single', match: 'any', auto: false, cd: false, cm: false, picked: ['In Stock', 'Out of Stock'] },
    { id: 'o2', source: 'priceRange', label: 'Price', display: 'slider', logic: 'single', match: 'any', auto: false, cd: false, cm: false, picked: ['0-10', 'Above 10'] },
    { id: 'o3', source: 'option_label_Color', label: 'Color', display: 'box', logic: 'single', match: 'any', auto: true, cd: false, cm: false, picked: [] },
    { id: 'o4', source: 'option_label_Size', label: 'Size', display: 'box', logic: 'single', match: 'any', auto: true, cd: false, cm: false, picked: [] },
  ];
  const filterOptionsLoad = () => { const v = load(FO_KEY, FO_DEFAULT); return Array.isArray(v) ? v : clone(FO_DEFAULT); };
  // the values a Translate page lists for one option (a slider with no fixed values, like Discount %, has none)
  function filterOptionValues(o) {
    const s = FO_SOURCES.find(x => x.source === o.source) || {}, all = s.fixed || s.sample || [];
    if (o.display === 'slider') return s.fixed || [];
    return o.auto ? all.filter(v => !(o.picked || []).includes(v)) : all.filter(v => (o.picked || []).includes(v));
  }

  /* ---------- modal (the demo's .mf-modal) ---------- */
  function openModal({ title, content, ok, okClass, cancel, onOk, onOpen }) {
    const opener = document.activeElement;
    const scrim = document.createElement('div'); scrim.className = 'mf-scrim'; scrim.setAttribute('data-mfp', '');
    scrim.innerHTML = `<div class="mf-modal" role="dialog" aria-modal="true" aria-labelledby="ex-m-title"><div class="mf-modal__head"><h2 class="mf-modal__title" id="ex-m-title">${esc(title)}</h2><button type="button" class="mf-modal__x" aria-label="Close">${ICON.close}</button></div><div class="mf-modal__body">${content}</div><div class="mf-modal__foot"><button type="button" class="mf-btn" data-m="cancel">${esc(cancel)}</button><button type="button" class="mf-btn ${okClass || 'mf-btn--primary'}" data-m="ok">${esc(ok)}</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => { document.removeEventListener('keydown', onKey, true); scrim.remove(); if (opener && document.contains(opener)) opener.focus({ preventScroll: true }); };
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    document.addEventListener('keydown', onKey, true);
    scrim.addEventListener('mousedown', e => { if (e.target === scrim) close(); });
    $('.mf-modal__x', scrim).addEventListener('click', close);
    $('[data-m=cancel]', scrim).addEventListener('click', close);
    $('[data-m=ok]', scrim).addEventListener('click', () => { if (onOk() !== false) close(); });
    if (onOpen) onOpen(scrim);
    return scrim;
  }

  /* ---------- contextual save bar (useFindterSaveBar), same look as the Sort page ---------- */
  const bar = document.createElement('div');
  bar.className = 'so-savebar'; bar.hidden = true; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Unsaved changes');
  bar.innerHTML = '<div class="so-savebar__t"><span>Unsaved changes</span></div><div class="so-savebar__a"><button type="button" class="so-sbtn so-sbtn--discard" data-b="discard">Discard</button><button type="button" class="so-sbtn so-sbtn--save" data-b="save">Save</button></div>';
  ($('.sh-main') || document.body).appendChild(bar);

  /* ===================== Search > Translations (pages/search/locales.jsx) ===================== */
  function translationsPage() {
    const KEY = 'findter.searchLocales.v1';
    const LOCALES = [['fr', 'French'], ['de', 'German'], ['es', 'Spanish'], ['it', 'Italian'], ['nl', 'Dutch'], ['pt-PT', 'Portuguese (Portugal)'], ['ja', 'Japanese'], ['vi', 'Vietnamese']];
    const name = c => (LOCALES.find(l => l[0] === c) || [c, c])[1];
    let saved = load(KEY, ['fr', 'de']), selected = [...saved], query = '', open = false, saving = false;
    const dirty = () => selected.length !== saved.length || selected.some(c => !saved.includes(c));
    const options = () => { const q = query.trim().toLowerCase(); return LOCALES.filter(([c, n]) => !q || n.toLowerCase().includes(q) || c.toLowerCase().includes(q)); };
    function render(blur) {
      const keepFocus = !blur && document.activeElement && document.activeElement.id === 'ex-loc-input';
      body.innerHTML = `<section class="ex-card"><div class="ex-col">
        <div class="ex-col ex-col--tight"><h2 class="ex-h">Translations</h2><p class="ex-sub">Select the languages to translate your product titles, descriptions, and metafields into. Translations are sourced from Shopify Translate &amp; Adapt.</p></div>
        ${saved.length === 0 ? `<div class="ex-note" role="status">${icon('info')}<p>Select the languages you want to translate indexed product content into, then click Save.</p></div>` : ''}
        <div class="ex-field ex-combo"><label for="ex-loc-input" class="ex-label">Languages</label>
          <div class="ex-input-wrap">${icon('search', 'ex-prefix')}<input id="ex-loc-input" class="mf-input ex-input--prefix" type="text" autocomplete="off" role="combobox" aria-expanded="${open}" placeholder="Search and select languages" value="${esc(query)}"></div>
          <div class="mf-pop" id="ex-loc-pop" role="listbox" aria-multiselectable="true"${open ? '' : ' hidden'}>${options().length ? options().map(([c, n]) => `<div class="mf-opt" role="option" data-code="${c}" aria-selected="${selected.includes(c)}"><input type="checkbox" class="pg-check" tabindex="-1"${selected.includes(c) ? ' checked' : ''}><span class="mf-opt__name">${esc(n)} (${c})</span></div>`).join('') : '<div class="mf-opt mf-opt--empty">No languages found</div>'}</div></div>
        ${selected.length ? `<div class="ex-col ex-col--tight"><h3 class="ex-h3">Selected languages</h3><div class="ex-tags">${selected.map(c => `<span class="ex-tag"><span>${esc(name(c))} (${c})</span><button type="button" class="ex-tag__x" data-rm="${c}" aria-label="Remove ${esc(name(c))}">${ICON.close}</button></span>`).join('')}</div></div>` : ''}
      </div></section>
      <div class="ex-actions"><button type="button" class="ex-btn ex-btn--primary${saving ? ' is-loading' : ''}" data-act="save"${!dirty() || saving ? ' disabled' : ''}>Save</button></div>`;
      if (keepFocus) { const i = $('#ex-loc-input'); i.focus({ preventScroll: true }); const l = i.value.length; i.setSelectionRange(l, l); }
    }
    const toggle = c => { selected = selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c]; };
    body.addEventListener('focusin', e => { if (e.target.id === 'ex-loc-input' && !open) { open = true; render(); } });
    body.addEventListener('input', e => { if (e.target.id === 'ex-loc-input') { query = e.target.value; open = true; render(); } });
    body.addEventListener('mousedown', e => { if (e.target.closest('.mf-opt[data-code]')) e.preventDefault(); });   // keep the field focused while picking
    body.addEventListener('click', e => {
      const opt = e.target.closest('.mf-opt[data-code]'); if (opt) { toggle(opt.dataset.code); render(); return; }
      const rm = e.target.closest('[data-rm]'); if (rm) { toggle(rm.dataset.rm); render(); return; }
      const sv = e.target.closest('[data-act=save]');
      if (sv && !sv.disabled) {
        saving = true; render();
        setTimeout(() => { saving = false; saved = [...selected]; store.set(KEY, JSON.stringify(saved)); render(); showToast('Languages updated. Translated content will refresh shortly.'); }, 450);
      }
    });
    document.addEventListener('mousedown', e => { if (open && !e.target.closest('.ex-combo')) { open = false; query = ''; render(true); } });
    render();
  }

  /* ===================== Search > Synonyms Search (SynonymSet.jsx + SynonymEditForm.jsx) ===================== */
  function synonymsPage() {
    const KEY = 'findter.synonyms.v1', MAX = 10;
    const SEED = [
      { id: 1, status: true, name: 'tv', relation: 'one_way', synonym_term: ['television', 'telly'] },
      { id: 2, status: true, name: 'sneakers', relation: 'two_ways', synonym_term: ['trainers', 'kicks'] },
      { id: 3, status: false, name: 'tshirt', relation: 'one_way', synonym_term: ['t-shirt', 'tee', 'tea shirt'] },
    ];
    let rows = load(KEY, SEED);
    const persist = () => store.set(KEY, JSON.stringify(rows));
    const REL = { one_way: 'One-way', two_ways: 'Two-ways' };
    const tip = `<div class="ex-tip" role="tooltip"><p><b>One-way</b></p><p>Searching the Search Term also returns results for its synonyms, but not the reverse.</p><p>e.g. Typing "tv" also shows television results. Typing "television" won't show "tv" results.</p><p class="ex-tip__gap"><b>Two-ways</b></p><p>All terms are equal. Searching any one returns results for all of them.</p><p>e.g. "sneakers" &lt;=&gt; "trainers": searching either one finds both.</p></div>`;
    function render() {
      body.innerHTML = `<section class="ex-card">${rows.length ? `
        <div class="ex-row-between"><h2 class="ex-h">Synonyms Search</h2><button type="button" class="ex-btn ex-btn--primary" data-act="add">Add new synonym</button></div>
        <div class="ex-tablewrap"><table class="ex-table"><thead><tr><th class="ex-w10">Status</th><th class="ex-w20">Search term</th><th class="ex-w20"><span class="ex-th-rel">Relation<span class="ex-info" tabindex="0" aria-label="Relation help">${icon('info')}${tip}</span></span></th><th>Synonyms</th><th>Action</th></tr></thead><tbody>
        ${rows.map(r => `<tr data-id="${r.id}"><td><input type="checkbox" class="pg-switch" role="switch" data-act="toggle" aria-label="Status"${r.status ? ' checked' : ''}></td><td><b>${esc(r.name)}</b></td><td>${REL[r.relation]}</td><td><div class="ex-tags">${r.synonym_term.map(t => `<span class="ex-tag ex-tag--static">${esc(t)}</span>`).join('')}</div></td><td><div class="ex-actions-cell"><button type="button" class="ex-iconbtn" data-act="edit" aria-label="Edit">${icon('edit')}</button><button type="button" class="ex-iconbtn" data-act="delete" aria-label="Delete">${icon('del')}</button></div></td></tr>`).join('')}
        </tbody></table></div>` : `
        <div class="ex-empty"><img src="assets/img/emptystate-files-10e84ca8.png" alt=""><h2>No synonyms yet</h2><p>Add synonyms to help shoppers find products even when they search with different words, typos, or abbreviations.</p><button type="button" class="ex-btn ex-btn--primary" data-act="add">Add new synonym</button></div>`}
      </section>`;
    }
    function openEdit(row) {
      const isNew = !row;
      let terms = row ? [...row.synonym_term] : [], status = row ? row.status : true, relation = row ? row.relation : 'one_way';
      openModal({
        title: isNew ? 'Add new synonym' : 'Edit synonym', ok: 'Save', cancel: 'Cancel',
        content: `<div class="ex-form">
          <label class="ex-switchrow"><input type="checkbox" class="pg-switch" role="switch" id="ex-s-status"${status ? ' checked' : ''}><span>Toggle on to enable the synonym. Toggle off to disable it.</span></label>
          <div class="mf-field"><label class="ex-label" for="ex-s-name">Search term</label><input id="ex-s-name" class="mf-input" autocomplete="off" value="${esc(row ? row.name : '')}"><p class="mf-help mf-help--error" id="ex-s-name-err"></p></div>
          <div class="mf-field"><span class="ex-label">Relation</span><div class="ex-radios"><label class="ex-radio"><input type="radio" name="ex-rel" value="one_way"${relation === 'one_way' ? ' checked' : ''}><span>One-way</span></label><label class="ex-radio"><input type="radio" name="ex-rel" value="two_ways"${relation === 'two_ways' ? ' checked' : ''}><span>Two-ways</span></label></div></div>
          <div class="mf-field"><div class="ex-row-between"><label class="ex-label" for="ex-s-terms">Synonyms &amp; Common Misspellings</label><span class="ex-sub" id="ex-s-count"></span></div>
            <div class="ex-taginput" id="ex-s-box"><span id="ex-s-tags" class="ex-tags"></span><input id="ex-s-terms" autocomplete="off"></div>
            <p class="mf-help mf-help--error" id="ex-s-terms-err"></p>
            <p class="ex-sub">Up to ${MAX} synonyms per search term. Each one adds work to every search that matches this term.</p></div></div>`,
        onOpen: scrim => {
          const input = $('#ex-s-terms', scrim), tags = $('#ex-s-tags', scrim);
          const draw = () => { tags.innerHTML = terms.map((t, i) => `<span class="ex-tag"><span>${esc(t)}</span><button type="button" class="ex-tag__x" data-i="${i}" aria-label="Remove ${esc(t)}">${ICON.close}</button></span>`).join(''); $('#ex-s-count', scrim).textContent = terms.length + '/' + MAX; };
          const commit = () => {
            const parts = input.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            if (!parts.length) return; const err = $('#ex-s-terms-err', scrim);
            parts.forEach(p => { if (!terms.includes(p) && terms.length < MAX) terms.push(p); else if (terms.length >= MAX) err.textContent = `A search term can have at most ${MAX} synonyms`; });
            input.value = ''; if (terms.length) err.textContent = terms.length >= MAX && parts.length > 1 ? err.textContent : ''; draw();
          };
          input.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } else if (e.key === 'Backspace' && !input.value && terms.length) { terms.pop(); draw(); } });
          input.addEventListener('blur', commit);
          $('#ex-s-box', scrim).addEventListener('click', e => { const x = e.target.closest('[data-i]'); if (x) { terms.splice(+x.dataset.i, 1); $('#ex-s-terms-err', scrim).textContent = ''; draw(); } input.focus(); });
          $('#ex-s-status', scrim).addEventListener('change', e => { status = e.target.checked; });
          $$('[name=ex-rel]', scrim).forEach(r => r.addEventListener('change', () => { relation = r.value; }));
          $('#ex-s-name', scrim).addEventListener('input', e => { $('#ex-s-name-err', scrim).textContent = ''; e.target.classList.remove('mf-input--error'); });
          input.addEventListener('input', () => { $('#ex-s-terms-err', scrim).textContent = ''; });
          draw(); $('#ex-s-name', scrim).focus();
        },
        onOk: () => {
          const nameEl = $('#ex-s-name'); const nm = nameEl.value.trim();
          const nErr = $('#ex-s-name-err'), tErr = $('#ex-s-terms-err'); nErr.textContent = ''; tErr.textContent = ''; nameEl.classList.remove('mf-input--error');
          const pending = $('#ex-s-terms').value.trim(); if (pending) { $('#ex-s-terms').dispatchEvent(new Event('blur')); }
          let bad = false;
          if (!nm) { nErr.textContent = 'This field is required'; nameEl.classList.add('mf-input--error'); bad = true; }
          else if (nm.includes(',')) { nErr.textContent = 'Commas are not allowed'; nameEl.classList.add('mf-input--error'); bad = true; }
          if (!terms.length) { tErr.textContent = 'Synonym cannot be empty'; bad = true; }
          else if (terms.includes(nm.toLowerCase())) { tErr.textContent = 'Synonym cannot match the search term'; bad = true; }
          if (bad) return false;
          const next = { id: row ? row.id : Date.now(), status, name: nm, relation, synonym_term: [...terms] };
          rows = row ? rows.map(r => r.id === row.id ? next : r) : [...rows, next];
          persist(); render(); showToast('Save successfully'); return true;
        },
      });
    }
    function openDelete(row) {
      openModal({ title: 'Delete confirmation', content: '<p class="mf-modal__text">This synonym set will be permanently deleted. Are you sure you want to proceed?</p>', ok: 'Delete', okClass: 'mf-btn--critical', cancel: 'Cancel',
        onOk: () => { rows = rows.filter(r => r.id !== row.id); persist(); render(); showToast('Deleted successfully'); } });
    }
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const tr = b.closest('tr'); const row = tr && rows.find(r => r.id === +tr.dataset.id);
      if (b.dataset.act === 'add') openEdit(null);
      else if (b.dataset.act === 'edit') openEdit(row);
      else if (b.dataset.act === 'delete') openDelete(row);
    });
    body.addEventListener('change', e => {
      const t = e.target.closest('[data-act=toggle]'); if (!t) return;
      const row = rows.find(r => r.id === +t.closest('tr').dataset.id); row.status = t.checked; persist(); showToast('Change status success');
    });
    render();
  }

  /* ===================== Filter set > Translate (pages/filter/set/[name]/translations.jsx + TranslationEditor.jsx) ===================== */
  function filterTranslatePage() {
    const KEY = 'findter.filterTranslations.v1';
    const LANGS = [['fr', 'French'], ['de', 'German']];
    // the Default filter set of the demo store; French and German come from the shop's native Shopify translations (only Color has them), so the other boxes show the original text
    const OPTIONS = filterOptionsLoad().map(o => ({ id: o.id, label: o.label, groups: [], values: filterOptionValues(o) }));
    const SUGGEST = {
      fr: { Color: 'Couleur', Dawn: 'Aube', Electric: 'Électrique', Ice: 'Glace', Powder: 'Poudre', Sunset: 'Coucher de soleil', 'Special Selling Plans Ski Wax Special Selling Plans Ski Wax': 'Plans de vente spéciaux fart de ski Plans de vente spéciaux fart de ski' },
      de: { Color: 'Farbe', Dawn: 'Morgendämmerung', Electric: 'Elektrisch', Ice: 'Eis', Powder: 'Pulver', Sunset: 'Sonnenuntergang' },
    };
    let locale = LANGS[0][0], all = load(KEY, {}), fields = clone(all[locale] || {}), initial = clone(fields), expanded = new Set(OPTIONS.map(o => o.id)), resyncing = false;
    const edited = () => JSON.stringify(fields) !== JSON.stringify(initial);
    const field = (key, label, ph) => `<input class="mf-input" autocomplete="off" aria-label="${esc(label)}" data-k="${esc(key)}" placeholder="${esc((SUGGEST[locale] || {})[ph] || ph)}" value="${esc(fields[key] || '')}">`;
    const valueRow = (oid, v) => `<div class="ex-trow"><span class="ex-tlabel">${esc(v)}</span>${field(oid + ':v:' + v, 'Value label translation', v)}</div>`;
    function render() {
      body.innerHTML = `<section class="ex-card"><div class="ex-resync"><div class="mf-field ex-lang"><label class="ex-label" for="ex-lang">Language</label><div class="Polaris-Select"><select id="ex-lang" class="Polaris-Select__Input">${LANGS.map(([c, n]) => `<option value="${c}"${c === locale ? ' selected' : ''}>${n}</option>`).join('')}</select><div class="Polaris-Select__Content" aria-hidden="true"><span class="Polaris-Select__SelectedOption">${esc(LANGS.find(l => l[0] === locale)[1])}</span><span class="Polaris-Select__Icon"><span class="Polaris-Icon">${ICON.down}</span></span></div><div class="Polaris-Select__Backdrop"></div></div></div>
        <button type="button" class="ex-btn${resyncing ? ' is-loading' : ''}" data-act="resync"${resyncing ? ' disabled' : ''}>${icon('reset', 'ex-btn__ic')}Resync native translations</button></div></section>
        ${OPTIONS.map(o => { const open = expanded.has(o.id); return `<section class="ex-card"><div class="ex-col ex-col--tight">
          <div class="ex-row-between ex-toggle" role="button" tabindex="0" aria-expanded="${open}" aria-controls="ex-o-${o.id}" aria-label="${open ? 'Collapse option' : 'Expand option'}" data-o="${o.id}"><h3 class="ex-h3">${esc(o.label)}</h3><span class="ex-chev${open ? ' is-open' : ''}">${icon('down')}</span></div>
          <div id="ex-o-${o.id}" class="ex-collapse"${open ? '' : ' hidden'}><div class="ex-col">
            ${field(o.id + ':o', 'Option label translation', o.label)}
            ${o.groups.map(g => `<div class="ex-col ex-col--tight"><div class="ex-trow"><span class="ex-tlabel"><span>${esc(g.label)}</span><span class="Polaris-Badge Polaris-Badge--toneInfo"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Group</span></span></span>${field(o.id + ':g:' + g.id, 'Group label translation', g.label)}</div><div class="ex-indent ex-col ex-col--tight">${g.values.map(v => valueRow(o.id, v)).join('')}</div></div>`).join('')}
            ${o.values.map(v => valueRow(o.id, v)).join('')}
          </div></div></div></section>`; }).join('')}`;
    }
    const syncBar = () => { bar.hidden = !edited(); };
    function save() { all[locale] = clone(fields); store.set(KEY, JSON.stringify(all)); initial = clone(fields); syncBar(); showToast('Save successfully'); }
    $('[data-b=save]', bar).addEventListener('click', save);
    $('[data-b=discard]', bar).addEventListener('click', () => { fields = clone(initial); render(); syncBar(); });
    body.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.k; if (!k) return; if (e.target.value) fields[k] = e.target.value; else delete fields[k]; syncBar(); });
    const toggleOpt = id => { expanded.has(id) ? expanded.delete(id) : expanded.add(id); render(); const el = $(`[data-o="${id}"]`); if (el) el.focus({ preventScroll: true }); };
    body.addEventListener('click', e => {
      const t = e.target.closest('[data-o]'); if (t) { toggleOpt(t.dataset.o); return; }
      const r = e.target.closest('[data-act=resync]');
      if (r && !resyncing) { resyncing = true; render(); setTimeout(() => { resyncing = false; render(); showToast('Translation resync started. Translated content will refresh shortly.'); }, 600); }
    });
    body.addEventListener('keydown', e => { const t = e.target.closest && e.target.closest('[data-o]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleOpt(t.dataset.o); } });
    body.addEventListener('change', e => {
      if (e.target.id !== 'ex-lang') return;
      const next = e.target.value;
      if (edited()) {
        e.target.value = locale;
        openModal({ title: 'Discard unsaved translations?', content: '<p class="mf-modal__text">Switching language will discard your unsaved translation changes.</p>', ok: 'Discard changes', okClass: 'mf-btn--critical', cancel: 'Cancel',
          onOk: () => { locale = next; fields = clone(all[locale] || {}); initial = clone(fields); render(); syncBar(); } });
      } else { locale = next; fields = clone(all[locale] || {}); initial = clone(fields); render(); }
    });
    render();
  }

  /* ===================== Filter set (the set's own page): add, edit, delete and reorder filter options =====================
     Port of components/ManageFilter/FilterSet/AddFilterOption.jsx + FilterOptionTable.jsx (same fields, texts and rules). The source list also has
     "Discount %" (proposed): a slider on each variant's discount from Compare-at price and Price. The Translations button -> filter-translate.html. */
  function filterSetPage() {
    const NAME = 'Default filter set', TAGS = ['All Collections', 'All Collections in Search Result Page'];
    const grip = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5.5" cy="3.5" r="1.25"/><circle cx="10.5" cy="3.5" r="1.25"/><circle cx="5.5" cy="8" r="1.25"/><circle cx="10.5" cy="8" r="1.25"/><circle cx="5.5" cy="12.5" r="1.25"/><circle cx="10.5" cy="12.5" r="1.25"/></svg>';
    let opts = filterOptionsLoad(), saved = clone(opts);
    const dirty = () => JSON.stringify(opts) !== JSON.stringify(saved);
    const syncBar = () => { bar.hidden = !dirty(); };
    const srcName = o => (FO_SOURCES.find(s => s.source === o.source) || {}).name || o.source;

    function render(focusId) {
      body.innerHTML = `<section class="ex-card"><div class="ex-col">
        <h2 class="ex-h">Filter set information</h2>
        <div class="ex-field"><span class="ex-label">Name</span><div class="ex-ro" aria-disabled="true"><span>${esc(NAME)}</span><span class="ex-ro__n">${NAME.length}/40</span></div></div>
        <div class="ex-field"><span class="ex-label">Collection</span><div class="ex-ro ex-ro--tags" aria-disabled="true">${TAGS.map(t => `<span class="ex-tag ex-tag--static">${esc(t)}<span class="ex-ic">${ICON.close}</span></span>`).join('')}<span class="ex-ro__ph">Search for collections</span></div><p class="ex-sub">Select the collections where this filter set will display</p></div>
      </div></section>
      <section class="ex-card"><div class="ex-row-between"><h2 class="ex-h">Filter options</h2><button type="button" class="ex-btn ex-btn--primary" data-act="add">Add filter option</button></div>
        ${opts.length === 0 ? `<div class="ex-empty"><h2>No filter option has been found</h2><p>You don’t have any filter options yet. Start by creating a new one.</p><button type="button" class="ex-btn ex-btn--primary" data-act="add">Add filter option</button></div>` : `<div class="ex-tablewrap ex-fo"><table class="ex-table ex-fo-t"><thead><tr><th><span class="Polaris-Text--visuallyHidden">Reorder</span></th><th>Label</th><th>Source</th><th>Display type</th><th>Actions</th></tr></thead><tbody>
          ${opts.map(o => `<tr data-id="${o.id}"><td><button type="button" class="ex-fo-drag" draggable="true" data-grip="${o.id}" aria-label="Reorder ${esc(o.label)}. Use the up and down arrow keys to move it.">${grip}</button></td><td>${esc(o.label)}</td><td>${esc(srcName(o))}</td><td>${esc(FO_DISPLAY[o.display] || o.display)}</td><td><div class="ex-actions-cell"><button type="button" class="ex-iconbtn ex-iconbtn--box" data-act="edit" aria-label="Edit ${esc(o.label)}">${icon('edit')}</button><button type="button" class="ex-iconbtn ex-iconbtn--box" data-act="delete" aria-label="Delete ${esc(o.label)}">${icon('del')}</button></div></td></tr>`).join('')}
        </tbody></table></div>`}</section>`;
      syncBar();
      if (focusId) { const g = $(`[data-grip="${focusId}"]`); if (g) g.focus({ preventScroll: true }); }
    }

    function move(id, to) {
      const from = opts.findIndex(o => o.id === id);
      if (from < 0 || to < 0 || to >= opts.length || to === from) return;
      opts.splice(to, 0, opts.splice(from, 1)[0]);
      render(id);
    }
    function openDelete(o) {
      openModal({ title: 'Delete confirmation', content: '<p class="mf-modal__text">This filter option will be permanently deleted. Are you sure you want to proceed?</p>', ok: 'Delete', okClass: 'mf-btn--critical', cancel: 'Cancel',
        onOk: () => { opts = opts.filter(x => x.id !== o.id); render(); showToast('Filter option deleted'); } });
    }

    /* ---------- Add / edit filter option modal ---------- */
    function openOptionModal(editing) {
      const used = opts.filter(o => !editing || o.id !== editing.id).map(o => o.source);
      const avail = FO_SOURCES.filter(s => !used.includes(s.source));
      const others = opts.filter(o => !editing || o.id !== editing.id).map(o => o.label);
      let m = editing ? clone(editing) : { source: '', label: '', display: '', logic: 'single', match: 'any', auto: false, cd: false, cm: false, picked: [] };
      if (!m.match) m.match = 'any';
      const initial = JSON.stringify(m), opener = document.activeElement;
      let srcOpen = false, srcText = null, touched = false, showPrev = true;
      const S = () => FO_SOURCES.find(s => s.source === m.source);
      const items = s => (s && (s.fixed || s.sample)) || [];
      const uniqueLabel = base => { let n = 0, l = base; while (others.includes(l)) { n++; const suf = ' ' + n; l = base.slice(0, 40 - suf.length) + suf; } return l; };
      const labelErr = () => { if (!touched) return ''; const l = m.label.trim(); return !l ? 'This field is required' : others.includes(m.label) ? 'Label already used' : ''; };
      const isDirty = () => JSON.stringify(m) !== initial;
      const canSave = () => !!m.source && !!m.label.trim() && !others.includes(m.label) && isDirty();
      const resetPicked = () => { const s = S(); m.picked = m.auto ? [] : [...items(s)]; };
      const shown = () => { const s = S(), all = items(s); return m.display === 'slider' ? (s.fixed || []) : m.auto ? all.filter(v => !m.picked.includes(v)) : all.filter(v => m.picked.includes(v)); };
      const tip = txt => `<span class="ex-info" tabindex="0" role="note" aria-label="${esc(txt)}">${icon('info')}<span class="ex-tip" role="tooltip"><p>${esc(txt)}</p></span></span>`;
      const select = (id, label, opt, val, hide) => `<div class="mf-field"><label class="ex-label${hide ? ' Polaris-Text--visuallyHidden' : ''}" for="${id}">${esc(label)}</label><div class="Polaris-Select"><select id="${id}" class="Polaris-Select__Input">${opt.map(([v, n]) => `<option value="${esc(v)}"${v === val ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select><div class="Polaris-Select__Content" aria-hidden="true"><span class="Polaris-Select__SelectedOption">${esc((opt.find(x => x[0] === val) || ['', ''])[1])}</span><span class="Polaris-Select__Icon"><span class="Polaris-Icon">${ICON.down}</span></span></div><div class="Polaris-Select__Backdrop"></div></div></div>`;
      const check = (act, txt, on, title) => `<label class="ex-switchrow"${title ? ` title="${esc(title)}"` : ''}><input type="checkbox" class="pg-check" data-f="${act}"${on ? ' checked' : ''}>${esc(txt)}</label>`;

      function preview() {
        const s = S();
        if (!s) return '<div class="fo-prev__empty">Add your settings to see a live preview.</div>';
        const label = m.label.trim() || 'Option Label', vals = shown(), counts = [12, 3, 8, 5, 9, 2, 7, 4];
        let inner = '';
        if (m.display === 'slider') {
          const u = s.range.unit ? ` (${s.range.unit})` : '';
          inner = `<div class="fdt-filter-preview__range"><div class="fdt-filter-preview__range-slider" aria-hidden="true"><div class="fdt-filter-preview__range-track"><div class="fdt-filter-preview__range-selected"></div></div></div><div class="fdt-filter-preview__range-values"><label class="fdt-filter-preview__range-field"><span class="fdt-filter-preview__range-field-label">From${u}</span><input type="text" class="fdt-filter-preview__box-input" readonly value="${s.range.min}" tabindex="-1"></label><label class="fdt-filter-preview__range-field"><span class="fdt-filter-preview__range-field-label">To${u}</span><input type="text" class="fdt-filter-preview__box-input" readonly value="${s.range.max}" tabindex="-1"></label></div></div>`;
        } else if (m.display === 'box') {
          inner = `<div class="fdt-filter-preview__box-grid">${vals.map((v, i) => `<div class="fdt-filter-preview__box-item"><span class="fdt-filter-preview__box-input fdt-filter-preview__box-label">${esc(v)}<span class="fdt-filter-preview__count">${counts[i % 8]}</span></span></div>`).join('')}</div>`;
        } else if (m.display === 'swatch') {
          inner = `<div class="fo-swatches">${vals.map(v => `<span class="fo-swatch" title="${esc(v)}" style="background:${FO_SWATCH[v] || '#c9c9c9'}"></span>`).join('')}</div>`;
        } else {
          inner = `<ul class="fdt-filter-preview__list">${vals.map((v, i) => `<li class="fdt-filter-preview__checklist-item"><span class="fdt-filter-preview__checkbox"></span><span class="fdt-filter-preview__item-label">${esc(v)}</span><span class="fdt-filter-preview__count">${counts[i % 8]}</span></li>`).join('')}</ul>`;
        }
        return `<div class="fo-prev__box"><p class="fo-prev__label">${esc(label)}</p><div class="fdt-filter-preview__wrapper">${inner}</div></div>
          <p class="fo-prev__note">Note: The preview is for display purposes only. ${tip('1. Not all of filter option values will display here if there are too many of them. 2. The number of filter option values and their product counts shown above are not exact and only serves the display purposes.')}</p>`;
      }

      function formHtml() {
        const s = S(), err = labelErr();
        const list = avail.filter(a => !(srcText || '').trim() || !srcOpen || a.name.toLowerCase().includes(srcText.trim().toLowerCase()));
        const text = srcText !== null ? srcText : (s ? s.name : '');
        let h = `<p class="fo-guide"><a href="${FO_GUIDE}" target="_blank" rel="noopener noreferrer">Add filter option guidelines here</a></p>
        <section class="fo-card"><div class="fo-sec"><div class="ex-row-between"><h3 class="ex-h">Filter option</h3>${showPrev ? '' : '<button type="button" class="fo-link" data-act="showprev">Preview</button>'}</div>
        <div class="ex-col">
          <div class="ex-field ex-combo"><label for="fo-src" class="ex-label">Source</label>
            <input id="fo-src" class="mf-input" type="text" autocomplete="off" role="combobox" aria-expanded="${srcOpen}" aria-controls="fo-src-pop" placeholder="Select source" value="${esc(text)}">
            <div class="mf-pop" id="fo-src-pop" role="listbox"${srcOpen ? '' : ' hidden'}>${list.length ? list.map(a => `<div class="mf-opt" role="option" data-src="${a.source}" aria-selected="${a.source === m.source}"><span class="mf-opt__name">${esc(a.name)}</span><span class="mf-opt__type">${FO_TYPE[a.type]}</span></div>`).join('') : '<div class="mf-opt mf-opt--empty">No sources found</div>'}</div>
            <p class="mf-help">Want to <strong>filter by metafields</strong>? Choose your metafields <a href="metafield.html" data-act="metafield">here</a>, then return to continue filter setup.</p></div>
          <div class="ex-field"><label for="fo-label" class="ex-label">Label</label><input id="fo-label" class="mf-input${err ? ' mf-input--error' : ''}" type="text" maxlength="40" autocomplete="off" value="${esc(m.label)}"${err ? ' aria-invalid="true" aria-describedby="fo-label-err"' : ''}>
            <div class="fo-helprow"><p class="mf-help mf-help--error" id="fo-label-err">${esc(err)}</p><span class="fo-count">${m.label.length}/40</span></div></div>`;
        if (s) {
          h += `<div class="ex-field"><div class="fo-lbl"><span class="ex-label">Display type</span>${tip('Display type of the filter option')}</div>
            ${select('fo-display', 'Display type', s.display.map(d => [d, FO_DISPLAY[d]]), m.display, true)}
            ${m.display === 'slider' && s.help ? `<p class="mf-help">${esc(s.help)}</p>` : ''}${m.display === 'slider' && s.note ? `<p class="mf-help">${esc(s.note)}</p>` : ''}</div>
            <div class="fo-two">${check('cd', 'Collapse on desktop', m.cd, 'When this option is enabled, the content of the filter option will be hidden by default on Desktop')}${check('cm', 'Collapse on mobile', m.cm, 'When this option is enabled, the content of the filter option will be hidden by default on Mobile')}</div>`;
        }
        h += '</div></div>';
        if (s && m.display !== 'slider') {
          const all = items(s), heading = m.auto ? 'Excluded filter values' : 'Manual filter values';
          h += `<div class="fo-sec fo-sec--top"><h3 class="ex-h">Filter values</h3><div class="ex-col">
            ${s.sample ? `<div>${select('fo-auto', 'Select filter value', [['auto', 'All filter values'], ['manual', 'Manually']], m.auto ? 'auto' : 'manual')}<p class="mf-help">${m.auto ? 'Automatically show all filter values related to each collection and search result page. Excluded filter values will be hidden on store.' : 'Filter values without products will be hidden on the storefront.'}</p></div>` : ''}
            <div><div class="fo-lbl"><span class="ex-label">Option select</span>${tip('SINGLE - Allow user to select only one value. MULTIPLE - Allow user to select multiple values.')}</div>${select('fo-logic', 'Option select', Object.entries(FO_LOGIC), m.logic, true)}</div>
            ${m.logic === 'multiple' && s.source !== 'priceRange' ? `<div class="fo-match"><span class="ex-label">Result must match:</span><label class="ex-radio"><input type="radio" name="fo-match" data-f="match" value="all"${m.match === 'all' ? ' checked' : ''}>All values</label><label class="ex-radio"><input type="radio" name="fo-match" data-f="match" value="any"${m.match === 'any' ? ' checked' : ''}>Any value</label></div>` : ''}
            <div><span class="ex-label">${heading}</span><div class="fo-values">${all.map((v, i) => `<label class="ex-switchrow"><input type="checkbox" class="pg-check" data-pick="${i}"${m.picked.includes(v) ? ' checked' : ''}><span class="fo-values__t">${esc(v)}</span></label>`).join('')}</div></div>
          </div></div>`;
        }
        return h + '</section>';
      }

      const scrim = document.createElement('div'); scrim.className = 'mf-scrim fo-scrim'; scrim.setAttribute('data-mfp', '');
      scrim.innerHTML = `<div class="mf-modal fo-modal" role="dialog" aria-modal="true" aria-labelledby="fo-title" tabindex="-1"><div class="mf-modal__head"><h2 class="mf-modal__title" id="fo-title">${esc(editing ? editing.label : 'Add new filter option')}</h2><button type="button" class="mf-modal__x" aria-label="Close">${ICON.close}</button></div><div class="mf-modal__body"><div class="fo-grid"><div class="fo-main"></div><aside class="fo-prev" aria-label="Preview"></aside></div></div><div class="mf-modal__foot"><button type="button" class="mf-btn" data-m="cancel">Cancel</button><button type="button" class="mf-btn mf-btn--primary" data-m="save">Save</button></div></div>`;
      document.body.appendChild(scrim);
      const dlg = $('.fo-modal', scrim), main = $('.fo-main', scrim), prev = $('.fo-prev', scrim), saveBtn = $('[data-m=save]', scrim);

      function draw() {
        const a = document.activeElement, keep = a && scrim.contains(a) && a.id ? { id: a.id, s: a.selectionStart, e: a.selectionEnd } : null, top = $('.mf-modal__body', scrim).scrollTop;
        main.innerHTML = formHtml();
        prev.innerHTML = showPrev ? `<div class="fo-prev__head"><h3 class="ex-h">Preview</h3><button type="button" class="fo-link" data-act="hideprev">Hide</button></div><div class="fo-prev__body">${preview()}</div>` : '';
        prev.hidden = !showPrev; $('.fo-grid', scrim).classList.toggle('fo-grid--one', !showPrev);
        saveBtn.disabled = !canSave();
        $('.mf-modal__body', scrim).scrollTop = top;
        if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus({ preventScroll: true }); if (keep.s != null && el.setSelectionRange) try { el.setSelectionRange(keep.s, keep.e); } catch (x) { /* not a text input */ } } }
      }
      function close() { document.removeEventListener('keydown', onKey, true); scrim.remove(); if (opener && document.contains(opener)) opener.focus({ preventScroll: true }); }
      // the X, Esc and the backdrop never drop unsaved edits (Cancel is the explicit discard)
      function requestClose() { if (isDirty()) { showToast('Save or discard your changes before closing'); return; } close(); }
      function onKey(e) { if (e.key !== 'Escape' || $('.mf-scrim:not(.fo-scrim)')) return; e.stopPropagation(); if (srcOpen) { closeSrc(); return; } requestClose(); }
      document.addEventListener('keydown', onKey, true);
      function pickSource(key) {
        const s = FO_SOURCES.find(x => x.source === key); if (!s) return;
        m.source = s.source; m.label = uniqueLabel(s.name); m.display = s.display[0]; m.logic = 'single'; m.match = 'any'; m.auto = !!s.sample; m.cd = false; m.cm = false;
        resetPicked(); srcOpen = false; srcText = null; touched = false;
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // so draw() does not hand focus back to the source field and reopen its list
        draw(); const i = $('#fo-label', scrim); if (i) i.focus({ preventScroll: true });
      }
      // closing the list or showing a label error only touches the DOM it needs: a full draw() here would replace the very button the merchant is clicking
      function closeSrc() { srcOpen = false; srcText = null; const i = $('#fo-src', scrim), pop = $('#fo-src-pop', scrim); if (pop) pop.hidden = true; if (i) { i.setAttribute('aria-expanded', 'false'); i.value = S() ? S().name : ''; } }
      function paintLabelErr() { const err = labelErr(), i = $('#fo-label', scrim), t = $('#fo-label-err', scrim); if (t) t.textContent = err; if (i) { i.classList.toggle('mf-input--error', !!err); if (err) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); } saveBtn.disabled = !canSave(); }

      scrim.addEventListener('mousedown', e => {
        if (e.target === scrim) { requestClose(); return; }
        const o = e.target.closest('[data-src]'); if (o) { e.preventDefault(); pickSource(o.dataset.src); return; }
        if (srcOpen && !e.target.closest('.ex-combo')) closeSrc();
      });
      $('.mf-modal__x', scrim).addEventListener('click', requestClose);
      $('[data-m=cancel]', scrim).addEventListener('click', close);
      saveBtn.addEventListener('click', () => {
        if (!canSave()) return;
        const next = { id: editing ? editing.id : 'o' + Date.now(), source: m.source, label: m.label.trim(), display: m.display, logic: m.logic, match: m.match, auto: m.auto, cd: m.cd, cm: m.cm, picked: [...m.picked] };
        opts = editing ? opts.map(o => o.id === editing.id ? next : o) : [...opts, next];
        close(); render();
      });
      scrim.addEventListener('focusin', e => { if (e.target.id === 'fo-src' && !srcOpen) { srcOpen = true; srcText = ''; draw(); } });
      scrim.addEventListener('input', e => {
        if (e.target.id === 'fo-src') { srcText = e.target.value; srcOpen = true; draw(); }
        else if (e.target.id === 'fo-label') { m.label = e.target.value; touched = true; draw(); }
      });
      scrim.addEventListener('focusout', e => { if (e.target.id === 'fo-label' && !touched) { touched = true; paintLabelErr(); } });
      scrim.addEventListener('change', e => {
        const t = e.target, f = t.dataset && t.dataset.f;
        if (t.id === 'fo-display') { m.display = t.value; if (m.display !== 'slider' && !m.auto && !m.picked.length) resetPicked(); }
        else if (t.id === 'fo-auto') { m.auto = t.value === 'auto'; resetPicked(); }
        else if (t.id === 'fo-logic') m.logic = t.value;
        else if (f === 'cd' || f === 'cm') m[f] = t.checked;
        else if (f === 'match') m.match = t.value;
        else if (t.dataset && t.dataset.pick != null) { const v = items(S())[+t.dataset.pick]; m.picked = t.checked ? [...m.picked, v] : m.picked.filter(x => x !== v); }
        else return;
        draw();
      });
      scrim.addEventListener('click', e => {
        const a = e.target.closest('[data-act]'); if (!a) return;
        if (a.dataset.act === 'hideprev') { showPrev = false; draw(); }
        else if (a.dataset.act === 'showprev') { showPrev = true; draw(); }
        else if (a.dataset.act === 'metafield' && isDirty()) { e.preventDefault(); showToast('Save or discard your changes before leaving'); }
      });
      draw(); dlg.focus({ preventScroll: true });
    }

    body.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const tr = b.closest('tr'), o = tr && opts.find(x => x.id === tr.dataset.id);
      if (b.dataset.act === 'add') openOptionModal(null);
      else if (b.dataset.act === 'edit' && o) openOptionModal(o);
      else if (b.dataset.act === 'delete' && o) openDelete(o);
    });
    // reorder: drag the grip, or focus it and press the up / down arrow keys
    let dragId = null;
    body.addEventListener('dragstart', e => { const g = e.target.closest('[data-grip]'); if (!g) return; dragId = g.dataset.grip; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (x) { /* ignore */ } });
    body.addEventListener('dragover', e => { if (dragId && e.target.closest('tbody tr')) e.preventDefault(); });
    body.addEventListener('drop', e => { const tr = e.target.closest('tbody tr'); if (!dragId || !tr) return; e.preventDefault(); const id = dragId; dragId = null; move(id, opts.findIndex(o => o.id === tr.dataset.id)); });
    body.addEventListener('dragend', () => { dragId = null; });
    body.addEventListener('keydown', e => {
      const g = e.target.closest('[data-grip]'); if (!g || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault(); const i = opts.findIndex(o => o.id === g.dataset.grip); move(g.dataset.grip, i + (e.key === 'ArrowUp' ? -1 : 1));
    });
    $('[data-b=save]', bar).addEventListener('click', () => { store.set(FO_KEY, JSON.stringify(opts)); saved = clone(opts); syncBar(); showToast('Save successfully'); });
    $('[data-b=discard]', bar).addEventListener('click', () => { opts = clone(saved); render(); });
    render();
  }

  ({ 'filter-set': filterSetPage, translations: translationsPage, synonyms: synonymsPage, 'filter-translate': filterTranslatePage }[page] || (() => {}))();
})();

// phone: bring the current Search tab into view in the sideways-scrolling tab row (after fonts and layout settle)
window.addEventListener('load', () => {
  const t = document.querySelector('.fdt-menu-tabs .Polaris-Tabs__Tab--active'), w = t && t.closest('.Polaris-Tabs__ButtonWrapper');
  if (w) w.scrollLeft = Math.max(0, t.closest('li').offsetLeft + t.closest('li').offsetWidth - w.clientWidth);
});
