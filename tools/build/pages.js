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

  /* ---------- Metafield page: Apply to + (with Advanced Search) Search type and Weight per metafield ----------
     Everything lives on the Metafield page. Search settings has no metafield rows.
     The table has Title, Type, Apply to, Type-weight, Actions. "Type-weight" shows e.g. "Any part of a word - 10" for a text metafield that
     has Search applied while Advanced Search is on (the Partial search switch on Advanced features, on by default in the demo), and "-"
     for everything else. In the edit window, Search type and Weight appear under the Search tick when Advanced Search is on.
     Saving a new metafield, a changed Search selection or a changed Search type / Weight starts an index (a few seconds here).
     State in localStorage:  findter.metafields.v1  [{ id, applies, type, weight }]   findter.mfIndex.v1  { pendingUntil, notice } */
  const MFS_KEY = 'findter.metafields.v1', MFI_KEY = 'findter.mfIndex.v1', MF_LIMIT = 10, INDEX_MS = 6000;
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
    { id: 'snowboard', applies: ['search'], type: 'standard_ngram', weight: 10 }, { id: 'multi', applies: ['filter'] }, { id: 'height', applies: ['filter'] },
    { id: 'sale', applies: ['search', 'filter'], type: 'standard', weight: 3 }, { id: 'year', applies: ['filter'] },
  ];
  const WEIGHT_ERROR = 'Enter a whole number, 0 or higher.';
  const isWhole = v => /^\d+$/.test(String(v).trim());
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const mfMeta = id => MF_CATALOG.find(c => c.id === id);
  const parse = (key, fallback) => { try { const v = JSON.parse(store.get(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; } };
  const mfsLoad = () => {
    const rows = parse(MFS_KEY, null);
    return (Array.isArray(rows) ? rows : MF_SEED).filter(r => r && mfMeta(r.id)).map(r => ({
      id: r.id, applies: ['search', 'filter'].filter(a => (r.applies || []).includes(a)),
      type: MF_TYPES[r.type] ? r.type : 'standard', weight: Number.isInteger(r.weight) && r.weight >= 0 ? r.weight : 1,
    }));
  };
  const isText = id => MF_TEXT_TYPES.includes(mfMeta(id).type);
  const searchIdsOf = rows => rows.filter(r => r.applies.includes('search') && isText(r.id)).map(r => r.id);
  const searchCfgOf = rows => JSON.stringify(rows.filter(r => r.applies.includes('search') && isText(r.id)).map(r => [r.id, r.type, r.weight]).sort());
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
  const mfSelect = (id, label, options, value) => `
    <div class="mf-field">
      ${mfLabel(id, label)}
      <div class="Polaris-Select">
        <select id="${id}" class="Polaris-Select__Input">${Object.entries(options).map(([v, name]) => `<option value="${v}"${v === value ? ' selected' : ''}>${name}</option>`).join('')}</select>
        <div class="Polaris-Select__Content" aria-hidden="true"><span class="Polaris-Select__SelectedOption">${options[value]}</span><span class="Polaris-Select__Icon"><span class="Polaris-Icon"><svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M10.884 4.323a1.25 1.25 0 0 0-1.768 0l-2.646 2.647a.75.75 0 0 0 1.06 1.06l2.47-2.47 2.47 2.47a.75.75 0 1 0 1.06-1.06z"></path><path d="m13.53 13.03-2.47 2.47-2.47-2.47a.75.75 0 0 0-1.06 1.06l2.646 2.647a1.25 1.25 0 0 0 1.768 0l2.646-2.647a.75.75 0 0 0-1.06-1.06"></path></svg></span></span></div>
        <div class="Polaris-Select__Backdrop"></div>
      </div>
    </div>`;
  const mfWeight = (id, value) => `
    <div class="mf-field">
      ${mfLabel(id, 'Weight')}
      <input id="${id}" class="mf-input" type="number" min="0" step="1" inputmode="numeric" autocomplete="off" value="${esc(value)}" aria-describedby="${id}-help">
      <p class="mf-help" id="${id}-help"></p>
    </div>`;
  const paintWeight = (input, valid) => {                                      // inline error under the field, red only for the error
    const p = $('#' + input.id + '-help'); input.classList.toggle('mf-input--error', !valid);
    input.setAttribute('aria-invalid', String(!valid)); p.classList.toggle('mf-help--error', !valid); p.textContent = valid ? '' : WEIGHT_ERROR;
  };

  /* --- Metafield page: picker + table (Title, Type, Apply to, Type-weight, Actions) + Apply to window + index banner --- */
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
    $('thead tr', wrap).innerHTML = ['Title', 'Type', 'Apply to', 'Type-weight', 'Actions'].map(h => `<th data-polaris-header-cell="true" class="Polaris-DataTable__Cell Polaris-DataTable__Cell--verticalAlignTop Polaris-DataTable__Cell--header" scope="col"><strong class="Polaris-Text--root">${h}</strong></th>`).join('');

    /* --- index banner: yellow while the app collects the values, green when it is done --- */
    const section = $('.Polaris-Layout__Section > .Polaris-BlockStack'); const bannerBox = document.createElement('div'); bannerBox.setAttribute('data-mfp', ''); if (section) section.prepend(bannerBox);
    function renderBanner() {
      const i = idxLoad(), pending = i.pendingUntil > Date.now();
      if (pending && !hidePending) bannerBox.innerHTML = `<div class="mf-banner mf-banner--warn" role="status"><div class="mf-banner__head"><span class="mf-banner__icon">${ICON_ALERT}</span><strong>Collecting data</strong><button type="button" class="mf-banner__x" data-banner="hide" aria-label="Dismiss">${ICON_CLOSE}</button></div><p class="mf-banner__body">We are collecting metafield values, please wait.</p></div>`;
      else if (!pending && i.notice === 'done') bannerBox.innerHTML = `<div class="mf-banner mf-banner--ok" role="status"><span class="mf-banner__icon">${ICON_OK}</span><span class="mf-banner__text">Data indexing is completed. You can use selected metafields in <a href="filter.html">filter</a> now.</span><button type="button" class="mf-banner__x" data-banner="done" aria-label="Dismiss">${ICON_CLOSE}</button></div>`;
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
    /* the Type-weight cell: only a text metafield with Search applied, and only while Advanced Search is on; otherwise it ranks as normal and shows "-" */
    const typeWeight = row => (isText(row.id) && row.applies.includes('search') && partialOn()) ? `${MF_TYPES[row.type]} - ${row.weight}` : '-';
    function renderTable() {
      tbody.innerHTML = rows.map(row => {
        const m = mfMeta(row.id);
        const tags = ['search', 'filter'].filter(a => row.applies.includes(a)).map(a => `<span class="mf-pill">${a === 'search' ? 'Search' : 'Filter'}</span>`).join('');
        return `<tr class="Polaris-DataTable__TableRow Polaris-DataTable--hoverable"><th class="Polaris-DataTable__Cell Polaris-DataTable__Cell--verticalAlignMiddle Polaris-DataTable__Cell--firstColumn" scope="row">${esc(m.label)}</th>`
          + cell(MF_TYPE_LABEL[m.type]) + cell(tags ? `<span class="mf-pills">${tags}</span>` : '-') + cell(esc(typeWeight(row)))
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
      if (i >= 0) rows.splice(i, 1); else if (rows.length < MF_LIMIT) rows.push({ id, applies: ['filter'], type: 'standard', weight: 1 });   // a new metafield starts as Filter, like the app
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

    /* --- window (Apply to + Search type + Weight, or confirm a delete); Esc / X / outside click close it --- */
    const scrim = document.createElement('div'); scrim.className = 'mf-scrim'; scrim.hidden = true; scrim.setAttribute('data-mfp', '');
    scrim.innerHTML = `<div class="mf-modal" role="dialog" aria-modal="true" aria-labelledby="mf-m-title"><div class="mf-modal__head"><h2 class="mf-modal__title" id="mf-m-title"></h2><button type="button" class="mf-modal__x" aria-label="Close">${ICON_CLOSE}</button></div><div class="mf-modal__body" id="mf-m-body"></div><div class="mf-modal__foot"><button type="button" class="mf-btn" data-m="cancel">Cancel</button><button type="button" class="mf-btn mf-btn--primary" data-m="ok">Save</button></div></div>`;
    document.body.appendChild(scrim);
    const dlg = $('.mf-modal', scrim), title = $('#mf-m-title', scrim), body = $('#mf-m-body', scrim), okBtn = $('[data-m=ok]', scrim);
    let current = null;                                                         // { kind, id, filter, search, type, weight, touched }
    const closeModal = () => {
      scrim.hidden = true; current = null;
      const back = opener && document.contains(opener) ? opener : (opener && opener.dataset && $(`[data-id="${opener.dataset.id}"][data-act="${opener.dataset.act}"]`, tbody)) || input;
      if (back === input) skipOpen = true;                                      // returning focus to the search box must not pop the list open
      if (back) back.focus(); opener = null;
    };
    const showConfig = m => partialOn() && isText(m.id) && m.search;            // Search type + Weight: Advanced Search on, text metafield, Search ticked
    function fillEdit() {
      const m = current, nonText = !isText(m.id);
      body.innerHTML = `
        <p class="mf-modal__sub">Apply to</p>
        <label class="mf-check"><input type="checkbox" class="pg-check" id="mf-a-filter"${m.filter ? ' checked' : ''}><span>Filter</span></label>
        <div class="mf-check-row"><label class="mf-check${nonText ? ' is-disabled' : ''}"><input type="checkbox" class="pg-check" id="mf-a-search"${!nonText && m.search ? ' checked' : ''}${nonText ? ' disabled' : ''}><span>Search</span></label>${nonText ? `<span class="mf-tip" tabindex="0" role="img" aria-label="Search is only available for text fields."><span class="Polaris-Icon Polaris-Icon--toneSubdued">${ICON_INFO}</span><span class="mf-tip__bubble" role="tooltip">Search is only available for text fields.</span></span>` : ''}</div>
        ${showConfig(m) ? `<div class="mf-grid mf-modal__config">${mfSelect('mf-a-type', 'Search type', MF_TYPES, m.type)}${mfWeight('mf-a-weight', m.weight)}</div>` : ''}`;
      const w = $('#mf-a-weight', body); if (w && m.touched) paintWeight(w, isWhole(m.weight));
    }
    function openEdit(id, from) {
      const row = rows.find(r => r.id === id); opener = from;
      current = { kind: 'edit', id, filter: row.applies.includes('filter'), search: row.applies.includes('search'), type: row.type, weight: String(row.weight), touched: false };
      title.textContent = mfMeta(id).label; okBtn.textContent = 'Save'; okBtn.classList.remove('mf-btn--critical'); okBtn.classList.add('mf-btn--primary');
      fillEdit(); scrim.hidden = false; const first = $('#mf-a-filter', body); if (first) first.focus();
    }
    function openDelete(id, from) {
      opener = from; current = { kind: 'delete', id };
      title.textContent = 'Delete this metafield?'; okBtn.textContent = 'Delete'; okBtn.classList.remove('mf-btn--primary'); okBtn.classList.add('mf-btn--critical');
      body.innerHTML = '<p class="mf-modal__text">After saving, deleted metafields will no longer appear in the filter.</p>';
      scrim.hidden = false; $('[data-m=cancel]', scrim).focus();
    }
    function confirmModal() {
      if (!current) return;
      if (current.kind === 'delete') { rows = rows.filter(r => r.id !== current.id); opener = input; closeModal(); renderTable(); return; }
      const row = rows.find(r => r.id === current.id), nonText = !isText(current.id), cfg = showConfig(current);
      if (cfg && !isWhole(current.weight)) { current.touched = true; fillEdit(); $('#mf-a-weight', body).focus(); return; }   // a bad weight blocks Save; the error shows under the field
      row.applies = ['search', 'filter'].filter(a => (a === 'filter' ? current.filter : (!nonText && current.search)));
      if (cfg) { row.type = current.type; row.weight = Number(current.weight); }
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
      if (e.target.id === 'mf-a-search') { current.search = e.target.checked; fillEdit(); const s = $('#mf-a-search', body); if (s) s.focus(); }   // the config fields appear / disappear with the tick
      if (e.target.id === 'mf-a-type') { current.type = e.target.value; fillEdit(); const t = $('#mf-a-type', body); if (t) t.focus(); }
    });
    scrim.addEventListener('input', e => { if (current && e.target.id === 'mf-a-weight') { current.weight = e.target.value; if (current.touched) paintWeight(e.target, isWhole(e.target.value)); } });
    scrim.addEventListener('focusout', e => { if (current && e.target.id === 'mf-a-weight') { current.touched = true; paintWeight(e.target, isWhole(e.target.value)); } });
    document.addEventListener('keydown', e => {
      if (scrim.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key === 'Tab') {                                                    // keep the keyboard inside the window while it is open
        const f = $$('button, input:not([disabled]), select, a[href], [tabindex="0"]', dlg).filter(x => x.offsetParent !== null);
        if (!f.length) return; const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    savers.push(() => {
      const added = rows.some(r => !saved.some(s => s.id === r.id));                      // a new metafield, a changed Search selection or a changed Search type / Weight needs an index
      const searchChanged = JSON.stringify(searchIdsOf(rows).sort()) !== JSON.stringify(searchIdsOf(saved).sort()) || searchCfgOf(rows) !== searchCfgOf(saved);
      savedJson = JSON.stringify(rows); saved = JSON.parse(savedJson); store.set(MFS_KEY, savedJson);
      if (added || searchChanged) { idxSave({ pendingUntil: Date.now() + INDEX_MS, notice: null }); hidePending = false; }
      renderBanner(); return true;
    });
    window.addEventListener('pageshow', () => { renderBanner(); renderTable(); });   // back from Advanced features: re-read the Partial search switch
    renderTable(); renderBanner();
  }
  if ($('.fdt-metafield-table')) initMetafieldPage();

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
    if (t.closest('[data-mfp]')) return;                                       // Metafield page (picker, table buttons, window): handled by initMetafieldPage
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
    if (el.matches('.pg-switch') && saveBtn()) setSave(true);                // design pages: toggling a setting
    if (el.matches('.pg-check')) {                                            // design page: layouts are picked one at a time
      const boxes = $$('.pg-check'), i = boxes.indexOf(el), group = i < 3 ? boxes.slice(0, 3) : boxes.slice(3);
      if (el.checked) group.forEach(b => { if (b !== el) b.checked = false; }); else el.checked = true;
      setSave(true);
    }
  });

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
