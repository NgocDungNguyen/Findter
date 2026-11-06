/* Sample storefront (collection page, search results page, header search with suggestions), for testing where the "Powered by Findter" badge goes.
   The badge shows in three places: under the suggestions box (right corner, outside the box; needs the Search suggestion embed), and in the filter bar of the layout in use (needs only the core embed), while FindterWatermark.onStorefront() is true: the feature is on in
   Master -> Features, the shop's type is ticked, and the badge was not removed. It follows the admin tab live (storage events). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const WM = window.FindterWatermark;
  const BASE = [
    ['Hydrating Face Serum', 'Skin care', 34, 'in'], ['Vitamin C Brightening Cream', 'Skin care', 29, 'in'], ['Gentle Foaming Cleanser', 'Skin care', 18, 'in'],
    ['Rose Water Toner', 'Skin care', 16, 'out'], ['Matte Liquid Lipstick', 'Makeup', 22, 'in'], ['Daily Sunscreen SPF 50', 'Skin care', 27, 'in'],
    ['Overnight Repair Mask', 'Skin care', 31, 'out'], ['Eye Contour Gel', 'Skin care', 26, 'in'], ['Hand Cream Trio', 'Body', 21, 'in'],
    ['Cocoa Body Lotion', 'Body', 19, 'in'], ['Hair Repair Oil', 'Hair', 24, 'out'], ['Cotton Makeup Pads', 'Makeup', 9, 'in'],
  ];
  /* 60 more sample products (12 lines x 5 kinds), so a search result runs long enough to scroll and load more */
  const LINES = ['Aloe', 'Argan', 'Bamboo', 'Cacao', 'Dew', 'Ember', 'Fig', 'Glow', 'Honey', 'Iris', 'Jade', 'Kelp'];
  const KINDS = [['Face Cream', 'Skin care', 28], ['Body Wash', 'Body', 15], ['Lip Balm', 'Makeup', 8], ['Hair Mask', 'Hair', 23], ['Night Serum', 'Skin care', 36]];
  LINES.forEach((l, i) => KINDS.forEach(([k, type, base], j) => BASE.push([l + ' ' + k, type, base + ((i * 7 + j * 3) % 9), (i * 5 + j) % 7 === 3 ? 'out' : 'in'])));
  /* Sort data. Every product has a value for everything the Sort page can sort by, so each option gives a real order: created date, compare-at price (sale %), stock count,
     the review app's rating + review count (Judge.me / Yotpo save these on the product) and the number metafields of the Metafield page. Values are made up from the product's
     position with a fixed hash, so they look varied but are the same on every load. */
  const rnd = (i, k) => { let x = Math.imul(i + 1, 374761393) + Math.imul(k, 668265263); x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  const MF_DEFS = {                                                             // id (as in pages.js MF_CATALOG) -> label, a value for product i, and how it is shown
    height: { label: 'Height', value: i => +(3.5 + rnd(i, 10) * 19).toFixed(1), show: v => v.toFixed(1) + ' cm' },
    popularity: { label: 'Popularity score', value: i => 1 + Math.floor(rnd(i, 11) * 100), show: v => String(v) },
    shelf_life: { label: 'Shelf life', value: i => [6, 9, 12, 18, 24, 30, 36][Math.floor(rnd(i, 12) * 7)], show: v => v + ' months' },
    net_weight: { label: 'Net weight', value: i => +(15 + Math.floor(rnd(i, 13) * 940) * 0.25).toFixed(2), show: v => v.toFixed(2) + ' g' },
    customer_rating: { label: 'Customer rating', value: i => +(1 + rnd(i, 14) * 4).toFixed(1), show: v => v.toFixed(1) + ' / 5' },
    purity: { label: 'Active ingredient', value: i => +(70 + rnd(i, 15) * 29.9).toFixed(1), show: v => v.toFixed(1) + '%' },
  };
  const SEED_METAFIELD_IDS = ['snowboard', 'multi', 'height', 'sale', 'year', 'popularity', 'shelf_life', 'net_weight', 'customer_rating'];   // what the Metafield page has saved at first (pages.js MF_SEED)
  const PRODUCTS = BASE.map(([title, type, price, stock], i) => ({
    title, type, price, stock, vendor: 'Demo Cosmetics', sku: String(10001 + i), order: i,
    created: Date.UTC(2026, 10, 6) - Math.floor(rnd(i, 1) * 300) * 864e5,
    compare: rnd(i, 2) > 0.45 ? Math.round(price * (1.1 + rnd(i, 3) * 0.6)) : null,
    qty: stock === 'out' ? 0 : 3 + Math.floor(rnd(i, 4) * 97),
    rating: +(3.4 + rnd(i, 5) * 1.6).toFixed(1), reviews: 3 + Math.floor(Math.pow(rnd(i, 6), 2) * 417),
    mf: Object.fromEntries(Object.entries(MF_DEFS).map(([id, d]) => [id, d.value(i)])),
  }));
  PRODUCTS.forEach(p => { p.salePct = p.compare ? Math.round((p.compare - p.price) / p.compare * 100) : 0; });
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const money = n => '$' + n.toFixed(2);

  const matchesOf = term => { const t = term.toLowerCase(); return PRODUCTS.filter(p => (p.title + ' ' + p.type + ' ' + p.vendor).toLowerCase().split(/\s+/).some(w => w.startsWith(t)) || p.title.toLowerCase().includes(t)); };
  const searchUrl = term => 'storefront-search.html?q=' + encodeURIComponent(term);
  const isSearchPage = document.body.dataset.page === 'search';
  const pageTerm = isSearchPage ? (new URLSearchParams(location.search).get('q') || '').trim() : '';
  const base = isSearchPage ? (pageTerm ? matchesOf(pageTerm) : []) : PRODUCTS;     // Featured / Relevance = this order
  let shown = base;

  /* ---------- Sort by: the options the admin turned on in Custom sort (findter.sortConfig.v1), in the admin's order with the admin's labels; the page's default is the one picked
     there. Without a saved Custom sort page the dropdown keeps its three plain options. A metafield option shows only while its metafield is still saved on the Metafield page. ---------- */
  const SORT_KEY = 'findter.sortConfig.v1', MFS_KEY = 'findter.metafields.v1';
  const readJson = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };      // storage blocked or empty -> null
  const savedMetafieldIds = () => { const v = readJson(MFS_KEY); return Array.isArray(v) ? v.map(r => r && r.id) : SEED_METAFIELD_IDS; };
  const sortOptions = () => {
    const cfg = readJson(SORT_KEY); if (!Array.isArray(cfg) || !cfg.length) return null;
    const ids = savedMetafieldIds();
    const rows = cfg.filter(r => r && r.status !== false && !(r.mf && !ids.includes(r.mf.id)) && (isSearchPage ? r.key !== 'featured' : r.key !== 'relevance'));
    if (!rows.length) return null;
    const flag = isSearchPage ? 'default_search' : 'default_collection', fallback = isSearchPage ? 'relevance' : 'created_at';
    const def = (rows.find(r => r[flag]) || rows.find(r => r.key === fallback) || rows[0]).key;
    return { rows, def };
  };
  const num = v => (typeof v === 'number' && !Number.isNaN(v)) ? v : null;
  const valueOf = (p, row) => {                                                  // the number a sort option looks at (null = no value: the product goes last)
    if (row.mf) return num(p.mf[row.mf.id]);
    return ({ created_at: p.created, created_at_asc: p.created, price_low_high: p.price, price_high_low: p.price, available_count: p.qty, sale_asc: p.salePct, sale_desc: p.salePct, rating_desc: p.rating, review_desc: p.reviews })[row.key];
  };
  const DIR = { created_at: -1, created_at_asc: 1, price_low_high: 1, price_high_low: -1, available_count: -1, sale_asc: 1, sale_desc: -1, rating_desc: -1, review_desc: -1 };   // 1 = low first, -1 = high first
  function sortedBy(row) {
    if (!row || row.key === 'featured' || row.key === 'relevance') return base;
    if (row.key === 'title_asc' || row.key === 'title_desc') return [...base].sort((a, b) => (row.key === 'title_asc' ? 1 : -1) * a.title.localeCompare(b.title));
    const dir = row.mf ? (row.mf.order === 'asc' ? 1 : -1) : DIR[row.key];
    return [...base].sort((a, b) => { const x = valueOf(a, row), y = valueOf(b, row); if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1; return dir * (x - y); });   // missing value always last
  }
  const sortNote = (p, row) => {                                                 // demo aid: under the price, the value the chosen option sorted by
    if (!row) return '';
    if (row.key === 'rating_desc' || row.key === 'review_desc') return '★ ' + p.rating.toFixed(1) + ' · ' + p.reviews + ' reviews';
    if (row.mf && MF_DEFS[row.mf.id]) return MF_DEFS[row.mf.id].label + ': ' + MF_DEFS[row.mf.id].show(p.mf[row.mf.id]);
    return '';
  };
  const SORT = sortOptions(); let sortRow = null;

  /* ---------- the badge in the filter bar ---------- */
  const showPlaced = () => document.querySelectorAll('[data-wm-place]').forEach(el => { el.hidden = !WM.onStorefront(); });   // looked up each time: the layouts build their own copies

  /* ---------- collection / search results ---------- */
  $('#sf-count').textContent = shown.length + ' products';
  const BATCH = 12, grid = $('#sf-grid'), more = $('#sf-more'); let loaded = 0;
  const cardsOf = list => list.map(p => '<li class="sf-card"><div class="sf-card__img">' + (p.stock === 'out' ? '<span class="sf-tag">Unavailable</span>' : '') + '</div>'
    + '<p class="sf-card__title">' + esc(p.title) + '</p><p class="sf-card__meta">' + p.sku + '</p><p class="sf-card__meta">' + esc(p.vendor) + '</p><p class="sf-card__price">' + money(p.price) + '</p>'
    + (sortNote(p, sortRow) ? '<p class="sf-card__sortval">' + esc(sortNote(p, sortRow)) + '</p>' : '')
    + '<button type="button" class="sf-card__btn"' + (p.stock === 'out' ? ' disabled' : '') + '>' + (p.stock === 'out' ? 'Sold out' : 'Add to cart') + '</button></li>').join('');
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { if (es[0].isIntersecting) showMore(); }, { rootMargin: '300px 0px' }) : null;
  function showMore() {                                                         // the next 12 products, until the list is used up
    const next = shown.slice(loaded, loaded + BATCH); grid.insertAdjacentHTML('beforeend', cardsOf(next)); loaded += next.length;
    if (io && more) { io.unobserve(more); if (loaded < shown.length) io.observe(more); }
  }
  function renderResults() { grid.innerHTML = ''; loaded = 0; showMore(); if (!io) while (loaded < shown.length) showMore(); }
  const sortSel = $('#sf-sort'), sortButtons = () => document.querySelectorAll('.sf-sorts button');
  const drawerSortHtml = () => SORT ? SORT.rows.map(r => '<button type="button" data-sort="' + esc(r.key) + '" class="' + (sortRow && r.key === sortRow.key ? 'is-on' : '') + '">' + esc(r.label) + '</button>').join('')
    : '<button type="button" class="is-on">' + (isSearchPage ? 'Relevance' : 'Featured') + '</button><button type="button">Price, low to high</button><button type="button">Price, high to low</button>';
  function setSort(key) {                                                       // called when a sort option is picked (dropdown or phone drawer)
    sortRow = SORT.rows.find(r => r.key === key) || SORT.rows[0]; shown = sortedBy(sortRow);
    sortSel.value = sortRow.key; sortButtons().forEach(b => b.classList.toggle('is-on', b.dataset.sort === sortRow.key)); renderResults();
  }
  if (SORT) {
    sortSel.innerHTML = SORT.rows.map(r => '<option value="' + esc(r.key) + '">' + esc(r.label) + '</option>').join('');
    sortSel.addEventListener('change', () => setSort(sortSel.value));
    sortRow = SORT.rows.find(r => r.key === SORT.def); shown = sortedBy(sortRow); sortSel.value = sortRow.key;
  }
  renderResults();
  if (isSearchPage) {
    document.title = 'Search: ' + shown.length + ' results found for ' + pageTerm + ' – Sample store';
    const sq = $('#sf-sr-q'); sq.value = pageTerm;
    $('#sf-sr-form').addEventListener('submit', e => { e.preventDefault(); const t = sq.value.trim(); if (t) location.href = searchUrl(t); });
    if (!shown.length) { const em = $('#sf-empty'); em.hidden = false; em.textContent = pageTerm ? 'No results found for “' + pageTerm + '”. Check the spelling or use a different word.' : 'Type a word to search the store.'; }
  }

  /* ---------- header search ---------- */
  const header = $('#sf-header'), panel = $('#sf-search'), scrim = $('#sf-scrim'), q = $('#sf-q'), openBtn = $('#sf-open-search');
  const phone = matchMedia('(max-width:767px)');
  const suggest = $('#sf-suggest'), list = $('#sf-suggest-list'), all = $('#sf-suggest-all'), clear = $('#sf-clear'), powered = $('#sf-powered');
  const setOpen = open => {
    panel.hidden = !open; scrim.hidden = !open; header.classList.toggle('is-searching', open); openBtn.setAttribute('aria-expanded', String(open));
    if (open) q.focus(); else { q.value = ''; update(); openBtn.focus(); }
  };
  function update() {
    const term = q.value.trim(), t = term.toLowerCase();
    q.closest('.sf-search__field').classList.toggle('has-value', !!term); clear.hidden = !term;
    if (!term) { suggest.hidden = true; q.setAttribute('aria-expanded', 'false'); showBadge(); return; }
    const hits = matchesOf(term).slice(0, phone.matches ? 15 : 5);
    list.innerHTML = hits.length
      ? '<p class="sf-suggest__head">Products</p>' + hits.map(p => '<a class="sf-suggest__item" href="#"><span class="sf-suggest__img"></span><span><span class="sf-suggest__title">' + esc(p.title) + '</span><span class="sf-suggest__price">' + money(p.price) + '</span></span></a>').join('')
      : '<p class="sf-suggest__none">No results for “' + esc(term) + '”</p><div class="sf-suggest__noresult"><a href="' + searchUrl(term) + '">Search for <strong>“' + esc(term) + '”</strong></a></div>';
    all.href = searchUrl(term);
    all.innerHTML = 'Search for “' + esc(term) + '” <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5"/></svg>';
    suggest.hidden = false; q.setAttribute('aria-expanded', 'true'); showBadge();
  }
  const showBadge = () => { powered.hidden = suggest.hidden || !WM.onStorefront(); };           // under the suggestions box, outside it
  openBtn.addEventListener('click', () => setOpen(true));
  $('#sf-close-search').addEventListener('click', () => setOpen(false));
  scrim.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) setOpen(false); });
  q.addEventListener('input', update);
  clear.addEventListener('click', () => { q.value = ''; update(); q.focus(); });
  suggest.addEventListener('click', e => { const a = e.target.closest('a'); if (a && a.getAttribute('href') === '#') e.preventDefault(); });   // products are not real pages; the "Search for" links go to the results page
  q.addEventListener('keydown', e => { if (e.key === 'Enter' && q.value.trim()) location.href = searchUrl(q.value.trim()); });
  $('.sf-search__go').addEventListener('click', () => { if (q.value.trim()) location.href = searchUrl(q.value.trim()); });
  phone.addEventListener('change', update);
  /* ---------- filter layouts: Vertical (the sidebar), Horizontal (a bar of dropdowns) and Off-canvas (a Filter button + drawer). The admin picks one in Filter & product grid design > Filter design
     (its Save keeps it in findter.design.filter.v1); phones (<= 767px) always use Off-canvas. The badge sits at the end of the filter options in each: under the last filter in the sidebar, after the last dropdown
     of the horizontal bar, after the last filter in the drawer. ---------- */
  const DESIGN_KEY = 'findter.design.filter.v1', LAYOUTS = ['vertical', 'horizontal', 'offcanvas'];          // the admin's Filter design page saves its config here (Save)
  const layoutNow = () => { if (phone.matches) return 'offcanvas'; const u = new URLSearchParams(location.search).get('layout'); if (LAYOUTS.includes(u)) return u; try { const c = JSON.parse(localStorage.getItem(DESIGN_KEY)); if (c && LAYOUTS.includes(c.layout_type)) return c.layout_type; } catch (e) { /* storage blocked or no saved design yet */ } return 'vertical'; };
  const groups = [...document.querySelectorAll('.sf-filters .sf-group')], headLeft = $('#sf-head-left');
  const labelOf = g => g.querySelector('summary').textContent.trim();
  const bodyOf = g => { const c = g.cloneNode(true); c.querySelector('summary').remove(); return c.innerHTML; };
  const markHtml = cls => '<a class="sf-powered ' + cls + '" data-wm-place href="https://apps.shopify.com/findter-custom-filter-search?utm_source=trademark&utm_medium=referral" target="_blank" rel="noopener" hidden><img class="sf-powered__logo" src="assets/img/findter-logo-black.webp" alt="" width="24" height="24"><span>Powered by <strong>Findter</strong></span></a>';
  const CHEV = '<svg class="sf-chev" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5"/></svg>';
  const SLIDERS = '<svg viewBox="0 0 27 27" aria-hidden="true"><path d="M3 8h8m6 0h7M3 19h3m6 0h12"/><circle cx="14" cy="8" r="3"/><circle cx="9" cy="19" r="3"/></svg>';
  let drawer = null;
  const closeDrawer = () => { if (!drawer || drawer.hidden) return; drawer.hidden = true; document.documentElement.classList.remove('sf-lock'); const b = $('#sf-open-drawer'); if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); } };
  const openDrawer = () => { drawer.hidden = false; document.documentElement.classList.add('sf-lock'); $('#sf-open-drawer').setAttribute('aria-expanded', 'true'); showPlaced(); $('.sf-drawer__close', drawer).focus(); };
  function buildDrawer() {
    if (drawer) return;
    drawer = document.createElement('div'); drawer.className = 'sf-drawer'; drawer.id = 'sf-drawer'; drawer.hidden = true;
    drawer.innerHTML = '<div class="sf-drawer__scrim" data-close></div>'
      + '<button type="button" class="sf-drawer__close" aria-label="Close" data-close><svg viewBox="0 0 26 26" aria-hidden="true"><path d="m4 4 18 18M22 4 4 22"/></svg></button>'
      + '<div class="sf-drawer__panel" role="dialog" aria-modal="true" aria-label="Filter by"><div class="sf-drawer__head"><strong>Filter by</strong></div><div class="sf-drawer__body">'
      + '<details class="sf-group sf-drawer__sort" open><summary>Sort</summary><div class="sf-sorts">' + drawerSortHtml() + '</div></details>'
      + groups.map(g => '<details class="sf-group" open>' + g.innerHTML + '</details>').join('') + markHtml('sf-powered--filter')
      + '</div><div class="sf-drawer__foot"><button type="button" class="sf-drawer__apply" data-close>View items</button></div></div>';
    document.body.appendChild(drawer);
    drawer.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDrawer(); const s = e.target.closest('.sf-sorts button'); if (s) { if (SORT && s.dataset.sort) setSort(s.dataset.sort); else drawer.querySelectorAll('.sf-sorts button').forEach(b => b.classList.toggle('is-on', b === s)); } });
  }
  const closePanels = () => document.querySelectorAll('.sf-hbtn[aria-expanded=true]').forEach(b => { b.setAttribute('aria-expanded', 'false'); document.getElementById(b.getAttribute('aria-controls')).hidden = true; });
  function applyLayout() {
    const l = layoutNow(); document.body.dataset.filterLayout = l; closeDrawer(); closePanels(); headLeft.innerHTML = '';
    if (l === 'horizontal') {
      headLeft.innerHTML = '<div class="sf-hbar"><strong class="sf-hbar__label">Filter by:</strong><div class="sf-hbar__list">' + groups.map((g, i) => '<div class="sf-hitem"><button type="button" class="sf-hbtn" aria-expanded="false" aria-controls="sf-hp-' + i + '">' + esc(labelOf(g)) + CHEV + '</button><div class="sf-hpanel" id="sf-hp-' + i + '" hidden>' + bodyOf(g) + '</div></div>').join('') + '</div>' + markHtml('sf-powered--hbar') + '</div>';
    } else if (l === 'offcanvas') {
      buildDrawer();
      headLeft.innerHTML = '<button type="button" class="sf-fbtn" id="sf-open-drawer" aria-haspopup="dialog" aria-expanded="false">' + SLIDERS + '<span class="sf-fbtn__d">Filter by</span><span class="sf-fbtn__m">Filter and sort</span></button>';
    }
    showPlaced();
  }
  headLeft.addEventListener('click', e => {
    if (e.target.closest('#sf-open-drawer')) { openDrawer(); return; }
    const b = e.target.closest('.sf-hbtn'); if (!b) return;
    const was = b.getAttribute('aria-expanded') === 'true'; closePanels(); if (!was) { b.setAttribute('aria-expanded', 'true'); const pn = document.getElementById(b.getAttribute('aria-controls')); pn.hidden = false; pn.classList.remove('is-right'); if (pn.getBoundingClientRect().right > innerWidth - 16) pn.classList.add('is-right'); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.sf-hitem')) closePanels(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePanels(); if (drawer && !drawer.hidden) closeDrawer(); } });
  window.addEventListener('storage', e => { if (e.key === DESIGN_KEY) applyLayout(); });                // the admin changed the layout in another tab
  phone.addEventListener('change', applyLayout);
  applyLayout();

  WM.onChange(() => { showBadge(); showPlaced(); });                                                                      // Master, the store type or the badge changed in the admin tab
  update(); showPlaced();
})();
