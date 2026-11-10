/* Year Make Model page (ymm.html): the options, the storefront widget's labels, "Remember vehicle selection", import from CSV / Excel and Manage history.
   Tabs: Options | Widget | History. Drawn with the app's Polaris markup (tools/build/pl.js). Option and history actions apply at once (each asks first when it removes something);
   the Widget tab is a draft saved from the contextual save bar.
   Stored in localStorage: findter.ymm.options.v1, findter.ymm.widget.v1, findter.ymm.history.v1 (the storefront adds a row for every search a shopper makes). */
(() => {
  'use strict';
  const root = document.getElementById('ym-root');
  if (!root || !window.FindterUI || !window.FindterPL) return;
  const { store, ICON, toast, openModal, saveBar } = window.FindterUI;
  const P = window.FindterPL, esc = P.esc;
  const K = { options: 'findter.ymm.options.v1', widget: 'findter.ymm.widget.v1', history: 'findter.ymm.history.v1' };
  const YMM_SEED = [   // keep in step with OPT_SEED in storefront-ext.js
    ['Toyota', 'Camry', 2015, 2023], ['Toyota', 'Corolla', 2014, 2024], ['Toyota', 'RAV4', 2016, 2024], ['Honda', 'Civic', 2012, 2023], ['Honda', 'Accord', 2013, 2022], ['Honda', 'CR-V', 2015, 2024],
    ['Ford', 'F-150', 2010, 2023], ['Ford', 'Focus', 2008, 2018], ['Ford', 'Mustang', 2015, 2024], ['BMW', '3 Series', 2012, 2023], ['Tesla', 'Model 3', 2018, 2024], ['Nissan', 'Altima', 2013, 2023],
  ].map(([make, model, from, to], i) => ({ id: i + 1, make, model, from, to }));
  const WIDGET_DEF = { enabled: true, title: 'Find parts for your vehicle', select: 'Select', search: 'Search', reset: 'Reset selection', remember: false };
  const clone = o => JSON.parse(JSON.stringify(o));
  let options = store.json(K.options, null); if (!Array.isArray(options)) options = clone(YMM_SEED);
  let saved = Object.assign({}, WIDGET_DEF, store.json(K.widget, {})), draft = clone(saved), show = false;
  const commitOptions = () => store.set(K.options, JSON.stringify(options));
  let tab = ({ '#widget': 'widget', '#history': 'history' })[location.hash] || 'options', page = 1, hpage = 1, topN = 5, hmake = '';
  const PER = 10;
  const $ = (s, r = root) => r.querySelector(s);
  const $$ = (s, r = root) => [...r.querySelectorAll(s)];

  /* ---------- history (the storefront adds rows; the first visit seeds a month of sample searches) ---------- */
  const matchCount = (y, mk, md) => { const h = [...(y + mk + md)].reduce((s, c) => s + c.charCodeAt(0), 0); let n = 0; for (let i = 0; i < 72; i++) if ((i + h) % 3 === 0) n++; return n; };
  function seedHistory() {
    const rnd = (i, k) => { let x = Math.imul(i + 1, 374761393) + Math.imul(k, 668265263); x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
    const combos = [['2019', 'Toyota', 'Camry', 9], ['2021', 'Honda', 'Civic', 7], ['2018', 'Ford', 'F-150', 6], ['2022', 'Tesla', 'Model 3', 5], ['2020', 'Toyota', 'RAV4', 4], ['2016', 'Honda', 'Accord', 3], ['2017', 'BMW', '3 Series', 3], ['2015', 'Ford', 'Mustang', 2], ['2014', 'Toyota', 'Corolla', 2], ['2019', 'Nissan', 'Altima', 1], ['2021', 'Honda', 'CR-V', 1]];
    const bag = combos.flatMap(c => Array(c[3]).fill(c)), out = [], now = Date.now();
    for (let i = 0; i < 96; i++) { const c = bag[Math.floor(rnd(i, 1) * bag.length)]; out.push({ t: new Date(now - Math.floor(rnd(i, 2) * 30 * 864e5) - Math.floor(rnd(i, 3) * 864e5 / 4)).toISOString(), y: c[0], mk: c[1], md: c[2], r: matchCount(c[0], c[1], c[2]) }); }
    return out.sort((a, b) => a.t.localeCompare(b.t));
  }
  let history = store.json(K.history, null); if (!Array.isArray(history)) { history = seedHistory(); store.set(K.history, JSON.stringify(history)); }
  const loadHistory = () => { const h = store.json(K.history, []); history = Array.isArray(h) ? h : []; };

  /* ---------- file reading (CSV by hand, Excel through SheetJS loaded on demand) ---------- */
  function parseCsv(text) {
    text = text.replace(/^﻿/, ''); const first = text.split(/\r?\n/)[0] || '', d = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true; else if (c === d) { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
  }
  const loadXlsx = () => window.XLSX ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = () => rej(new Error('load')); document.head.appendChild(s); });
  async function readFile(file) {
    const name = file.name.toLowerCase();
    if (/\.csv$|\.txt$/.test(name)) return parseCsv(await file.text());
    if (/\.xlsx?$/.test(name)) { await loadXlsx(); const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array' }); return window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }).filter(r => r.some(x => String(x).trim() !== '')); }
    throw new Error('type');
  }
  const norm = s => String(s).toLowerCase().replace(/[^a-z]/g, '');
  const HEAD = { make: ['make', 'brand', 'manufacturer'], model: ['model'], year: ['year'], from: ['yearfrom', 'startyear', 'fromyear', 'from', 'start', 'yearstart', 'beginyear'], to: ['yearto', 'endyear', 'toyear', 'to', 'end', 'yearend'] };
  function analyze(rows) {     // -> { ok: [options], bad: [{ line, why }], dup: n, error }
    if (rows.length < 2) return { error: 'The file has no data rows. Add a header row (Year, Make, Model) and at least one vehicle.' };
    const head = rows[0].map(norm), at = k => head.findIndex(h => HEAD[k].includes(h));
    const iMake = at('make'), iModel = at('model'), iYear = at('year'), iFrom = at('from'), iTo = at('to');
    const missing = [iMake < 0 && 'Make', iModel < 0 && 'Model', (iYear < 0 && iFrom < 0) && 'Year'].filter(Boolean);
    if (missing.length) return { error: 'Could not find the ' + missing.join(', ') + ' column. The first row must be a header, for example: Year, Make, Model.' };
    const exist = new Set(options.map(o => [o.make, o.model, o.from, o.to].join('|').toLowerCase())), seen = new Set(), ok = [], bad = []; let dup = 0;
    rows.slice(1).forEach((r, n) => {
      const line = n + 2, make = String(r[iMake] ?? '').trim(), model = String(r[iModel] ?? '').trim();
      const yv = iYear >= 0 ? String(r[iYear] ?? '').trim() : '', from = iFrom >= 0 ? Number(r[iFrom]) : NaN, to = iTo >= 0 ? Number(r[iTo]) : NaN;
      let f, t;
      if (iFrom >= 0) { f = from; t = iTo >= 0 && String(r[iTo]).trim() !== '' ? to : from; }
      else { const m = yv.match(/^(\d{4})\s*[-–to ]+\s*(\d{4})$/i); if (m) { f = +m[1]; t = +m[2]; } else { f = t = Number(yv); } }
      if (!make || !model) return bad.push({ line, why: !make ? 'Make is empty' : 'Model is empty' });
      if (!Number.isInteger(f) || !Number.isInteger(t) || f < 1900 || t > 2100) return bad.push({ line, why: 'Year is not a number between 1900 and 2100' });
      if (f > t) return bad.push({ line, why: 'The first year is after the last year' });
      const key = [make, model, f, t].join('|').toLowerCase();
      if (exist.has(key) || seen.has(key)) { dup++; return; }
      seen.add(key); ok.push({ make, model, from: f, to: t });
    });
    return { ok, bad, dup };
  }
  const TEMPLATE = 'Year,Make,Model\n2019,Toyota,Camry\n2020-2023,Honda,Civic\n2018,Ford,F-150\n';

  /* ---------- markup ---------- */
  const tabHtml = (id, label) => `<li class="Polaris-Tabs__TabContainer" role="presentation"><button id="ym-tab-${id}" class="Polaris-Tabs__Tab${tab === id ? ' Polaris-Tabs__Tab--active' : ''}" data-mfp role="tab" type="button" aria-selected="${tab === id}" aria-controls="ym-panel" tabindex="${tab === id ? 0 : -1}" data-tab="${id}"><div class="Polaris-InlineStack" style="--pc-inline-stack-align:center;--pc-inline-stack-block-align:center;--pc-inline-stack-wrap:nowrap;--pc-inline-stack-gap-xs:var(--p-space-200);--pc-inline-stack-flex-direction-xs:row"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">${label}</span></div></button></li>`;
  const tabsHtml = () => `<div class="fdt-menu-tabs"><div class="Polaris-Tabs__Outer"><div class="Polaris-Box" style="--pc-box-padding-block-start-md:var(--p-space-200);--pc-box-padding-block-end-md:var(--p-space-200);--pc-box-padding-inline-start-md:var(--p-space-200);--pc-box-padding-inline-end-md:var(--p-space-200)"><div class="Polaris-Tabs__Wrapper"><div class="Polaris-Tabs__ButtonWrapper"><ul class="Polaris-Tabs" role="tablist" aria-label="Year Make Model">${tabHtml('options', 'Options')}${tabHtml('widget', 'Widget')}${tabHtml('history', 'History')}</ul></div></div></div></div></div>`;
  const pager = (n, p, act) => n <= PER ? '' : `<div class="pl-pager">${P.text(`${(p - 1) * PER + 1}–${Math.min(n, p * PER)} of ${n}`, 'bodyMd', 'Polaris-Text--subdued')}<div class="Polaris-ButtonGroup Polaris-ButtonGroup--segmented"><div class="Polaris-ButtonGroup__Item"><button type="button" class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter${p <= 1 ? ' Polaris-Button--disabled' : ''}" data-act="${act}-prev" aria-label="Previous page"${p <= 1 ? ' disabled' : ''}><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium"><span class="Polaris-Icon">${ICON.back.replace('<svg ', '<svg ')}</span></span></button></div><div class="Polaris-ButtonGroup__Item"><button type="button" class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter${p * PER >= n ? ' Polaris-Button--disabled' : ''}" data-act="${act}-next" aria-label="Next page"${p * PER >= n ? ' disabled' : ''}><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium"><span class="Polaris-Icon pl-flip">${ICON.back}</span></span></button></div></div></div>`;
  const enableCard = () => P.card(`<div class="pl-switchrow"><div class="Polaris-BlockStack" style="--pc-block-stack-order:column;--pc-block-stack-gap-xs:var(--p-space-100)"><h2 class="Polaris-Text--root Polaris-Text--headingMd" id="ym-en-t">Enable Year Make Model</h2><p class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued" id="ym-en-d">Turn on to display the search widget on your storefront.</p></div><input type="checkbox" class="pg-switch" role="switch" id="ym-enable" aria-labelledby="ym-en-t" aria-describedby="ym-en-d"${draft.enabled ? ' checked' : ''}></div>`);
  const yearsOf = o => o.from === o.to ? o.from : o.from + ' – ' + o.to;

  function optionsHtml() {
    if (!options.length) return P.empty({ title: 'No YMM options yet', body: 'You don’t have any YMM options yet. Create one, or import them from a CSV or Excel file.', actions: `<div class="pl-actions">${P.button('Create your first option', 'add')}${P.button('Import file', 'import', 'Secondary')}</div>` });
    const rows = options.slice((page - 1) * PER, page * PER);
    return P.card(P.head('YMM options', `<div class="pl-actions">${P.button('Import file', 'import', 'Secondary')}${P.button('Create option', 'add')}</div>`, `${options.length} option${options.length === 1 ? '' : 's'}. Shoppers pick a year, then a make, then a model.`)
      + P.table({ heads: ['Make', 'Model', 'Years', 'Actions'], label: 'YMM options', min: 520, rows: rows.map(o => ({ cells: [esc(o.make), esc(o.model), P.text(String(yearsOf(o)), 'bodyMd', 'Polaris-Text--subdued'), `<div class="pl-actions">${P.iconButton('edit', 'Edit ' + o.make + ' ' + o.model, 'edit')}${P.iconButton('delete', 'Delete ' + o.make + ' ' + o.model, 'delete')}</div>`], cls: 'pl-row', attrs: `data-id="${o.id}"` })) }) + pager(options.length, page, 'opt'));
  }
  const widgetPreview = () => {
    const c = draft;
    return `<div class="pl-prev"><p class="Polaris-Text--root Polaris-Text--headingSm" style="color:#121212">${esc(c.title || WIDGET_DEF.title)}</p><div class="pl-prev__row"><span class="pl-prev__sel">${esc(c.select || 'Select')} year</span><span class="pl-prev__sel">${esc(c.select || 'Select')} make</span><span class="pl-prev__sel">${esc(c.select || 'Select')} model</span></div><div class="pl-prev__row"><span class="pl-prev__btn">${esc(c.search || 'Search')}</span><span class="pl-prev__lnk">${esc(c.reset || 'Reset selection')}</span></div>
      ${c.remember ? `<div class="pl-prev__row">${P.text('Your vehicles', 'bodySm', 'Polaris-Text--subdued')}<span class="pl-prev__chip">2019 Toyota Camry</span><span class="pl-prev__chip">2021 Honda Civic</span></div>` : ''}</div>`;
  };
  const labelField = (key, label, max, help) => P.field({ id: 'ym-' + key, label: label + ' (required)', control: P.textField({ id: 'ym-' + key, value: draft[key], attrs: `maxlength="${max}" data-w="${key}"` }), helpText: help, errKey: 'w-' + key });
  function widgetHtml() {
    return `<div class="pl-cols"><div class="pl-colA">${P.card(P.head('Widget labels', null, 'Edit the words shoppers see on the widget.')
      + labelField('title', 'Widget title', 60, 'The heading above the selects.') + labelField('select', 'Select', 20, 'Starts each dropdown, for example “Select year”.') + labelField('search', 'Search', 20, 'The button that shows matching products.') + labelField('reset', 'Reset selection', 30, 'The link that clears the choice.')
      + P.divider() + `<div class="pl-switchrow"><div class="Polaris-BlockStack" style="--pc-block-stack-order:column;--pc-block-stack-gap-xs:var(--p-space-100)"><h3 class="Polaris-Text--root Polaris-Text--headingSm" id="ym-rem-t">Remember vehicle selection</h3><p class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued" id="ym-rem-d">Shoppers see the vehicles they searched before and can pick one again.</p></div><input type="checkbox" class="pg-switch" role="switch" id="ym-remember" aria-labelledby="ym-rem-t" aria-describedby="ym-rem-d"${draft.remember ? ' checked' : ''}></div>`)}</div>
      <div class="pl-colB">${P.card(P.head('Preview', null, 'How the widget looks on your storefront.') + `<div id="ym-prev">${widgetPreview()}</div><div>${`<a class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter" href="storefront.html" target="_blank" rel="noopener noreferrer"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Open on storefront</span></a>`}</div>`)}</div></div>`;
  }
  const comboLabel = h => h.y + ' ' + h.mk + ' ' + h.md;
  const kpi = (label, value) => P.card(P.text(label, 'bodyMd', 'Polaris-Text--subdued') + `<p class="Polaris-Text--root Polaris-Text--headingLg" style="overflow-wrap:anywhere">${value}</p>`, { gap: '100' });
  function historyHtml() {
    if (!history.length) return P.empty({ title: 'No searches yet', body: 'When shoppers pick a vehicle and search, the combination shows up here.', actions: '' });
    const d30 = history.filter(h => Date.now() - Date.parse(h.t) <= 30 * 864e5), by = {};
    history.forEach(h => { const k = comboLabel(h); by[k] = (by[k] || 0) + 1; });
    const top = Object.entries(by).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, topN), max = top.length ? top[0][1] : 1;
    const makes = [...new Set(history.map(h => h.mk))].sort();
    const list = history.filter(h => !hmake || h.mk === hmake).slice().sort((a, b) => b.t.localeCompare(a.t)), rows = list.slice((hpage - 1) * PER, hpage * PER);
    const seg = `<div class="Polaris-ButtonGroup Polaris-ButtonGroup--segmented" role="group" aria-label="Number of combinations">${[5, 10].map(n => `<div class="Polaris-ButtonGroup__Item">${P.button('Top ' + n, 'top', 'Secondary', `data-top="${n}" aria-pressed="${topN === n}"`)}</div>`).join('')}</div>`;
    return `<div class="pl-stack"><div class="pl-kpis">${kpi('Searches, last 30 days', d30.length)}${kpi('Different combinations', Object.keys(by).length)}${kpi('Most searched', top[0] ? esc(top[0][0]) : '—')}</div>
      ${P.card(P.head('Top combinations', seg, 'The vehicles shoppers search for most.') + `<ol class="pl-top">${top.map(([k, n], i) => `<li class="pl-top__row"><span class="pl-rank">${i + 1}</span>${P.text(esc(k), 'bodyMd', 'Polaris-Text--medium')}${P.progress((n / max * 100).toFixed(0))}<span class="pl-top__n Polaris-Text--root Polaris-Text--bodySm">${n} · ${(n / history.length * 100).toFixed(0)}%</span></li>`).join('')}</ol>`)}
      ${P.card(P.head('Search history', `<div class="pl-actions">${P.select({ id: 'ym-hmake', options: [['', 'All makes']].concat(makes.map(m => [m, m])), value: hmake, label: 'Make' })}${P.button('Clear history', 'clear', 'Secondary')}</div>`, 'Every vehicle search, newest first.')
        + P.table({ heads: ['Date', 'Year', 'Make', 'Model', 'Products found'], label: 'Search history', min: 640, rows: rows.map(h => ({ cells: [P.text(new Date(h.t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), 'bodyMd', 'Polaris-Text--subdued'), esc(h.y), esc(h.mk), esc(h.md), P.text(String(h.r), 'bodyMd', 'Polaris-Text--subdued')], cls: 'pl-row', noHeaderCell: true })) }) + pager(list.length, hpage, 'his'))}</div>`;
  }
  function render(focus) {
    root.innerHTML = `<div class="pl-stack">${enableCard()}${tabsHtml()}<div id="ym-panel" role="tabpanel" aria-labelledby="ym-tab-${tab}">${tab === 'options' ? optionsHtml() : tab === 'widget' ? widgetHtml() : historyHtml()}</div></div>`;
    paintWErr(); const f = focus && $(focus); if (f) f.focus({ preventScroll: true }); bar.sync();
  }
  function paintWErr() { ['title', 'select', 'search', 'reset'].forEach(k => { const e = $('#err-w-' + k), i = $('#ym-' + k); if (!e) return; const bad = show && !String(draft[k]).trim(); e.hidden = !bad; $('[data-msg]', e).textContent = bad ? 'Enter text for this label.' : ''; i.closest('.Polaris-TextField').classList.toggle('Polaris-TextField--error', bad); bad ? i.setAttribute('aria-invalid', 'true') : i.removeAttribute('aria-invalid'); }); }

  /* ---------- the Widget tab's save bar ---------- */
  const isEdited = () => JSON.stringify(draft) !== JSON.stringify(saved);
  function saveW() { show = true; const bad = ['title', 'select', 'search', 'reset'].find(k => !String(draft[k]).trim()); if (bad) { if (tab !== 'widget') { tab = 'widget'; render('#ym-' + bad); } else { paintWErr(); $('#ym-' + bad).focus(); } return false; } draft.title = draft.title.trim(); ['select', 'search', 'reset'].forEach(k => { draft[k] = draft[k].trim(); }); saved = clone(draft); store.set(K.widget, JSON.stringify(saved)); show = false; toast('Saved'); render(); return true; }
  const bar = saveBar({ isEdited, onSave: saveW, onDiscard: () => { draft = clone(saved); show = false; render(); } });

  /* ---------- windows ---------- */
  function optionForm(id) {
    const cur = id ? options.find(o => o.id == id) : null;
    openModal({ title: cur ? 'Edit YMM option' : 'Create YMM option', ok: 'Save',
      content: P.field({ id: 'yo-make', label: 'Make (required)', control: P.textField({ id: 'yo-make', value: cur ? cur.make : '' }), errKey: 'yomake' }) + P.field({ id: 'yo-model', label: 'Model (required)', control: P.textField({ id: 'yo-model', value: cur ? cur.model : '' }), errKey: 'yomodel' })
        + `<div class="pl-two">${P.field({ id: 'yo-from', label: 'First year (required)', control: P.textField({ id: 'yo-from', type: 'number', value: cur ? cur.from : '', attrs: 'min="1900" max="2100"' }) })}${P.field({ id: 'yo-to', label: 'Last year (required)', control: P.textField({ id: 'yo-to', type: 'number', value: cur ? cur.to : '', attrs: 'min="1900" max="2100"' }), errKey: 'yoyear' })}</div>`,
      onOk: m => {
        const g = s => m.querySelector(s), make = g('#yo-make').value.trim(), model = g('#yo-model').value.trim(), f = Number(g('#yo-from').value), t = Number(g('#yo-to').value);
        const e = { make: make ? '' : 'Enter a make.', model: model ? '' : 'Enter a model.', year: (!Number.isInteger(f) || !Number.isInteger(t) || f < 1900 || t > 2100) ? 'Enter two years between 1900 and 2100.' : f > t ? 'The first year must not be after the last year.' : '' };
        if (!e.year && options.some(o => o.id !== (cur && cur.id) && o.make.toLowerCase() === make.toLowerCase() && o.model.toLowerCase() === model.toLowerCase() && o.from === f && o.to === t)) e.year = 'This option already exists.';
        [['make', '#yo-make'], ['model', '#yo-model'], ['year', '#yo-to']].forEach(([k, sel]) => { const p = g('#err-yo' + k); p.hidden = !e[k]; g('[data-msg]', p) ; p.querySelector('[data-msg]').textContent = e[k]; g(sel).closest('.Polaris-TextField').classList.toggle('Polaris-TextField--error', !!e[k]); if (k === 'year') g('#yo-from').closest('.Polaris-TextField').classList.toggle('Polaris-TextField--error', !!e[k]); });
        const first = e.make ? '#yo-make' : e.model ? '#yo-model' : e.year ? '#yo-from' : ''; if (first) { g(first).focus(); return false; }
        if (cur) Object.assign(cur, { make, model, from: f, to: t }); else options.push({ id: Math.max(0, ...options.map(o => o.id)) + 1, make, model, from: f, to: t });
        commitOptions(); render(); toast('Option saved');
      } });
  }
  function importWindow() {
    let result = null, mode = 'add';
    const body = `<p class="mf-modal__text">Upload a CSV or Excel file with the columns <strong>Year</strong>, <strong>Make</strong> and <strong>Model</strong>. Use it to bring over the list you exported from another YMM app. <a href="#" id="ym-tpl" class="Polaris-Link">Download an example CSV</a></p>
      <div style="margin-top:16px">${P.field({ id: 'ym-file', label: 'File (.csv, .xlsx)', control: `<input id="ym-file" class="pl-file" type="file" accept=".csv,.txt,.xlsx,.xls">`, errKey: 'ymfile' })}</div><div id="ym-res" aria-live="polite"></div>`;
    const close = openModal({ title: 'Import YMM options', content: body, ok: 'Import', wide: true, onOk: () => { if (!result || !result.ok.length) return false; const base = mode === 'replace' ? 0 : Math.max(0, ...options.map(o => o.id)); if (mode === 'replace') options = []; result.ok.forEach((o, i) => options.push({ id: base + i + 1, ...o })); commitOptions(); page = 1; tab = 'options'; render(); toast(`Imported ${result.ok.length} option${result.ok.length === 1 ? '' : 's'}`); },
      onOpen: (m, okBtn) => {
        okBtn.disabled = true; const file = m.querySelector('#ym-file'), res = m.querySelector('#ym-res'), ferr = m.querySelector('#err-ymfile'); file.focus();
        m.querySelector('#ym-tpl').addEventListener('click', e => { e.preventDefault(); const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(TEMPLATE); a.download = 'ymm-example.csv'; document.body.appendChild(a); a.click(); a.remove(); });
        const fail = msg => { ferr.hidden = false; ferr.querySelector('[data-msg]').textContent = msg; ferr.setAttribute('role', 'alert'); res.innerHTML = ''; okBtn.disabled = true; result = null; };
        const paintRes = () => {
          const r = result, shown = r.ok.slice(0, 5);
          res.innerHTML = `<div class="pl-tags" style="margin:16px 0 8px">${P.badge('Success', r.ok.length + ' ready')}${r.dup ? P.badge('Neutral', r.dup + ' already exist' + (r.dup === 1 ? 's' : '')) : ''}${r.bad.length ? P.badge('Warning', r.bad.length + ' with problems') : ''}</div>
            ${shown.length ? P.table({ heads: ['Make', 'Model', 'Years'], label: 'Rows ready to import', min: 0, rows: shown.map(o => ({ cells: [esc(o.make), esc(o.model), String(yearsOf(o))] })) }) + (r.ok.length > 5 ? P.sub(`Showing 5 of ${r.ok.length}.`) : '') : ''}
            ${r.bad.length ? `<div style="margin-top:8px">${P.errorLine('ymbad', r.bad.slice(0, 5).map(b => `Row ${b.line}: ${esc(b.why)}.`).join('<br>') + (r.bad.length > 5 ? `<br>and ${r.bad.length - 5} more rows.` : '') + ' These rows are skipped.', false)}</div>` : ''}
            <fieldset class="mc-fieldset" style="margin-top:16px"><legend class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--medium pl-legend">When importing</legend><div class="Polaris-BlockStack" style="--pc-block-stack-order:column;--pc-block-stack-gap-xs:var(--p-space-100)">${P.radio({ id: 'ym-mode-add', name: 'ym-mode', value: 'add', label: `Add to the ${options.length} existing options`, checked: mode === 'add' })}${P.radio({ id: 'ym-mode-replace', name: 'ym-mode', value: 'replace', label: 'Replace all existing options', checked: mode === 'replace' })}</div></fieldset>`;
          okBtn.disabled = !r.ok.length;
        };
        res.addEventListener('change', e => { if (e.target.name === 'ym-mode') mode = e.target.value; });
        file.addEventListener('change', async () => {
          ferr.hidden = true; res.innerHTML = ''; okBtn.disabled = true; result = null; const f = file.files[0]; if (!f) return;
          res.innerHTML = P.sub('Reading the file…');
          try { const rows = await readFile(f), a = analyze(rows); if (a.error) return fail(a.error); result = a; paintRes(); }
          catch (err) { fail(err.message === 'type' ? 'This file type is not supported. Use .csv or .xlsx.' : err.message === 'load' ? 'Excel files could not be read right now. Save the file as CSV and try again.' : 'This file could not be read. Check that it is a valid CSV or Excel file.'); }
        });
      } });
    return close;
  }

  /* ---------- events ---------- */
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-tab],[data-act],[data-top]'); if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; if (tab === 'history') loadHistory(); render('#ym-tab-' + tab); return; }
    if (t.dataset.top) { topN = +t.dataset.top; render(`[data-top="${topN}"]`); return; }
    const a = t.dataset.act, id = t.closest('tr') && t.closest('tr').dataset.id;
    if (a === 'add') optionForm(null); else if (a === 'edit') optionForm(id); else if (a === 'import') importWindow();
    else if (a === 'delete') { const o = options.find(x => x.id == id); openModal({ title: 'Delete this option?', content: `<p class="mf-modal__text">${esc(o.make + ' ' + o.model)} (${yearsOf(o)}) will no longer appear in the widget.</p>`, ok: 'Delete', okClass: 'mf-btn--critical', onOk: () => { options = options.filter(x => x.id != id); commitOptions(); if ((page - 1) * PER >= options.length && page > 1) page--; render(); toast('Option deleted'); } }); }
    else if (a === 'clear') openModal({ title: 'Clear the search history?', content: '<p class="mf-modal__text">All saved vehicle searches will be removed. This cannot be undone.</p>', ok: 'Clear history', okClass: 'mf-btn--critical', onOk: () => { history = []; store.set(K.history, '[]'); hpage = 1; render(); toast('History cleared'); } });
    else if (a === 'opt-prev') { page--; render(); } else if (a === 'opt-next') { page++; render(); } else if (a === 'his-prev') { hpage--; render(); } else if (a === 'his-next') { hpage++; render(); }
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'ym-enable') { draft.enabled = t.checked; bar.sync(); }
    else if (t.id === 'ym-remember') { draft.remember = t.checked; const p = $('#ym-prev'); if (p) p.innerHTML = widgetPreview(); bar.sync(); }
    else if (t.id === 'ym-hmake') { hmake = t.value; hpage = 1; render('#ym-hmake'); }
  });
  root.addEventListener('input', e => { const k = e.target.dataset.w; if (!k) return; draft[k] = e.target.value; const p = $('#ym-prev'); if (p) p.innerHTML = widgetPreview(); paintWErr(); bar.sync(); });
  root.addEventListener('keydown', e => { const t = e.target.closest && e.target.closest('[role=tab]'); if (t && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); const ids = ['options', 'widget', 'history'], i = ids.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1); tab = ids[(i + 3) % 3]; if (tab === 'history') loadHistory(); render('#ym-tab-' + tab); } });
  window.addEventListener('storage', e => { if (e.key === K.history && tab === 'history') { loadHistory(); render(); } });
  render();
})();
