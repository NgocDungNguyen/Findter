/* Behaviour shared by the stand-alone pages (filter, search, metafield, boosters, ymm, features, design...).
   First-view replica: nothing here talks to a server. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const toast = m => window.__shell && window.__shell.toast(m);
  const soon = what => toast(`“${what}” is not part of this copy`);
  const text = el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();

  /* ---------- Save button (Search / Metafield / Design pages): disabled until something changes ---------- */
  const saveBtn = () => $$('button.Polaris-Button--variantPrimary').find(x => /^Save$/.test(x.textContent.trim()));
  function setSave(on) {
    const b = saveBtn(); if (!b) return;
    b.classList.toggle('Polaris-Button--disabled', !on);
    if (on) { b.removeAttribute('aria-disabled'); b.removeAttribute('tabindex'); } else { b.setAttribute('aria-disabled', 'true'); b.setAttribute('tabindex', '-1'); }
  }

  /* ---------- Save hooks + browser storage (every access guarded: storage can throw when blocked) ---------- */
  const savers = [];                                                            // run when the page's Save button is clicked
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: keep going */ } },
  };
  const PARTIAL_KEY = 'findter.partialSearch';                                  // Advanced features > Partial search switch (on by default, as captured)
  const partialOn = () => store.get(PARTIAL_KEY) !== '0';

  /* ---------- Promotion image banner: ONE banner shared by the 2 sub tabs of Filter, and one shared by the 2 sub tabs of Search ----------
     Each sub tab carries its own bannerId (by position, as the RQM says), but closing it on either sub tab closes it on both:
     the dismissal is stored for every bannerId of the page. Clicking the banner opens Crisp and sends the merchant's message
     (no auto reply, at most once every 10 s); the X only closes. The real app stores the dismissal on the server. */
  const PROMOS = {
    filter: {
      ids: { 'Manage filter set': 'manage-filter-set-promo', 'Collection booster': 'collection-booster-promo' },
      desktop: 'https://cdn.shopify.com/s/files/1/0765/0302/3847/files/Filter_Promotion_Desktop.png?v=1791793896',
      mobile: 'https://cdn.shopify.com/s/files/1/0765/0302/3847/files/Filter_Promotion_Mobile.png?v=1791793699',
      alt: 'Get help getting your filters ready for BFCM. Chat with our team.',
      message: "Hi, I'd like help getting my filters ready for BFCM (Sale filter + out-of-stock items)",
    },
    search: {
      ids: { 'Search settings': 'search-settings-promo', 'Search booster': 'search-booster-promo' },
      desktop: 'https://cdn.shopify.com/s/files/1/0765/0302/3847/files/Search_Promotion_Desktop.png?v=1791793660',
      mobile: 'https://cdn.shopify.com/s/files/1/0765/0302/3847/files/Search_Promotion_Mobile.png?v=1791793673',
      alt: 'Get help fixing searches that return no results before BFCM. Chat with our team.',
      message: "Hi, I'd like help fixing searches that return no results before BFCM",
    },
  };
  const PROMO_KEY = id => 'findter.promo.' + id + '.dismissed';
  function initPromoBanner() {
    const tab = $('.Polaris-Tabs__Tab[aria-selected="true"]'); if (!tab) return;
    const label = text(tab);
    const promo = Object.values(PROMOS).find(p => p.ids[label]); if (!promo) return;
    const ids = Object.values(promo.ids);
    if (ids.some(id => store.get(PROMO_KEY(id)) === '1')) return;              // closed on either sub tab: gone for good on both
    const card = $('#app .Polaris-ShadowBevel'); if (!card) return;            // the table / block info / Search field box
    const box = document.createElement('div'); box.className = 'pr-banner'; box.setAttribute('data-mfp', ''); box.setAttribute('data-banner-id', promo.ids[label]);
    box.innerHTML = `<button type="button" class="pr-banner__link" aria-label="${promo.alt} Opens a chat."><picture><source media="(max-width: 767.98px)" srcset="${promo.mobile}"><img src="${promo.desktop}" alt="${promo.alt}" width="966" height="160" decoding="async"></picture></button><button type="button" class="pr-banner__x" aria-label="Dismiss"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94z"></path></svg></button>`;
    card.insertAdjacentElement('afterend', box);
    let lastSent = 0;
    $('.pr-banner__link', box).addEventListener('click', () => {
      if (Date.now() - lastSent < 10000) return;                               // anti-spam: one message per 10 s
      lastSent = Date.now();
      if (window.__shell) window.__shell.openChatWith(promo.message);          // no auto reply: CSE answers in person
    });
    $('.pr-banner__x', box).addEventListener('click', () => {
      ids.forEach(id => store.set(PROMO_KEY(id), '1'));
      box.remove();
    });
  }
  initPromoBanner();

  /* ---------- Metafield search: every text metafield chosen on the Metafield page is its own search field in Search settings ----------
     Metafield page: pick product metafields and set Apply to (Filter / Search; Search only for text types).
     Search settings: every chosen TEXT metafield (Text, Text List, Multi Line Text) is a row of its own, after Vendor, tagged "Metafield".
       The row's tick IS the Search tick of that metafield's Apply to: untick it on either page and it is unticked on the other (after Save).
       A ticked row has its own Search type + Weight (editable while Partial search is on). Nothing is ever disabled or locked for this.
     Saving starts an index when a metafield is added or the Search selection changes (yellow, then green banner on the Metafield page).
     A page with unsaved changes cannot be left until they are saved or discarded.
     State in localStorage:  findter.metafields.v1  [{ id, applies }]   findter.mfFields.v1  { [id]: { type, weight } }   findter.mfIndex.v1  { pendingUntil, notice } */
  const MFS_KEY = 'findter.metafields.v1', MFI_KEY = 'findter.mfIndex.v1', MFF_KEY = 'findter.mfFields.v1', MF_LIMIT = 10, INDEX_MS = 6000;
  const MF_TYPES = {
    standard: 'Whole words',
    standard_edge_ngram: 'Word beginnings',
    standard_ngram: 'Any part of a word',
  };
  const MF_CATALOG = [                                                         // product metafields of the demo store
    { id: 'snowboard', label: 'Snowboard binding mount', type: 'single_line_text_field' },
    { id: 'img', label: 'img', type: 'file_reference' },
    { id: 'multi', label: 'multi line text', type: 'multi_line_text_field' },
    { id: 'height', label: 'height', type: 'number_decimal' },
    { id: 'sale', label: 'Sale', type: 'single_line_text_field' },
    { id: 'year', label: 'Year', type: 'list.single_line_text_field' },
    { id: 'material', label: 'Material', type: 'single_line_text_field' },
    { id: 'swatch', label: 'Swatch color', type: 'color' },
  ];
  const MF_TYPE_LABEL = { single_line_text_field: 'Text', 'list.single_line_text_field': 'Text List', multi_line_text_field: 'Multi Line Text', number_decimal: 'Decimal', file_reference: 'File', color: 'Color' };
  const MF_TEXT_TYPES = ['single_line_text_field', 'list.single_line_text_field', 'multi_line_text_field'];   // the only types Search works for
  const MF_SEED = [                                                            // what the demo store has selected the first time
    { id: 'snowboard', applies: ['search'] }, { id: 'multi', applies: ['filter'] }, { id: 'height', applies: ['filter'] },
    { id: 'sale', applies: ['search', 'filter'] }, { id: 'year', applies: ['filter'] },
  ];
  const WEIGHT_ERROR = 'Enter a whole number, 0 or higher.';
  const isWhole = v => /^\d+$/.test(String(v).trim());
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const mfMeta = id => MF_CATALOG.find(c => c.id === id);
  const isText = id => MF_TEXT_TYPES.includes(mfMeta(id).type);
  const parse = (key, fallback) => { try { const v = JSON.parse(store.get(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; } };
  const mfsLoad = () => {                                                      // the saved Metafield page selection
    const rows = parse(MFS_KEY, null);
    return (Array.isArray(rows) ? rows : MF_SEED).filter(r => r && mfMeta(r.id)).map(r => ({ id: r.id, applies: ['search', 'filter'].filter(a => (r.applies || []).includes(a)) }));
  };
  const searchIdsOf = rows => rows.filter(r => r.applies.includes('search') && isText(r.id)).map(r => r.id);
  const idxLoad = () => { const s = parse(MFI_KEY, null) || {}; return { pendingUntil: Number(s.pendingUntil) || 0, notice: s.notice === 'done' ? 'done' : null }; };
  const idxSave = i => store.set(MFI_KEY, JSON.stringify(i));
  const idxTick = () => {                                                      // finishes a pending index once its time is up; true when something changed
    const i = idxLoad(); if (!i.pendingUntil || Date.now() < i.pendingUntil) return false;
    idxSave({ pendingUntil: 0, notice: 'done' }); return true;
  };
  const idxWatchers = [];
  if ($('.fdt-metafield-table')) {                                             // only the page that shows the index result
    setInterval(() => { if (idxTick()) idxWatchers.forEach(fn => fn()); }, 1000);
    idxTick();
  }

  const mfLabel = (id, label) => `<div class="Polaris-Labelled__LabelWrapper"><div class="Polaris-Label"><label id="${id}-label" for="${id}" class="Polaris-Label__Text"><span class="Polaris-Text--root Polaris-Text--bodyMd">${label}</span></label></div></div>`;
  const mfSelect = (id, label, options, value, disabled) => `
    <div class="mf-field">
      ${mfLabel(id, label)}
      <div class="Polaris-Select${disabled ? ' Polaris-Select--disabled' : ''}">
        <select id="${id}" class="Polaris-Select__Input"${disabled ? ' disabled' : ''}>${Object.entries(options).map(([v, name]) => `<option value="${v}"${v === value ? ' selected' : ''}>${name}</option>`).join('')}</select>
        <div class="Polaris-Select__Content" aria-hidden="true"><span class="Polaris-Select__SelectedOption">${options[value]}</span><span class="Polaris-Select__Icon"><span class="Polaris-Icon"><svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M10.884 4.323a1.25 1.25 0 0 0-1.768 0l-2.646 2.647a.75.75 0 0 0 1.06 1.06l2.47-2.47 2.47 2.47a.75.75 0 1 0 1.06-1.06z"></path><path d="m13.53 13.03-2.47 2.47-2.47-2.47a.75.75 0 0 0-1.06 1.06l2.646 2.647a1.25 1.25 0 0 0 1.768 0l2.646-2.647a.75.75 0 0 0-1.06-1.06"></path></svg></span></span></div>
        <div class="Polaris-Select__Backdrop"></div>
      </div>
    </div>`;
  const mfWeight = (id, value, disabled) => `
    <div class="mf-field">
      ${mfLabel(id, 'Weight')}
      <input id="${id}" class="mf-input" type="number" min="0" step="1" inputmode="numeric" autocomplete="off" value="${esc(value)}" aria-describedby="${id}-help"${disabled ? ' disabled' : ''}>
      <p class="mf-help" id="${id}-help"></p>
    </div>`;
  const paintWeight = (input, valid) => {                                      // inline error under the field, red only for the error
    const p = $('#' + input.id + '-help'); input.classList.toggle('mf-input--error', !valid);
    input.setAttribute('aria-invalid', String(!valid)); p.classList.toggle('mf-help--error', !valid); p.textContent = valid ? '' : WEIGHT_ERROR;
  };
  const PARTIAL_NOTE = '<p class="mf-help mf-lock">Search type and weight need Partial search. Turn it on in <a class="Polaris-Link Polaris-Link--monochrome" href="features.html">Advanced features</a>.</p>';

  /* --- Search settings: one row per chosen text metafield, with its own Search type + Weight --- */
  function initMetafieldFields() {
    const list = $('.ss-table > div'); const proto = list && list.lastElementChild; if (!proto) return;
    const template = proto.cloneNode(true);                                    // same row as the other search fields
    const stored = parse(MFF_KEY, {}) || {};
    const draft = {}; const draftSearch = {}; const open = new Set(); const touched = new Set();
    const field = id => draft[id] || (draft[id] = (s => ({ type: MF_TYPES[s.type] ? s.type : 'standard', weight: String(Number.isInteger(s.weight) && s.weight >= 0 ? s.weight : 1) }))(stored[id] || {}));
    const applied = id => (mfsLoad().find(r => r.id === id) || { applies: [] }).applies.includes('search');   // the saved Apply to of the Metafield page
    const searchOf = id => (id in draftSearch) ? draftSearch[id] : applied(id);                                // this tick IS the Search tick of that metafield's Apply to window

    function paint(row, id) {                                                  // (re)draws one row
      const f = field(id), on = searchOf(id), panel = $('.mf-panel', row), chev = $('[role=button]', row), box = $('input.ft-checkbox', row);
      box.checked = on;
      chev.style.display = on ? 'inline-flex' : 'none';                        // the options only exist for a ticked field
      const show = on && open.has(id);
      chev.setAttribute('aria-expanded', String(show)); row.classList.toggle('mf-open', show); panel.hidden = !show;
      if (!show) return;
      const locked = !partialOn();                                             // Partial search off: options stay visible but disabled, with a way to unlock them
      panel.innerHTML = `<div class="mf-grid">${mfSelect('mf-type-' + id, 'Search type', MF_TYPES, f.type, locked)}${mfWeight('mf-weight-' + id, f.weight, locked)}</div>${locked ? PARTIAL_NOTE : ''}`;
      if (touched.has(id) && !locked) paintWeight($('#mf-weight-' + id, panel), isWhole(f.weight));
    }
    function buildRow(id) {
      const row = template.cloneNode(true); row.setAttribute('data-mf', ''); row.setAttribute('data-mf-id', id);
      const label = $('.Polaris-Text--root', row); label.textContent = mfMeta(id).label;
      label.insertAdjacentHTML('afterend', '<span class="mf-pill mf-pill--kind">Metafield</span>');
      const chev = $('[role=button]', row); chev.setAttribute('aria-controls', 'mf-panel-' + id); chev.setAttribute('aria-label', 'Options for ' + mfMeta(id).label); chev.tabIndex = 0;
      const box = $('input.ft-checkbox', row);
      const panel = document.createElement('div'); panel.id = 'mf-panel-' + id; panel.className = 'mf-panel'; panel.hidden = true;
      $('.Polaris-Collapsible', row).replaceWith(panel);
      const toggle = () => { if (!searchOf(id)) return; open.has(id) ? open.delete(id) : open.add(id); paint(row, id); };
      row.addEventListener('click', e => { if (e.target.closest('.mf-panel') || e.target.closest('input')) return; toggle(); });
      chev.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      box.addEventListener('change', () => { draftSearch[id] = box.checked; box.checked ? open.add(id) : open.delete(id); paint(row, id); });
      panel.addEventListener('change', e => {
        if (e.target.id === 'mf-type-' + id) { field(id).type = e.target.value; setSave(true); paint(row, id); const again = $('#mf-type-' + id, row); if (again) again.focus(); }
      });
      panel.addEventListener('input', e => { if (e.target.id === 'mf-weight-' + id) { field(id).weight = e.target.value; setSave(true); if (touched.has(id)) paintWeight(e.target, isWhole(e.target.value)); } });
      panel.addEventListener('focusout', e => { if (e.target.id === 'mf-weight-' + id && !e.target.disabled) { touched.add(id); paintWeight(e.target, isWhole(field(id).weight)); } });
      paint(row, id);
      return row;
    }
    const textIds = () => mfsLoad().filter(r => isText(r.id)).map(r => r.id);   // every chosen text metafield, in the Metafield page order
    const render = () => { $$('[data-mf]', list).forEach(r => r.remove()); textIds().forEach(id => list.appendChild(buildRow(id))); };
    savers.push(() => {
      const bad = textIds().find(id => searchOf(id) && partialOn() && !isWhole(field(id).weight));
      if (bad) {                                                               // a bad weight blocks Save; the error shows next to the field
        open.add(bad); touched.add(bad); const row = $(`[data-mf-id="${bad}"]`, list); paint(row, bad); const w = $('#mf-weight-' + bad, row); if (w) w.focus(); return false;
      }
      const out = {}; Object.keys(stored).forEach(k => { out[k] = stored[k]; });
      Object.keys(draft).forEach(k => { out[k] = { type: draft[k].type, weight: isWhole(draft[k].weight) ? Number(draft[k].weight) : 1 }; });
      store.set(MFF_KEY, JSON.stringify(out));
      const rows = mfsLoad(); let searchChanged = false;                       // the Search tick is shared: write it back to the Metafield page's Apply to
      rows.forEach(r => {
        if (!isText(r.id) || !(r.id in draftSearch)) return;
        const has = r.applies.includes('search'); if (has === draftSearch[r.id]) return;
        r.applies = ['search', 'filter'].filter(a => (a === 'search' ? draftSearch[r.id] : r.applies.includes('filter'))); searchChanged = true;
      });
      if (searchChanged) { store.set(MFS_KEY, JSON.stringify(rows)); idxSave({ pendingUntil: Date.now() + INDEX_MS, notice: null }); }   // changed Search selection: index (banner on the Metafield page)
      Object.keys(draftSearch).forEach(k => { delete draftSearch[k]; });
      return true;
    });
    window.addEventListener('pageshow', render);
    render();
  }
  if ($('.ss-table')) initMetafieldFields();

  /* --- Metafield page: picker + table (Title, Type, Apply to, Actions) + Apply to window + index banner --- */
  const ICON_EDIT = '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path fill-rule="evenodd" d="M15.655 4.344a2.695 2.695 0 0 0-3.81 0l-.599.599-.009-.009-1.06 1.06.008.01-5.88 5.88a2.75 2.75 0 0 0-.805 1.944v1.922a.75.75 0 0 0 .75.75h1.922a2.75 2.75 0 0 0 1.944-.806l7.54-7.539a2.695 2.695 0 0 0 0-3.81Zm-4.409 2.72-5.88 5.88a1.25 1.25 0 0 0-.366.884v1.172h1.172c.331 0 .65-.132.883-.366l5.88-5.88-1.689-1.69Zm2.75.629.599-.599a1.195 1.195 0 1 0-1.69-1.689l-.598.599 1.69 1.689Z"></path></svg>';
  const ICON_DELETE = '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M11.5 8.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0v-4.25a.75.75 0 0 1 .75-.75Z"></path><path d="M9.25 9a.75.75 0 0 0-1.5 0v4.25a.75.75 0 0 0 1.5 0v-4.25Z"></path><path fill-rule="evenodd" d="M7.25 5.25a2.75 2.75 0 0 1 5.5 0h3a.75.75 0 0 1 0 1.5h-.75v5.45c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311c-.642.327-1.482.327-3.162.327h-.4c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311c-.327-.642-.327-1.482-.327-3.162v-5.45h-.75a.75.75 0 0 1 0-1.5h3Zm1.5 0a1.25 1.25 0 1 1 2.5 0h-2.5Zm-2.25 1.5h7v5.45c0 .865-.001 1.423-.036 1.848-.033.408-.09.559-.128.633a1.5 1.5 0 0 1-.655.655c-.074.038-.225.095-.633.128-.425.035-.983.036-1.848.036h-.4c-.865 0-1.423-.001-1.848-.036-.408-.033-.559-.09-.633-.128a1.5 1.5 0 0 1-.656-.655c-.037-.074-.094-.225-.127-.633-.035-.425-.036-.983-.036-1.848v-5.45Z"></path></svg>';
  const ICON_INFO = '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M10 14a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-.75.75Z"></path><path d="M9 7a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"></path><path fill-rule="evenodd" d="M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-1.5 0a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"></path></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94z"></path></svg>';
  const ICON_ALERT = '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path fill-rule="evenodd" d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 3.25a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 .75-.75ZM10 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>';
  const ICON_OK = '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path fill-rule="evenodd" d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm3.28 5.78a.75.75 0 0 0-1.06-1.06L9 10.94 7.78 9.72a.75.75 0 1 0-1.06 1.06l1.75 1.75c.3.3.77.3 1.06 0l3.75-3.75Z"></path></svg>';
  function initMetafieldPage() {
    const wrap = $('.fdt-metafield-table'); const input = $('input[role=combobox]'); if (!wrap || !input) return;
    const tbody = $('tbody', wrap), footer = $('.Polaris-DataTable__Footer strong', wrap);
    let saved = mfsLoad(), savedJson = JSON.stringify(saved);
    let rows = mfsLoad(), activeIndex = -1, opener = null, skipOpen = false, hidePending = false;
    const dirty = () => JSON.stringify(rows) !== savedJson;
    wrap.setAttribute('data-mfp', '');
    $('thead tr', wrap).innerHTML = ['Title', 'Type', 'Apply to', 'Actions'].map(h => `<th data-polaris-header-cell="true" class="Polaris-DataTable__Cell Polaris-DataTable__Cell--verticalAlignTop Polaris-DataTable__Cell--header" scope="col"><strong class="Polaris-Text--root">${h}</strong></th>`).join('');

    /* --- index banner: yellow while the app collects the values, green when it is done --- */
    const section = $('.Polaris-Layout__Section > .Polaris-BlockStack'); const bannerBox = document.createElement('div'); bannerBox.setAttribute('data-mfp', ''); if (section) section.prepend(bannerBox);
    function renderBanner() {
      const i = idxLoad(), pending = i.pendingUntil > Date.now();
      if (pending && !hidePending) bannerBox.innerHTML = `<div class="mf-banner mf-banner--warn" role="status"><div class="mf-banner__head"><span class="mf-banner__icon">${ICON_ALERT}</span><strong>Collecting data</strong><button type="button" class="mf-banner__x" data-banner="hide" aria-label="Dismiss">${ICON_CLOSE}</button></div><p class="mf-banner__body">We are collecting metafield values, please wait.</p></div>`;
      else if (!pending && i.notice === 'done') bannerBox.innerHTML = `<div class="mf-banner mf-banner--ok" role="status"><span class="mf-banner__icon">${ICON_OK}</span><span class="mf-banner__text">Data indexing is completed. You can use selected metafields in <a href="filter.html">filter</a> and <a href="search.html">search</a> now.</span><button type="button" class="mf-banner__x" data-banner="done" aria-label="Dismiss">${ICON_CLOSE}</button></div>`;
      else bannerBox.innerHTML = '';
    }
    bannerBox.addEventListener('click', e => {
      const b = e.target.closest('[data-banner]'); if (!b) return;
      if (b.dataset.banner === 'hide') hidePending = true; else { const i = idxLoad(); i.notice = null; idxSave(i); }
      renderBanner();
    });
    idxWatchers.push(renderBanner);

    const iconBtn = (label, id, kind, icon) => `<button class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter" aria-label="${esc(label)}" data-id="${id}" data-act="${kind}" type="button"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium"><span class="Polaris-Icon Polaris-Icon--toneBase">${icon}</span></span></button>`;
    const cell = html => `<td class="Polaris-DataTable__Cell Polaris-DataTable__Cell--verticalAlignMiddle">${html}</td>`;
    function renderTable() {
      tbody.innerHTML = rows.map(row => {
        const m = mfMeta(row.id);
        const tags = ['search', 'filter'].filter(a => row.applies.includes(a)).map(a => `<span class="mf-pill">${a === 'search' ? 'Search' : 'Filter'}</span>`).join('');
        return `<tr class="Polaris-DataTable__TableRow Polaris-DataTable--hoverable"><th class="Polaris-DataTable__Cell Polaris-DataTable__Cell--verticalAlignMiddle Polaris-DataTable__Cell--firstColumn" scope="row">${esc(m.label)}</th>`
          + cell(MF_TYPE_LABEL[m.type]) + cell(tags ? `<span class="mf-pills">${tags}</span>` : '-')
          + cell(`<div class="filter-set-table-action-column">${iconBtn('Edit ' + m.label, row.id, 'edit', ICON_EDIT)}${iconBtn('Delete ' + m.label, row.id, 'delete', ICON_DELETE)}</div>`) + '</tr>';
      }).join('');
      footer.textContent = `${rows.length}/${MF_LIMIT} selected`;
      if (tables().length) tables().forEach(layoutTable);                      // columns changed: re-check the phone-width scroller
      setSave(dirty());
    }

    /* --- picker (the search box lists every metafield; ticking one adds it, unticking removes it) --- */
    const field = input.closest('.Polaris-Box'); field.style.position = 'relative'; field.setAttribute('data-mfp', '');
    const pop = document.createElement('div'); pop.id = 'mf-listbox'; pop.className = 'mf-pop'; pop.setAttribute('role', 'listbox'); pop.setAttribute('aria-multiselectable', 'true'); pop.setAttribute('aria-label', 'Metafields'); pop.hidden = true;
    field.appendChild(pop); input.setAttribute('aria-controls', 'mf-listbox'); input.setAttribute('aria-expanded', 'false');
    const options = () => MF_CATALOG.filter(c => c.label.toLowerCase().includes(input.value.trim().toLowerCase()));
    function renderPop() {
      const opts = options(); activeIndex = Math.min(activeIndex, opts.length - 1);
      pop.innerHTML = opts.length ? opts.map((c, i) => {
        const on = rows.some(r => r.id === c.id), full = !on && rows.length >= MF_LIMIT;
        return `<div role="option" id="mf-opt-${c.id}" class="mf-opt${i === activeIndex ? ' is-active' : ''}${full ? ' is-disabled' : ''}" data-id="${c.id}" aria-selected="${on}"${full ? ' aria-disabled="true"' : ''}><input type="checkbox" class="pg-check" tabindex="-1" aria-hidden="true"${on ? ' checked' : ''}${full ? ' disabled' : ''}><span class="mf-opt__name">${esc(c.label)}</span><span class="mf-opt__type">${MF_TYPE_LABEL[c.type]}</span></div>`;
      }).join('') : '<div class="mf-opt mf-opt--empty">No metafields found</div>';
      if (activeIndex >= 0 && opts[activeIndex]) input.setAttribute('aria-activedescendant', 'mf-opt-' + opts[activeIndex].id); else input.removeAttribute('aria-activedescendant');
    }
    const openPop = () => { pop.hidden = false; input.setAttribute('aria-expanded', 'true'); renderPop(); };
    const closePop = () => { pop.hidden = true; input.setAttribute('aria-expanded', 'false'); activeIndex = -1; input.removeAttribute('aria-activedescendant'); };
    function pick(id) {
      const i = rows.findIndex(r => r.id === id);
      if (i >= 0) rows.splice(i, 1); else if (rows.length < MF_LIMIT) rows.push({ id, applies: ['filter'] });   // a new metafield starts as Filter, like the app
      renderTable(); renderPop();
    }
    input.addEventListener('focus', () => { if (skipOpen) { skipOpen = false; return; } openPop(); });
    input.addEventListener('click', openPop);
    input.addEventListener('input', () => { activeIndex = -1; openPop(); });
    input.addEventListener('keydown', e => {
      const opts = options();
      if (e.key === 'ArrowDown') { e.preventDefault(); if (pop.hidden) openPop(); activeIndex = Math.min(activeIndex + 1, opts.length - 1); renderPop(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); renderPop(); }
      else if (e.key === 'Enter' && !pop.hidden && opts[activeIndex]) { e.preventDefault(); pick(opts[activeIndex].id); }
      else if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); closePop(); }
    });
    pop.addEventListener('mousedown', e => e.preventDefault());                // keep the focus in the search box while picking
    pop.addEventListener('click', e => { const o = e.target.closest('.mf-opt[data-id]'); if (o && !o.classList.contains('is-disabled')) pick(o.dataset.id); });
    document.addEventListener('click', e => { if (!pop.hidden && !field.contains(e.target)) closePop(); });
    input.addEventListener('blur', () => setTimeout(() => { if (!field.contains(document.activeElement)) closePop(); }, 0));

    /* --- window (Apply to, or confirm a delete); Esc / X / outside click close it --- */
    const scrim = document.createElement('div'); scrim.className = 'mf-scrim'; scrim.hidden = true; scrim.setAttribute('data-mfp', '');
    scrim.innerHTML = `<div class="mf-modal" role="dialog" aria-modal="true" aria-labelledby="mf-m-title"><div class="mf-modal__head"><h2 class="mf-modal__title" id="mf-m-title"></h2><button type="button" class="mf-modal__x" aria-label="Close">${ICON_CLOSE}</button></div><div class="mf-modal__body" id="mf-m-body"></div><div class="mf-modal__foot"><button type="button" class="mf-btn" data-m="cancel">Cancel</button><button type="button" class="mf-btn mf-btn--primary" data-m="ok">Save</button></div></div>`;
    document.body.appendChild(scrim);
    const dlg = $('.mf-modal', scrim), title = $('#mf-m-title', scrim), body = $('#mf-m-body', scrim), okBtn = $('[data-m=ok]', scrim);
    let current = null;                                                         // { kind, id, filter, search }
    const closeModal = () => {
      scrim.hidden = true; current = null;
      const back = opener && document.contains(opener) ? opener : (opener && opener.dataset && $(`[data-id="${opener.dataset.id}"][data-act="${opener.dataset.act}"]`, tbody)) || input;
      if (back === input) skipOpen = true;                                      // returning focus to the search box must not pop the list open
      if (back) back.focus(); opener = null;
    };
    function fillEdit() {
      const m = current, nonText = !isText(m.id);                               // only a non-text metafield has Search disabled (tooltip); everything else is a plain tick
      body.innerHTML = `
        <p class="mf-modal__sub">Apply to</p>
        <label class="mf-check"><input type="checkbox" class="pg-check" id="mf-a-filter"${m.filter ? ' checked' : ''}><span>Filter</span></label>
        <div class="mf-check-row"><label class="mf-check${nonText ? ' is-disabled' : ''}"><input type="checkbox" class="pg-check" id="mf-a-search"${!nonText && m.search ? ' checked' : ''}${nonText ? ' disabled' : ''}><span>Search</span></label>${nonText ? `<span class="mf-tip" tabindex="0" role="img" aria-label="Search is only available for text fields."><span class="Polaris-Icon Polaris-Icon--toneSubdued">${ICON_INFO}</span><span class="mf-tip__bubble" role="tooltip">Search is only available for text fields.</span></span>` : ''}</div>`;
    }
    function openEdit(id, from) {
      const row = rows.find(r => r.id === id); opener = from;
      current = { kind: 'edit', id, filter: row.applies.includes('filter'), search: row.applies.includes('search') };
      title.textContent = mfMeta(id).label; okBtn.textContent = 'Save'; okBtn.classList.remove('mf-btn--critical'); okBtn.classList.add('mf-btn--primary');
      fillEdit(); scrim.hidden = false; const first = $('#mf-a-filter', body); if (first) first.focus();
    }
    function openDelete(id, from) {
      opener = from; current = { kind: 'delete', id };
      title.textContent = 'Delete this metafield?'; okBtn.textContent = 'Delete'; okBtn.classList.remove('mf-btn--primary'); okBtn.classList.add('mf-btn--critical');
      body.innerHTML = '<p class="mf-modal__text">After saving, deleted metafields will no longer appear in the filter or in Search settings.</p>';
      scrim.hidden = false; $('[data-m=cancel]', scrim).focus();
    }
    function confirmModal() {
      if (!current) return;
      if (current.kind === 'delete') { rows = rows.filter(r => r.id !== current.id); opener = input; closeModal(); renderTable(); return; }
      const row = rows.find(r => r.id === current.id), nonText = !isText(current.id);
      row.applies = ['search', 'filter'].filter(a => (a === 'filter' ? current.filter : (!nonText && current.search)));
      closeModal(); renderTable();
    }
    wrap.addEventListener('click', e => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      if (b.dataset.act === 'edit') openEdit(b.dataset.id, b); else openDelete(b.dataset.id, b);
    });
    scrim.addEventListener('click', e => {
      if (e.target === scrim || e.target.closest('.mf-modal__x') || e.target.closest('[data-m=cancel]')) closeModal();
      else if (e.target.closest('[data-m=ok]')) confirmModal();
    });
    scrim.addEventListener('change', e => {
      if (!current) return;
      if (e.target.id === 'mf-a-filter') current.filter = e.target.checked;
      if (e.target.id === 'mf-a-search') current.search = e.target.checked;
    });
    document.addEventListener('keydown', e => {
      if (scrim.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key === 'Tab') {                                                    // keep the keyboard inside the window while it is open
        const f = $$('button, input:not([disabled]), a[href], [tabindex="0"]', dlg).filter(x => x.offsetParent !== null);
        if (!f.length) return; const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    savers.push(() => {
      const added = rows.some(r => !saved.some(s => s.id === r.id));                      // a new metafield or a changed Search selection needs an index
      const searchChanged = JSON.stringify(searchIdsOf(rows).sort()) !== JSON.stringify(searchIdsOf(saved).sort());
      savedJson = JSON.stringify(rows); saved = JSON.parse(savedJson); store.set(MFS_KEY, savedJson);
      if (added || searchChanged) { idxSave({ pendingUntil: Date.now() + INDEX_MS, notice: null }); hidePending = false; }
      renderBanner(); return true;
    });
    window.addEventListener('pageshow', () => { renderBanner(); renderTable(); });   // back from Search settings: re-read what is switched on there
    renderTable(); renderBanner();
  }
  if ($('.fdt-metafield-table')) initMetafieldPage();

  /* ---------- Filter design + Product grid design: the real app's settings panels (components/CustomDesign, develop) ----------
     Same config shape, defaults, controls, ranges and preview logic as the app. Every collapsible starts closed; the header
     switch (Vendor, badges, buttons) dims its whole panel when off, and each "Enable custom" switch dims its own card. The
     preview follows the draft on every change and only uses a group's values while its "Enable custom" is on (buildCssVars).
     Save is enabled while the draft differs from what was saved; Save stores it here in localStorage (the app: shop metafields). */
  const W_OPTS = [['normal', 'Regular'], ['bold', 'Bold']];
  const TF_OPTS = [['none', 'None'], ['capitalize', 'Capitalize'], ['uppercase', 'Uppercase']];
  const POS_OPTS = [['top left', 'Top left'], ['top right', 'Top right']];
  const DZ_DEFAULTS = {
    filter: {
      layout_type: 'vertical',
      filter_custom: {
        toolbar: { enable_custom: false, preview: ['Blue', 'Red', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink'], toolbar_color: '#000000', toolbar_background: '#F4F4F4', close_icon: '#000000' },
        filter_bar: { enable_custom: false, sticky_filter: false, hide_scroll: false, bar_background: '#FFFFFF', bar_width: 350 },
        filter_label: { enable_custom: false, label_size: '14px', label_color: '#000000', label_weight: 'normal', label_transform: 'none' },
        filter_value: { enable_custom: false, value_size: 14, value_color: '#000000', value_color_hover: '#000000', value_background: '#FFFFFF', value_background_hover: '#FFFFFF', value_weight: 'normal', value_transform: 'none' },
        filter_button: { enable_custom: false, button_size: 14, button_weight: 'normal', button_transform: 'none', button_color: '#000000', button_background: '#FFFFFF', button_border_color: '#000000', button_border_radius: 5 },
      },
    },
    grid: {
      product_per_page: 16, number_items_per_row: '3', pagination: 'show_more', product_grid_enable_custom: false, background: '#FFFFFF',
      image_ratio: '3-4', image_shape: 'default', image_radius: '4', effect_on_hover: { show_second_image: true, zoom_in: true },
      show_vendor: true, show_button_quick_add: true,
      element_order: [{ id: 'product_title', position: 0 }, { id: 'vendor', position: 1 }, { id: 'price', position: 2 }],
      product_card: { enable_custom: false, content_alignment: 'start', background: '#FFFFFF', show_border: false, border_color: '#CCCCCC', border_radius: 5, content_padding: 0 },
      title: { enable_custom: false, font_size: 16, color: '#000000', font_weight: 'normal', text_transform: 'none' },
      vendor: { enable_custom: false, font_size: 12, color: '#6B7280', font_weight: 'normal', text_transform: 'none' },
      price: { hide: 'never', hide_decimal: false, enable_custom: false, regular: { font_size: 15, color: '#1F2937', font_weight: 'normal' }, compare_at: { font_size: 13, color: '#9CA3AF', font_weight: 'normal' }, sale: { font_size: 18, color: '#DC2626', font_weight: 'normal' } },
      sale_badge: { show_sale_badge: true, enable_custom: false, font_size: 11, color: '#FFFFFF', font_weight: 'normal', text_transform: 'none', background: '#16A34A', position: 'top left', border_radius: 5, style: 'custom', custom_text: 'Sale' },
      sold_out_badge: { enabled: false, enable_custom: false, font_size: 11, color: '#FFFFFF', background: '#374151', font_weight: 'bold', style: 'sold_out', custom_text: 'Unavailable', position: 'top left', border_radius: 5 },
      low_stock_badge: { enabled: false, enable_custom: false, font_size: 11, color: '#FFFFFF', background: '#374151', font_weight: 'bold', position: 'top left', show_when_stock_lte: 1 },
      button_add_to_cart: { enable_custom: false, background: '#000000', color: '#FFFFFF', font_weight: 'normal', text_transform: 'none', font_size: 14, border_radius: 4, label_style: 'default', custom_text: 'Add to cart', padding: 8, border_color: '#1F2937', hover_color: '#FFFFFF', hover_background: '#374151', hover_border_color: '#1F2937' },
    },
  };

  /* panel schema: one entry per collapsible, in the app's order. Item types: sw (switch), checks, color, range, select, pair
     (two selects on one row), card (the "Enable custom" card), dim (dimmed while a switch is off), style (select + custom
     text), num, tags, order, choices, h, p, help, perpage */
  const chatLink = (label, msg) => `<button type="button" class="Polaris-Link dz-chat" data-msg="${esc(msg)}">${label}</button>`;
  const ecF = g => ({ t: 'sw', label: 'Enable custom design', path: g + '.enable_custom' });
  const ecG = g => ({ t: 'sw', label: 'Enable custom', path: g + '.enable_custom' });
  const wt = (p, pair) => ({ t: 'select', label: 'Weight', path: p, opts: W_OPTS });
  const tf = p => ({ t: 'select', label: 'Transform', path: p, opts: TF_OPTS });
  const FC = 'filter_custom.';
  const DZ_SECTIONS = {
    filter: [
      { id: 'toolbar-settings', title: 'Toolbar', items: [ecF(FC + 'toolbar'), { t: 'card', when: FC + 'toolbar.enable_custom', items: [
        { t: 'tags' },
        { t: 'color', label: 'Text color', path: FC + 'toolbar.toolbar_color' },
        { t: 'color', label: 'Background color', path: FC + 'toolbar.toolbar_background' },
        { t: 'color', label: 'Close icon', path: FC + 'toolbar.close_icon' }] }] },
      { id: 'filter-bar-settings', title: 'Filter bar', items: [ecF(FC + 'filter_bar'), { t: 'card', when: FC + 'filter_bar.enable_custom', items: [
        { t: 'checks', items: [['Sticky filter (scrolls with page)', FC + 'filter_bar.sticky_filter'], ['Hide scroll', FC + 'filter_bar.hide_scroll']] },
        { t: 'color', label: 'Bar background', path: FC + 'filter_bar.bar_background' },
        { t: 'range', label: 'Bar width', path: FC + 'filter_bar.bar_width', min: 250, max: 800 }] }] },
      { id: 'filter-label-settings', title: 'Filter option label', items: [ecF(FC + 'filter_label'), { t: 'card', when: FC + 'filter_label.enable_custom', items: [
        { t: 'range', label: 'Size', path: FC + 'filter_label.label_size', min: 10, max: 20 },
        { t: 'color', label: 'Text color', path: FC + 'filter_label.label_color' },
        { t: 'pair', items: [wt(FC + 'filter_label.label_weight'), tf(FC + 'filter_label.label_transform')] }] }] },
      { id: 'filter-value-settings', title: 'Filter option value', items: [ecF(FC + 'filter_value'), { t: 'card', when: FC + 'filter_value.enable_custom', items: [
        { t: 'range', label: 'Size', path: FC + 'filter_value.value_size', min: 10, max: 20 },
        { t: 'color', label: 'Text color', path: FC + 'filter_value.value_color' },
        { t: 'color', label: 'Text hover color', path: FC + 'filter_value.value_color_hover' },
        { t: 'color', label: 'Background color', path: FC + 'filter_value.value_background' },
        { t: 'color', label: 'Background hover color', path: FC + 'filter_value.value_background_hover' },
        { t: 'pair', items: [wt(FC + 'filter_value.value_weight'), tf(FC + 'filter_value.value_transform')] }] }] },
      { id: 'filter-button-settings', title: 'Filter button', items: [ecF(FC + 'filter_button'), { t: 'card', when: FC + 'filter_button.enable_custom', items: [
        { t: 'range', label: 'Size', path: FC + 'filter_button.button_size', min: 10, max: 20 },
        { t: 'pair', items: [wt(FC + 'filter_button.button_weight'), tf(FC + 'filter_button.button_transform')] },
        { t: 'color', label: 'Text color', path: FC + 'filter_button.button_color' },
        { t: 'color', label: 'Background color', path: FC + 'filter_button.button_background' },
        { t: 'color', label: 'Border color', path: FC + 'filter_button.button_border_color' },
        { t: 'range', label: 'Border radius', path: FC + 'filter_button.button_border_radius', min: 0, max: 20 }] },
        { t: 'help', html: 'The filter button opens the filter panel. It only appears when the filter layout is set to off-canvas.' }] },
    ],
    grid: [
      { id: 'product-grid-desktop-settings', title: 'Product grid (Desktop)', items: [
        { t: 'perpage' },
        { t: 'select', label: 'Number of items in a row', path: 'number_items_per_row', opts: [['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']], size: '30%' },
        { t: 'select', label: 'Pagination', path: 'pagination', opts: [['show_more', 'Show more'], ['infinite_scroll', 'Infinite scroll'], ['numbers', 'Number pagination']], size: '60%' },
        { t: 'sw', label: 'Enable custom', path: 'product_grid_enable_custom' },
        { t: 'card', when: 'product_grid_enable_custom', items: [{ t: 'color', label: 'Background', path: 'background' }] }] },
      { id: 'product-grid-mobile-settings', title: 'Product grid (Mobile)', items: [
        { t: 'p', html: 'Pagination is not available.<br>Number of items in a row is 2.<br>' + chatLink('Contact us', 'I want to customize on Mobile') + ' to customize on Mobile.' }] },
      { id: 'element-order-settings', title: 'Element order', items: [
        { t: 'p', html: 'Reorder how elements appear in your product card.<br>Drag items to change their position.' }, { t: 'order' }] },
      { id: 'product-card-settings', title: 'Product card', items: [ecG('product_card'), { t: 'card', when: 'product_card.enable_custom', items: [
        { t: 'sw', label: 'Show border', path: 'product_card.show_border' },
        { t: 'dim', when: 'product_card.show_border', items: [{ t: 'color', label: 'Border color', path: 'product_card.border_color' }] },
        { t: 'color', label: 'Background', path: 'product_card.background' },
        { t: 'range', label: 'Border radius', path: 'product_card.border_radius', min: 1, max: 36 },
        { t: 'select', label: 'Content align', path: 'product_card.content_alignment', opts: [['start', 'Left'], ['center', 'Center'], ['end', 'Right']], size: '40%' },
        { t: 'range', label: 'Content padding', path: 'product_card.content_padding', min: 0, max: 20 }] }] },
      { id: 'image-settings', title: 'Product image', items: [
        { t: 'select', label: 'Image ratio', path: 'image_ratio', opts: [['auto', 'Adapt to image'], ['3-4', 'Portrait (3:4)'], ['1-1', 'Square (1:1)']], size: '60%' },
        { t: 'select', label: 'Image shape', path: 'image_shape', opts: [['default', 'Default']], size: '60%' },
        { t: 'help', html: chatLink('Contact us', 'I want other image shapes') + ' if you would like other shapes.' },
        { t: 'range', label: 'Choose radius for image', path: 'image_radius', min: 0, max: 50 },
        { t: 'choices', title: 'Effect on hover', items: [['Show second image', 'effect_on_hover.show_second_image'], ['Zoom in', 'effect_on_hover.zoom_in']] }] },
      { id: 'product-title-settings', title: 'Product title', items: [ecG('title'), { t: 'card', when: 'title.enable_custom', items: [
        { t: 'color', label: 'Text color', path: 'title.color' },
        { t: 'range', label: 'Size', path: 'title.font_size', min: 1, max: 30 },
        wt('title.font_weight'), tf('title.text_transform')] }] },
      { id: 'vendor-settings', title: 'Vendor', action: { path: 'show_vendor', label: 'Show Vendor' }, items: [ecG('vendor'), { t: 'card', when: 'vendor.enable_custom', items: [
        { t: 'color', label: 'Text color', path: 'vendor.color' },
        { t: 'range', label: 'Size', path: 'vendor.font_size', min: 1, max: 30 },
        wt('vendor.font_weight'), tf('vendor.text_transform')] }] },
      { id: 'product-price-settings', title: 'Price', items: [ecG('price'),
        { t: 'card', when: 'price.enable_custom', items: [
          { t: 'select', label: 'Hide price when', path: 'price.hide', opts: [['never', 'Never'], ['always', 'Always hide'], ['guest', 'Guest users only']] },
          { t: 'sw', label: 'Hide decimal (.00)', path: 'price.hide_decimal', spread: true },
          { t: 'h', text: 'Fixed/Regular price' }, { t: 'color', label: 'Text color', path: 'price.regular.color' }, wt('price.regular.font_weight'), { t: 'range', label: 'Size', path: 'price.regular.font_size', min: 1, max: 30 }] },
        { t: 'card', when: 'price.enable_custom', items: [
          { t: 'h', text: 'Old/Compare-at price' }, { t: 'color', label: 'Text color', path: 'price.compare_at.color' }, wt('price.compare_at.font_weight'), { t: 'range', label: 'Size', path: 'price.compare_at.font_size', min: 1, max: 30 }] },
        { t: 'card', when: 'price.enable_custom', items: [
          { t: 'h', text: 'Sale price' }, { t: 'color', label: 'Text color', path: 'price.sale.color' }, wt('price.sale.font_weight'), { t: 'range', label: 'Size', path: 'price.sale.font_size', min: 1, max: 30 }] }] },
      { id: 'sale-badge-settings', title: 'Sale badge', action: { path: 'sale_badge.show_sale_badge', label: 'Sale badge' }, items: [ecG('sale_badge'), { t: 'card', when: 'sale_badge.enable_custom', items: [
        { t: 'color', label: 'Background', path: 'sale_badge.background' }, { t: 'color', label: 'Text color', path: 'sale_badge.color' },
        wt('sale_badge.font_weight'), { t: 'select', label: 'Position', path: 'sale_badge.position', opts: POS_OPTS },
        { t: 'range', label: 'Size', path: 'sale_badge.font_size', min: 1, max: 30 }, { t: 'range', label: 'Border radius', path: 'sale_badge.border_radius', min: 1, max: 15 },
        { t: 'style', path: 'sale_badge.style', text: 'sale_badge.custom_text', opts: [['percentage', 'Percentage (-30%)'], ['amount', 'Amount (-$20)'], ['custom', 'Custom text']] }] }] },
      { id: 'sold-out-badge-settings', title: 'Sold out badge', action: { path: 'sold_out_badge.enabled', label: 'Sold out badge' }, items: [ecG('sold_out_badge'), { t: 'card', when: 'sold_out_badge.enable_custom', items: [
        { t: 'color', label: 'Background', path: 'sold_out_badge.background' }, { t: 'color', label: 'Text color', path: 'sold_out_badge.color' },
        wt('sold_out_badge.font_weight'), { t: 'select', label: 'Position', path: 'sold_out_badge.position', opts: POS_OPTS },
        { t: 'range', label: 'Size', path: 'sold_out_badge.font_size', min: 1, max: 30 }, { t: 'range', label: 'Border radius', path: 'sold_out_badge.border_radius', min: 1, max: 15 },
        { t: 'style', path: 'sold_out_badge.style', text: 'sold_out_badge.custom_text', opts: [['sold_out', 'Sold out'], ['out_of_stock', 'Out of stock'], ['custom', 'Custom text']] }] }] },
      { id: 'low-stock-badge-settings', title: 'Low stock badge', action: { path: 'low_stock_badge.enabled', label: 'Low stock badge' }, items: [ecG('low_stock_badge'), { t: 'card', when: 'low_stock_badge.enable_custom', items: [
        { t: 'num', label: 'When stock ≤', path: 'low_stock_badge.show_when_stock_lte' },
        { t: 'color', label: 'Background', path: 'low_stock_badge.background' }, { t: 'color', label: 'Text color', path: 'low_stock_badge.color' },
        wt('low_stock_badge.font_weight'), { t: 'select', label: 'Position', path: 'low_stock_badge.position', opts: POS_OPTS },
        { t: 'range', label: 'Size', path: 'low_stock_badge.font_size', min: 1, max: 30 }] }] },
      { id: 'add-to-cart-settings', title: 'Product card buttons', action: { path: 'show_button_quick_add', label: 'Show button' }, items: [ecG('button_add_to_cart'), { t: 'card', when: 'button_add_to_cart.enable_custom', items: [
        { t: 'color', label: 'Background', path: 'button_add_to_cart.background' }, { t: 'color', label: 'Text color', path: 'button_add_to_cart.color' },
        { t: 'color', label: 'Border color', path: 'button_add_to_cart.border_color' }, { t: 'color', label: 'Hover text', path: 'button_add_to_cart.hover_color' },
        { t: 'color', label: 'Hover background', path: 'button_add_to_cart.hover_background' }, { t: 'color', label: 'Hover border', path: 'button_add_to_cart.hover_border_color' },
        wt('button_add_to_cart.font_weight'), tf('button_add_to_cart.text_transform'),
        { t: 'range', label: 'Size', path: 'button_add_to_cart.font_size', min: 1, max: 30 }, { t: 'range', label: 'Border radius', path: 'button_add_to_cart.border_radius', min: 1, max: 15 },
        { t: 'range', label: 'Padding', path: 'button_add_to_cart.padding', min: 0, max: 30 },
        { t: 'style', path: 'button_add_to_cart.label_style', text: 'button_add_to_cart.custom_text', opts: [['default', 'Default'], ['custom', 'Custom text']] }] }] },
    ],
  };

  const dzClone = o => JSON.parse(JSON.stringify(o));
  const dzGet = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const dzSet = (o, p, v) => { const ks = p.split('.'), last = ks.pop(); let a = o; ks.forEach(k => { if (a[k] == null || typeof a[k] !== 'object') a[k] = {}; a = a[k]; }); a[last] = v; };
  const dzObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const dzMerge = (base, upd) => { const out = { ...base }; Object.keys(upd || {}).forEach(k => { out[k] = dzObj(upd[k]) && dzObj(base[k]) ? dzMerge(base[k], upd[k]) : upd[k]; }); return out; };   // mergeConfigUpdates
  const dzNum = v => parseInt(v, 10) || 0;                                       // the app stores some sizes as 14 and one as "14px"
  const dzHex = v => { const m = String(v || '').trim().replace(/^#/, ''); if (/^[0-9a-f]{6}$/i.test(m)) return '#' + m.toUpperCase(); if (/^[0-9a-f]{3}$/i.test(m)) return '#' + m.replace(/./g, c => c + c).toUpperCase(); return null; };
  const ICON_CHEV = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M5.72 12.53a.75.75 0 0 1 0-1.06l3.47-3.47-3.47-3.47a.749.749 0 1 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06 0"></path></svg>';
  const ICON_SELECT = '<span class="Polaris-Icon"><svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M10.884 4.323a1.25 1.25 0 0 0-1.768 0l-2.646 2.647a.75.75 0 0 0 1.06 1.06l2.47-2.47 2.47 2.47a.75.75 0 1 0 1.06-1.06l-2.646-2.647Z"></path><path d="m13.53 13.03-2.646 2.647a1.25 1.25 0 0 1-1.768 0l-2.646-2.647a.75.75 0 0 1 1.06-1.06l2.47 2.47 2.47-2.47a.75.75 0 0 1 1.06 1.06Z"></path></svg></span>';
  const ICON_DRAG = '<span class="Polaris-Icon Polaris-Icon--toneSubdued"><svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M7.5 4.5c-.552 0-1 .448-1 1v.5c0 .552.448 1 1 1h.5c.552 0 1-.448 1-1v-.5c0-.552-.448-1-1-1h-.5Z"></path><path d="M7.5 8.75c-.552 0-1 .448-1 1v.5c0 .552.448 1 1 1h.5c.552 0 1-.448 1-1v-.5c0-.552-.448-1-1-1h-.5Z"></path><path d="M6.5 14c0-.552.448-1 1-1h.5c.552 0 1 .448 1 1v.5c0 .552-.448 1-1 1h-.5c-.552 0-1-.448-1-1v-.5Z"></path><path d="M12 4.5c-.552 0-1 .448-1 1v.5c0 .552.448 1 1 1h.5c.552 0 1-.448 1-1v-.5c0-.552-.448-1-1-1h-.5Z"></path><path d="M11 9.75c0-.552.448-1 1-1h.5c.552 0 1 .448 1 1v.5c0 .552-.448 1-1 1h-.5c-.552 0-1-.448-1-1v-.5Z"></path><path d="M12 13c-.552 0-1 .448-1 1v.5c0 .552.448 1 1 1h.5c.552 0 1-.448 1-1v-.5c0-.552-.448-1-1-1h-.5Z"></path></svg></span>';
  const ICON_CARET = '<span class="Polaris-Icon"><svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M13.098 8h-6.196c-.751 0-1.172.754-.708 1.268l3.098 3.432c.36.399 1.055.399 1.416 0l3.098-3.433c.464-.513.043-1.267-.708-1.267Z"></path></svg></span>';
  const ICON_ADJUST = '<span class="Polaris-Icon"><svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M3 6.25a.75.75 0 0 1 .75-.75h5.4a2.25 2.25 0 0 1 4.2 0h2.9a.75.75 0 0 1 0 1.5h-2.9a2.25 2.25 0 0 1-4.2 0h-5.4a.75.75 0 0 1-.75-.75Zm8.25.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-8.25 6.75a.75.75 0 0 1 .75-.75h1.4a2.25 2.25 0 0 1 4.2 0h6.9a.75.75 0 0 1 0 1.5h-6.9a2.25 2.25 0 0 1-4.2 0h-1.4a.75.75 0 0 1-.75-.75Zm4.25.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"></path></svg></span>';
  const EL_META = {
    product_title: ['Product title', 'Main product title display', '<path d="M2 2.75a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-.75h-3.5v8.75h1.25a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5h1.25v-8.75h-3.5v.75a.75.75 0 0 1-1.5 0z"></path>'],
    vendor: ['Vendor', 'Brand or seller name', '<path fill-rule="evenodd" d="M11.257 1h-6.514c-.384 0-.746.176-.983.478l-2.386 3.037a1.75 1.75 0 0 0-.374 1.08v.655a2.75 2.75 0 0 0 1.5 2.45v4.55c0 .966.784 1.75 1.75 1.75h7.5a1.75 1.75 0 0 0 1.75-1.75v-4.55a2.75 2.75 0 0 0 1.5-2.45v-.481c0-.504-.17-.994-.48-1.39l-2.28-2.901a1.25 1.25 0 0 0-.983-.478m-.257 12.5h.75a.25.25 0 0 0 .25-.25v-4.25a2.74 2.74 0 0 1-2-.863c-.501.532-1.212.863-2 .863s-1.499-.331-2-.863a2.74 2.74 0 0 1-2 .863v4.25c0 .138.112.25.25.25h3.75v-2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1zm-7-6h-.25c-.69 0-1.25-.56-1.25-1.25v-.654q.001-.086.053-.155l2.312-2.941h6.27l2.205 2.805c.104.133.16.296.16.464v.481c0 .69-.56 1.25-1.25 1.25h-.25c-.69 0-1.25-.56-1.25-1.25v-.5a.75.75 0 0 0-1.5 0v.5a1.25 1.25 0 0 1-2.5 0v-.5a.75.75 0 0 0-1.5 0v.5c0 .69-.56 1.25-1.25 1.25"></path>'],
    price: ['Price', 'Product pricing block', '<path d="M7.5 4.5a.75.75 0 0 1 1.5 0v.25h.75a.75.75 0 0 1 0 1.5h-2.25a.5.5 0 0 0 0 1h1a2 2 0 1 1 0 4v.25a.75.75 0 0 1-1.5 0v-.25h-.75a.75.75 0 0 1 0-1.5h2.25a.5.5 0 0 0 0-1h-1a2 2 0 1 1 0-4z"></path><path fill-rule="evenodd" d="M15 8a7 7 0 1 1-14 0 7 7 0 0 1 14 0m-1.5 0a5.5 5.5 0 1 1-11 0 5.5 5.5 0 1 1 11 0"></path>'],
  };

  /* buildCssVars (utils/buildCssVars.js): a group's CSS variables exist only while its "Enable custom" is on */
  function dzCssVars(c) {
    const v = {}, f = c.filter_custom || {};
    if (f.toolbar && f.toolbar.enable_custom) Object.assign(v, { '--fdt-custom-toolbar-background': f.toolbar.toolbar_background, '--fdt-custom-toolbar-color': f.toolbar.toolbar_color, '--fdt-custom-toolbar-close-icon': f.toolbar.close_icon });
    if (f.filter_bar && f.filter_bar.enable_custom) Object.assign(v, { '--fdt-filter-bar-sticky': String(!!f.filter_bar.sticky_filter), '--fdt-filter-bar-hide-scroll': String(!!f.filter_bar.hide_scroll), '--fdt-filter-bar-background': f.filter_bar.bar_background, '--fdt-filter-bar-width': dzNum(f.filter_bar.bar_width) + 'px' });
    if (f.filter_label && f.filter_label.enable_custom) Object.assign(v, { '--fdt-filter-label-size': dzNum(f.filter_label.label_size) + 'px', '--fdt-filter-label-color': f.filter_label.label_color, '--fdt-filter-label-weight': f.filter_label.label_weight, '--fdt-filter-label-transform': f.filter_label.label_transform });
    if (f.filter_value && f.filter_value.enable_custom) { const x = f.filter_value; Object.assign(v, { '--fdt-filter-value-size': dzNum(x.value_size) + 'px', '--fdt-filter-value-color': x.value_color, '--fdt-filter-value-color-hover': x.value_color_hover, '--fdt-filter-value-background': x.value_background, '--fdt-filter-value-background-hover': x.value_background_hover, '--fdt-filter-value-weight': x.value_weight, '--fdt-filter-value-transform': x.value_transform }); }
    if (f.filter_button && f.filter_button.enable_custom) { const x = f.filter_button; Object.assign(v, { '--fdt-filter-button-size': dzNum(x.button_size) + 'px', '--fdt-filter-button-weight': x.button_weight, '--fdt-filter-button-transform': x.button_transform, '--fdt-filter-button-color': x.button_color, '--fdt-filter-button-background': x.button_background, '--fdt-filter-button-border-radius': dzNum(x.button_border_radius) + 'px', '--fdt-filter-button-border-color': x.button_border_color }); }
    const text = (pre, x) => { v[pre + '-font-size'] = dzNum(x.font_size) + 'px'; v[pre + '-font-weight'] = x.font_weight; v[pre + '-color'] = x.color; if (x.text_transform) v[pre + '-text-transform'] = x.text_transform; };
    if (c.title && c.title.enable_custom) text('--fdt-title', c.title);
    if (c.vendor && c.vendor.enable_custom) text('--fdt-vendor', c.vendor);
    if (c.price && c.price.enable_custom) { text('--fdt-regular-price', c.price.regular); text('--fdt-compare-at-price', c.price.compare_at); text('--fdt-sale-price', c.price.sale); }
    if (c.sale_badge && c.sale_badge.enable_custom) { text('--fdt-sale-badge', c.sale_badge); v['--fdt-sale-badge-background'] = c.sale_badge.background; v['--fdt-sale-badge-border-radius'] = dzNum(c.sale_badge.border_radius) + 'px'; }
    if (c.button_add_to_cart && c.button_add_to_cart.enable_custom) { const b = c.button_add_to_cart; text('--fdt-button-add-to-cart', b); Object.assign(v, { '--fdt-button-add-to-cart-background': b.background, '--fdt-button-add-to-cart-border-radius': dzNum(b.border_radius) + 'px', '--fdt-button-add-to-cart-padding': dzNum(b.padding) + 'px', '--fdt-button-add-to-cart-border-color': b.border_color, '--fdt-button-add-to-cart-hover-color': b.hover_color, '--fdt-button-add-to-cart-hover-background': b.hover_background, '--fdt-button-add-to-cart-hover-border-color': b.hover_border_color }); }
    return v;
  }
  const dzApplyVars = (el, vars) => { (el._dzVars || []).forEach(k => el.style.removeProperty(k)); el._dzVars = Object.keys(vars); el._dzVars.forEach(k => el.style.setProperty(k, vars[k])); };

  /* Filter design: Live Preview (FilterPreview.jsx) */
  const MOCK_FILTERS = [
    { label: 'Availability', type: 'checklist', items: [['In stock', 12], ['Out of stock', 3]] },
    { label: 'Price', type: 'range', min: 30, max: 225 },
    { label: 'Color', type: 'box', items: [['Beige', 5], ['Black', 8], ['White', 4], ['Blue', 6]] },
  ];
  const fmtCount = n => new Intl.NumberFormat('en-US').format(n);
  function filterItems(o) {
    if (o.type === 'range') return `<div class="fdt-filter-preview__range"><div class="fdt-filter-preview__range-slider" aria-hidden="true"><div class="fdt-filter-preview__range-track"><div class="fdt-filter-preview__range-selected"></div></div></div><div class="fdt-filter-preview__range-values"><label class="fdt-filter-preview__range-field"><span class="fdt-filter-preview__range-field-label">From</span><input type="text" class="fdt-filter-preview__box-input" readonly value="${o.min}" tabindex="-1"></label><label class="fdt-filter-preview__range-field"><span class="fdt-filter-preview__range-field-label">To</span><input type="text" class="fdt-filter-preview__box-input" readonly value="${o.max}" tabindex="-1"></label></div></div>`;
    const search = '<input type="text" class="fdt-filter-preview__search" placeholder="Search filter value" aria-label="Search filter value" readonly>';
    if (o.type === 'box') return search + `<div class="fdt-filter-preview__box-grid">${o.items.map(([l, n]) => `<div class="fdt-filter-preview__box-item"><span class="fdt-filter-preview__box-input fdt-filter-preview__box-label">${l}<span class="fdt-filter-preview__count">${fmtCount(n)}</span></span></div>`).join('')}</div>`;
    return search + `<ul class="fdt-filter-preview__list">${o.items.map(([l, n]) => `<li class="fdt-filter-preview__checklist-item"><span class="fdt-filter-preview__checkbox"></span><span class="fdt-filter-preview__item-label">${l}</span><span class="fdt-filter-preview__count">${fmtCount(n)}</span></li>`).join('')}</ul>`;
  }
  function filterPreview(c, openLabel) {
    const lay = c.layout_type, hz = lay === 'horizontal';
    let h = `<div class="fdt-filter-preview__wrapper${hz ? ' fdt-filter-preview__wrapper--horizontal' : ''}">`;
    if (lay === 'vertical') h += '<p class="fdt-filter-preview__heading">Filter by</p>';
    if (lay === 'offcanvas') h += `<div class="fdt-filter-preview__heading"><button type="button" class="fdt-filter-preview__filter-button" tabindex="-1">${ICON_ADJUST}<span>Filter by</span></button></div>`;
    if (hz) h += `<div class="fdt-filter-preview__horizontal"><span class="fdt-filter-preview__horizontal-heading">Filter by:</span>${MOCK_FILTERS.map(o => `<div class="fdt-filter-preview__horizontal-option${openLabel === o.label ? ' fdt-filter-preview__horizontal-option--open' : ''}"><button type="button" class="fdt-filter-preview__horizontal-label" aria-expanded="${openLabel === o.label}" data-hl="${o.label}">${o.label}${ICON_CARET}</button><div class="fdt-filter-preview__horizontal-panel">${filterItems(o)}</div></div>`).join('')}</div>`;
    else h += MOCK_FILTERS.map(o => `<div class="fdt-filter-preview__option"><p class="fdt-filter-preview__option-label">${o.label}</p>${filterItems(o)}</div>`).join('');
    if (lay === 'offcanvas') h += '<button type="button" class="fdt-filter-preview__apply-btn" tabindex="-1">VIEW ITEMS</button>';
    return h + '</div>';
  }
  function alignHorizontalPanel(option) {                                      // keep the open panel inside the preview box
    const wrapper = option.closest('.fdt-filter-preview__wrapper--horizontal'), panel = $('.fdt-filter-preview__horizontal-panel', option);
    if (!wrapper || !panel) return;
    const wr = wrapper.getBoundingClientRect(), or = option.getBoundingClientRect(), pad = 8, maxW = Math.min(220, Math.max(160, wr.width - pad * 2));
    let left = or.left - wr.left;
    if (left + maxW > wr.width - pad) left = wr.width - pad - maxW;
    if (left < pad) left = pad;
    panel.style.left = (left - (or.left - wr.left)) + 'px'; panel.style.maxWidth = maxW + 'px';
    const below = wr.bottom - or.bottom - pad - 6; if (below > 0) panel.style.maxHeight = Math.max(120, below) + 'px';
  }

  /* Product grid design: Preview card (Preview.jsx, SoldOutBadge.jsx, LowStockBadge.jsx) */
  const IMAGE_RATIO_MAP = { '1-1': '100%', '3-4': '133.33%' };
  const MOCK_AVAILABLE_QUANTITY = 1;
  function resolveSoldOut(b) {
    if (!b || !b.enabled) return null;
    const d = DZ_DEFAULTS.grid.sold_out_badge, x = b.enable_custom === true ? b : d;
    const label = x.style === 'custom' ? (x.custom_text || d.custom_text) : ({ sold_out: 'Sold out', out_of_stock: 'Out of stock' }[x.style] || 'Sold out');
    return { size: x.font_size, color: x.color, background: x.background, weight: x.font_weight, label, radius: x.border_radius, side: x.position === 'top right' ? 'right' : 'left' };
  }
  function resolveLowStock(b, qty) {
    if (!b || !b.enabled) return null;
    const d = DZ_DEFAULTS.grid.low_stock_badge, x = b.enable_custom === true ? b : d;
    if (qty <= 0 || qty > x.show_when_stock_lte) return null;
    return { size: x.font_size, color: x.color, background: x.background, weight: x.font_weight, qty, side: x.position === 'top right' ? 'right' : 'left' };
  }
  function gridPreview(c) {
    const sb = c.sale_badge, pc = c.product_card, atc = c.button_add_to_cart || {};
    const BADGE = { percentage: '-30%', amount: '-$20', custom: sb.custom_text || 'Sale' };
    const hidePrice = c.price.enable_custom && c.price.hide !== 'never', noDec = c.price.enable_custom && c.price.hide_decimal;
    const money = n => noDec ? '$' + n : '$' + n + '.00';
    const R = {
      product_title: '<p class="fdt-product-card__title">Essential Oversized T-Shirt</p>',
      vendor: c.show_vendor ? '<p class="fdt-product-card__brand">Nike Sportswear</p>' : '',
      price: hidePrice ? '' : `<div class="fdt-product-card__price-row"><span class="fdt-product-card__price-regular">${money(59)}</span><span class="fdt-product-card__price-original">${money(89)}</span><span class="fdt-product-card__price-sale">${money(49)}</span></div>`,
    };
    const elements = [...(c.element_order || [])].sort((a, b) => a.position - b.position).map(e => R[e.id] || '').join('');
    const auto = c.image_ratio === 'auto', radius = dzNum(c.image_radius) + 'px';
    const saleOn = !!sb.show_sale_badge, saleSide = sb.position === 'top right' && sb.enable_custom ? 'right' : 'left';
    const so = resolveSoldOut(c.sold_out_badge), ls = resolveLowStock(c.low_stock_badge, MOCK_AVAILABLE_QUANTITY);
    const topBySide = { left: 10, right: 10 }, top = {};
    [['sale', saleOn, saleSide], ['soldOut', !!so, so && so.side], ['lowStock', !!ls, ls && ls.side]].forEach(([k, on, side]) => { if (!on) return; top[k] = topBySide[side]; topBySide[side] += 30; });
    const wrapCls = ['fdt-product-card__image-wrapper', auto && 'fdt-product-card__image-wrapper--auto', c.effect_on_hover.zoom_in && 'fdt-product-card__image-wrapper--zoom', c.effect_on_hover.show_second_image && 'fdt-product-card__image-wrapper--has-second'].filter(Boolean).join(' ');
    const cardStyle = pc.enable_custom ? `--fdt-card-border-width:${pc.show_border ? 1 : 0}px;--fdt-card-border-radius:${dzNum(pc.border_radius)}px;--fdt-card-border-color:${pc.border_color};--fdt-card-background:${pc.background}` : '';
    const infoStyle = pc.enable_custom ? `--fdt-card-info-padding:${dzNum(pc.content_padding)}px;--fdt-card-info-alignment:${pc.content_alignment}` : '';
    const badge = (cls, side, t, extra, label) => `<span class="fdt-product-card__badge ${cls}" style="${side}:10px;top:${t}px;${extra}">${esc(label)}</span>`;
    const btnLabel = atc.enable_custom && atc.label_style === 'custom' ? (atc.custom_text || 'Add to cart') : 'Add to cart';
    return `<div class="fdt-product-card" style="${cardStyle}"><div class="${wrapCls}" style="${auto ? '' : 'padding-top:' + (IMAGE_RATIO_MAP[c.image_ratio] || IMAGE_RATIO_MAP['3-4']) + ';'}border-radius:${radius}">`
      + `<img class="fdt-product-card__image fdt-product-card__image--primary" src="assets/img/preview-5396ce01.png" alt="Product primary" style="border-radius:${radius}">`
      + (c.effect_on_hover.show_second_image ? `<img class="fdt-product-card__image fdt-product-card__image--secondary" src="assets/img/preview-2-a586acf8.png" alt="Product secondary" style="border-radius:${radius}">` : '')
      + (saleOn ? badge('fdt-product-card__badge--discount', saleSide, top.sale, '', sb.enable_custom ? BADGE[sb.style] : BADGE.custom) : '')
      + (so ? badge('fdt-product-card__badge--sold-out', so.side, top.soldOut, `font-size:${dzNum(so.size)}px;color:${so.color};background-color:${so.background};font-weight:${so.weight === 'bold' ? 700 : 400};border-radius:${dzNum(so.radius)}px`, so.label) : '')
      + (ls ? badge('fdt-product-card__badge--low-stock', ls.side, top.lowStock, `font-size:${dzNum(ls.size)}px;color:${ls.color};background-color:${ls.background};font-weight:${ls.weight === 'bold' ? 700 : 400}`, `Only ${ls.qty} left`) : '')
      + `</div><div class="fdt-product-card__info" style="${infoStyle}">${elements}</div>`
      + (c.show_button_quick_add ? `<div class="fdt-product-card__actions"><button type="button" class="fdt-product-card__btn-cart" tabindex="-1">${esc(btnLabel)}</button></div>` : '')
      + '</div>';
  }

  /* settings markup */
  let dzUid = 0;
  function dzItem(it, c) {
    const id = () => 'dz-' + (++dzUid);
    const row = (label, ctl, size, forId) => `<div class="dz-row"><label class="dz-row__label"${forId ? ` for="${forId}"` : ''}>${label}</label><div class="dz-row__ctl" style="${size ? 'flex:0 0 ' + size : ''}">${ctl}</div></div>`;
    const select = (p, opts, i, label) => { const v = String(dzGet(c, p)); const cur = opts.find(o => o[0] === v) || opts[0]; return `<div class="Polaris-Select"><select id="${i}" class="Polaris-Select__Input" data-p="${p}" aria-label="${esc(label)}">${opts.map(o => `<option value="${esc(o[0])}"${o[0] === v ? ' selected' : ''}>${o[1]}</option>`).join('')}</select><div aria-hidden="true" class="Polaris-Select__Content"><span class="Polaris-Select__SelectedOption">${cur[1]}</span><span class="Polaris-Select__Icon">${ICON_SELECT}</span></div><div class="Polaris-Select__Backdrop"></div></div>`; };
    const textField = (p, i, label, attrs = '') => `<div class="Polaris-TextField"><input id="${i}" class="Polaris-TextField__Input" data-p="${p}" value="${esc(dzGet(c, p) ?? '')}" aria-label="${esc(label)}" autocomplete="off"${attrs}><div class="Polaris-TextField__Backdrop"></div></div>`;
    const range = (p, min, max, i, label) => { const v = dzNum(dzGet(c, p)); return `<div class="dz-range"><input type="range" id="${i}" min="${min}" max="${max}" step="1" value="${v}" data-p="${p}" data-kind="range" aria-label="${esc(label)}" style="--dz-p:${(v - min) / (max - min) * 100}%"><output for="${i}">${v}px</output></div>`; };
    switch (it.t) {
      case 'sw': { const i = id(); return `<div class="dz-sw${it.spread ? ' dz-sw--spread' : ''}"><label for="${i}">${it.label}</label><input type="checkbox" id="${i}" class="pg-switch" role="switch" data-p="${it.path}"${dzGet(c, it.path) ? ' checked' : ''}></div>`; }
      case 'checks': return `<div class="dz-checks">${it.items.map(([l, p]) => `<label class="dz-chk"><input type="checkbox" class="pg-check" data-p="${p}"${dzGet(c, p) ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
      case 'choices': return `<fieldset class="dz-choices"><legend>${it.title}</legend>${it.items.map(([l, p]) => `<label class="dz-chk"><input type="checkbox" class="pg-check" data-p="${p}"${dzGet(c, p) ? ' checked' : ''}><span>${l}</span></label>`).join('')}</fieldset>`;
      case 'color': { const i = id(), v = dzGet(c, it.path) || '#FFFFFF'; return row(it.label, `<div class="dz-color" data-color="${it.path}"><button type="button" class="color-picker dz-color__swatch" style="background-color:${esc(v)}" aria-label="Pick ${esc(it.label.toLowerCase())}"></button><input type="color" class="dz-color__native" tabindex="-1" aria-hidden="true" value="${esc(v.toLowerCase())}"><div class="Polaris-TextField Polaris-TextField--hasValue"><div class="Polaris-TextField__Prefix" aria-hidden="true"><span class="Polaris-Text--root Polaris-Text--bodyMd">#</span></div><input id="${i}" class="Polaris-TextField__Input" data-p="${it.path}" data-kind="hex" value="${esc(v.replace('#', ''))}" autocomplete="off" spellcheck="false" maxlength="7"><div class="Polaris-TextField__Backdrop"></div></div></div>`, '', i); }
      case 'range': { const i = id(); return row(it.label, range(it.path, it.min, it.max, i, it.label), '64%', i); }
      case 'select': { const i = id(); return row(it.label, select(it.path, it.opts, i, it.label), it.size || '50%', i); }
      case 'pair': return `<div class="dz-pair">${it.items.map(s => { const i = id(); return `<div class="dz-pair__item"><label for="${i}">${s.label}</label><div class="dz-pair__ctl">${select(s.path, s.opts, i, s.label)}</div></div>`; }).join('')}</div>`;
      case 'style': { const i = id(), j = id(); return `<div class="dz-style"><label for="${i}" class="dz-row__label">Style</label><div class="dz-style__ctl">${select(it.path, it.opts, i, 'Style')}</div><div class="dz-style__ctl" data-show="${it.path}=custom"${dzGet(c, it.path) === 'custom' ? '' : ' hidden'}>${textField(it.text, j, 'Custom text', ' placeholder="Custom text" required aria-required="true"')}</div></div>`; }
      case 'num': { const i = id(); return `<div class="dz-row"><label class="dz-row__label" for="${i}">${it.label}</label><div class="dz-row__ctl" style="flex:0 0 140px"><div class="Polaris-TextField"><input id="${i}" type="number" min="1" step="1" inputmode="numeric" class="Polaris-TextField__Input" data-p="${it.path}" data-kind="num" value="${esc(dzGet(c, it.path))}" aria-describedby="${i}-err"><div class="Polaris-TextField__Backdrop"></div></div></div></div><p class="dz-error" id="${i}-err" hidden>Must be a number greater than 0.</p>`; }
      case 'perpage': { const i = id(), v = c.product_per_page || 1; return `<div class="dz-row dz-row--perpage"><span class="dz-row__label dz-perpage__label"><label for="${i}">Product per page</label><span class="mf-tip" tabindex="0" role="img" aria-label="Select the number of products per page on Desktop. Pagination is not available on Mobile."><span class="Polaris-Icon">${ICON_INFO}</span><span class="mf-tip__bubble" role="tooltip">Select the number of products per page on Desktop. Pagination is not available on Mobile.</span></span></span><div class="dz-row__ctl dz-perpage__ctl">${range('product_per_page', 1, 36, i, 'Product per page').replace(/<output[^>]*>.*?<\/output>/, '')}</div><span class="dz-perpage__value" data-out="product_per_page">${v}</span></div>`; }
      case 'tags': return '<div class="fdt-toolbar-preview-row" data-tags></div>';
      case 'order': return '<div class="draggable-list-table dz-order" role="list" aria-label="Element order" data-order></div><p class="dz-sr" aria-live="polite" data-order-live></p>';
      case 'h': return `<h4 class="dz-h">${it.text}</h4>`;
      case 'p': return `<p class="dz-p">${it.html}</p>`;
      case 'help': return `<p class="dz-help">${it.html}</p>`;
      case 'card': return `<div class="fdt-custom-design-card" data-dim="${it.when}">${it.items.map(x => dzItem(x, c)).join('')}</div>`;
      case 'dim': return `<div class="dz-dim" data-dim="${it.when}">${it.items.map(x => dzItem(x, c)).join('')}</div>`;
    }
    return '';
  }
  function dzSection(s, c) {
    const body = s.items.map(x => dzItem(x, c)).join('');
    const sw = s.action ? `<input type="checkbox" class="pg-switch" role="switch" data-p="${s.action.path}" aria-label="${esc(s.action.label)}"${dzGet(c, s.action.path) ? ' checked' : ''}>` : '';
    return `<div class="dz-col" data-col="${s.id}"><div class="dz-col__head"><h3 class="dz-col__title"><button type="button" class="dz-col__btn" aria-expanded="false" aria-controls="dz-${s.id}">${s.title}</button></h3><div class="dz-col__end">${sw}<span class="dz-col__chev" aria-hidden="true">${ICON_CHEV}</span></div></div>`
      + `<div class="dz-col__body" id="dz-${s.id}" hidden><div class="dz-stack">${s.action ? `<div class="dz-dim dz-stack" data-dim="${s.action.path}">${body}</div>` : body}</div></div></div>`;
  }

  function initDesignPage(kind) {
    const KEY = 'findter.design.' + kind + '.v1';
    const load = () => { try { return JSON.parse(store.get(KEY)) || {}; } catch (e) { return {}; } };
    let saved = dzMerge(dzClone(DZ_DEFAULTS[kind]), load());
    let draft = dzClone(saved), openLabel = null;
    const isGrid = kind === 'grid';

    // where the panels go: Product grid has its own column; Filter replaces the captured "Filter bar" block below the layout card
    let root;
    if (isGrid) { root = $('.fdt-product-grid-design'); if (!root) return; root.innerHTML = ''; }
    else {
      const anchor = $('#filter-bar-settings'), save = saveBtn(); if (!anchor || !save) return;
      let block = anchor; while (block.parentElement && !block.parentElement.contains(save)) block = block.parentElement;
      root = document.createElement('div'); root.className = 'dz-sections'; block.replaceWith(root);
    }
    root.setAttribute('data-dz', '');
    root.innerHTML = DZ_SECTIONS[kind].map(s => dzSection(s, draft)).join('');

    const previewBox = isGrid ? $('.fdt-preview-card-wrapper') : $('.fdt-filter-preview');
    const varsBox = isGrid ? previewBox : $('.fdt-filter-preview-container');
    if (varsBox) varsBox.setAttribute('data-dz', '');

    function renderTags() {
      const box = $('[data-tags]', root); if (!box) return;
      const t = draft.filter_custom.toolbar;
      box.innerHTML = '<span class="Polaris-Text--root Polaris-Text--bodyMd">Preview:</span>' + t.preview.map(tag => `<span class="fdt-toolbar-preview-tag" style="color:${esc(t.toolbar_color)};background-color:${esc(t.toolbar_background)}"><span>${tag}</span><span class="fdt-toolbar-preview-tag-close" style="color:${esc(t.close_icon)}" aria-hidden="true"><span class="Polaris-Icon">${ICON_CLOSE}</span></span></span>`).join('') + '<button type="button" class="Polaris-Link Polaris-Link--monochrome" tabindex="-1">Clear all</button>';
    }
    function renderOrder(focusId) {
      const box = $('[data-order]', root); if (!box) return;
      const rows = [...draft.element_order].sort((a, b) => a.position - b.position);
      box.innerHTML = rows.map((el, i) => { const m = EL_META[el.id]; return `<div class="table-row dz-order__row" role="listitem" tabindex="0" data-id="${el.id}" aria-roledescription="sortable" aria-label="${m[0]}, position ${i + 1} of ${rows.length}. Press arrow up or arrow down to move."><div class="fdt-drag-drop-row"><div class="placeholder"></div><div class="dz-order__handle">${ICON_DRAG}</div><div class="drag-drop-truncate-cell"><div class="dz-order__cell"><div class="dz-order__icon"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${m[2]}</svg></div><div class="dz-order__text"><p class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--semibold">${m[0]}</p><p class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--subdued">${m[1]}</p></div></div></div></div></div>`; }).join('');
      if (focusId) { const r = $(`[data-id="${focusId}"]`, box); if (r) r.focus(); }
    }
    function renderPreview() {
      if (!previewBox) return;
      if (isGrid) {
        previewBox.innerHTML = gridPreview(draft);
        dzApplyVars(previewBox, Object.assign(dzCssVars(draft), { '--fdt-border-radius': dzNum(draft.image_radius) + 'px', '--fdt-background-color': draft.product_grid_enable_custom ? (draft.background || '#FFFFFF') : '#FFFFFF' }));
      } else {
        previewBox.innerHTML = filterPreview(draft, openLabel);
        if (varsBox) dzApplyVars(varsBox, dzCssVars(draft));
        const open = $('.fdt-filter-preview__horizontal-option--open', previewBox); if (open) alignHorizontalPanel(open);
      }
    }
    function refresh() {
      $$('[data-dim]', root).forEach(el => { const off = !dzGet(draft, el.dataset.dim); el.classList.toggle('fdt-disabled-card', off); if (off) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
      $$('[data-show]', root).forEach(el => { const [p, v] = el.dataset.show.split('='); el.hidden = dzGet(draft, p) !== v; });
      renderTags(); renderPreview();
      setSave(JSON.stringify(draft) !== JSON.stringify(saved));                 // formChanged: back to the saved values = nothing to save
    }
    const change = (p, v) => { dzSet(draft, p, v); refresh(); };

    // collapsible headers: a click anywhere on the header toggles, except on its switch (data-no-click in the app)
    root.addEventListener('click', e => {
      const t = e.target;
      const chat = t.closest('.dz-chat'); if (chat) { e.preventDefault(); if (window.__shell) window.__shell.openChatWith(chat.dataset.msg); return; }
      const sw = t.closest('.dz-color__swatch'); if (sw) { const n = $('.dz-color__native', sw.parentElement); if (n.showPicker) { try { n.showPicker(); return; } catch (err) { /* fall back to click */ } } n.click(); return; }
      const head = t.closest('.dz-col__head'); if (!head || t.closest('.pg-switch')) return;
      const btn = $('.dz-col__btn', head), body = $('#' + btn.getAttribute('aria-controls')), open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open)); body.hidden = !open; head.parentElement.classList.toggle('is-open', open);
    });
    root.addEventListener('input', e => {
      const el = e.target;
      if (el.matches('.dz-color__native')) { const box = el.closest('[data-color]'), hex = el.value.toUpperCase(); $('.dz-color__swatch', box).style.backgroundColor = hex; $('[data-kind=hex]', box).value = hex.slice(1); change(box.dataset.color, hex); return; }
      const p = el.dataset.p; if (!p || el.type === 'checkbox' || el.tagName === 'SELECT') return;
      if (el.dataset.kind === 'range') {
        const v = Number(el.value), min = Number(el.min), max = Number(el.max);
        el.style.setProperty('--dz-p', (v - min) / (max - min) * 100 + '%');
        const out = el.nextElementSibling; if (out && out.tagName === 'OUTPUT') out.textContent = v + 'px';
        const ext = $(`[data-out="${p}"]`, root); if (ext) ext.textContent = v;
        change(p, v);
      } else if (el.dataset.kind === 'num') {                                   // LowStockBadgeSettings: a bad value shows the error and is stored as 1
        const n = Number(el.value), bad = el.value.trim() === '' || Number.isNaN(n) || n <= 0;
        const err = $('#' + el.getAttribute('aria-describedby')); err.hidden = !bad; el.setAttribute('aria-invalid', String(bad)); el.closest('.Polaris-TextField').classList.toggle('Polaris-TextField--error', bad);
        change(p, bad ? 1 : n);
      } else if (el.dataset.kind !== 'hex') change(p, el.value);                // custom text: the preview follows each key
    });
    root.addEventListener('change', e => {
      const el = e.target, p = el.dataset.p; if (!p) return;
      if (el.type === 'checkbox') { change(p, el.checked); return; }
      if (el.tagName === 'SELECT') { $('.Polaris-Select__SelectedOption', el.parentElement).textContent = el.options[el.selectedIndex].text; change(p, el.value); return; }
      if (el.dataset.kind === 'hex') {                                          // ColorPickerField: applied on blur, an invalid value goes back to the last good one
        const box = el.closest('[data-color]'), hex = dzHex(el.value);
        if (!hex) { el.value = String(dzGet(draft, p) || '').replace('#', ''); return; }
        el.value = hex.slice(1); $('.dz-color__swatch', box).style.backgroundColor = hex; $('.dz-color__native', box).value = hex.toLowerCase();
        change(p, hex);
      }
    });
    root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.kind === 'hex') e.target.blur(); });

    // Element order (DraggableList): drag a row, or focus it and use the arrow keys
    const orderBox = $('[data-order]', root);
    if (orderBox) {
      const commit = ids => { draft.element_order = ids.map((id, i) => ({ id, position: i })); refresh(); };
      const idsNow = () => $$('.dz-order__row', orderBox).map(r => r.dataset.id);
      let drag = null;
      orderBox.addEventListener('pointerdown', e => {
        const row = e.target.closest('.dz-order__row'); if (!row || e.button !== 0) return;
        drag = { row, y: e.clientY, moved: false, id: e.pointerId };
      });
      document.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.moved && Math.abs(e.clientY - drag.y) < 4) return;
        if (!drag.moved) { drag.moved = true; drag.row.classList.add('is-dragging'); try { drag.row.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } }
        e.preventDefault();
        const others = $$('.dz-order__row', orderBox).filter(r => r !== drag.row);
        const after = others.find(r => { const b = r.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
        if (after) { if (drag.row.nextElementSibling !== after) orderBox.insertBefore(drag.row, after); } else if (orderBox.lastElementChild !== drag.row) orderBox.appendChild(drag.row);
      });
      const end = () => { if (!drag) return; const d = drag; drag = null; d.row.classList.remove('is-dragging'); if (d.moved) { const ids = idsNow(); commit(ids); renderOrder(); } };
      document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
      orderBox.addEventListener('keydown', e => {
        const row = e.target.closest('.dz-order__row'); if (!row || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
        e.preventDefault();
        const ids = idsNow(), i = ids.indexOf(row.dataset.id), j = e.key === 'ArrowUp' ? i - 1 : i + 1;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]]; commit(ids); renderOrder(row.dataset.id);
        const live = $('[data-order-live]', root); if (live) live.textContent = `${EL_META[row.dataset.id][0]} moved to position ${j + 1} of ${ids.length}.`;
      });
    }

    if (!isGrid) {
      // Filter layout: Vertical / Horizontal / Off-canvas, one at a time; hovering a picture plays its GIF. Mobile is always off-canvas.
      const first = $('#app .Polaris-Checkbox__Input'), layoutCard = first && first.closest('.Polaris-ShadowBevel'), checks = layoutCard ? $$('.Polaris-Checkbox__Input', layoutCard) : [];   // the card with the layout ticks (not the info banner above it)
      if (layoutCard && checks.length >= 4) {
        layoutCard.setAttribute('data-dz', '');
        const KEYS = ['vertical', 'horizontal', 'offcanvas'], GIF = { vertical: 'assets/img/vertical.gif', horizontal: 'assets/img/horizontal.gif', offcanvas: 'assets/img/off-canvas.gif' };
        const sync = () => checks.slice(0, 3).forEach((b, i) => { b.checked = draft.layout_type === KEYS[i]; b.setAttribute('aria-checked', String(b.checked)); const tick = b.parentElement.querySelector('svg path'); if (tick) tick.setAttribute('class', b.checked ? 'Polaris-Checkbox--checked' : ''); });   // Polaris draws the tick only on the path with this class
        checks.slice(0, 3).forEach((b, i) => b.addEventListener('change', () => { draft.layout_type = KEYS[i]; sync(); refresh(); }));
        checks[3].addEventListener('change', () => { checks[3].checked = true; });   // the app's onChange does nothing here
        const imgs = $$('img', layoutCard).slice(0, 3);
        imgs.forEach((img, i) => {
          const still = img.getAttribute('src'), box = img.parentElement;
          box.addEventListener('mouseenter', () => { img.src = GIF[KEYS[i]]; });
          box.addEventListener('mouseleave', () => { img.src = still; });
        });
        sync();
      }
      // horizontal preview: a filter label opens its panel; a click anywhere else closes it
      if (previewBox) previewBox.addEventListener('click', e => {
        const hl = e.target.closest('[data-hl]'); if (!hl) return;
        e.stopPropagation(); openLabel = openLabel === hl.dataset.hl ? null : hl.dataset.hl; renderPreview();
      });
      document.addEventListener('click', e => { if (openLabel && !e.target.closest('.fdt-filter-preview__horizontal-option--open')) { openLabel = null; renderPreview(); } });
      // "Need more Filter UI Customize? Contact us now"
      const more = varsBox && $$('button.Polaris-Link', varsBox).find(b => /Contact us/.test(b.textContent));
      if (more) more.addEventListener('click', e => { e.preventDefault(); if (window.__shell) window.__shell.openChatWith('Hi I need help with customize Filter UI'); });
    }

    savers.push(() => { saved = dzClone(draft); store.set(KEY, JSON.stringify(saved)); return true; });
    renderOrder(); refresh();
  }
  if ($('.fdt-product-grid-design')) initDesignPage('grid');
  else if ($('#filter-bar-settings')) initDesignPage('filter');

  /* ---------- Unsaved changes: a page with a Save button cannot be left until the changes are saved or discarded (BFS 4.1.5) ----------
     Applies to every link that goes to another page (sidebar, tabs, in-page links) and to closing / reloading the tab. */
  const isDirty = () => { const b = saveBtn(); return !!b && !b.classList.contains('Polaris-Button--disabled'); };
  let leaving = false, leaveDlg = null, leaveHref = '', leaveFrom = null;
  const leaveTo = href => { leaving = true; location.href = href; };
  function closeLeave() { leaveDlg.hidden = true; if (leaveFrom && document.contains(leaveFrom)) leaveFrom.focus(); leaveFrom = null; }
  function askLeave(href, from) {
    if (!leaveDlg) {
      leaveDlg = document.createElement('div'); leaveDlg.className = 'mf-scrim'; leaveDlg.hidden = true; leaveDlg.setAttribute('data-mfp', '');
      leaveDlg.innerHTML = `<div class="mf-modal" role="dialog" aria-modal="true" aria-labelledby="mf-leave-title"><div class="mf-modal__head"><h2 class="mf-modal__title" id="mf-leave-title">Unsaved changes</h2><button type="button" class="mf-modal__x" aria-label="Close">${ICON_CLOSE}</button></div><div class="mf-modal__body"><p class="mf-modal__text">You have unsaved changes. Leave without saving?</p></div><div class="mf-modal__foot"><button type="button" class="mf-btn" data-l="discard">Discard</button><button type="button" class="mf-btn mf-btn--primary" data-l="save">Save</button></div></div>`;
      document.body.appendChild(leaveDlg);
      leaveDlg.addEventListener('click', e => {
        if (e.target === leaveDlg || e.target.closest('.mf-modal__x')) closeLeave();
        else if (e.target.closest('[data-l=discard]')) leaveTo(leaveHref);
        else if (e.target.closest('[data-l=save]')) {
          if (savers.every(save => save() !== false)) { setSave(false); leaveTo(leaveHref); }
          else closeLeave();                                                    // a field is invalid: stay on the page, the error is shown next to it
        }
      });
      document.addEventListener('keydown', e => {
        if (leaveDlg.hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); closeLeave(); }
        else if (e.key === 'Tab') {                                             // keep the keyboard inside the window while it is open
          const f = $$('button', leaveDlg); const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }
    leaveHref = href; leaveFrom = from; leaveDlg.hidden = false; $('[data-l=save]', leaveDlg).focus();
  }
  document.addEventListener('click', e => {
    if (!isDirty()) return;
    const a = e.target.closest('a[href], .Polaris-Tabs__Tab[data-href]'); if (!a) return;
    const href = a.getAttribute('href') || a.dataset.href;
    if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:)/i.test(href) || a.target === '_blank') return;   // same page, external or new tab: not leaving
    if (a.getAttribute('aria-selected') === 'true') return;                    // the tab we are already on
    e.preventDefault(); e.stopImmediatePropagation(); askLeave(href, a);
  }, true);
  window.addEventListener('beforeunload', e => { if (!leaving && isDirty()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- Advanced features: the Partial search switch decides whether Search settings can edit the options above ---------- */
  const partialSwitch = $('.pg-switch[aria-label="Turn Partial search on or off"]');
  if (partialSwitch) partialSwitch.checked = partialOn();

  /* ---------- "Contact us" in info banners -> Crisp-style chat ---------- */
  const SURE = 'Sure! Please describe your idea and include any examples, images, or reference links.';
  const CHAT = {
    filter:    { msg: 'Hi, I want to make a custom filter request', reply: SURE },                // Manage filter set + Collection booster
    search:    { msg: 'Hi, I want to make a custom search request', reply: SURE },                // Search settings + Search booster
    metafield: { msg: 'Hi, I would like to have additional metafields', reply: "Sure! How many more metafields would you like to add? We'll review your request and get back to you shortly." },
    feature:   { msg: 'Hi, I want to make a feature request', reply: SURE },                      // Advanced features, "Contact us now"
    design:    { msg: 'Hi, I want to make a custom design request', reply: SURE },                // Filter design + Product grid design, "Let us know"
  };

  /* ---------- clicks (one delegated handler so the markup stays plain) ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-mfp], [data-dz]')) return;                            // Metafield page and design panels: handled by initMetafieldPage / initDesignPage
    const chat = t.closest('[data-chat]');                                   // "Contact us" in an info banner: the chat opens with the request already sent + the auto reply
    if (chat) { e.preventDefault(); const m = CHAT[chat.dataset.chat]; if (m && window.__shell) window.__shell.openChatWith(m.msg, m.reply); return; }
    const tab = t.closest('.Polaris-Tabs__Tab');
    if (tab) {
      if (tab.getAttribute('aria-selected') === 'true') return;
      if (tab.dataset.href) location.href = tab.dataset.href; else soon(text(tab));
      return;
    }
    const sw = t.closest('.ft-switch-btn');                                   // status toggle in the filter table
    if (sw) { if (!sw.classList.contains('disabled')) { const s = $('.slider-toggle', sw); s.classList.remove('no-transition'); s.classList.toggle('active'); } return; }

    const prev = t.closest('.display-features-card-preview');                 // features: click on a preview opens the big viewer in the original
    if (prev) { soon('Feature preview'); return; }

    const act = t.closest('button[aria-label="Edit"], button[aria-label="Duplicate"], button[aria-label="Delete"]');
    if (act) { soon(act.getAttribute('aria-label') + ' filter set'); return; }

    const btn = t.closest('#app button.Polaris-Button, #app [data-s=s-button] button');
    if (btn) {
      const label = text(btn);
      if (/^Save$/.test(label)) { if (!btn.classList.contains('Polaris-Button--disabled')) { if (savers.every(save => save() !== false)) { toast('Saved'); setSave(false); } } return; }
      if (btn.closest('.Polaris-DataTable__Navigation')) { if (!btn.classList.contains('Polaris-Button--disabled')) scrollTable(btn); return; }
      if (!btn.classList.contains('Polaris-Button--disabled') && !btn.disabled) soon(label);
      return;
    }
    const link = t.closest('#app button.Polaris-Link, #app a.fdt-header__link:not([href])');
    if (link) { toast('Opens the contact form'); return; }

    const row = t.closest('#app [role=button][aria-controls^="adv-search"]');  // chevron on a search field row
    if (row) { soon('Advanced options for ' + row.closest('.Polaris-Box').querySelector('.Polaris-Text--root').textContent.trim()); return; }
    const rowBtn = t.closest('#app [role=button]');                            // accordion rows (product grid design)
    if (rowBtn && !t.closest('input, .pg-switch')) { soon(text(rowBtn)); return; }
  });

  /* ---------- inputs ---------- */
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.matches('.ft-checkbox')) setSave(true);                           // search page: untick / tick a field
    if (el.matches('.pg-switch[aria-label="Turn Partial search on or off"]')) store.set(PARTIAL_KEY, el.checked ? '1' : '0');   // features page: read back by Search settings
  });                                                                           // design pages: initDesignPage handles their switches, ticks and Save

  /* ---------- features page: hovering a card previews its video ---------- */
  $$('.display-features-card-preview').forEach(card => {
    const v = $('video', card);
    card.addEventListener('mouseenter', () => { card.classList.add('is-hovered'); if (v) { v.muted = true; const p = v.play(); if (p && p.catch) p.catch(() => {}); } });
    card.addEventListener('mouseleave', () => { card.classList.remove('is-hovered'); if (v) { v.pause(); v.currentTime = 0; } });
  });

  /* ---------- DataTable: on narrow screens it "condenses" into a sideways scroller with arrows + dots ---------- */
  function tables() { return $$('.Polaris-DataTable').map(dt => ({ dt, wrap: dt.parentElement, nav: $('.Polaris-DataTable__Navigation', dt.parentElement), sc: $('.Polaris-DataTable__ScrollContainer', dt), table: $('table', dt) })).filter(x => x.nav && x.sc); }
  const colsOf = x => $$('thead th', x.table);
  function layoutTable(x) {
    x.wrap.classList.remove('Polaris-DataTable--condensed'); x.dt.classList.remove('Polaris-DataTable--condensed');
    const needs = x.table.scrollWidth > x.sc.clientWidth + 1;
    x.wrap.classList.toggle('Polaris-DataTable--condensed', needs); x.dt.classList.toggle('Polaris-DataTable--condensed', needs);
    if (needs && !$('.Polaris-DataTable__Pip', x.nav)) {                       // dots between the two arrows
      const [, right] = $$('button', x.nav);
      colsOf(x).forEach(() => { const p = document.createElement('div'); p.className = 'Polaris-DataTable__Pip'; x.nav.insertBefore(p, right); });
    }
    updateTable(x);
  }
  function updateTable(x) {
    const [left, right] = $$('button', x.nav), view = x.sc.scrollLeft + x.sc.clientWidth;
    const set = (b, off) => { b.classList.toggle('Polaris-Button--disabled', off); off ? (b.setAttribute('aria-disabled', 'true'), b.tabIndex = -1) : (b.removeAttribute('aria-disabled'), b.removeAttribute('tabindex')); };
    set(left, x.sc.scrollLeft <= 1); set(right, view >= x.sc.scrollWidth - 1);
    $$('.Polaris-DataTable__Pip', x.nav).forEach((p, i) => { const th = colsOf(x)[i]; p.classList.toggle('Polaris-DataTable__Pip--visible', !!th && th.offsetLeft < view - 2); });
  }
  function scrollTable(btn) {
    const x = tables().find(t => t.nav.contains(btn)); if (!x) return;
    const dir = btn === $$('button', x.nav)[0] ? -1 : 1, step = Math.max(120, x.sc.clientWidth * 0.5);
    x.sc.scrollBy({ left: dir * step, behavior: 'smooth' });
  }
  const initTables = () => tables().forEach(x => { layoutTable(x); x.sc.addEventListener('scroll', () => updateTable(x), { passive: true }); });
  initTables();
  if (tables().length) new ResizeObserver(() => tables().forEach(layoutTable)).observe($('.sh-scroll'));
})();
