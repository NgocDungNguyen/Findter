/* Merchandising page (merchandising.html): projects that boost, demote or hide products on collection pages and on search results.
   One project = one schedule + one "where it applies" shared by up to three rules (Boost, Demote, Hide). Follows the real app's build (branch rds_shopify-707): list in a
   "Manage projects" card, the builder is a normal page (back arrow, single column) with the contextual save bar, rule tabs ordered by priority (default Hide > Demote > Boost,
   the leftmost wins a conflict), a warning when one product is picked in two rules.
   Built for Shopify: sentence case, inline errors, red only for errors and Delete, "Unsaved changes" dialog (Cancel / Leave page), one banner at a time, Save stays on the page.
   Projects live in localStorage (findter.merch.collection.v3 / findter.merch.search.v3); the real app would store them per shop. */
(() => {
  'use strict';
  const root = document.getElementById('mc-root');
  if (!root || !window.FindterUI || !window.FindterCatalog || !window.FindterPL) return;
  const { $, $$, store, ICON, toast, openModal, saveBar } = window.FindterUI;
  const P = window.FindterPL, esc = P.esc;
  const { PRODUCTS, COLLECTIONS, METAFIELDS, money, MERCH_SEEDS } = window.FindterCatalog;
  const MAX_PRODUCTS = 6, MAX_CONDS = 3;
  const TYPES = ['boost', 'demote', 'hide'];
  const LABEL = { boost: 'Boost', demote: 'Demote', hide: 'Hide' };
  const VERB = { boost: 'boosted', demote: 'demoted', hide: 'hidden' };
  const TONE = { boost: 'Info', demote: 'Attention', hide: 'Warning' };   // blue / yellow / orange Polaris badge tones; red stays for errors and Delete
  const DEFAULT_ORDER = ['hide', 'demote', 'boost'];      // same default as the real app: the leftmost rule wins when a product is in more than one
  const MARKETS = ['Store default', 'United States', 'European Union', 'Asia Pacific'];
  const GUIDE = 'https://flintverse.gitbook.io/docs/findter-custom-filter-search/user-guide/';

  const MODES = {
    collection: {
      key: 'findter.merch.collection.v3', label: 'Collection page', sub: 'Projects apply on the collection pages you choose.', page: 'collection page',
      emptyP: 'A project groups your collection merchandising under one schedule. Inside it you can boost best sellers, demote slow movers, and hide what shouldn’t appear — all at once.',
      ph: 'e.g. Holiday jewelry push',
      desc: { boost: 'Selected products are pinned higher on the collection page.', demote: 'Selected products rank lower on the collection page.', hide: 'Selected products are hidden from the collection page.' },
      seed: MERCH_SEEDS.collection,
    },
    search: {
      key: 'findter.merch.search.v3', label: 'Search result page', sub: 'Projects apply when shoppers search your store.', page: 'search result page',
      emptyP: 'A project groups your search merchandising under one schedule. Inside it you can boost best sellers, demote slow movers, and hide what shouldn’t appear — all at once.',
      ph: 'e.g. Summer sale campaign',
      desc: { boost: 'Selected products rank higher when shoppers search these terms.', demote: 'Selected products rank lower when shoppers search these terms.', hide: 'Selected products are hidden from search results for these terms.' },
      seed: MERCH_SEEDS.search,
    },
  };

  /* ---------- data ---------- */
  const blankRule = () => ({ enabled: false, productMode: 'specific', productIds: [], groups: [], groupRelation: 'AND' });
  const normOrder = a => { const base = Array.isArray(a) ? a.filter(t => TYPES.includes(t)) : []; DEFAULT_ORDER.forEach(t => { if (!base.includes(t)) base.push(t); }); return base; };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const isExpiredDate = end => !!end && new Date(end + 'T00:00:00') < today();
  const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const projects = {};
  const normalize = list => { list.forEach(p => { if (isExpiredDate(p.end)) p.enabled = false; TYPES.forEach(t => { p.rules[t] = Object.assign(blankRule(), p.rules[t] || {}); }); p.ruleOrder = normOrder(p.ruleOrder); }); return list; };
  Object.keys(MODES).forEach(m => { const saved = store.json(MODES[m].key, null); projects[m] = normalize(Array.isArray(saved) ? saved : JSON.parse(JSON.stringify(MODES[m].seed))); });
  const persist = m => store.set(MODES[m].key, JSON.stringify(projects[m]));
  let seq = 1;
  const uid = () => 'g' + Date.now().toString(36) + (seq++);

  /* ---------- routing: #collection, #search, #collection/new, #collection/edit/ID ---------- */
  const parse = h => { const m = /^#(collection|search)(?:\/(new)|\/edit\/(\d+))?$/.exec(h || ''); return m ? { mode: m[1], view: m[2] ? 'new' : m[3] ? 'edit' : 'list', id: m[3] ? Number(m[3]) : null } : { mode: 'collection', view: 'list', id: null }; };
  const hashOf = r => '#' + r.mode + (r.view === 'new' ? '/new' : r.view === 'edit' ? '/edit/' + r.id : '');
  let route = parse(location.hash), b = null, suppress = false;
  const mode = () => route.mode;

  /* ---------- attribute conditions ---------- */
  const uniq = (list, f) => [...new Set(list.flatMap(p => [].concat(p[f])))].sort();
  const OPS = { is: 'is', lte: 'at most', eq: 'exactly', gte: 'at least', before: 'before', after: 'after' };
  const attrConfig = scoped => {
    const cfg = {
      'Product title': { ops: ['is'] }, 'Product type': { ops: ['is'], options: uniq(scoped, 'type') }, 'Product category': { ops: ['is'], options: uniq(scoped, 'category') },
      'Vendor': { ops: ['is'] , options: uniq(scoped, 'vendor') }, 'Product tag': { ops: ['is'], options: uniq(scoped, 'tags') }, 'Metafield': { ops: ['is'], options: METAFIELDS },
      'Inventory': { ops: ['is', 'lte', 'eq', 'gte'] }, 'Price': { ops: ['eq', 'lte', 'gte'] }, 'Date published': { ops: ['before', 'after'] },
    };
    if (b.mode === 'search') cfg.Collection = { ops: ['is'], options: COLLECTIONS };
    return cfg;
  };
  const newCond = () => ({ id: uid(), attr: 'Product title', operator: 'is', value: '' });
  const newGroup = list => { const names = new Set((list || []).map(g => g.name.trim().toLowerCase())); let n = (list || []).length + 1; while (names.has('condition group ' + n)) n++; return { id: uid(), name: 'Condition group ' + n, conditions: [newCond()] }; };

  /* ---------- builder state ---------- */
  const rule = () => b.rules[b.active];
  const scopedProducts = () => b.mode === 'collection' && b.applyMode === 'specific' ? (b.collection ? PRODUCTS.filter(p => p.collections.includes(b.collection)) : []) : PRODUCTS;
  const snap = () => JSON.stringify({ n: b.name, s: b.start, e: b.end, m: b.market, en: b.enabled, a: b.applyMode, mm: b.matchMode, t: b.terms, c: b.collection, o: b.order, r: b.rules });
  const isEdited = () => route.view !== 'list' && !!b && snap() !== b.base;
  function conflicts() {
    const picked = {}; b.order.forEach(t => { const r = b.rules[t]; if (r.enabled && r.productMode === 'specific') picked[t] = new Set(r.productIds); });
    const types = Object.keys(picked), out = {};
    types.forEach(t => picked[t].forEach(id => { if (out[id]) return; const m = types.filter(x => picked[x].has(id)); if (m.length > 1) out[id] = { types: m, winner: b.order.find(x => m.includes(x)) }; }));
    return out;
  }
  const errors = () => {
    const e = { rules: {} };
    if (!b.name.trim()) e.name = 'Give this project a name.';
    if (b.start && b.end && b.end < b.start) e.end = 'Choose an end date on or after the start date.';
    if (b.mode === 'search' && b.applyMode === 'specific' && !b.terms.length) e.terms = 'Add at least one search term.';
    if (b.mode === 'collection' && b.applyMode === 'specific' && !b.collection) e.collection = 'Select a collection page.';
    if (!TYPES.some(t => b.rules[t].enabled)) e.norule = 'Turn on at least one of Boost, Demote, or Hide.';
    TYPES.forEach(t => {
      const r = b.rules[t]; if (!r.enabled) return; const re = {};
      if (r.productMode === 'specific') { if (!r.productIds.length) re.products = 'Select at least one product.'; }
      else {
        const names = r.groups.map(g => g.name.trim().toLowerCase());
        if (names.some(n => !n) || new Set(names).size !== names.length) re.groups = 'Give every condition group a unique name.';
        if (r.groups.some(g => g.conditions.some(c => String(c.value ?? '').trim() === ''))) re.conds = 'Complete every condition, or remove the ones you do not need.';
      }
      if (Object.keys(re).length) e.rules[t] = re;
    });
    return e;
  };

  /* ---------- markup: list ---------- */
  const tabHtml = (id, label) => `<li class="Polaris-Tabs__TabContainer" role="presentation"><button id="mc-tab-${id}" class="Polaris-Tabs__Tab${mode() === id ? ' Polaris-Tabs__Tab--active' : ''}" data-mfp role="tab" type="button" aria-selected="${mode() === id}" aria-controls="mc-panel" tabindex="${mode() === id ? 0 : -1}" data-tab="${id}"><div class="Polaris-InlineStack" style="--pc-inline-stack-align:center;--pc-inline-stack-block-align:center;--pc-inline-stack-wrap:nowrap;--pc-inline-stack-gap-xs:var(--p-space-200);--pc-inline-stack-flex-direction-xs:row"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">${label}</span></div></button></li>`;
  const headerHtml = () => `<div class="fdt-header"><h1 class="fdt-header__title" id="mc-title" tabindex="-1">Merchandising</h1><p class="fdt-header__description"><a class="fdt-header__link" href="${GUIDE}" target="_blank" rel="noopener noreferrer">Merchandising guidelines</a></p></div>`;
  const tabsHtml = () => `<div class="fdt-menu-tabs"><div class="Polaris-Tabs__Outer"><div class="Polaris-Box" style="--pc-box-padding-block-start-md:var(--p-space-200);--pc-box-padding-block-end-md:var(--p-space-200);--pc-box-padding-inline-start-md:var(--p-space-200);--pc-box-padding-inline-end-md:var(--p-space-200)"><div class="Polaris-Tabs__Wrapper"><div class="Polaris-Tabs__ButtonWrapper"><ul class="Polaris-Tabs" role="tablist" aria-label="Merchandising pages">${tabHtml('collection', MODES.collection.label)}${tabHtml('search', MODES.search.label)}</ul></div></div></div></div></div>`;
  function rowOf(p) {
    const exp = isExpiredDate(p.end), on = normOrder(p.ruleOrder).filter(t => p.rules[t] && p.rules[t].enabled);
    const cells = [
      `<button type="button" class="pl-handle" data-handle="rows" data-id="${p.id}" aria-label="Reorder ${esc(p.name)}. Use the up and down arrow keys.">${P.svg('drag')}</button>`,
      P.toggle({ on: p.enabled, label: 'Status of ' + p.name, disabled: exp }),
      `<div class="pl-name">${P.link(esc(p.name), 'edit')}</div>`,
      `<div class="pl-tagcell">${on.length ? on.map(t => P.badge(TONE[t], LABEL[t])).join('') : P.text('No rules set', 'bodyMd', 'Polaris-Text--subdued')}</div>`,
      P.text(fmtDate(p.start)),
      `<div class="pl-tagcell">${P.text(fmtDate(p.end))}${exp ? P.text('(Expired)', 'bodyMd', 'Polaris-Text--subdued') : ''}</div>`,
      `<div class="pl-actions">${P.iconButton('edit', 'Edit ' + p.name, 'edit')}${P.iconButton('delete', 'Delete ' + p.name, 'delete')}</div>`,
    ];
    return { cells, cls: 'pl-row', attrs: `data-dnd="rows" data-id="${p.id}"`, noHeaderCell: true };
  }
  function listHtml() {
    const c = MODES[mode()], list = projects[mode()];
    const heads = ['<span class="pl-sr">Reorder</span>', 'Status', 'Project name', 'Rules', 'Start date', 'End date', 'Action'];
    const body = list.length
      ? P.card(P.head('Manage projects', P.button('Add project', 'add'), c.sub) + `<div id="mc-rows">${P.table({ heads, rows: list.map(rowOf), label: 'Projects', min: 760 })}</div>`)
      : P.empty({ title: 'No projects yet', body: c.emptyP, actions: P.button('Create your first project', 'add') });
    return `<div class="pl-stack">${headerHtml()}${tabsHtml()}<div id="mc-panel" role="tabpanel" aria-labelledby="mc-tab-${mode()}">${body}</div></div>`;
  }

  /* ---------- markup: builder ---------- */
  const errLine = key => P.errorLine(key, '', true);
  const vstack = (inner, gap = '100') => `<div class="Polaris-BlockStack" style="--pc-block-stack-order:column;--pc-block-stack-gap-xs:var(--p-space-${gap})">${inner}</div>`;
  const label = t => `<span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--medium pl-legend">${t}</span>`;
  const seg = (name, opts, value, act) => `<div class="Polaris-ButtonGroup Polaris-ButtonGroup--segmented" role="group" aria-label="${esc(name)}">${opts.map(([v, l]) => `<div class="Polaris-ButtonGroup__Item">${P.button(l, act, 'Secondary', `data-v="${v}" aria-pressed="${v === value}"`)}</div>`).join('')}</div>`;
  const termTags = () => b.terms.map(t => P.tag(esc(t), 'rmterm', `data-term="${esc(t)}"`, 'Remove term ' + t)).join('');
  function applyHtml() {
    const search = b.mode === 'search';
    const head = seg('Where it applies', search ? [['all', 'All search terms'], ['specific', 'Specific terms']] : [['all', 'All collections'], ['specific', 'One collection']], b.applyMode, 'apply');
    if (b.applyMode === 'all') return head + (search ? `<div class="pl-note">${P.icon('bar')}<p>This applies to every search — any matching product is affected wherever it appears in results.</p></div>` : '');
    if (!search) return head + P.field({ id: 'mc-collection', label: 'Collection page', control: P.select({ id: 'mc-collection', options: [['', 'Select collection page']].concat(COLLECTIONS.map(c => [c, c])), value: b.collection }), errKey: 'collection' });
    return head + `${P.field({ id: 'mc-match', label: 'Match', control: P.select({ id: 'mc-match', options: [['contains', 'Contains'], ['is', 'Is exactly']], value: b.matchMode }) })}
      ${P.field({ id: 'mc-term', label: 'Search terms', control: `<div class="pl-actions"><div style="flex:1;min-width:0">${P.textField({ id: 'mc-term', placeholder: 'Type terms, comma-separated, then Enter' })}</div>${P.button('Add', 'addterm', 'Secondary')}</div>`, errKey: 'terms' })}
      <div class="pl-tags" id="mc-terms">${termTags()}</div><p class="Polaris-Text--root Polaris-Text--bodyMd pl-warntext" id="mc-dup"${b.dup ? '' : ' hidden'}>Some terms already existed and were skipped.</p>`;
  }
  const statusHtml = () => {
    const exp = isExpiredDate(b.end), on = b.enabled && !exp;
    return P.card(`<div class="pl-switchrow"><div class="pl-actions">${P.text('Status', 'bodyMd', 'Polaris-Text--medium')}${P.badge(on ? 'Success' : 'Neutral', on ? 'Published' : 'Draft')}${exp ? P.text('This project has ended. Change the end date to turn it on again.', 'bodySm', 'Polaris-Text--subdued') : ''}</div>${P.toggle({ on, label: 'Project status', attrs: 'data-sw="status"', disabled: exp })}</div>`);
  };
  const detailsHtml = () => P.card(vstack(P.head('Project details')
    + P.field({ id: 'mc-name', label: 'Project name (required)', control: P.textField({ id: 'mc-name', value: b.name, placeholder: MODES[b.mode].ph, attrs: 'maxlength="60"' }), errKey: 'name' })
    + `<div>${label('Schedule')}<div class="pl-two">${P.field({ id: 'mc-start', label: 'Start date', control: P.textField({ id: 'mc-start', type: 'date', value: b.start }) })}${P.field({ id: 'mc-end', label: 'End date', control: P.textField({ id: 'mc-end', type: 'date', value: b.end }), errKey: 'end' })}</div>${P.sub('Applies to every rule in this project. Leave blank to run forever.')}</div>`
    + P.field({ id: 'mc-market', label: 'Market', control: P.select({ id: 'mc-market', options: MARKETS.map(m => [m, m]), value: b.market }) })
    + P.divider() + `<div>${label('Where it applies (required)')}</div><div id="mc-apply">${vstack(applyHtml(), '300')}</div>`, '400'));
  function conflictHtml() {
    const cf = conflicts(), ids = Object.keys(cf); if (!ids.length) return '';
    return `<div class="pl-warnbanner" role="status">${P.icon('bar')}<div><p class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--semibold">${ids.length} product ${ids.length === 1 ? 'conflict' : 'conflicts'} in this project</p><ul>${ids.map(id => { const x = cf[id], p = PRODUCTS.find(q => q.id === Number(id)); return `<li>${esc(p.name)} is targeted by ${x.types.map(t => LABEL[t]).join(', ')} — ${LABEL[x.winner]} applies. <button type="button" class="Polaris-Link Polaris-Link--removeUnderline" data-act="goto" data-type="${x.winner}">View</button></li>`; }).join('')}</ul></div></div>`;
  }
  function rtabsHtml() {
    const cf = conflicts();
    return `<div class="mc-rtabs" role="tablist" aria-label="Rule types">${b.order.map(t => {
      const on = b.rules[t].enabled, n = Object.values(cf).filter(x => x.types.includes(t) && x.winner !== t).length;
      return `<div class="mc-rtab${t === b.active ? ' is-active' : ''}" role="presentation" data-dnd="tabs" data-id="${t}"><button type="button" class="pl-handle" data-handle="tabs" data-id="${t}" aria-label="Reorder ${LABEL[t]}. Use the left and right arrow keys.">${P.svg('drag')}</button><button type="button" class="mc-rtab__b" role="tab" id="mc-rt-${t}" aria-selected="${t === b.active}" aria-controls="mc-rpanel" data-act="tab" data-type="${t}"><span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--medium">${LABEL[t]}</span>${P.badge(on ? TONE[t] : 'Neutral', on ? 'On' : 'Off')}${n ? `<span class="mc-warnic" title="${n} ${n === 1 ? 'product here is' : 'products here are'} overridden by a higher-priority rule" role="img" aria-label="${n} overridden by a higher-priority rule">${P.icon('bar')}</span>` : ''}</button></div>`;
    }).join('')}</div>`;
  }
  const prow = (p, on, dis) => `<label class="pl-prow${dis ? ' is-off' : ''}"><span class="Polaris-Choice__Control"><span class="Polaris-Checkbox"><input type="checkbox" class="Polaris-Checkbox__Input" data-pid="${p.id}"${on ? ' checked' : ''}${dis ? ' disabled' : ''}><span class="Polaris-Checkbox__Backdrop"></span><span class="Polaris-Checkbox__Icon Polaris-Checkbox--animated"><span class="Polaris-Icon">${P.tick}</span></span></span></span><span class="pl-thumb" style="background:${p.color}" aria-hidden="true"></span><span class="pl-pname Polaris-Text--root Polaris-Text--bodyMd">${esc(p.name)}</span><span class="pl-pprice Polaris-Text--root Polaris-Text--bodySm">${money(p.price)}</span></label>`;
  const pickHtml = () => `${b.mode === 'collection' ? `<p class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued" id="mc-scope"></p>` : ''}${vstack(`<div class="pl-actions" style="justify-content:space-between">${P.text('Up to ' + MAX_PRODUCTS + ' products', 'bodyMd', 'Polaris-Text--subdued')}<span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued" id="mc-count" aria-live="polite"></span></div><div class="pl-tags" id="mc-chips"></div>${P.textField({ id: 'mc-psearch', prefix: P.icon('search'), placeholder: 'Search products by name', label: 'Search products by name', value: b.q })}<div class="pl-plist" id="mc-plist"></div>${errLine('products')}`, '300')}`;
  const opSel = (g, c, cfg) => P.select({ id: `op-${c.id}`, options: cfg.ops.map(o => [o, OPS[o]]), value: c.operator, attrs: `data-g="${g.id}" data-c="${c.id}" data-k="operator"`, label: 'Condition' });
  function valueCtl(g, c, cfg) {
    const at = `data-g="${g.id}" data-c="${c.id}" data-k="value"`, id = 'val-' + c.id;
    if (c.attr === 'Inventory') return c.operator === 'is' ? P.select({ id, options: [['', 'Select value'], ['In stock', 'In stock'], ['Out of stock', 'Out of stock']], value: c.value, attrs: at, label: 'Value' }) : P.textField({ id, type: 'number', value: c.value, placeholder: 'Quantity', attrs: at + ' min="0"', label: 'Value' });
    if (c.attr === 'Price') return P.textField({ id, type: 'number', value: c.value, placeholder: '0.00', attrs: at + ' min="0" step="0.01"', label: 'Value' });
    if (c.attr === 'Date published') return P.textField({ id, type: 'date', value: c.value, attrs: at, label: 'Value' });
    if (cfg.options) return P.select({ id, options: [['', 'Select value']].concat(cfg.options.map(o => [o, o])), value: c.value, attrs: at, label: 'Value' });
    return P.textField({ id, value: c.value, placeholder: 'Enter product title', attrs: at, label: 'Value' });
  }
  function groupsHtml() {
    const r = rule(), cfgAll = attrConfig(scopedProducts());
    const rel = r.groups.length > 1 ? `<div class="pl-actions"><span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued">Match groups using</span>${seg('Match groups using', [['AND', 'All groups'], ['OR', 'Any group']], r.groupRelation, 'rel')}</div>${P.sub('Products that match a higher group come first. Drag a group to change the order.')}` : '';
    const nameField = g => P.textField({ id: 'gn-' + g.id, value: g.name, attrs: `data-g="${g.id}" data-k="gname" maxlength="40"`, label: 'Group name' }).replace('class="Polaris-TextField__Input"', 'class="Polaris-TextField__Input mc-gname"');
    return vstack(rel + r.groups.map((g, i) => `<div class="pl-box pl-box--tint mc-group" data-dnd="groups" data-id="${g.id}" data-g="${g.id}"><div class="pl-gh"><button type="button" class="pl-handle" data-handle="groups" data-id="${g.id}" aria-label="Reorder ${esc(g.name)}. Use the up and down arrow keys.">${P.svg('drag')}</button><span class="pl-num" aria-hidden="true">${i + 1}</span>${nameField(g)}${r.groups.length > 1 ? P.iconButton('delete', 'Delete ' + g.name, 'gdel', `data-g="${g.id}"`) : ''}</div>
      ${g.conditions.map(c => { const cfg = cfgAll[c.attr] || cfgAll['Product title'], multi = cfg.ops.length > 1; return `<div class="pl-cond mc-cond${multi ? '' : ' pl-cond--noop'}">${P.select({ id: 'at-' + c.id, options: Object.keys(cfgAll).map(a => [a, a]), value: c.attr, attrs: `data-g="${g.id}" data-c="${c.id}" data-k="attr"`, label: 'Attribute' })}${multi ? opSel(g, c, cfg) : ''}${valueCtl(g, c, cfg)}${g.conditions.length > 1 ? P.iconButton('delete', 'Remove condition', 'cdel', `data-g="${g.id}" data-c="${c.id}"`) : '<span style="width:36px"></span>'}</div>`; }).join('')}
      ${g.conditions.length < MAX_CONDS ? `<div>${P.button('Add condition', 'cadd', 'Plain', `data-g="${g.id}"`)}</div>` : ''}</div>`).join('') + `<div>${P.button('Add condition group', 'gadd', 'Secondary')}</div>${errLine('groups')}${errLine('conds')}`, '300');
  }
  function panelHtml() {
    const r = rule(), t = b.active, c = MODES[b.mode];
    const head = `<div class="pl-box pl-box--tint"><div class="pl-switchrow"><div>${P.text('Use ' + LABEL[t] + ' in this project', 'bodyMd', 'Polaris-Text--semibold')}${P.sub(c.desc[t])}</div>${P.toggle({ on: r.enabled, label: 'Use ' + LABEL[t] + ' in this project', attrs: 'data-sw="rule"' })}</div></div>`;
    if (!r.enabled) return vstack(head + `<div class="mc-dash"><p class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--medium">${LABEL[t]} is off for this project.</p>${P.sub('Turn it on above to set it up. Leaving it off means this project won’t ' + LABEL[t].toLowerCase() + ' anything.')}</div>`, '400');
    return vstack(head + `<div>${label('Which products (required)')}</div>${seg('Which products', [['specific', 'Pick products'], ['attributes', 'By attributes']], r.productMode, 'pmode')}${r.productMode === 'specific' ? pickHtml() : groupsHtml()}<div class="pl-note" id="mc-summary" aria-live="polite"></div>`, '400');
  }
  const rulesHtml = () => P.card(vstack(P.head('Rules', '', 'Set up any combination. Only the ones you turn on will apply.') + P.sub('Drag a tab to change which rule wins when a product is targeted by more than one in this project. The leftmost tab has the highest priority.')
    + `<div id="mc-rtabs">${rtabsHtml()}</div><div role="tabpanel" id="mc-rpanel" aria-labelledby="mc-rt-${b.active}">${panelHtml()}</div>${errLine('norule')}`, '300'));
  function builderHtml() {
    return `<div class="pl-stack"><div class="fdt-header"><div class="ex-titlebar ex-titlebar--split"><div class="ex-titlebar__l"><button type="button" class="ex-back" data-act="back" aria-label="Back to Merchandising"><span class="Polaris-Icon">${ICON.back}</span></button><div class="ex-titlebar__text"><h1 class="fdt-header__title" id="mc-title" tabindex="-1">${b.id ? 'Edit project' : 'Add a new project'}</h1><p class="fdt-header__description"><a class="fdt-header__link" href="${GUIDE}" target="_blank" rel="noopener noreferrer">Merchandising guidelines</a></p></div></div></div></div>
      <div id="mc-status">${statusHtml()}</div>${detailsHtml()}<div id="mc-conflicts">${conflictHtml()}</div>${rulesHtml()}</div>`;
  }

  /* ---------- builder: partial paints (keep focus where the merchant is typing) ---------- */
  const setErr = (key, msg) => { const e = $('#err-' + key, root); if (e) { e.hidden = !msg; $('[data-msg]', e).textContent = msg || ''; } };
  const wrapOf = el => el.closest('.Polaris-TextField') || el.closest('.Polaris-Select');
  const markEl = (el, on) => { const w = wrapOf(el); if (w) w.classList.toggle(w.classList.contains('Polaris-Select') ? 'Polaris-Select--error' : 'Polaris-TextField--error', on); on ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid'); };
  const markInput = (sel, on) => { const el = $(sel, root); if (el) markEl(el, on); };
  function paintErrors() {
    const e = b.show ? errors() : { rules: {} }, re = e.rules[b.active] || {};
    setErr('name', e.name); setErr('end', e.end); setErr('terms', e.terms); setErr('collection', e.collection); setErr('norule', e.norule);
    setErr('products', re.products); setErr('groups', re.groups); setErr('conds', re.conds);
    markInput('#mc-name', !!e.name); markInput('#mc-end', !!e.end); markInput('#mc-term', !!e.terms); markInput('#mc-collection', !!e.collection);
    const r = rule();
    $$('.mc-group', root).forEach(g => {
      const gi = r.groups.find(x => x.id === g.dataset.g), el = $('.mc-gname', g); if (!el || !gi) return;
      const n = gi.name.trim().toLowerCase(), bad = !n || r.groups.some(o => o.id !== gi.id && o.name.trim().toLowerCase() === n);
      markEl(el, bad && (b.show || n !== ''));
    });
    $$('.mc-cond [data-k=value]', root).forEach(el => markEl(el, !!re.conds && String(el.value ?? '').trim() === ''));
  }
  function paintSummary() {
    const el = $('#mc-summary', root); if (!el) return;
    const t = b.active, r = rule();
    let ctx;
    if (b.mode === 'search') ctx = b.applyMode === 'specific' ? (b.terms.length ? `a search term that ${b.matchMode === 'is' ? 'is exactly' : 'contains'} ${b.terms.map(x => '“' + esc(x) + '”').join(', ')}` : 'the search terms you add') : 'any search term';
    else ctx = b.applyMode === 'specific' ? (b.collection ? esc(b.collection) : 'the collection you choose') : 'all collection pages';
    const n = r.groups.length, k = r.productIds.length;
    const prod = r.productMode === 'specific' ? `<strong>${k}</strong> selected product${k === 1 ? '' : 's'}` : `products that match <strong>${n}</strong> condition group${n === 1 ? '' : 's'}${n > 1 ? ` (${r.groupRelation === 'AND' ? 'all groups' : 'any group'})` : ''}`;
    el.innerHTML = P.icon('bar') + `<p>${b.mode === 'search' ? `When a shopper searches with ${ctx}, ${prod} will be <strong>${VERB[t]}</strong>.` : `On <strong>${ctx}</strong>, ${prod} will be <strong>${VERB[t]}</strong>.`}</p>`;
  }
  function paintProducts() {
    const list = $('#mc-plist', root); if (!list) return;
    const r = rule(), q = ($('#mc-psearch', root) || { value: '' }).value.trim().toLowerCase(), sc = scopedProducts(), full = r.productIds.length >= MAX_PRODUCTS, cf = conflicts();
    const scope = $('#mc-scope', root);
    if (scope) scope.textContent = b.applyMode === 'specific' ? (b.collection ? `Showing products from “${b.collection}” only.` : 'Select a collection page above to choose from its products.') : 'Showing all products in your store.';
    const shown = sc.filter(p => p.name.toLowerCase().includes(q));
    list.innerHTML = !sc.length ? '<p class="pl-empty">Select a collection page above to see its products.</p>' : !shown.length ? `<p class="pl-empty">No products match “${esc($('#mc-psearch', root).value)}”.</p>` : shown.map(p => prow(p, r.productIds.includes(p.id), full && !r.productIds.includes(p.id))).join('');
    $('#mc-count', root).textContent = `${r.productIds.length} of ${MAX_PRODUCTS} selected`;
    $('#mc-chips', root).innerHTML = r.productIds.map(id => { const p = PRODUCTS.find(x => x.id === id), x = cf[id]; return p ? P.tag((x && x.winner !== b.active ? '⚠ ' : '') + esc(p.name), 'rmprod', `data-pid="${id}"`, 'Remove ' + p.name) : ''; }).join('');
  }
  function paintAround() { $('#mc-conflicts', root).innerHTML = conflictHtml(); $('#mc-rtabs', root).innerHTML = rtabsHtml(); $('#mc-status', root).innerHTML = statusHtml(); }
  function paintAll() { paintProducts(); paintSummary(); paintErrors(); }

  /* ---------- render ---------- */
  const focusKey = el => el && (el.id ? '#' + el.id : null);
  function render(focus) {
    const keep = focus || focusKey(document.activeElement), pos = document.activeElement && document.activeElement.selectionStart;
    root.innerHTML = route.view === 'list' ? listHtml() : builderHtml();
    if (route.view !== 'list') paintAll();
    document.title = (route.view === 'list' ? '' : (b.id ? 'Edit project' : 'Add a new project') + ' — ') + 'Merchandising — Findter Filter & Search';
    const f = keep && $(keep, root); if (f) { f.focus({ preventScroll: true }); if (pos != null && f.setSelectionRange && f.type === 'text') { try { f.setSelectionRange(pos, pos); } catch (e) { /* not selectable */ } } }
    if (bar) bar.sync();
  }
  function openBuilder() {
    const m = route.mode, p = route.view === 'edit' ? projects[m].find(x => x.id === route.id) : null;
    if (route.view === 'edit' && !p) { navigate('#' + m, true); return; }
    const rules = {};
    TYPES.forEach(t => { const r = JSON.parse(JSON.stringify(p ? p.rules[t] : blankRule())); if (!r.groups.length) r.groups = [newGroup()]; rules[t] = r; });
    b = { mode: m, id: p ? p.id : null, name: p ? p.name : '', start: p ? p.start : '', end: p ? p.end : '', market: p ? p.market : MARKETS[0], enabled: p ? p.enabled : true,
      applyMode: p ? p.applyMode : 'all', matchMode: p ? (p.matchMode || 'contains') : 'contains', terms: p ? [...(p.terms || [])] : [], collection: p ? (p.collection || '') : '',
      order: normOrder(p ? p.ruleOrder : null), rules, active: 'boost', show: false, dup: false, q: '', base: '' };
    b.base = snap();
  }
  function apply() {
    if (route.view !== 'list') openBuilder(); else b = null;
    if (route.view !== 'list' && !b) return;
    render('#mc-title'); const sc = $('.sh-scroll'); if (sc) sc.scrollTop = 0;
  }
  function navigate(hash, force) {
    if (!force && isEdited()) { askLeave(() => navigate(hash, true)); return; }
    if (location.hash === hash) { route = parse(hash); apply(); return; }
    suppress = true; location.hash = hash;
  }
  const askLeave = onLeave => openModal({ title: 'Unsaved changes', content: '<p class="mf-modal__text">If you leave this page, all unsaved changes will be lost.</p>', ok: 'Leave page', okClass: 'mf-btn--critical', cancel: 'Cancel', onOk: onLeave });
  window.addEventListener('hashchange', () => {
    const next = parse(location.hash);
    if (suppress) { suppress = false; route = next; apply(); return; }
    if (isEdited()) { history.replaceState(null, '', hashOf(route)); askLeave(() => navigate(hashOf(next), true)); return; }
    route = next; apply();
  });
  window.addEventListener('beforeunload', e => { if (isEdited()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- save: stays on the project page ---------- */
  function save() {
    b.show = true;
    const e = errors(), bad = TYPES.filter(t => e.rules[t]);
    if (Object.keys(e).length > 1 || bad.length) {
      if (bad.length && !bad.includes(b.active)) b.active = b.order.find(t => bad.includes(t));
      render(); const first = $('[aria-invalid=true]', root) || $('.Polaris-Labelled__Error:not([hidden])', root);
      if (first) { first.scrollIntoView({ block: 'center' }); if (first.matches('input,select')) first.focus({ preventScroll: true }); }
      return false;
    }
    const payload = { name: b.name.trim(), start: b.start, end: b.end, market: b.market, applyMode: b.applyMode, ruleOrder: [...b.order], rules: JSON.parse(JSON.stringify(b.rules)),
      enabled: isExpiredDate(b.end) ? false : b.enabled };
    if (b.mode === 'search') { payload.matchMode = b.matchMode; payload.terms = b.applyMode === 'specific' ? [...b.terms] : []; } else payload.collection = b.applyMode === 'specific' ? b.collection : '';
    const list = projects[b.mode];
    if (b.id) { const i = list.findIndex(p => p.id === b.id); list[i] = Object.assign({}, list[i], payload); }
    else { b.id = Math.max(0, ...list.map(p => p.id)) + 1; list.push(Object.assign({ id: b.id }, payload)); }
    persist(b.mode); b.enabled = payload.enabled; b.show = false; b.base = snap();
    if (route.view === 'new') { route = { mode: b.mode, view: 'edit', id: b.id }; history.replaceState(null, '', hashOf(route)); }
    toast('Project saved'); render('#mc-title'); return true;
  }
  const bar = saveBar({ isEdited, onSave: save, onDiscard: () => navigate('#' + route.mode, true) });

  /* ---------- events ---------- */
  function swap(kind, id, d) {
    if (kind === 'rows') { const l = projects[route.mode], i = l.findIndex(p => p.id === Number(id)), j = i + d; if (i < 0 || j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; persist(route.mode); render(`[data-handle=rows][data-id="${id}"]`); toast('Order updated'); }
    else if (kind === 'tabs') { const i = b.order.indexOf(id), j = i + d; if (j < 0 || j >= b.order.length) return; [b.order[i], b.order[j]] = [b.order[j], b.order[i]]; render(`[data-handle=tabs][data-id="${id}"]`); }
    else { const l = rule().groups, i = l.findIndex(g => g.id === id), j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; render(`[data-handle=groups][data-id="${id}"]`); }
  }
  function askDelete(id) {
    const p = projects[mode()].find(x => x.id === Number(id)); if (!p) return;
    openModal({ title: 'Delete this project?', content: `<p class="mf-modal__text">“${esc(p.name)}” will be permanently deleted and stop changing how products show on the ${MODES[mode()].page}. This can’t be undone.</p>`, ok: 'Delete', okClass: 'mf-btn--critical', onOk: () => { projects[mode()] = projects[mode()].filter(x => x.id !== p.id); persist(mode()); render('#mc-title'); toast('Project deleted'); } });
  }
  function addTerm() {
    const inp = $('#mc-term', root), raw = inp.value; if (!raw.trim()) return;
    let skipped = false; raw.split(',').map(s => s.trim()).filter(Boolean).forEach(t => { if (b.terms.some(x => x.toLowerCase() === t.toLowerCase())) skipped = true; else b.terms.push(t); });
    b.dup = skipped; inp.value = ''; $('#mc-terms', root).innerHTML = termTags(); $('#mc-dup', root).hidden = !skipped; paintSummary(); paintErrors(); bar.sync(); inp.focus();
  }
  function pruneScope() {
    if (b.mode === 'collection' && b.applyMode === 'specific' && !b.collection) return;   // no collection chosen yet: keep what was picked until one is chosen
    const ids = new Set(scopedProducts().map(p => p.id)), cfg = attrConfig(scopedProducts());
    TYPES.forEach(t => { const r = b.rules[t]; r.productIds = r.productIds.filter(id => ids.has(id)); r.groups.forEach(g => g.conditions.forEach(c => { const o = cfg[c.attr] && cfg[c.attr].options; if (o && c.value && !o.includes(c.value)) c.value = ''; })); });
  }
  const groupBy = id => rule().groups.find(g => g.id === id);
  const after = () => { bar.sync(); if (b.show) paintErrors(); };
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-tab],[data-act]'); if (!t) return;
    if (t.dataset.tab) { if (t.dataset.tab !== mode()) navigate('#' + t.dataset.tab); return; }
    const a = t.dataset.act;
    if (route.view === 'list') {
      const row = t.closest('.pl-row'), id = row && row.dataset.id;
      if (a === 'add') navigate('#' + mode() + '/new');
      else if (a === 'edit') navigate('#' + mode() + '/edit/' + id);
      else if (a === 'delete') askDelete(id);
      else if (a === 'toggle') { const p = projects[mode()].find(x => x.id === Number(id)); if (!p || t.disabled) return; p.enabled = !p.enabled; persist(mode()); render(`.pl-row[data-id="${id}"] .ft-switch-btn`); toast('Status updated'); }
      return;
    }
    const r = rule();
    if (a === 'back') navigate('#' + route.mode);
    else if (a === 'toggle') {
      if (t.dataset.sw === 'status') { b.enabled = !b.enabled; $('#mc-status', root).innerHTML = statusHtml(); bar.sync(); const s = $('[data-sw=status]', root); if (s) s.focus(); }
      else { r.enabled = !r.enabled; render('[data-sw=rule]'); }
    }
    else if (a === 'apply') { b.applyMode = t.dataset.v; pruneScope(); render(`[data-act=apply][data-v="${t.dataset.v}"]`); }
    else if (a === 'tab' || a === 'goto') { b.active = t.dataset.type; render('#mc-rt-' + b.active); }
    else if (a === 'pmode') { r.productMode = t.dataset.v; if (r.productMode === 'attributes' && !r.groups.length) r.groups = [newGroup()]; b.q = ''; render(`[data-act=pmode][data-v="${t.dataset.v}"]`); }
    else if (a === 'rel') { r.groupRelation = t.dataset.v; render(`[data-act=rel][data-v="${t.dataset.v}"]`); }
    else if (a === 'addterm') addTerm();
    else if (a === 'rmterm') { b.terms = b.terms.filter(x => x !== t.dataset.term); $('#mc-terms', root).innerHTML = termTags(); paintSummary(); paintErrors(); bar.sync(); }
    else if (a === 'rmprod') { r.productIds = r.productIds.filter(id => id !== Number(t.dataset.pid)); paintProducts(); paintSummary(); paintAround(); after(); }
    else if (a === 'gadd') { r.groups.push(newGroup(r.groups)); render(); }
    else if (a === 'gdel') { r.groups = r.groups.filter(g => g.id !== t.dataset.g); render(); }
    else if (a === 'cadd') { groupBy(t.dataset.g).conditions.push(newCond()); render(); }
    else if (a === 'cdel') { const g = groupBy(t.dataset.g); g.conditions = g.conditions.filter(c => c.id !== t.dataset.c); render(); }
  });
  root.addEventListener('change', e => {
    const t = e.target; if (!b || route.view === 'list') return;
    const r = rule();
    if (t.id === 'mc-collection') { b.collection = t.value; pruneScope(); render('#mc-collection'); return; }
    else if (t.id === 'mc-match') { b.matchMode = t.value; paintSummary(); }
    else if (t.id === 'mc-market') b.market = t.value;
    else if (t.id === 'mc-start') { b.start = t.value; paintErrors(); }
    else if (t.id === 'mc-end') { b.end = t.value; paintAround(); paintErrors(); }
    else if (t.dataset.pid) { const id = Number(t.dataset.pid); if (t.checked) { if (r.productIds.length >= MAX_PRODUCTS) { t.checked = false; return; } r.productIds.push(id); } else r.productIds = r.productIds.filter(x => x !== id); paintProducts(); paintSummary(); paintAround(); const again = $(`input[data-pid="${id}"]`, $('#mc-plist', root)); if (again) again.focus(); }
    else if (t.dataset.k) {
      const g = groupBy(t.dataset.g), c = g && g.conditions.find(x => x.id === t.dataset.c);
      if (t.dataset.k === 'attr') { c.attr = t.value; c.operator = attrConfig(scopedProducts())[c.attr].ops[0]; c.value = ''; render(`#at-${c.id}`); return; }
      else if (t.dataset.k === 'operator') { c.operator = t.value; c.value = ''; render(`#op-${c.id}`); return; }
      else if (t.dataset.k === 'value') { c.value = t.value; paintErrors(); }
    }
    after();
  });
  root.addEventListener('input', e => {
    const t = e.target; if (!b || route.view === 'list') return;
    if (t.id === 'mc-name') { b.name = t.value; paintErrors(); }
    else if (t.id === 'mc-psearch') { b.q = t.value; paintProducts(); return; }
    else if (t.dataset.k === 'gname') { groupBy(t.dataset.g).name = t.value; paintErrors(); paintSummary(); }
    else if (t.dataset.k === 'value') { const g = groupBy(t.dataset.g), c = g.conditions.find(x => x.id === t.dataset.c); c.value = t.value; paintErrors(); }
    else return;
    bar.sync();
  });
  root.addEventListener('keydown', e => {
    const t = e.target;
    if (t.id === 'mc-term' && e.key === 'Enter') { e.preventDefault(); addTerm(); return; }
    const h = t.closest && t.closest('[data-handle]');
    if (h) { const horiz = h.dataset.handle === 'tabs', k = e.key; if (horiz ? (k === 'ArrowLeft' || k === 'ArrowRight') : (k === 'ArrowUp' || k === 'ArrowDown')) { e.preventDefault(); swap(h.dataset.handle, h.dataset.id, k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1); } return; }
    const tab = t.closest && t.closest('[role=tab]');
    if (tab && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      if (route.view === 'list') navigate('#' + (mode() === 'collection' ? 'search' : 'collection'));
      else { const i = b.order.indexOf(b.active), j = (i + (e.key === 'ArrowRight' ? 1 : -1) + b.order.length) % b.order.length; b.active = b.order[j]; render('#mc-rt-' + b.active); }
    }
  });
  /* drag by the handle only (so fields keep normal text selection); the handles also work with the arrow keys */
  let drag = null;
  root.addEventListener('pointerdown', e => { const h = e.target.closest('[data-handle]'); if (h) { const it = h.closest('[data-dnd]'); if (it) it.draggable = true; } });
  document.addEventListener('pointerup', () => { if (!drag) $$('[data-dnd][draggable=true]', root).forEach(x => { x.draggable = false; }); });
  root.addEventListener('dragstart', e => { const it = e.target.closest && e.target.closest('[data-dnd]'); if (!it || !it.draggable) return; drag = { it, kind: it.dataset.dnd }; it.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', it.dataset.id); } catch (err) { /* ignore */ } });
  root.addEventListener('dragover', e => {
    if (!drag) return; const over = e.target.closest(`[data-dnd="${drag.kind}"]`); if (!over || over === drag.it) return; e.preventDefault();
    const r = over.getBoundingClientRect(), below = drag.kind === 'tabs' ? e.clientX - r.left > r.width / 2 : e.clientY - r.top > r.height / 2;
    over.parentNode.insertBefore(drag.it, below ? over.nextSibling : over);
  });
  root.addEventListener('drop', e => { if (drag) e.preventDefault(); });
  root.addEventListener('dragend', () => {
    if (!drag) return; const { it, kind } = drag; it.classList.remove('is-drag'); it.draggable = false; drag = null;
    const ids = $$(`[data-dnd="${kind}"]`, root).map(x => x.dataset.id);
    if (kind === 'rows') { projects[mode()].sort((x, y) => ids.indexOf(String(x.id)) - ids.indexOf(String(y.id))); persist(mode()); render(); toast('Order updated'); }
    else if (kind === 'tabs') { b.order = ids; render(); }
    else { rule().groups.sort((x, y) => ids.indexOf(x.id) - ids.indexOf(y.id)); render(); }
  });

  apply();
})();
