/* Merchandising page (merchandising.html): boost, demote or hide products on collection pages and on search results.
   Rebuilt in Polaris from the Boost prototype (NgocDungNguyen/Boost, index.html): same rules and fields, drawn with the app's own Polaris markup (tools/build/pl.js) and following
   the Built for Shopify rules (contextual save bar, back arrow on the rule page, inline errors, red only for delete, modals with the actions in the footer).
   Rules live in localStorage (findter.merch.collection.v2 / findter.merch.search.v2); the real app would store them per shop. */
(() => {
  'use strict';
  const root = document.getElementById('mc-root');
  if (!root || !window.FindterUI || !window.FindterCatalog || !window.FindterPL) return;
  const { $, $$, store, ICON, toast, openModal, saveBar } = window.FindterUI;
  const P = window.FindterPL, esc = P.esc;
  const { PRODUCTS, COLLECTIONS, METAFIELDS, money, MERCH_SEEDS } = window.FindterCatalog;
  const MAX_PRODUCTS = 6, MAX_CONDS = 3;
  const TYPES = [['boost', 'Boost'], ['demote', 'Demote'], ['hide', 'Hide']];
  const TONE = { boost: 'Success', demote: 'Attention', hide: 'Warning' };
  const MARKETS = ['Store default', 'United States', 'European Union', 'Asia Pacific'];
  const GUIDE = 'https://flintverse.gitbook.io/docs/findter-custom-filter-search/user-guide/';

  const MODES = {
    collection: {
      key: 'findter.merch.collection.v2', title: 'Collection booster', sub: 'Boost, demote, or hide products on collection pages.',
      emptyH: 'Boost, demote, or hide products in a collection', emptyP: 'Take control of how products rank on collection pages. Boost best sellers to the top, demote slow movers, or hide out-of-stock items.',
      ph: 'e.g. Boost new arrivals in Skin care',
      desc: { boost: 'Selected products are pinned higher on the collection page.', demote: 'Selected products rank lower on the collection page.', hide: 'Selected products are hidden from the collection page.' },
      seed: MERCH_SEEDS.collection,
    },
    search: {
      key: 'findter.merch.search.v2', title: 'Search booster', sub: 'Boost, demote, or hide products when shoppers search for specific terms.',
      emptyH: 'Boost, demote, or hide products in search results', emptyP: 'Take control of how products rank in search. Boost best sellers, demote slow movers, or hide out-of-stock items for the terms shoppers type.',
      ph: 'e.g. Boost holiday favorites',
      desc: { boost: 'Selected products rank higher when shoppers search for these terms.', demote: 'Selected products rank lower when shoppers search for these terms.', hide: 'Selected products are hidden from search results for these terms.' },
      seed: MERCH_SEEDS.search,
    },
  };
  const BADGE = { boost: 'Boost', demote: 'Demote', hide: 'Hide' };

  /* ---------- data ---------- */
  const rules = {};
  Object.keys(MODES).forEach(m => { const saved = store.json(MODES[m].key, null); rules[m] = Array.isArray(saved) ? saved : JSON.parse(JSON.stringify(MODES[m].seed)); });
  const persist = m => store.set(MODES[m].key, JSON.stringify(rules[m]));
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const isExpired = r => !!r.end && new Date(r.end + 'T00:00:00') < today();
  const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const expireAll = m => { let ch = false; rules[m].forEach(r => { if (isExpired(r) && r.enabled) { r.enabled = false; ch = true; } }); if (ch) persist(m); };
  let mode = location.hash === '#search' ? 'search' : 'collection';
  let view = 'list';                        // 'list' | 'builder'
  let seq = 1;
  const uid = () => 100000 + (seq++);

  /* ---------- attribute conditions ---------- */
  const uniq = (list, f) => [...new Set(list.flatMap(p => [].concat(p[f])))].sort();
  const OPS = { is: 'is', lte: 'at most', eq: 'exactly', gte: 'at least', before: 'before', after: 'after' };
  const attrConfig = scoped => {
    const cfg = {
      'Product title': { ops: ['is'] }, 'Product type': { ops: ['is'], options: uniq(scoped, 'type') }, 'Product category': { ops: ['is'], options: uniq(scoped, 'category') },
      'Vendor': { ops: ['is'], options: uniq(scoped, 'vendor') }, 'Product tag': { ops: ['is'], options: uniq(scoped, 'tags') }, 'Metafield': { ops: ['is'], options: METAFIELDS },
      'Inventory': { ops: ['is', 'lte', 'eq', 'gte'] }, 'Price': { ops: ['eq', 'lte', 'gte'] }, 'Date published': { ops: ['before', 'after'] },
    };
    if (mode === 'search') cfg.Collection = { ops: ['is'], options: COLLECTIONS };
    return cfg;
  };
  const newCond = () => ({ id: uid(), attr: 'Product title', operator: 'is', value: '' });
  const newGroup = list => { const names = new Set((list || []).map(g => g.name.trim().toLowerCase())); let n = (list || []).length + 1; while (names.has(('Condition group ' + n).toLowerCase())) n++; return { id: uid(), name: 'Condition group ' + n, conditions: [newCond()] }; };

  /* ---------- builder state ---------- */
  let b = null;
  const scopedProducts = () => mode === 'collection' && b.applyMode === 'specific' ? (b.collection ? PRODUCTS.filter(p => p.collections.includes(b.collection)) : []) : PRODUCTS;
  const snap = () => JSON.stringify({ t: b.type, n: b.name, s: b.start, e: b.end, m: b.market, a: b.applyMode, mm: b.matchMode, te: b.terms, c: b.collection, pm: b.productMode, p: [...b.sel].sort((x, y) => x - y), g: b.groups, r: b.rel });
  const isEdited = () => view === 'builder' && !!b && snap() !== b.base;
  const errors = () => {
    const e = {};
    if (!b.name.trim()) e.name = 'Enter a rule name.';
    if (b.start && b.end && b.end < b.start) e.end = 'Choose an end date on or after the start date.';
    if (mode === 'search' && b.applyMode === 'specific' && !b.terms.length) e.terms = 'Add at least one search term.';
    if (mode === 'collection' && b.applyMode === 'specific' && !b.collection) e.collection = 'Select a collection page.';
    if (b.productMode === 'specific') { if (!b.sel.size) e.products = 'Select at least one product.'; }
    else {
      const names = b.groups.map(g => g.name.trim().toLowerCase());
      if (names.some(n => !n) || new Set(names).size !== names.length) e.groups = 'Give every condition group a unique name.';
      if (b.groups.some(g => g.conditions.some(c => String(c.value ?? '').trim() === ''))) e.conds = 'Complete every condition, or remove the ones you do not need.';
    }
    return e;
  };

  /* ---------- markup: list ---------- */
  const tabHtml = (id, label) => `<li class="Polaris-Tabs__TabContainer" role="presentation"><button id="mc-tab-${id}" class="Polaris-Tabs__Tab${mode === id ? ' Polaris-Tabs__Tab--active' : ''}" data-mfp role="tab" type="button" aria-selected="${mode === id}" aria-controls="mc-panel" tabindex="${mode === id ? 0 : -1}" data-tab="${id}"><div class="Polaris-InlineStack" style="--pc-inline-stack-align:center;--pc-inline-stack-block-align:center;--pc-inline-stack-wrap:nowrap;--pc-inline-stack-gap-xs:var(--p-space-200);--pc-inline-stack-flex-direction-xs:row"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">${label}</span></div></button></li>`;
  const headerHtml = () => `<div class="fdt-header"><h1 class="fdt-header__title">Merchandising</h1><p class="fdt-header__description"><a class="fdt-header__link" href="${GUIDE}" target="_blank" rel="noopener noreferrer">Merchandising guidelines here</a></p></div>`;
  const tabsHtml = () => `<div class="fdt-menu-tabs"><div class="Polaris-Tabs__Outer"><div class="Polaris-Box" style="--pc-box-padding-block-start-md:var(--p-space-200);--pc-box-padding-block-end-md:var(--p-space-200);--pc-box-padding-inline-start-md:var(--p-space-200);--pc-box-padding-inline-end-md:var(--p-space-200)"><div class="Polaris-Tabs__Wrapper"><div class="Polaris-Tabs__ButtonWrapper"><ul class="Polaris-Tabs" role="tablist" aria-label="Merchandising pages">${tabHtml('collection', 'Collection page')}${tabHtml('search', 'Search result page')}</ul></div></div></div></div></div>`;
  function rowOf(r) {
    const exp = isExpired(r);
    const sub = mode === 'search' ? (r.applyMode === 'all' ? 'All search terms' : (r.matchMode === 'contains' ? 'Contains: ' : 'Is: ') + r.terms.join(', ')) : '';
    const cells = [
      `<button type="button" class="pl-handle" data-act="move" aria-label="Reorder ${esc(r.name)}. Use the up and down arrow keys.">${P.svg('drag')}</button>`,
      P.toggle({ on: r.enabled, label: 'Status of ' + r.name, disabled: exp }),
      `<div class="pl-name">${P.link(esc(r.name), 'edit')}${sub ? P.text(esc(sub), 'bodySm', 'Polaris-Text--subdued') : ''}</div>`,
      P.badge(TONE[r.type], BADGE[r.type]),
    ];
    if (mode === 'collection') cells.push(`<div class="pl-tagcell"><div class="ft-collection-tag">${r.applyMode === 'all' ? 'All collections' : esc(r.collection || '—')}</div></div>`);
    cells.push(P.text(fmtDate(r.start)), `<div class="pl-tagcell">${P.text(fmtDate(r.end))}${exp ? P.badge('Neutral', 'Expired') : ''}</div>`,
      `<div class="pl-actions">${P.iconButton('edit', 'Edit ' + r.name, 'edit')}${P.iconButton('delete', 'Delete ' + r.name, 'delete')}</div>`);
    return { cells, cls: 'pl-row', attrs: `draggable="true" data-id="${r.id}"`, noHeaderCell: true };
  }
  function listHtml() {
    const c = MODES[mode], list = rules[mode];
    const heads = ['<span class="pl-sr">Reorder</span>', 'Status', 'Rule name', 'Type'].concat(mode === 'collection' ? ['Collection'] : [], ['Start date', 'End date', 'Actions']);
    const body = list.length
      ? P.card(P.head(c.title, P.button('Add rule', 'add'), c.sub) + `<div id="mc-rows">${P.table({ heads, rows: list.map(rowOf), label: c.title, min: 820 })}</div>`)
      : P.empty({ title: c.emptyH, body: c.emptyP, actions: P.button('Add rule', 'add') });
    return `<div class="pl-stack">${headerHtml()}${tabsHtml()}<div id="mc-panel" role="tabpanel" aria-labelledby="mc-tab-${mode}">${body}</div></div>`;
  }

  /* ---------- markup: builder ---------- */
  const errLine = key => P.errorLine(key, '', true);
  const legend = t => `<legend class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--medium pl-legend">${t}</legend>`;
  const vstack = (inner, gap = '100') => `<div class="Polaris-BlockStack" style="--pc-block-stack-order:column;--pc-block-stack-gap-xs:var(--p-space-${gap})">${inner}</div>`;
  const typeChoices = () => `<fieldset class="mc-fieldset">${legend('Rule type (required)')}${vstack(TYPES.map(([k, l]) => P.radio({ id: 'mc-type-' + k, name: 'mc-type', value: k, label: l, checked: b.type === k, help: MODES[mode].desc[k] })).join(''))}</fieldset>`;
  const termTags = () => b.terms.map(t => P.tag(esc(t), 'rmterm', `data-term="${esc(t)}"`, 'Remove term ' + t)).join('');
  const applyHtml = () => {
    const search = mode === 'search';
    const radios = `<fieldset class="mc-fieldset">${legend('Apply to')}${vstack(P.radio({ id: 'mc-apply-all', name: 'mc-apply', value: 'all', label: search ? 'All search terms' : 'All collections', checked: b.applyMode === 'all' }) + P.radio({ id: 'mc-apply-specific', name: 'mc-apply', value: 'specific', label: search ? 'Specific search terms' : 'Specific collection page', checked: b.applyMode === 'specific' }))}</fieldset>`;
    if (b.applyMode === 'all') return radios + (search ? P.sub('This rule applies to every search. Any product that matches the rule is boosted, demoted, or hidden whenever it appears in search results.') : '');
    if (!search) return radios + `<div class="pl-box pl-box--tint">${P.field({ id: 'mc-collection', label: 'Collection page', control: P.select({ id: 'mc-collection', options: [['', 'Select collection page']].concat(COLLECTIONS.map(c => [c, c])), value: b.collection }), errKey: 'collection' })}</div>`;
    return radios + `<div class="pl-box pl-box--tint">${P.field({ id: 'mc-match', label: 'Match search terms', control: P.select({ id: 'mc-match', options: [['contains', 'Contains'], ['is', 'Is (exact match)']], value: b.matchMode }), helpText: 'The choice applies to every term below.' })}
      ${P.field({ id: 'mc-term', label: 'Search terms', control: `<div class="pl-actions"><div style="flex:1;min-width:0">${P.textField({ id: 'mc-term', placeholder: 'Type terms, separated by commas' })}</div>${P.button('Add', 'addterm', 'Secondary')}</div>`, errKey: 'terms' })}
      <div class="pl-tags" id="mc-terms">${termTags()}</div><p class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued" id="mc-dup" hidden>Some terms were skipped because the rule already has them.</p></div>`;
  };
  const productsHtml = () => `<div class="Polaris-ButtonGroup Polaris-ButtonGroup--segmented" role="group" aria-label="Choose products by"><div class="Polaris-ButtonGroup__Item">${P.button('Specific products', 'pmode', 'Secondary', `data-pmode="specific" aria-pressed="${b.productMode === 'specific'}"`)}</div><div class="Polaris-ButtonGroup__Item">${P.button('Attributes', 'pmode', 'Secondary', `data-pmode="attributes" aria-pressed="${b.productMode === 'attributes'}"`)}</div></div>
    ${mode === 'collection' ? `<p class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued" id="mc-scope"></p>` : ''}
    <div id="mc-specific"${b.productMode === 'specific' ? '' : ' hidden'}>${vstack(`<div class="pl-actions" style="justify-content:space-between">${P.text('Select up to ' + MAX_PRODUCTS + ' products.', 'bodyMd', 'Polaris-Text--subdued')}<span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued" id="mc-count" aria-live="polite"></span></div><div class="pl-tags" id="mc-chips"></div>${P.textField({ id: 'mc-psearch', prefix: P.icon('search'), placeholder: 'Search products by name', label: 'Search products by name' })}<div class="pl-plist" id="mc-plist"></div>${errLine('products')}`, '300')}</div>
    <div id="mc-attrs"${b.productMode === 'attributes' ? '' : ' hidden'}>${vstack(`<div id="mc-groups">${''}</div>${errLine('groups')}${errLine('conds')}`, '300')}</div>`;
  function builderHtml() {
    const c = MODES[mode];
    return `<div class="pl-stack"><div class="fdt-header"><div class="ex-titlebar ex-titlebar--split"><div class="ex-titlebar__l"><button type="button" class="ex-back" data-act="back" aria-label="Back to Merchandising"><span class="Polaris-Icon">${ICON.back}</span></button><div class="ex-titlebar__text"><h1 class="fdt-header__title" id="mc-title" tabindex="-1">${b.id ? 'Edit rule' : 'Add rule'}</h1><p class="fdt-header__description"><a class="fdt-header__link" href="${GUIDE}" target="_blank" rel="noopener noreferrer">${c.title} guidelines here</a></p></div></div></div></div>
      <div class="pl-cols"><div class="pl-colA">
        ${P.card(P.head('Rule details') + typeChoices()
          + P.field({ id: 'mc-name', label: 'Rule name (required)', control: P.textField({ id: 'mc-name', value: b.name, placeholder: c.ph, attrs: 'maxlength="60"' }), errKey: 'name' })
          + `<div class="pl-two">${P.field({ id: 'mc-start', label: 'Start date', control: P.textField({ id: 'mc-start', type: 'date', value: b.start }) })}${P.field({ id: 'mc-end', label: 'End date', control: P.textField({ id: 'mc-end', type: 'date', value: b.end }), errKey: 'end' })}</div>${P.sub('Leave the dates empty to keep the rule on until you turn it off.')}`
          + P.field({ id: 'mc-market', label: 'Market', control: P.select({ id: 'mc-market', options: MARKETS.map(m => [m, m]), value: b.market }) }))}
        ${P.card(P.head('Where it applies') + `<div id="mc-apply">${vstack(applyHtml(), '300')}</div>`)}
      </div><div class="pl-colB">${P.card(P.head('Products (required)') + productsHtml() + `<div id="mc-summary">${P.banner('')}</div>`)}</div></div></div>`;
  }

  /* ---------- builder: partial paints (keep focus where the merchant is typing) ---------- */
  const setErr = (key, msg) => { const e = $('#err-' + key, root); if (e) { e.hidden = !msg; $('[data-msg]', e).textContent = msg || ''; } };
  const wrapOf = el => el.closest('.Polaris-TextField') || el.closest('.Polaris-Select');
  const markEl = (el, on) => { const w = wrapOf(el); if (w) w.classList.toggle(w.classList.contains('Polaris-Select') ? 'Polaris-Select--error' : 'Polaris-TextField--error', on); on ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid'); };
  const markInput = (sel, on) => { const el = $(sel, root); if (el) markEl(el, on); };
  function paintErrors() {
    const e = b.show ? errors() : {};
    ['name', 'end', 'terms', 'collection', 'products', 'groups', 'conds'].forEach(k => setErr(k, e[k]));
    markInput('#mc-name', !!e.name); markInput('#mc-end', !!e.end); markInput('#mc-term', !!e.terms); markInput('#mc-collection', !!e.collection);
    $$('.mc-group', root).forEach(g => { const gi = b.groups.find(x => x.id == g.dataset.g); const bad = !!(e.groups && gi && (!gi.name.trim() || b.groups.some(o => o.id !== gi.id && o.name.trim().toLowerCase() === gi.name.trim().toLowerCase()))); const el = $('.mc-gname', g); if (el) markEl(el, bad); });
    $$('.mc-cond [data-k=value]', root).forEach(el => markEl(el, !!e.conds && String(el.value ?? '').trim() === ''));
  }
  function paintSummary() {
    let ctx;
    if (mode === 'search') ctx = b.applyMode === 'specific' ? (b.terms.length ? `a search term that ${b.matchMode === 'is' ? 'is exactly' : 'contains'} ${b.terms.map(t => '“' + esc(t) + '”').join(', ')}` : 'the search terms you add') : 'any search term';
    else ctx = b.applyMode === 'specific' ? (b.collection ? esc(b.collection) : 'the collection you choose') : 'all collection pages';
    const prod = b.productMode === 'specific' ? `<strong>${b.sel.size}</strong> selected product${b.sel.size === 1 ? '' : 's'}` : `products that match <strong>${b.groups.length}</strong> condition group${b.groups.length === 1 ? '' : 's'}${b.groups.length > 1 ? ` (${b.rel === 'AND' ? 'all groups' : 'any group'})` : ''}`;
    const verb = b.type === 'boost' ? 'boosted' : b.type === 'demote' ? 'demoted' : 'hidden';
    const el = $('#mc-summary', root); if (!el) return;
    el.innerHTML = P.banner(mode === 'search' ? `When a shopper searches with ${ctx}, ${prod} will be <strong>${verb}</strong>.` : `On <strong>${ctx}</strong>, ${prod} will be <strong>${verb}</strong>.`);
  }
  const prow = (p, on, dis) => `<label class="pl-prow${dis ? ' is-off' : ''}"><span class="Polaris-Choice__Control"><span class="Polaris-Checkbox"><input type="checkbox" class="Polaris-Checkbox__Input" data-pid="${p.id}"${on ? ' checked' : ''}${dis ? ' disabled' : ''}><span class="Polaris-Checkbox__Backdrop"></span><span class="Polaris-Checkbox__Icon Polaris-Checkbox--animated"><span class="Polaris-Icon">${P.tick}</span></span></span></span><span class="pl-thumb" style="background:${p.color}" aria-hidden="true"></span><span class="pl-pname Polaris-Text--root Polaris-Text--bodyMd">${esc(p.name)}</span><span class="pl-pprice Polaris-Text--root Polaris-Text--bodySm">${money(p.price)}</span></label>`;
  function paintProducts() {
    const q = ($('#mc-psearch', root) || { value: '' }).value.trim().toLowerCase(), scoped = scopedProducts(), full = b.sel.size >= MAX_PRODUCTS;
    const list = $('#mc-plist', root); if (!list) return;
    const scope = $('#mc-scope', root);
    if (scope) scope.textContent = b.applyMode === 'specific' ? (b.collection ? `Showing products from “${b.collection}” only.` : 'Select a collection page to choose from its products.') : 'Showing all products in your store.';
    const shown = scoped.filter(p => p.name.toLowerCase().includes(q));
    list.innerHTML = !scoped.length ? '<p class="pl-empty">Select a collection page to see its products.</p>' : !shown.length ? `<p class="pl-empty">No products match “${esc($('#mc-psearch', root).value)}”.</p>` : shown.map(p => prow(p, b.sel.has(p.id), full && !b.sel.has(p.id))).join('');
    $('#mc-count', root).textContent = `${b.sel.size} of ${MAX_PRODUCTS} selected`;
    $('#mc-chips', root).innerHTML = [...b.sel].map(id => { const p = PRODUCTS.find(x => x.id === id); return p ? P.tag(esc(p.name), 'rmprod', `data-pid="${id}"`, 'Remove ' + p.name) : ''; }).join('');
  }
  const opSel = (g, c, cfg) => P.select({ id: `op-${c.id}`, options: cfg.ops.map(o => [o, OPS[o]]), value: c.operator, attrs: `data-g="${g.id}" data-c="${c.id}" data-k="operator"`, label: 'Condition' });
  function valueCtl(g, c, cfg) {
    const at = `data-g="${g.id}" data-c="${c.id}" data-k="value"`, id = 'val-' + c.id;
    if (c.attr === 'Inventory') return c.operator === 'is' ? P.select({ id, options: [['', 'Select value'], ['In stock', 'In stock'], ['Out of stock', 'Out of stock']], value: c.value, attrs: at, label: 'Value' }) : P.textField({ id, type: 'number', value: c.value, placeholder: 'Quantity', attrs: at + ' min="0"', label: 'Value' });
    if (c.attr === 'Price') return P.textField({ id, type: 'number', value: c.value, placeholder: '0.00', attrs: at + ' min="0" step="0.01"', label: 'Value' });
    if (c.attr === 'Date published') return P.textField({ id, type: 'date', value: c.value, attrs: at, label: 'Value' });
    if (cfg.options) return P.select({ id, options: [['', 'Select value']].concat(cfg.options.map(o => [o, o])), value: c.value, attrs: at, label: 'Value' });
    return P.textField({ id, value: c.value, placeholder: 'Enter product title', attrs: at, label: 'Value' });
  }
  function paintGroups() {
    const wrap = $('#mc-groups', root); if (!wrap) return;
    const cfgAll = attrConfig(scopedProducts());
    const rel = b.groups.length > 1 ? `<fieldset class="mc-fieldset">${legend('Match groups using')}${vstack(P.radio({ id: 'mc-rel-and', name: 'mc-rel', value: 'AND', label: 'All groups', checked: b.rel === 'AND' }) + P.radio({ id: 'mc-rel-or', name: 'mc-rel', value: 'OR', label: 'Any group', checked: b.rel === 'OR', help: 'Products that match a higher group come first. Use the arrows to change the order.' }))}</fieldset>` : '';
    const nameField = g => P.textField({ id: 'gn-' + g.id, value: g.name, attrs: `data-g="${g.id}" data-k="gname" maxlength="40"`, label: 'Group name' }).replace('class="Polaris-TextField__Input"', 'class="Polaris-TextField__Input mc-gname"');
    wrap.innerHTML = vstack(rel + b.groups.map((g, i) => `<div class="pl-box mc-group" data-g="${g.id}"><div class="pl-gh"><span class="pl-num" aria-hidden="true">${i + 1}</span>${nameField(g)}${b.groups.length > 1 ? `${P.iconButton('up', 'Move ' + g.name + ' up', 'gup', `data-g="${g.id}"${i === 0 ? ' disabled' : ''}`)}${P.iconButton('down', 'Move ' + g.name + ' down', 'gdown', `data-g="${g.id}"${i === b.groups.length - 1 ? ' disabled' : ''}`)}${P.iconButton('delete', 'Delete ' + g.name, 'gdel', `data-g="${g.id}"`)}` : ''}</div>
      ${g.conditions.map(c => { const cfg = cfgAll[c.attr] || cfgAll['Product title'], multi = cfg.ops.length > 1; return `<div class="pl-cond mc-cond${multi ? '' : ' pl-cond--noop'}">${P.select({ id: 'at-' + c.id, options: Object.keys(cfgAll).map(a => [a, a]), value: c.attr, attrs: `data-g="${g.id}" data-c="${c.id}" data-k="attr"`, label: 'Attribute' })}${multi ? opSel(g, c, cfg) : ''}${valueCtl(g, c, cfg)}${g.conditions.length > 1 ? P.iconButton('delete', 'Remove condition', 'cdel', `data-g="${g.id}" data-c="${c.id}"`) : '<span style="width:36px"></span>'}</div>`; }).join('')}
      ${g.conditions.length < MAX_CONDS ? `<div>${P.button('Add condition', 'cadd', 'Plain', `data-g="${g.id}"`)}</div>` : ''}</div>`).join('') + `<div>${P.button('Add condition group', 'gadd', 'Secondary')}</div>`, '300');
    paintErrors();
  }
  function paintAll() { paintProducts(); paintGroups(); paintSummary(); paintErrors(); }

  /* ---------- render ---------- */
  function render(focus) {
    expireAll(mode);
    root.innerHTML = view === 'builder' ? builderHtml() : listHtml();
    if (view === 'builder') paintAll();
    document.title = (view === 'builder' ? (b.id ? 'Edit rule' : 'Add rule') + ' — ' : '') + 'Merchandising — Findter Filter & Search';
    const f = focus && $(focus, root); if (f) f.focus({ preventScroll: true });
    if (bar) bar.sync();
  }

  /* ---------- builder: open / close / save ---------- */
  function openBuilder(id) {
    const r = id ? rules[mode].find(x => x.id == id) : null;
    b = { id: r ? r.id : null, type: r ? r.type : 'boost', name: r ? r.name : '', start: r ? r.start : '', end: r ? r.end : '', market: r ? r.market : MARKETS[0], applyMode: r ? r.applyMode : 'all',
      matchMode: r ? (r.matchMode || 'contains') : 'contains', terms: r ? [...(r.terms || [])] : [], collection: r ? (r.collection || '') : '', productMode: r ? (r.productMode || 'specific') : 'specific',
      sel: new Set(r && r.productMode !== 'attributes' ? r.productIds : []), groups: r && r.groups && r.groups.length ? JSON.parse(JSON.stringify(r.groups)) : [newGroup()], rel: r ? (r.groupRelation || 'AND') : 'AND', show: false, base: '' };
    b.base = snap(); view = 'builder'; render('#mc-title'); const sc = $('.sh-scroll'); if (sc) sc.scrollTop = 0;
  }
  function closeBuilder() { view = 'list'; b = null; render(); }
  function save() {
    b.show = true;
    const e = errors();
    if (Object.keys(e).length) { paintErrors(); const first = $('[aria-invalid=true]', root) || $('.Polaris-Labelled__Error:not([hidden])', root); if (first) { first.scrollIntoView({ block: 'center' }); if (first.matches('input,select')) first.focus({ preventScroll: true }); } return false; }
    const payload = { type: b.type, name: b.name.trim(), start: b.start, end: b.end, market: b.market, applyMode: b.applyMode, productMode: b.productMode,
      productIds: b.productMode === 'specific' ? [...b.sel] : [], groups: b.productMode === 'attributes' ? JSON.parse(JSON.stringify(b.groups)) : [], groupRelation: b.rel };
    if (mode === 'search') { payload.matchMode = b.matchMode; payload.terms = b.applyMode === 'specific' ? [...b.terms] : []; } else payload.collection = b.applyMode === 'specific' ? b.collection : '';
    const list = rules[mode];
    if (b.id) { const i = list.findIndex(r => r.id == b.id); list[i] = { ...list[i], ...payload, enabled: isExpired(payload) ? false : list[i].enabled }; }
    else list.push({ id: Math.max(0, ...list.map(r => r.id)) + 1, enabled: !isExpired(payload), ...payload });
    persist(mode); toast('Rule saved'); closeBuilder(); return true;
  }
  const bar = saveBar({ isEdited, onSave: save, onDiscard: closeBuilder });

  /* ---------- events ---------- */
  function move(id, delta) {
    const list = rules[mode], i = list.findIndex(r => r.id == id), j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]]; persist(mode); render(`.pl-row[data-id="${id}"] .pl-handle`);
  }
  function askDelete(id) {
    const r = rules[mode].find(x => x.id == id); if (!r) return;
    openModal({ title: 'Delete this rule?', content: `<p class="mf-modal__text">“${esc(r.name)}” will be removed and stop changing how products show on the ${mode === 'search' ? 'search result page' : 'collection page'}.</p>`, ok: 'Delete', okClass: 'mf-btn--critical', onOk: () => { rules[mode] = rules[mode].filter(x => x.id != id); persist(mode); render(); toast('Rule deleted'); } });
  }
  const groupBy = id => b.groups.find(g => g.id == id);
  function addTerm() {
    const inp = $('#mc-term', root), raw = inp.value; if (!raw.trim()) return;
    let skipped = false; raw.split(',').map(s => s.trim()).filter(Boolean).forEach(t => { if (b.terms.some(x => x.toLowerCase() === t.toLowerCase())) skipped = true; else b.terms.push(t); });
    inp.value = ''; $('#mc-terms', root).innerHTML = termTags(); $('#mc-dup', root).hidden = !skipped; paintSummary(); paintErrors(); bar.sync(); inp.focus();
  }
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-tab],[data-act],[data-pmode]'); if (!t) return;
    if (t.dataset.tab) { if (t.dataset.tab !== mode) { mode = t.dataset.tab; history.replaceState(null, '', mode === 'search' ? '#search' : location.pathname + location.search); render('#mc-tab-' + mode); } return; }
    if (t.dataset.pmode) { b.productMode = t.dataset.pmode; render(`[data-pmode="${b.productMode}"]`); return; }
    const a = t.dataset.act, row = t.closest('.pl-row'), id = row && row.dataset.id;
    if (a === 'add') openBuilder(null);
    else if (a === 'edit') openBuilder(id);
    else if (a === 'delete') askDelete(id);
    else if (a === 'toggle') { const r = rules[mode].find(x => x.id == id); if (!r || t.disabled) return; r.enabled = !r.enabled; persist(mode); render(`.pl-row[data-id="${id}"] .ft-switch-btn`); toast('Saved'); }
    else if (a === 'back') { if (isEdited()) window.FindterUI.confirmDiscard(closeBuilder); else closeBuilder(); }
    else if (a === 'addterm') addTerm();
    else if (a === 'rmterm') { b.terms = b.terms.filter(x => x !== t.dataset.term); $('#mc-terms', root).innerHTML = termTags(); paintSummary(); paintErrors(); bar.sync(); }
    else if (a === 'rmprod') { b.sel.delete(Number(t.dataset.pid)); paintProducts(); paintSummary(); paintErrors(); bar.sync(); }
    else if (a === 'gadd') { b.groups.push(newGroup(b.groups)); paintGroups(); paintSummary(); bar.sync(); }
    else if (a === 'gdel') { b.groups = b.groups.filter(g => g.id != t.dataset.g); paintGroups(); paintSummary(); bar.sync(); }
    else if (a === 'gup' || a === 'gdown') { const i = b.groups.findIndex(g => g.id == t.dataset.g), j = i + (a === 'gup' ? -1 : 1); if (j >= 0 && j < b.groups.length) { [b.groups[i], b.groups[j]] = [b.groups[j], b.groups[i]]; paintGroups(); bar.sync(); const nb = $(`[data-act="${a}"][data-g="${t.dataset.g}"]`, root); if (nb && !nb.disabled) nb.focus(); } }
    else if (a === 'cadd') { groupBy(t.dataset.g).conditions.push(newCond()); paintGroups(); bar.sync(); }
    else if (a === 'cdel') { const g = groupBy(t.dataset.g); g.conditions = g.conditions.filter(c => c.id != t.dataset.c); paintGroups(); paintSummary(); bar.sync(); }
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (!b) return;
    if (t.name === 'mc-type') { b.type = t.value; paintSummary(); }
    else if (t.name === 'mc-apply') { b.applyMode = t.value; $('#mc-apply', root).innerHTML = vstack(applyHtml(), '300'); paintProducts(); paintGroups(); paintSummary(); const r = $(`input[name=mc-apply][value=${t.value}]`, root); if (r) r.focus(); }
    else if (t.id === 'mc-collection') {
      b.collection = t.value; const ids = new Set(scopedProducts().map(p => p.id)); [...b.sel].forEach(id => { if (!ids.has(id)) b.sel.delete(id); });
      const cfg = attrConfig(scopedProducts()); b.groups.forEach(g => g.conditions.forEach(c => { const o = cfg[c.attr] && cfg[c.attr].options; if (o && c.value && !o.includes(c.value)) c.value = ''; })); paintAll();
    }
    else if (t.id === 'mc-match') { b.matchMode = t.value; paintSummary(); }
    else if (t.id === 'mc-market') b.market = t.value;
    else if (t.id === 'mc-start') { b.start = t.value; paintErrors(); }
    else if (t.id === 'mc-end') { b.end = t.value; paintErrors(); }
    else if (t.dataset.pid) { const id = Number(t.dataset.pid); if (t.checked) { if (b.sel.size >= MAX_PRODUCTS) { t.checked = false; return; } b.sel.add(id); } else b.sel.delete(id); paintProducts(); paintSummary(); paintErrors(); const again = $(`input[data-pid="${id}"]`, $('#mc-plist', root)); if (again) again.focus(); }
    else if (t.name === 'mc-rel') { b.rel = t.value; paintSummary(); }
    else if (t.dataset.k) {
      const g = groupBy(t.dataset.g), c = g && g.conditions.find(x => x.id == t.dataset.c);
      if (t.dataset.k === 'attr') { c.attr = t.value; c.operator = attrConfig(scopedProducts())[c.attr].ops[0]; c.value = ''; paintGroups(); const f = $(`[data-c="${c.id}"][data-k=attr]`, root); if (f) f.focus(); }
      else if (t.dataset.k === 'operator') { c.operator = t.value; c.value = ''; paintGroups(); const f = $(`[data-c="${c.id}"][data-k=operator]`, root); if (f) f.focus(); }
      else if (t.dataset.k === 'value') { c.value = t.value; paintErrors(); }
    }
    bar.sync();
  });
  root.addEventListener('input', e => {
    const t = e.target; if (!b) return;
    if (t.id === 'mc-name') { b.name = t.value; paintErrors(); }
    else if (t.id === 'mc-psearch') paintProducts();
    else if (t.dataset.k === 'gname') { groupBy(t.dataset.g).name = t.value; paintErrors(); paintSummary(); }
    else if (t.dataset.k === 'value') { const g = groupBy(t.dataset.g), c = g.conditions.find(x => x.id == t.dataset.c); c.value = t.value; paintErrors(); }
    bar.sync();
  });
  root.addEventListener('keydown', e => {
    const t = e.target;
    if (t.id === 'mc-term' && e.key === 'Enter') { e.preventDefault(); addTerm(); return; }
    if (t.matches && t.matches('.pl-handle') && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); move(t.closest('.pl-row').dataset.id, e.key === 'ArrowUp' ? -1 : 1); return; }
    const tab = t.closest && t.closest('[role=tab]');
    if (tab && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); mode = mode === 'collection' ? 'search' : 'collection'; history.replaceState(null, '', mode === 'search' ? '#search' : location.pathname + location.search); render('#mc-tab-' + mode); }
  });
  /* drag a row with the mouse (the handle also works with the arrow keys) */
  let dragEl = null;
  root.addEventListener('dragstart', e => { const row = e.target.closest && e.target.closest('.pl-row'); if (!row) return; dragEl = row; row.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', row.dataset.id); } catch (err) { /* ignore */ } });
  root.addEventListener('dragover', e => { const row = e.target.closest && e.target.closest('.pl-row'); if (!dragEl || !row || row === dragEl) return; e.preventDefault(); const r = row.getBoundingClientRect(); row.parentNode.insertBefore(dragEl, e.clientY - r.top > r.height / 2 ? row.nextSibling : row); });
  root.addEventListener('dragend', () => {
    if (!dragEl) return; dragEl.classList.remove('is-drag'); dragEl = null;
    const order = $$('.pl-row', root).map(r => r.dataset.id); rules[mode].sort((x, y) => order.indexOf(String(x.id)) - order.indexOf(String(y.id))); persist(mode); toast('Saved');
  });
  window.addEventListener('hashchange', () => { if (view === 'list') { mode = location.hash === '#search' ? 'search' : 'collection'; render(); } });

  render();
})();
