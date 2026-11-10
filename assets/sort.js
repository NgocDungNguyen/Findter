/* Sort page (sort.html): a port of the real app's Settings/SortBody.jsx (develop) with the same rules, texts and states.
   Reads/writes only localStorage (the real app: /api/sort-config/*). Demo helpers: sort.html?reset=1 restores the freshly unlocked state, sort.html?state=empty shows the empty state. */
(() => {
  'use strict';
  const body = document.getElementById('so-body');
  if (!body) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: keep going */ } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { /* storage blocked: keep going */ } },
  };
  const KEY = 'findter.sortConfig.v1', SYNC_KEY = 'findter.sortSync.v1', SYNC_MS = 6000;
  const params = new URLSearchParams(location.search);
  if (params.get('reset') === '1') { store.del(KEY); store.del(SYNC_KEY); history.replaceState(null, '', location.pathname); }
  const FORCE_EMPTY = params.get('state') === 'empty';

  /* ---------- the app's sort options (default.config.ts: defaultSortConfigs + availableSortConfigs; SortBy.type_* in en.json) ---------- */
  const TYPE_TEXT = {
    featured: 'Default / Manually sort', relevance: 'Best matches for your search first', created_at: 'Latest created',
    price_low_high: 'Cheapest first', price_high_low: 'Most expensive first', title_asc: 'Alphabet from A to Z', title_desc: 'Alphabet from Z to A',
    created_at_asc: 'By created date, oldest first', sale_asc: 'By sale percentage, ascending', sale_desc: 'By sale percentage, descending', available_count: 'Most in-stock product first',
    rating_desc: 'Product rating high to low', review_desc: 'Review amount high to low',
  };
  const DEFAULT_SORTS = [['featured', 'Featured']];                  // Best selling was retired (14/10): it sorted by the same collection order as Featured
  const AVAILABLE_SORTS = [['relevance', 'Relevance'], ['created_at', 'What\'s new?'], ['title_asc', 'A-Z'], ['title_desc', 'Z-A'], ['price_low_high', 'Price low to high'], ['price_high_low', 'Price high to low'],
    ['available_count', 'Stock Availability'], ['created_at_asc', 'Old to New'], ['sale_asc', 'Sale low to high'], ['sale_desc', 'Sale high to low'],
    ['rating_desc', 'Rating'], ['review_desc', 'Review']];             // Phase 2 (rds_shopify-881): they read the data the shop's review app saves
  /* Rating + Review (Phase 2): the data comes from ONE review app the merchant picks in the Edit window. Findter does not keep its own rating data: it reads
     what the picked app already saves on every product (Judge.me: reviews.rating + reviews.rating_count, Yotpo: its own reviews metafields). The pick is shared by both rows. */
  const REVIEW_SORT_KEYS = ['rating_desc', 'review_desc'];
  const REVIEW_APPS = [{ id: 'judgeme', name: 'Judge.me', logo: 'assets/img/judgeme-logo.png' }, { id: 'yotpo', name: 'Yotpo', logo: 'assets/img/yotpo-logo.png' }];
  const appName = id => (REVIEW_APPS.find(a => a.id === id) || {}).name || '';
  const REVIEW_TOOLTIP = 'Set up Judge.me or Yotpo before turning on this sort option.';
  /* Metafield sorts (Phase 2): a saved metafield of a NUMBER type can be sorted (the app's MetafieldData.getSortConfigs: number_integer, number_decimal, rating);
     text, list, color, file and metaobject metafields have no number to sort by. Each option is one direction of one metafield, products without a value come last. */
  const SORTABLE_MF_TYPES = ['number_integer', 'number_decimal', 'rating'];
  const MF_ORDER_TEXT = { asc: 'low to high', desc: 'high to low' };
  const MFS = () => window.__pages && window.__pages.metafields;
  const mfNs = id => 'custom.' + id;                                  // the demo store's metafields live in the custom namespace
  const mfHandle = m => 'metafield_' + m.type + '_custom_' + m.id.replace(/\W/g, '_');
  const mfSortKey = (m, order) => mfHandle(m) + '_' + order;
  const mfTypeLabel = m => (MFS().typeLabel || {})[m.type] || m.type;
  const savedSortableMetafields = () => { const s = MFS(); if (!s) return []; return s.load().map(r => s.catalog.find(c => c.id === r.id)).filter(m => m && SORTABLE_MF_TYPES.includes(m.type)); };
  const mfByRow = o => o.mf ? savedSortableMetafields().find(m => m.id === o.mf.id) : null;
  const pickLabel = m => `${m.label} (${mfTypeLabel(m)})`;
  const mfDefaultLabel = (m, order) => (m.label + ' ' + MF_ORDER_TEXT[order]).slice(0, 40);
  const DEFAULT_ENABLED_SORT_KEYS = ['relevance', 'created_at', 'price_low_high', 'price_high_low'];
  // the order the admin lists the built-in options in (GET /api/sort-config/all: reservedKeys)
  const RESERVED = [...DEFAULT_SORTS, ...AVAILABLE_SORTS].map(([key, label]) => ({ key, label, status: DEFAULT_ENABLED_SORT_KEYS.includes(key) }));
  const ORIGINAL_LABELS = Object.fromEntries(RESERVED.map(r => [r.key, r.label]));
  // what unlocking Custom Sort stores for a shop (SortConfigData.initDefaultConfigs): the available options first, then Featured and Best selling, every other option off
  const initConfigs = () => [...AVAILABLE_SORTS, ...DEFAULT_SORTS].map(([key, label]) => ({ key, label, status: DEFAULT_ENABLED_SORT_KEYS.includes(key) }));

  /* ---------- rules (SortBody.jsx) ---------- */
  const DEFAULT_SORT_FALLBACK = { collection: 'created_at', search: 'relevance' };
  const SEARCH_ONLY_SORT_KEYS = ['relevance'];               // Relevance needs a search query: only the Search result page
  const COLLECTION_ONLY_SORT_KEYS = ['featured'];            // Featured follows the merchant-arranged collection order: never on the Search result page
  const SORT_SCOPE_BADGES = {
    relevance: { tag: 'Search only', tooltip: 'This option only appears on the search results page, not on collection pages.' },
    featured: { tag: 'Collection only', tooltip: 'This option only appears on collection pages, not on the search results page.' },
  };
  // spf_sorting = "Collection Manual Sorting" (Advanced features). Featured follows the collection order it builds, so without it Featured is hidden (kept in the data).
  // Demo: on by default like a fresh install; sort.html?spf=0 shows a shop that has not turned it on.
  const SPF_SORTING = params.get('spf') !== '0';
  const SPF_SORTING_ONLY_SORT_KEYS = ['featured'];
  const LABEL_MAX_LENGTH = 40;
  const MSG = {
    noSort: 'Keep at least one sort option other than Relevance turned on. Collection pages need it to sort products.',
    noSearchSort: 'Keep at least one sort option other than Featured turned on. The search results page needs it to sort products.',
    saved: 'Sort options updated successfully',
    editNote: 'This only renames the option shown to shoppers. Sorting logic stays the same.',
  };
  const validateSortOptions = options => {
    const enabled = options.filter(o => o.status);
    if (!enabled.some(o => !SEARCH_ONLY_SORT_KEYS.includes(o.key))) return MSG.noSort;
    if (!enabled.some(o => !COLLECTION_ONLY_SORT_KEYS.includes(o.key))) return MSG.noSearchSort;
    return null;
  };
  const applyToggle = (prev, key, value) => prev.map(o => o.key === key ? { ...o, status: value } : o);   // no option switches another one off any more
  // A stored 'best_selling' row (saved before it was retired) is folded into Featured when the config is read (sort.config.ts foldLegacyBestSelling):
  // enabled -> Featured enabled at its position, keeping the Collection default; disabled -> dropped. Rewritten the next time the page is saved.
  const foldLegacyBestSelling = raw => {
    const legacy = raw.find(e => e && e.key === 'best_selling'); if (!legacy) return raw;
    const featured = raw.find(e => e && e.key === 'featured');
    if (legacy.status === false || (featured && featured.status !== false)) return raw.filter(e => e !== legacy);
    const folded = { key: 'featured', label: (featured && featured.label) || 'Featured', status: true, ...((legacy.default_collection === true || (featured && featured.default_collection === true)) ? { default_collection: true } : {}) };
    return raw.filter(e => e !== featured).map(e => e === legacy ? folded : e);
  };
  // `app` rides on the Rating and Review rows; `info` + `mf` on a metafield sort row (the app stores info.field / order / missing for custom options)
  const toRow = c => ({ key: c.key, label: c.label, status: c.status !== false,
    ...(REVIEW_SORT_KEYS.includes(c.key) ? { app: REVIEW_APPS.some(a => a.id === c.app) ? c.app : null } : {}),
    ...(c.mf ? { mf: c.mf, info: c.info } : {}) });
  const originalLabel = row => ORIGINAL_LABELS[row.key] || (row.mf && mfByRow(row) ? mfDefaultLabel(mfByRow(row), row.mf.order) : row.label);
  const resolveDefaultSort = (picked, choices, fallback) =>
    (choices.find(o => o.key === picked) || {}).key || (choices.find(o => o.key === fallback) || {}).key || (choices[0] || {}).key || '';

  /* ---------- state ---------- */
  let options = [], originalOptions = [], defaults = { collection: null, search: null }, originalDefaults = { collection: null, search: null };
  let loading = true, saving = false;
  const clone = x => JSON.parse(JSON.stringify(x));
  function loadFromStore() {
    let configs = null;
    try { const v = JSON.parse(store.get(KEY) || 'null'); if (Array.isArray(v)) configs = v; } catch (e) { configs = null; }
    if (FORCE_EMPTY) configs = [];
    else if (!configs) configs = initConfigs();
    else configs = foldLegacyBestSelling(configs);
    const have = new Set(configs.map(c => c.key));
    const rows = FORCE_EMPTY ? [] : [...configs.map(toRow), ...RESERVED.filter(r => !have.has(r.key)).map(r => ({ key: r.key, label: r.label, status: r.status === true }))];
    options = rows; originalOptions = clone(rows);
    const d = { collection: ((configs.find(c => c.default_collection)) || {}).key || null, search: ((configs.find(c => c.default_search)) || {}).key || null };
    defaults = { ...d }; originalDefaults = { ...d };
  }
  // hidden but kept in the data: Featured without Collection Manual Sorting, and a metafield sort whose metafield is no longer saved on the Metafield page (adding it back restores the row)
  const isShown = o => (SPF_SORTING || !SPF_SORTING_ONLY_SORT_KEYS.includes(o.key)) && (!o.mf || !!mfByRow(o));
  const visibleOptions = () => options.filter(isShown);
  const reviewApp = () => ((options.find(o => REVIEW_SORT_KEYS.includes(o.key) && o.app) || {}).app) || null;
  const collectionChoices = () => visibleOptions().filter(o => o.status && !SEARCH_ONLY_SORT_KEYS.includes(o.key));
  const searchChoices = () => visibleOptions().filter(o => o.status && !COLLECTION_ONLY_SORT_KEYS.includes(o.key));
  const effectiveDefaults = () => ({
    collection: resolveDefaultSort(defaults.collection, collectionChoices(), DEFAULT_SORT_FALLBACK.collection),
    search: resolveDefaultSort(defaults.search, searchChoices(), DEFAULT_SORT_FALLBACK.search),
  });
  const isEdited = () => JSON.stringify(options) !== JSON.stringify(originalOptions) || JSON.stringify(defaults) !== JSON.stringify(originalDefaults);

  /* ---------- sync banner: after Save, when the review app Rating / Review read from changed (yellow while the data is collected, then green) ---------- */
  let hidePending = false, syncTimer = 0;
  const readSync = () => { try { return JSON.parse(store.get(SYNC_KEY) || 'null'); } catch (e) { return null; } };
  function bannerHtml() {
    const s = readSync(); if (!s || !appName(s.app)) return '';
    if (Date.now() < s.until) {
      if (hidePending) return '';
      return `<div class="mf-banner mf-banner--warn" role="status"><div class="mf-banner__head"><span class="mf-banner__icon">${ICON_ALERT}</span><strong>Collecting data</strong><button type="button" class="mf-banner__x" data-act="banner-hide" aria-label="Dismiss">${ICON_CLOSE}</button></div><p class="mf-banner__body">We are collecting ${appName(s.app)} ratings and review counts, please wait.</p></div>`;
    }
    return `<div class="mf-banner mf-banner--done" role="status"><div class="mf-banner__head"><span class="mf-banner__icon">${ICON_OK}</span><strong>Data indexing is completed</strong><button type="button" class="mf-banner__x" data-act="banner-done" aria-label="Dismiss">${ICON_CLOSE}</button></div><p class="mf-banner__body">Rating and Review are ready.</p></div>`;
  }
  function scheduleSync() {
    clearTimeout(syncTimer); const s = readSync(); if (!s || Date.now() >= s.until) return;
    syncTimer = setTimeout(function tick() { if (drag || document.querySelector('[data-mfp]')) { syncTimer = setTimeout(tick, 1000); return; } render(); }, s.until - Date.now() + 50);   // wait while a window is open or a row is being dragged
  }

  /* ---------- toast ---------- */
  const toastEl = $('#toast');
  const showToast = (msg, isError) => { if (toastEl) toastEl.classList.toggle('is-error', !!isError); if (window.__shell) window.__shell.toast(msg); };

  /* ---------- markup ---------- */
  const ICON_EDIT = '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path fill-rule="evenodd" d="M15.655 4.344a2.695 2.695 0 0 0-3.81 0l-.599.599-.009-.009-1.06 1.06.008.01-5.88 5.88a2.75 2.75 0 0 0-.805 1.944v1.922a.75.75 0 0 0 .75.75h1.922a2.75 2.75 0 0 0 1.944-.806l7.54-7.539a2.695 2.695 0 0 0 0-3.81Zm-4.409 2.72-5.88 5.88a1.25 1.25 0 0 0-.366.884v1.172h1.172c.331 0 .65-.132.883-.366l5.88-5.88-1.689-1.69Zm2.75.629.599-.599a1.195 1.195 0 1 0-1.69-1.689l-.598.599 1.69 1.689Z"></path></svg>';
  const ICON_DRAG = '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><circle cx="7.5" cy="5.5" r="1.4"/><circle cx="12.5" cy="5.5" r="1.4"/><circle cx="7.5" cy="10" r="1.4"/><circle cx="12.5" cy="10" r="1.4"/><circle cx="7.5" cy="14.5" r="1.4"/><circle cx="12.5" cy="14.5" r="1.4"/></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94z"></path></svg>';
  const ICON_BAR = '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Z"/><path d="M11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/><path fill-rule="evenodd" d="M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-1.5 0a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"/></svg>';
  const ICON_DELETE = '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M11.5 8.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0v-4.25a.75.75 0 0 1 .75-.75Z"></path><path d="M9.25 9a.75.75 0 0 0-1.5 0v4.25a.75.75 0 0 0 1.5 0v-4.25Z"></path><path fill-rule="evenodd" d="M7.25 5.25a2.75 2.75 0 0 1 5.5 0h3a.75.75 0 0 1 0 1.5h-.75v5.45c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311c-.642.327-1.482.327-3.162.327h-.4c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311c-.327-.642-.327-1.482-.327-3.162v-5.45h-.75a.75.75 0 0 1 0-1.5h3Zm1.5 0a1.25 1.25 0 1 1 2.5 0h-2.5Zm-2.25 1.5h7v5.45c0 .865-.001 1.423-.036 1.848-.033.408-.09.559-.128.633a1.5 1.5 0 0 1-.655.655c-.074.038-.225.095-.633.128-.425.035-.983.036-1.848.036h-.4c-.865 0-1.423-.001-1.848-.036-.408-.033-.559-.09-.633-.128a1.5 1.5 0 0 1-.656-.655c-.037-.074-.094-.225-.127-.633-.035-.425-.036-.983-.036-1.848v-5.45Z"></path></svg>';
  const ICON_ALERT = '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path fill-rule="evenodd" d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 3.25a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 .75-.75ZM10 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"></path></svg>';
  const ICON_OK = '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path fill-rule="evenodd" d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm3.28 5.78a.75.75 0 0 0-1.06-1.06L9 10.94 7.78 9.72a.75.75 0 1 0-1.06 1.06l1.75 1.75c.3.3.77.3 1.06 0l3.75-3.75Z"></path></svg>';
  const CHEVRON ='<span class="Polaris-Select__Icon"><span class="Polaris-Icon"><svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M10.884 4.323a1.25 1.25 0 0 0-1.768 0l-2.646 2.647a.75.75 0 0 0 1.06 1.06l2.47-2.47 2.47 2.47a.75.75 0 1 0 1.06-1.06z"></path><path d="m13.53 13.03-2.47 2.47-2.47-2.47a.75.75 0 0 0-1.06 1.06l2.646 2.647a1.25 1.25 0 0 0 1.768 0l2.646-2.647a.75.75 0 0 0-1.06-1.06"></path></svg></span></span>';
  const ghostBar = (w = '100%', h = 20) => `<div class="ft-sort-skeleton-bar" style="width:${w};height:${h}px"></div>`;

  const skeletonHtml = () => `<div class="so-stack" aria-busy="true" aria-label="Loading sort options">
    <section class="so-card"><div class="so-col"><h2 class="so-card__h">Default sort by value</h2><p class="so-sub">Choose the default sort by value of each pages</p>
      <div class="ft-sort-defaults">${['Collection page', 'Search result page'].map(t => `<div class="so-box"><h3 class="so-box__h">${t}</h3>${ghostBar('100%', 32)}</div>`).join('')}</div></div></section>
    <section class="so-card"><div class="so-col so-col--tight"><div class="so-tablehead"><p class="so-caption">Enable or disable sort option. Drag to reorder.</p>${ghostBar('132px', 28)}</div>
      <div class="ft-table ft-sort-table"><div class="table-head"><div style="width:40px"></div><div>Status</div><div>Label</div><div>Type</div><div class="action">Actions</div></div>
      ${Array.from({ length: RESERVED.length }, () => `<div class="table-row"><div class="so-handle">${ICON_DRAG}</div><div>${ghostBar('36px')}</div><div>${ghostBar('60%')}</div><div>${ghostBar('70%')}</div><div class="action so-action">${ghostBar('32px', 32)}</div></div>`).join('')}</div></div></section></div>`;

  const selectHtml = (id, label, choices, value, act = 'default') => {
    const disabled = choices.length === 0;
    const current = (choices.find(c => c.key === value) || {}).label || '';
    return `<div class="Polaris-Select${disabled ? ' Polaris-Select--disabled' : ''}"><select id="${id}" class="Polaris-Select__Input" aria-label="${esc(label)}"${act ? ` data-act="${act}"` : ''}${disabled ? ' disabled' : ''}>${choices.map(c => `<option value="${c.key}"${c.key === value ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}</select><div class="Polaris-Select__Content" aria-hidden="true"><span class="Polaris-Select__SelectedOption">${esc(current)}</span>${CHEVRON}</div><div class="Polaris-Select__Backdrop"></div></div>`;
  };
  const rowHtml = o => {
    const badge = SORT_SCOPE_BADGES[o.key];
    const grab = 'tabindex="0" role="button" aria-roledescription="sortable"';
    const m = o.mf ? mfByRow(o) : null;
    const typeText = m ? `Metafield ${mfNs(m.id)}, ${MF_ORDER_TEXT[o.mf.order]}` : (TYPE_TEXT[o.key] || '');
    const info = REVIEW_SORT_KEYS.includes(o.key) ? `<span class="sort-label-info" data-tip="${esc(REVIEW_TOOLTIP)}" tabindex="0" role="img" aria-label="${esc(REVIEW_TOOLTIP)}">${ICON_BAR}</span>` : '';
    return `<div class="table-row" data-key="${o.key}">
      <div class="so-handle so-grab" ${grab} aria-label="Reorder ${esc(o.label)}">${ICON_DRAG}</div>
      <div><input type="checkbox" class="pg-switch" role="switch" data-act="toggle" aria-label="Status"${o.status ? ' checked' : ''}></div>
      <div class="sort-label so-sort-label"><div class="so-grab" ${grab}><span>${esc(o.label)}</span></div>${badge ? `<span class="sort-label-badge" data-tip="${esc(badge.tooltip)}" tabindex="0"><span class="Polaris-Badge Polaris-Badge--toneInfo"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">${badge.tag}</span></span></span>` : ''}${info}</div>
      <div class="sort-type so-grab" ${grab}><span class="so-t so-sub-text">${esc(typeText)}</span></div>
      <div class="action"><div class="so-action"><button type="button" class="so-iconbtn" data-act="edit" aria-label="Edit ${esc(o.label)}">${ICON_EDIT}</button>${o.mf ? `<button type="button" class="so-iconbtn" data-act="delete" aria-label="Delete ${esc(o.label)}">${ICON_DELETE}</button>` : ''}</div></div>
    </div>`;
  };
  function pageHtml() {
    if (!visibleOptions().length) {
      return `<section class="so-card" aria-label="No sort options yet"><div class="so-empty"><img src="assets/img/emptystate-files-10e84ca8.png" alt="No sort options yet"><h2>No sort options yet</h2><p>Please contact us to enable sort options.</p><button type="button" class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantPrimary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Contact us</span></button></div></section>`;
    }
    const eff = effectiveDefaults();
    return `<div class="so-stack">${bannerHtml()}
      <section class="so-card"><div class="so-col"><h2 class="so-card__h">Default sort by value</h2><p class="so-sub">Choose the default sort by value of each pages</p>
        <div class="ft-sort-defaults">
          <div class="so-box"><h3 class="so-box__h">Collection page</h3>${selectHtml('so-def-collection', 'Collection page', collectionChoices(), eff.collection)}</div>
          <div class="so-box"><h3 class="so-box__h">Search result page</h3>${selectHtml('so-def-search', 'Search result page', searchChoices(), eff.search)}</div>
        </div></div></section>
      <section class="so-card"><div class="so-col so-col--tight"><div class="so-tablehead"><p class="so-caption">Enable or disable sort option. Drag to reorder.</p><button type="button" class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter" data-act="add-mf"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Add metafield sort</span></button></div>
        <div class="ft-table ft-sort-table"><div class="table-head"><div style="width:40px"></div><div>Status</div><div>Label</div><div>Type</div><div class="action">Actions</div></div>
        <div id="so-rows">${visibleOptions().map(rowHtml).join('')}</div></div></div></section></div>`;
  }
  function render(focusSel) {
    body.innerHTML = loading ? skeletonHtml() : pageHtml();
    if (focusSel) { const el = $(focusSel, body); if (el) el.focus({ preventScroll: true }); }
  }

  /* ---------- contextual save bar (useFindterSaveBar: Save / Discard, leave confirmation) ---------- */
  const bar = document.createElement('div');
  bar.className = 'so-savebar'; bar.hidden = true; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Unsaved changes');
  bar.innerHTML = `<div class="so-savebar__t">${ICON_BAR}<span>Unsaved changes</span></div><div class="so-savebar__a"><button type="button" class="so-sbtn so-sbtn--discard" data-b="discard">Discard</button><button type="button" class="so-sbtn so-sbtn--save" data-b="save">Save</button></div>`;
  ($('.sh-main') || document.body).appendChild(bar);
  const syncBar = () => {
    bar.hidden = !(isEdited() || saving);
    $$('.so-sbtn', bar).forEach(b => { b.disabled = saving; });
    $('[data-b=save]', bar).classList.toggle('is-loading', saving);
  };
  const changed = focusSel => { syncBar(); render(focusSel); };

  /* ---------- save / discard ---------- */
  function persist() {                                                          // POST /api/sort-config/update
    const eff = effectiveDefaults();
    const config = options.map(o => ({ key: o.key, label: o.label, status: o.status,
      ...(o.app ? { app: o.app } : {}), ...(o.mf ? { mf: o.mf, info: o.info } : {}),
      ...(o.key === eff.collection ? { default_collection: true } : {}), ...(o.key === eff.search ? { default_search: true } : {}) }));
    const prevApp = ((originalOptions.find(o => REVIEW_SORT_KEYS.includes(o.key) && o.app)) || {}).app || null, nextApp = reviewApp();
    if (nextApp && nextApp !== prevApp) { store.set(SYNC_KEY, JSON.stringify({ app: nextApp, until: Date.now() + SYNC_MS })); hidePending = false; scheduleSync(); }   // a new review app: its data has to be collected first
    store.set(KEY, JSON.stringify(config));
    options = config.map(toRow); originalOptions = clone(options);
    defaults = { collection: (config.find(o => o.default_collection) || {}).key || null, search: (config.find(o => o.default_search) || {}).key || null };
    originalDefaults = { ...defaults };
  }
  function saveNow() {                                                          // used by the "leave without saving" window too; false = stay on the page
    const err = validateSortOptions(visibleOptions());
    if (err) { showToast(err, true); return false; }
    persist(); syncBar(); render(); showToast(MSG.saved, false);
    return true;
  }
  function onSaveClick() {
    if (saving) return;
    const err = validateSortOptions(visibleOptions());
    if (err) { showToast(err, true); return; }
    saving = true; syncBar();
    setTimeout(() => { saving = false; saveNow(); }, 450);                      // the real request takes a moment: the Save button shows its spinner
  }
  function discardNow() { options = clone(originalOptions); defaults = { ...originalDefaults }; changed(); }

  /* ---------- modals (Polaris Modal look = the demo's .mf-modal) ---------- */
  function openModal({ title, content, ok, okClass, cancel, onOk, onOpen }) {
    const opener = document.activeElement;
    const scrim = document.createElement('div'); scrim.className = 'mf-scrim'; scrim.setAttribute('data-mfp', '');
    scrim.innerHTML = `<div class="mf-modal" role="dialog" aria-modal="true" aria-labelledby="so-m-title"><div class="mf-modal__head"><h2 class="mf-modal__title" id="so-m-title">${esc(title)}</h2><button type="button" class="mf-modal__x" aria-label="Close">${ICON_CLOSE}</button></div><div class="mf-modal__body">${content}</div><div class="mf-modal__foot"><button type="button" class="mf-btn" data-m="cancel">${esc(cancel)}</button><button type="button" class="mf-btn ${okClass || 'mf-btn--primary'}" data-m="ok">${esc(ok)}</button></div></div>`;
    document.body.appendChild(scrim);
    const okBtn = $('[data-m=ok]', scrim);
    const close = () => { document.removeEventListener('keydown', onKey, true); scrim.remove(); if (opener && document.contains(opener)) opener.focus({ preventScroll: true }); };
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Tab') {
        const f = $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]', scrim), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    scrim.addEventListener('click', e => {
      if (e.target === scrim || e.target.closest('.mf-modal__x') || e.target.closest('[data-m=cancel]')) close();
      else if (e.target.closest('[data-m=ok]') && !okBtn.disabled) { if (onOk(scrim) !== false) close(); }
    });
    document.addEventListener('keydown', onKey, true);
    if (onOpen) onOpen(scrim, okBtn);
    return close;
  }
  const labelFieldHtml = label => `<div class="so-field"><label for="so-edit-label">Label</label><input id="so-edit-label" class="mf-input" type="text" autocomplete="off" maxlength="${LABEL_MAX_LENGTH}" value="${esc(label)}"><span class="so-counter" id="so-edit-count"></span></div>`;
  function openEditModal(row) {
    if (REVIEW_SORT_KEYS.includes(row.key)) return openReviewModal(row, false);
    let label = row.label;
    const m = row.mf ? mfByRow(row) : null;
    openModal({
      title: 'Edit Sort by ' + originalLabel(row),
      content: `${labelFieldHtml(row.label)}<p class="so-note">${MSG.editNote}</p>${m ? `<p class="so-note">Metafield: <strong>${esc(mfNs(m.id))}</strong> (${esc(mfTypeLabel(m))})</p>` : ''}`,
      ok: 'Save', cancel: 'Cancel',
      onOpen: (scrim, okBtn) => {
        const input = $('#so-edit-label', scrim), count = $('#so-edit-count', scrim);
        const sync = () => { label = input.value; count.textContent = `${label.length}/${LABEL_MAX_LENGTH}`; okBtn.disabled = !label.trim(); };
        input.addEventListener('input', sync); sync();
        input.focus(); input.select();
      },
      onOk: () => {
        const trimmed = label.trim();
        if (!trimmed) return false;
        options = options.map(o => o.key === row.key ? { ...o, label: trimmed } : o);   // saveEditLabel: only the table changes until the page is saved
        changed(`[data-key="${row.key}"] [data-act=edit]`);
      },
    });
  }
  /* Rating / Review: Label + the review app to read from. Exactly one app; the pick is shared by Rating and Review. Opens by itself the first time one of them is turned on
     (no app picked yet): Cancel leaves it off. Save needs an app. Changing the app makes the sync banner show once the page is saved. */
  function openReviewModal(row, fromToggle) {
    let label = row.label, app = reviewApp();
    const box = a => `<label class="so-app"><input type="radio" class="so-app__in" name="so-app" value="${a.id}"${a.id === app ? ' checked' : ''}><span class="so-app__box"><img src="${a.logo}" alt="" width="40" height="40"><span class="so-app__name">${a.name}</span></span></label>`;
    openModal({
      title: 'Edit Sort by ' + (ORIGINAL_LABELS[row.key] || row.label),
      content: `${labelFieldHtml(row.label)}<p class="so-note so-note--icon"><span class="so-note__i">${ICON_BAR}</span><span>${MSG.editNote}</span></p>
        <fieldset class="so-apps"><legend class="so-apps__h">Choose integrated app</legend><div class="so-apps__grid">${REVIEW_APPS.map(box).join('')}</div>
        <p class="so-note">Only one app can be active at a time.</p><p class="so-app-error" id="so-app-error" role="alert" hidden>Choose an app to continue.</p></fieldset>`,
      ok: 'Save', cancel: 'Cancel',
      onOpen: (scrim, okBtn) => {
        const input = $('#so-edit-label', scrim), count = $('#so-edit-count', scrim), err = $('#so-app-error', scrim);
        const sync = () => { label = input.value; count.textContent = `${label.length}/${LABEL_MAX_LENGTH}`; okBtn.disabled = !label.trim(); };
        input.addEventListener('input', sync); sync();
        scrim.addEventListener('change', e => { if (e.target.matches('.so-app__in')) { app = e.target.value; err.hidden = true; } });
        input.focus(); input.select();
      },
      onOk: scrim => {
        const trimmed = label.trim();
        if (!trimmed) return false;
        if (!app) { const err = $('#so-app-error', scrim); err.hidden = false; const first = $('.so-app__in', scrim); if (first) first.focus(); return false; }
        options = options.map(o => {
          let n = o;
          if (REVIEW_SORT_KEYS.includes(o.key)) n = { ...n, app };
          if (o.key === row.key) n = { ...n, label: trimmed, ...(fromToggle ? { status: true } : {}) };
          return n;
        });
        changed(`[data-key="${row.key}"] [data-act=toggle]`);
      },
    });
  }
  /* Add metafield sort: pick one saved metafield of a number type (Integer / Decimal / Rating), then which directions to add. Each direction becomes its own row. */
  function openAddMetafieldModal() {
    const taken = (m, order) => options.some(o => o.key === mfSortKey(m, order));
    const free = savedSortableMetafields().filter(m => !(taken(m, 'asc') && taken(m, 'desc')));
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const dirRow = d => `<div class="so-dir"><label class="mf-check"><input type="checkbox" data-dir="${d}"><span>${cap(MF_ORDER_TEXT[d])}<span class="so-dir__hint" data-hint="${d}"></span></span></label><input class="mf-input" id="so-mf-label-${d}" type="text" autocomplete="off" maxlength="${LABEL_MAX_LENGTH}" aria-label="Label for ${MF_ORDER_TEXT[d]}"></div>`;
    const content = free.length
      ? `<div class="so-field"><label for="so-mf-pick">Metafield</label>${selectHtml('so-mf-pick', 'Metafield', free.map(m => ({ key: m.id, label: pickLabel(m) })), free[0].id, '')}</div>
         <fieldset class="so-apps"><legend class="so-apps__h">Sort direction</legend><div class="so-dirs">${['asc', 'desc'].map(dirRow).join('')}</div></fieldset>`
      : `<p class="mf-modal__text">No number metafield saved. Add an Integer, Decimal or Rating metafield on the <a href="metafield.html">Metafield page</a>.</p>`;
    openModal({
      title: 'Add metafield sort', content, ok: 'Add', cancel: 'Cancel',
      onOpen: (scrim, okBtn) => {
        if (!free.length) { okBtn.disabled = true; return; }
        const pick = $('#so-mf-pick', scrim), cur = () => free.find(m => m.id === pick.value);
        const checks = $$('input[data-dir]', scrim), inputs = { asc: $('#so-mf-label-asc', scrim), desc: $('#so-mf-label-desc', scrim) };
        const refresh = () => { okBtn.disabled = !checks.some(c => c.checked) || checks.some(c => c.checked && !inputs[c.dataset.dir].value.trim()); };
        const load = () => {                                                      // a metafield was picked: reset the directions and labels
          const m = cur(); $('.Polaris-Select__SelectedOption', scrim).textContent = pickLabel(m);
          checks.forEach(c => { const d = c.dataset.dir, used = taken(m, d); c.disabled = used; c.checked = !used; $(`[data-hint=${d}]`, scrim).textContent = used ? ' (already in the table)' : '';
            inputs[d].disabled = used; inputs[d].value = used ? '' : mfDefaultLabel(m, d); });
          refresh();
        };
        pick.addEventListener('change', load);
        checks.forEach(c => c.addEventListener('change', () => { inputs[c.dataset.dir].disabled = !c.checked; refresh(); }));
        Object.values(inputs).forEach(i => i.addEventListener('input', refresh));
        load(); pick.focus();
      },
      onOk: scrim => {
        const m = free.find(x => x.id === $('#so-mf-pick', scrim).value); if (!m) return false;
        const adds = $$('input[data-dir]:checked', scrim).map(c => ({ key: mfSortKey(m, c.dataset.dir), label: $('#so-mf-label-' + c.dataset.dir, scrim).value.trim(), status: false,
          mf: { id: m.id, order: c.dataset.dir }, info: { field: mfHandle(m), order: c.dataset.dir, missing: '_last' } }));
        if (!adds.length) return false;
        options = [...options, ...adds];                                          // new rows go to the end of the table, turned off
        changed(`[data-key="${adds[0].key}"] [data-act=toggle]`);
        const first = $(`[data-key="${adds[0].key}"]`, body); if (first) first.scrollIntoView({ block: 'nearest' });
      },
    });
  }
  function openDeleteModal(row) {
    const next = options.filter(o => o.key !== row.key), err = row.status ? validateSortOptions(next.filter(isShown)) : null;   // the same "keep one option" rule as turning an option off
    openModal({ title: 'Delete this sort option?', content: `<p class="mf-modal__text">Shoppers will no longer see “${esc(row.label)}”.</p>${err ? `<p class="so-app-error" id="so-del-error" role="alert">${esc(err)}</p>` : ''}`,
      ok: 'Delete', okClass: 'mf-btn--critical', cancel: 'Cancel',
      onOpen: (scrim, okBtn) => { if (err) okBtn.disabled = true; },               // the reason is written in the window, not in a toast that disappears
      onOk: () => { options = next; changed('[data-act=add-mf]'); } });
  }
  function openDiscardModal() {
    openModal({ title: 'Discard all unsaved changes?', content: '<p class="mf-modal__text">If you discard changes, you’ll delete any edits you made since you last saved.</p>',
      ok: 'Discard changes', okClass: 'mf-btn--critical', cancel: 'Continue editing', onOk: () => { discardNow(); } });
  }

  /* ---------- scope badge tooltip ---------- */
  const tip = document.createElement('div'); tip.className = 'so-tooltip'; tip.hidden = true; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
  const showTip = el => {
    tip.textContent = el.dataset.tip; tip.hidden = false;
    const r = el.getBoundingClientRect(), t = tip.getBoundingClientRect();
    let left = r.left + r.width / 2 - t.width / 2; left = Math.max(8, Math.min(left, innerWidth - t.width - 8));
    tip.style.left = left + 'px'; tip.style.top = (r.top - t.height - 6 < 8 ? r.bottom + 6 : r.top - t.height - 6) + 'px';
  };
  const hideTip = () => { tip.hidden = true; };

  /* ---------- drag to reorder (dnd-kit: mouse 5px, touch 200ms hold, keyboard Space/Enter + arrows) ---------- */
  const announcer = document.createElement('div'); announcer.setAttribute('aria-live', 'assertive'); announcer.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)'; document.body.appendChild(announcer);
  let drag = null;
  const rowsBox = () => $('#so-rows', body);
  const rowEls = () => $$('.table-row', rowsBox());
  const labelOf = key => (options.find(o => o.key === key) || {}).label || key;
  function flip(box, mutate) {                                                  // move rows with a short slide (dnd-kit's 150ms transition)
    const rows = $$('.table-row', box), before = new Map(rows.map(r => [r, r.getBoundingClientRect().top]));
    mutate();
    rows.forEach(r => {
      const dy = before.get(r) - r.getBoundingClientRect().top; if (!dy || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
      r.style.transition = 'none'; r.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => { r.style.transition = 'transform 150ms cubic-bezier(.25,1,.5,1)'; r.style.transform = ''; });
    });
  }
  function beginDrag(row, kind, e, grabEl) {
    const box = rowsBox(); if (!box) return;
    const rect = row.getBoundingClientRect();
    drag = { row, kind, key: row.dataset.key, startY: e ? e.clientY : 0, startX: e ? e.clientX : 0, rect, orderBefore: rowEls().map(r => r.dataset.key), overlay: null, raf: 0, grabEl };
    row.classList.add('is-ghost');
    if (kind === 'pointer') {
      const ov = row.cloneNode(true); ov.className = 'so-drag-overlay'; ov.removeAttribute('data-key');
      ov.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;grid-template-columns:${getComputedStyle(row).gridTemplateColumns}`;
      document.body.appendChild(ov); drag.overlay = ov; document.body.style.cursor = 'grabbing'; document.body.style.userSelect = 'none';
    }
    announcer.textContent = `Picked up sort option ${labelOf(drag.key)}. Sort option is in position ${drag.orderBefore.indexOf(drag.key) + 1} of ${drag.orderBefore.length}.`;
  }
  function moveOverlay(e) {
    if (!drag || !drag.overlay) return;
    const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    drag.overlay.style.transform = `translate(${dx}px,${dy}px)`;
    const cy = drag.rect.top + dy + drag.rect.height / 2, box = rowsBox();
    let best = null, bestD = Infinity;
    rowEls().forEach(r => { const b = r.getBoundingClientRect(); const d = Math.abs(b.top + b.height / 2 - cy); if (d < bestD) { bestD = d; best = r; } });
    if (best && best !== drag.row) {
      const after = rowEls().indexOf(best) > rowEls().indexOf(drag.row);
      flip(box, () => { if (after) best.after(drag.row); else best.before(drag.row); });
      announcer.textContent = `Sort option ${labelOf(drag.key)} was moved over position ${rowEls().indexOf(drag.row) + 1} of ${rowEls().length}.`;
    }
    autoScroll(e);
  }
  function autoScroll(e) {
    const sc = $('.sh-scroll'); if (!sc) return;
    cancelAnimationFrame(drag.raf);
    const r = sc.getBoundingClientRect(), edge = 60;
    const speed = e.clientY < r.top + edge ? -12 : e.clientY > r.bottom - edge ? 12 : 0;
    if (!speed) return;
    const step = () => { if (!drag) return; sc.scrollTop += speed; drag.raf = requestAnimationFrame(step); };
    drag.raf = requestAnimationFrame(step);
  }
  function endDrag(commit) {
    if (!drag) return;
    const d = drag; drag = null; cancelAnimationFrame(d.raf);
    document.body.style.cursor = ''; document.body.style.userSelect = ''; if (d.overlay) d.overlay.remove();
    document.removeEventListener('touchmove', stopTouchScroll);
    const order = rowEls().map(r => r.dataset.key);
    const moved = commit && order.join() !== d.orderBefore.join();
    if (moved) {
      const shown = new Set(order), queue = [...order];                          // a hidden row (Featured without spf_sorting) keeps its place
      const before = options; options = before.map(o => { if (!shown.has(o.key)) return o; const k = queue.shift(); return before.find(x => x.key === k); });
      announcer.textContent = `Sort option ${labelOf(d.key)} was dropped at position ${order.indexOf(d.key) + 1} of ${order.length}.`;
    } else announcer.textContent = `Sorting was cancelled. Sort option ${labelOf(d.key)} was dropped.`;
    changed(d.kind === 'keyboard' ? `[data-key="${d.key}"] .so-handle` : null);
  }
  const stopTouchScroll = e => e.preventDefault();
  function onPointerDown(e) {
    const grab = e.target.closest('.so-grab'); if (!grab || e.button > 0 || drag) return;
    const row = grab.closest('.table-row'); if (!row || !row.dataset.key) return;
    const touch = e.pointerType === 'touch', sx = e.clientX, sy = e.clientY, id = e.pointerId;
    let started = false, timer = 0;
    const start = ev => { started = true; beginDrag(row, 'pointer', { clientX: sx, clientY: sy }, grab); if (touch) document.addEventListener('touchmove', stopTouchScroll, { passive: false }); if (ev) moveOverlay(ev); };
    const move = ev => {
      if (ev.pointerId !== id) return;
      const dist = Math.hypot(ev.clientX - sx, ev.clientY - sy);
      if (!started) {
        if (touch) { if (dist > 5) cleanup(); return; }                          // touch: moving before the hold ends means the user is scrolling
        if (dist >= 5) start(ev);
      } else { ev.preventDefault(); moveOverlay(ev); }
    };
    const up = ev => { if (ev.pointerId !== id) return; const was = started; cleanup(); if (was) endDrag(ev.type === 'pointerup'); };
    const keyCancel = ev => { if (ev.key === 'Escape' && started) { cleanup(); endDrag(false); } };
    function cleanup() {
      clearTimeout(timer);
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up); document.removeEventListener('keydown', keyCancel, true);
    }
    document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up); document.addEventListener('keydown', keyCancel, true);
    if (touch) timer = setTimeout(() => { if (!started) start(null); }, 200);
  }
  function onGrabKey(e) {
    const grab = e.target.closest('.so-grab'); if (!grab) return;
    const row = grab.closest('.table-row'); if (!row) return;
    if (!drag) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); beginDrag(row, 'keyboard', null, grab); }
      return;
    }
    if (drag.kind !== 'keyboard') return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const rows = rowEls(), i = rows.indexOf(drag.row), j = i + (e.key === 'ArrowUp' ? -1 : 1);
      if (j < 0 || j >= rows.length) return;
      drag.moving = true;                                                      // moving a focused node can blur it: do not read that as leaving
      flip(rowsBox(), () => { if (j < i) rows[j].before(drag.row); else rows[j].after(drag.row); });
      drag.grabEl.focus({ preventScroll: true }); drag.moving = false;
      drag.row.scrollIntoView({ block: 'nearest' });
      announcer.textContent = `Sort option ${labelOf(drag.key)} was moved over position ${j + 1} of ${rows.length}.`;
    } else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endDrag(true); }
    else if (e.key === 'Escape') { e.preventDefault(); endDrag(false); }
  }

  /* ---------- events ---------- */
  body.addEventListener('pointerdown', onPointerDown);
  body.addEventListener('keydown', onGrabKey);
  body.addEventListener('focusout', e => { if (drag && drag.kind === 'keyboard' && !drag.moving && !body.contains(e.relatedTarget)) endDrag(true); });
  body.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-act=toggle]')) {
      const key = t.closest('.table-row').dataset.key, value = t.checked;
      if (value && REVIEW_SORT_KEYS.includes(key) && !reviewApp()) { t.checked = false; openReviewModal(options.find(o => o.key === key), true); return; }   // no review app yet: pick one first, Save turns the option on
      const next = applyToggle(options, key, value), err = validateSortOptions(next.filter(isShown));
      if (err && !value) { t.checked = !value; showToast(err, true); return; }     // only the change that breaks the rule is blocked; turning an option ON is always allowed
      options = next; changed(`[data-key="${key}"] [data-act=toggle]`);
    } else if (t.matches('[data-act=default]')) {
      defaults = { ...defaults, [t.id === 'so-def-search' ? 'search' : 'collection']: t.value }; changed('#' + t.id);
    }
  });
  body.addEventListener('click', e => {
    const edit = e.target.closest('[data-act=edit]');
    if (edit) { const row = options.find(o => o.key === edit.closest('.table-row').dataset.key); if (row) openEditModal(row); return; }
    const del = e.target.closest('[data-act=delete]');
    if (del) { const row = options.find(o => o.key === del.closest('.table-row').dataset.key); if (row) openDeleteModal(row); return; }
    if (e.target.closest('[data-act=add-mf]')) { openAddMetafieldModal(); return; }
    if (e.target.closest('[data-act=banner-hide]')) { hidePending = true; render(); return; }
    if (e.target.closest('[data-act=banner-done]')) { store.del(SYNC_KEY); render(); }
  });
  body.addEventListener('mouseover', e => { const b = e.target.closest('[data-tip]'); if (b) showTip(b); });
  body.addEventListener('mouseout', e => { if (e.target.closest('[data-tip]')) hideTip(); });
  body.addEventListener('focusin', e => { const b = e.target.closest('[data-tip]'); if (b) showTip(b); });
  body.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('[data-tip]')) hideTip(); });
  bar.addEventListener('click', e => {
    if (e.target.closest('[data-b=save]')) onSaveClick();
    else if (e.target.closest('[data-b=discard]') && !saving) openDiscardModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });

  /* ---------- hook into the page-leave guard of pages.js (unsaved changes) ---------- */
  if (window.__pages) { window.__pages.dirty.push(() => isEdited()); window.__pages.savers.push(saveNow); }

  /* ---------- start: the skeleton shows while "fetching" ---------- */
  render();
  setTimeout(() => { loadFromStore(); loading = false; render(); scheduleSync(); }, 650);
})();
