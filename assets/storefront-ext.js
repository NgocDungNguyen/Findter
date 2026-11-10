/* Sample storefront, part 2 (storefront.html / storefront-search.html): the features the admin switches on.
   - Product compare (Advanced features switch findter.feature.compare): a "Compare with" option in the toolbar, a tick on every card, up to 5 products, a Compare bar and a comparison window with Quick add.
   - Product grid design, Phase 3 (findter.design.grid.v1, saved on the Product grid & card page): review stars, Quick add, Quick view and Wishlist buttons, each with its own window.
   - Year Make Model widget (findter.ymm.*, set on the Year Make Model page): admin-edited labels, "Remember vehicle selection", and every search is added to the admin's Manage history.
   Everything follows the admin tab live through "storage" events. Shopper-side data (cart, wishlist, saved vehicles) lives in this page's own storage. */
(() => {
  'use strict';
  const S = window.FindterStore;
  if (!S) return;
  const { PRODUCTS, money, esc } = S;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* blocked */ } }, json: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } } };
  const K = { grid: 'findter.design.grid.v1', compare: 'findter.feature.compare', widget: 'findter.ymm.widget.v1', options: 'findter.ymm.options.v1', history: 'findter.ymm.history.v1', wish: 'findter.store.wishlist.v1', saved: 'findter.store.vehicles.v1' };
  const bySku = Object.fromEntries(PRODUCTS.map(p => [p.sku, p]));
  const MAX = 5, SIZES = ['30 ml', '50 ml', '100 ml'];
  const ICON = {
    heart: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 16.5S3.5 12.6 3.5 8A3.4 3.4 0 0 1 10 6.6 3.4 3.4 0 0 1 16.5 8c0 4.6-6.5 8.5-6.5 8.5Z"/></svg>',
    eye: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 10S5 5 10 5s7.5 5 7.5 5-2.5 5-7.5 5-7.5-5-7.5-5Z"/><circle cx="10" cy="10" r="2.2"/></svg>',
    x: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>',
  };

  /* ---------- admin settings ---------- */
  const grid = () => { const g = store.json(K.grid, {}) || {}; const on = o => (o && o.enabled ? o : null); return { rating: on(g.rating_review), qa: on(g.quick_add), qv: on(g.quick_view), wl: on(g.wishlist) }; };
  const compareOn = () => store.get(K.compare) === '1';

  /* ---------- toast, windows ---------- */
  const live = document.createElement('div'); live.className = 'sfx-toast'; live.setAttribute('role', 'status'); document.body.appendChild(live);
  let toastTimer = null;
  const toast = msg => { live.textContent = msg; live.classList.add('is-on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => live.classList.remove('is-on'), 2600); };
  function openWindow(html, { label, wide }) {
    const opener = document.activeElement;
    const w = document.createElement('div'); w.className = 'sfx-win';
    w.innerHTML = `<div class="sfx-win__scrim" data-close></div><div class="sfx-win__box${wide ? ' sfx-win__box--wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(label)}"><button type="button" class="sfx-win__x" data-close aria-label="Close">${ICON.x}</button>${html}</div>`;
    document.body.appendChild(w); document.documentElement.classList.add('sfx-lock');
    const close = () => { document.removeEventListener('keydown', onKey, true); w.remove(); if (!$('.sfx-win')) document.documentElement.classList.remove('sfx-lock'); if (opener && document.contains(opener)) opener.focus({ preventScroll: true }); };
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Tab') { const f = $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]', w), a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    }
    w.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey, true);
    const first = $('.sfx-win__x', w); if (first) first.focus({ preventScroll: true });
    return { w, close };
  }

  /* ---------- cart and wishlist (shopper side) ---------- */
  let cart = 0;
  const cartBtn = $('.sf-iconbtn[aria-label="Cart"]');
  const paintCart = () => { if (!cartBtn) return; let b = $('.sfx-count', cartBtn); if (!b) { b = document.createElement('span'); b.className = 'sfx-count'; cartBtn.style.position = 'relative'; cartBtn.appendChild(b); } b.textContent = cart; b.hidden = !cart; cartBtn.setAttribute('aria-label', cart ? 'Cart, ' + cart + ' items' : 'Cart'); };
  const addToCart = (p, qty, opt) => { if (p.stock === 'out') return false; cart += qty; paintCart(); toast(`Added to cart: ${p.title}${opt ? ' (' + opt + ')' : ''}${qty > 1 ? ' × ' + qty : ''}`); return true; };
  let wish = store.json(K.wish, []); if (!Array.isArray(wish)) wish = [];
  const saveWish = () => { store.set(K.wish, JSON.stringify(wish)); paintWish(); decorateAll(); };
  const wishBtn = (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sf-iconbtn sfx-wishbtn'; b.hidden = true; b.innerHTML = ICON.heart + '<span class="sfx-count" hidden></span>'; if (cartBtn) cartBtn.before(b); return b; })();
  function paintWish() { const on = !!grid().wl; wishBtn.hidden = !on; wishBtn.setAttribute('aria-label', 'Wishlist' + (wish.length ? ', ' + wish.length + ' saved' : '')); const c = $('.sfx-count', wishBtn); c.textContent = wish.length; c.hidden = !wish.length; }

  /* ---------- windows: wishlist, quick view, choose options, compare ---------- */
  const starHtml = p => `<span class="sfx-stars" style="--r:${(p.rating / 5 * 100).toFixed(0)}%" aria-hidden="true">★★★★★</span>`;
  const pic = (p, cls = '') => `<span class="sfx-pic ${cls}" aria-hidden="true"></span>`;
  function wishlistWindow(justAdded) {
    const { w } = openWindow('', { label: 'Wishlist' });
    const box = $('.sfx-win__box', w);
    const paint = () => {
      const list = wish.map(sku => bySku[sku]).filter(Boolean);
      box.querySelectorAll('.sfx-wl').forEach(e => e.remove());
      box.insertAdjacentHTML('beforeend', `<div class="sfx-wl"><h2 class="sfx-h">Wishlist <span class="sfx-sub">(${list.length})</span></h2>${justAdded ? `<p class="sfx-note" role="status">Saved “${esc(justAdded)}” to your wishlist.</p>` : ''}${list.length ? `<ul class="sfx-wl__list">${list.map(p => `<li class="sfx-wl__row">${pic(p)}<span class="sfx-wl__t"><strong>${esc(p.title)}</strong><span>${money(p.price)}</span></span><button type="button" class="sfx-btn sfx-btn--sm" data-add="${p.sku}"${p.stock === 'out' ? ' disabled' : ''}>${p.stock === 'out' ? 'Sold out' : 'Add to cart'}</button><button type="button" class="sfx-link" data-rm="${p.sku}" aria-label="Remove ${esc(p.title)} from wishlist">Remove</button></li>`).join('')}</ul>` : '<p class="sfx-empty">Your wishlist is empty. Tap the heart on a product to save it.</p>'}<button type="button" class="sfx-btn sfx-btn--line" data-close>Continue shopping</button></div>`);
    };
    paint();
    box.addEventListener('click', e => {
      const a = e.target.closest('[data-add]'); if (a) { addToCart(bySku[a.dataset.add], 1); return; }
      const r = e.target.closest('[data-rm]'); if (r) { wish = wish.filter(s => s !== r.dataset.rm); justAdded = null; saveWish(); paint(); const f = $('.sfx-win__x', box); if (f) f.focus(); }
    });
  }
  function quickView(p) {
    const sale = p.compare ? Math.round((p.compare - p.price) / p.compare * 100) : 0;
    const { w } = openWindow(`<div class="sfx-qv"><div class="sfx-qv__img">${pic(p, 'sfx-pic--lg')}</div><div class="sfx-qv__b"><p class="sfx-eyebrow">${esc(p.vendor)}</p><h2 class="sfx-h">${esc(p.title)}</h2><p class="sfx-rate">${starHtml(p)} <span>${p.rating.toFixed(1)} (${p.reviews} reviews)</span></p>
      <p class="sfx-price">${money(p.price)}${p.compare ? ` <s>${money(p.compare)}</s> <span class="sfx-off">-${sale}%</span>` : ''}</p><p class="sfx-desc">${esc(p.title)} is a ${esc(p.type.toLowerCase())} product made for everyday use. SKU ${p.sku}.</p>
      <label class="sfx-lab" for="sfx-qv-size">Size</label><select id="sfx-qv-size" class="sfx-sel">${SIZES.map(s => `<option>${s}</option>`).join('')}</select>
      <label class="sfx-lab" for="sfx-qv-qty">Quantity</label><div class="sfx-qty"><button type="button" data-q="-1" aria-label="Decrease quantity">−</button><input id="sfx-qv-qty" type="number" min="1" max="99" value="1" inputmode="numeric"><button type="button" data-q="1" aria-label="Increase quantity">+</button></div>
      <button type="button" class="sfx-btn" data-add${p.stock === 'out' ? ' disabled' : ''}>${p.stock === 'out' ? 'Sold out' : 'Add to cart'}</button><a class="sfx-link" href="#" data-noop>View full details</a></div></div>`, { label: 'Quick view: ' + p.title, wide: true });
    const qty = $('#sfx-qv-qty', w);
    w.addEventListener('click', e => {
      const q = e.target.closest('[data-q]'); if (q) { qty.value = Math.max(1, Math.min(99, (+qty.value || 1) + (+q.dataset.q))); return; }
      if (e.target.closest('[data-noop]')) { e.preventDefault(); return; }
      if (e.target.closest('[data-add]')) addToCart(p, Math.max(1, +qty.value || 1), $('#sfx-qv-size', w).value);
    });
  }
  function chooseOptions(p) {
    const { w, close } = openWindow(`<div class="sfx-co"><h2 class="sfx-h">Choose options</h2><p class="sfx-co__p">${pic(p)}<span><strong>${esc(p.title)}</strong><br>${money(p.price)}</span></p><label class="sfx-lab" for="sfx-co-size">Size</label><select id="sfx-co-size" class="sfx-sel">${SIZES.map(s => `<option>${s}</option>`).join('')}</select><button type="button" class="sfx-btn" data-add${p.stock === 'out' ? ' disabled' : ''}>${p.stock === 'out' ? 'Sold out' : 'Add to cart'}</button></div>`, { label: 'Choose options: ' + p.title });
    w.addEventListener('click', e => { if (e.target.closest('[data-add]') && addToCart(p, 1, $('#sfx-co-size', w).value)) close(); });
  }

  /* ---------- product compare ---------- */
  let cmpMode = false, sel = [];
  const ROWS = [
    ['Price', p => money(p.price), p => p.price],
    ['Availability', p => p.stock === 'out' ? 'Out of stock' : 'In stock', p => p.stock],
    ['Vendor', p => esc(p.vendor), p => p.vendor], ['Product type', p => esc(p.type), p => p.type],
    ['Rating', p => starHtml(p) + ' ' + p.rating.toFixed(1), p => p.rating], ['Reviews', p => String(p.reviews), p => p.reviews],
    ['On sale', p => p.salePct ? '-' + p.salePct + '%' : 'No', p => p.salePct],
    ['Shelf life', p => p.mf.shelf_life + ' months', p => p.mf.shelf_life], ['Net weight', p => p.mf.net_weight.toFixed(0) + ' g', p => p.mf.net_weight], ['Active ingredient', p => p.mf.purity.toFixed(1) + '%', p => p.mf.purity], ['SKU', p => p.sku, p => p.sku],
  ];
  function compareWindow() {
    const items = sel.map(s => bySku[s]).filter(Boolean); if (items.length < 2) return;
    let diffOnly = false;
    const { w, close } = openWindow('', { label: 'Compare products', wide: true });
    const box = $('.sfx-win__box', w);
    const paint = () => {
      const prods = sel.map(s => bySku[s]), low = Math.min(...prods.map(p => p.price));
      const rows = ROWS.filter(r => !diffOnly || new Set(prods.map(p => String(r[2](p)))).size > 1);
      $$('.sfx-cmp', box).forEach(e => e.remove());
      box.insertAdjacentHTML('beforeend', `<div class="sfx-cmp"><div class="sfx-cmp__h"><h2 class="sfx-h">Compare products</h2><label class="sfx-chk"><input type="checkbox" id="sfx-diff"${diffOnly ? ' checked' : ''}> Show differences only</label></div>
        <div class="sfx-cmp__scroll"><table class="sfx-cmp__t"><caption class="sfx-sr">${prods.length} products compared</caption><thead><tr><td></td>${prods.map(p => `<th scope="col" class="sfx-cmp__p">${pic(p)}<button type="button" class="sfx-cmp__x" data-rm="${p.sku}" aria-label="Remove ${esc(p.title)} from the comparison">${ICON.x}</button><span class="sfx-cmp__n">${esc(p.title)}</span><span class="sfx-cmp__pr">${money(p.price)}${p.price === low ? ' <span class="sfx-off">Lowest price</span>' : ''}</span><button type="button" class="sfx-btn sfx-btn--sm" data-add="${p.sku}"${p.stock === 'out' ? ' disabled' : ''}>${p.stock === 'out' ? 'Sold out' : 'Quick add'}</button></th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr><th scope="row">${r[0]}</th>${prods.map(p => `<td>${r[1](p)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="' + (prods.length + 1) + '" class="sfx-empty">These products have the same details.</td></tr>'}</tbody></table></div></div>`);
    };
    paint();
    box.addEventListener('change', e => { if (e.target.id === 'sfx-diff') { diffOnly = e.target.checked; paint(); $('#sfx-diff', box).focus(); } });
    box.addEventListener('click', e => {
      const a = e.target.closest('[data-add]'); if (a) { addToCart(bySku[a.dataset.add], 1); return; }
      const r = e.target.closest('[data-rm]'); if (r) { sel = sel.filter(s => s !== r.dataset.rm); syncCompare(); if (sel.length < 2) { close(); toast('Choose at least 2 products to compare.'); } else { paint(); $('.sfx-win__x', box).focus(); } }
    });
  }
  const cmpBtn = (() => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sfx-cmpbtn'; b.setAttribute('aria-pressed', 'false'); b.hidden = true; b.innerHTML = '<span>Compare with</span>'; const t = $('.sf-toolbar'); if (t) t.prepend(b); return b; })();
  const bar = document.createElement('div'); bar.className = 'sfx-bar'; bar.hidden = true; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Compare products'); document.body.appendChild(bar);
  function syncCompare() {
    const on = compareOn();
    cmpBtn.hidden = !on; if (!on && cmpMode) { cmpMode = false; sel = []; }
    cmpBtn.setAttribute('aria-pressed', String(cmpMode)); cmpBtn.firstChild.textContent = cmpMode ? 'Done comparing' : 'Compare with';
    document.body.classList.toggle('sfx-cmp-on', cmpMode);
    bar.hidden = !cmpMode;
    if (cmpMode) bar.innerHTML = `<div class="sfx-bar__in"><div class="sfx-bar__list">${sel.map(s => `<span class="sfx-chip">${pic(bySku[s], 'sfx-pic--sm')}<span>${esc(bySku[s].title)}</span><button type="button" data-rm="${s}" aria-label="Remove ${esc(bySku[s].title)}">${ICON.x}</button></span>`).join('') || '<span class="sfx-bar__hint">Tick up to 5 products to compare.</span>'}</div><span class="sfx-bar__n" aria-live="polite">${sel.length} of ${MAX}${sel.length >= MAX ? ' · the most you can compare' : ''}</span><button type="button" class="sfx-btn sfx-btn--sm" data-go${sel.length < 2 ? ' disabled' : ''}>Compare</button><button type="button" class="sfx-link" data-clear>Clear</button></div>`;
    decorateAll();
  }
  cmpBtn.addEventListener('click', () => { cmpMode = !cmpMode; if (!cmpMode) sel = []; syncCompare(); });
  bar.addEventListener('click', e => {
    if (e.target.closest('[data-go]')) { compareWindow(); return; }
    if (e.target.closest('[data-clear]')) { sel = []; syncCompare(); return; }
    const r = e.target.closest('[data-rm]'); if (r) { sel = sel.filter(s => s !== r.dataset.rm); syncCompare(); }
  });

  /* ---------- product cards ---------- */
  const gridEl = $('#sf-grid');
  function decorate(li) {
    const p = bySku[li.dataset.sku]; if (!p) return;
    $$('.sfx', li).forEach(e => e.remove());
    const g = grid(), img = $('.sf-card__img', li), price = $('.sf-card__price', li), saved = wish.includes(p.sku);
    /* every button sits in the corner the admin chose (Product grid & card); buttons in the same corner stack (the Unavailable tag already takes the top left) */
    const st = { top: { left: $('.sf-tag', li) ? 54 : 14, right: 14 }, bottom: { left: 14, right: 14 } };
    const place = (pos, size) => { const v = String(pos).includes('bottom') ? 'bottom' : 'top', h = String(pos).includes('left') ? 'left' : 'right'; const css = h + ':14px;' + v + ':' + st[v][h] + 'px'; st[v][h] += size + 6; return css; };
    const stars = '<span class="sfx-stars-wrap">' + starHtml(p) + '<span>' + p.rating.toFixed(1) + (g.rating && g.rating.show_count ? ' (' + p.reviews + ')' : '') + '</span></span>';
    if (g.rating && (!g.rating.position || g.rating.position === 'below')) price.insertAdjacentHTML('afterend', '<p class="sfx sfx-rating" aria-label="Rated ' + p.rating.toFixed(1) + ' out of 5">' + stars + '</p>');
    let h = '';
    if (g.wl) h += `<button type="button" class="sfx sfx-heart${saved ? ' is-on' : ''}" style="${place(g.wl.position || 'top right', 34)}" data-wish aria-pressed="${saved}" aria-label="${saved ? 'Saved to wishlist' : 'Add to wishlist'}: ${esc(p.title)}">${ICON.heart}</button>`;
    if (g.qv) h += `<button type="button" class="sfx sfx-qv-btn${g.qv.style === 'text' ? ' sfx-qv-btn--text' : ''}" style="${place(g.qv.position || 'bottom right', g.qv.style === 'text' ? 30 : 34)}" data-qv aria-label="Quick view: ${esc(p.title)}">${g.qv.style === 'text' ? 'Quick view' : ICON.eye}</button>`;
    if (g.qa) h += `<button type="button" class="sfx sfx-qa${g.qa.show === 'always' ? ' is-always' : ''}" style="${place(g.qa.position || 'bottom left', 32)}" data-qa${p.stock === 'out' ? ' disabled' : ''}>${p.stock === 'out' ? 'Sold out' : esc(g.qa.label_style === 'custom' ? (g.qa.custom_text || 'Quick add') : 'Quick add')}</button>`;
    if (g.rating && g.rating.position && g.rating.position !== 'below') h += `<p class="sfx sfx-rating sfx-rating--on" style="${place(g.rating.position, 26)}" aria-label="Rated ${p.rating.toFixed(1)} out of 5">${stars}</p>`;
    if (cmpMode) { const on = sel.includes(p.sku), full = sel.length >= MAX && !on; h += `<label class="sfx sfx-cmpbox${full ? ' is-off' : ''}" style="${place('bottom left', 32)}"><input type="checkbox" data-cmp${on ? ' checked' : ''}${full ? ' disabled' : ''}><span>Compare</span><span class="sfx-sr"> ${esc(p.title)}</span></label>`; }
    img.insertAdjacentHTML('beforeend', h);
  }
  const decorateAll = () => $$('.sf-card', gridEl).forEach(decorate);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.matches('.sf-card')) decorate(n); }))).observe(gridEl, { childList: true });
  gridEl.addEventListener('click', e => {
    const li = e.target.closest('.sf-card'); if (!li) return; const p = bySku[li.dataset.sku];
    if (e.target.closest('[data-wish]')) { const added = !wish.includes(p.sku); if (added) wish.push(p.sku); saveWish(); wishlistWindow(added ? p.title : null); }
    else if (e.target.closest('[data-qv]')) quickView(p);
    else if (e.target.closest('[data-qa]')) chooseOptions(p);
  });
  gridEl.addEventListener('change', e => {
    const c = e.target.closest('[data-cmp]'); if (!c) return; const sku = e.target.closest('.sf-card').dataset.sku;
    if (c.checked) { if (sel.length < MAX) sel.push(sku); else c.checked = false; } else sel = sel.filter(s => s !== sku);
    syncCompare(); const again = $(`.sf-card[data-sku="${sku}"] [data-cmp]`); if (again && !again.disabled) again.focus();
  });
  wishBtn.addEventListener('click', () => wishlistWindow(null));

  /* ---------- Year Make Model widget (collection page) ---------- */
  const OPT_SEED = [   // keep in step with YMM_SEED in ymm.js
    ['Toyota', 'Camry', 2015, 2023], ['Toyota', 'Corolla', 2014, 2024], ['Toyota', 'RAV4', 2016, 2024], ['Honda', 'Civic', 2012, 2023], ['Honda', 'Accord', 2013, 2022], ['Honda', 'CR-V', 2015, 2024],
    ['Ford', 'F-150', 2010, 2023], ['Ford', 'Focus', 2008, 2018], ['Ford', 'Mustang', 2015, 2024], ['BMW', '3 Series', 2012, 2023], ['Tesla', 'Model 3', 2018, 2024], ['Nissan', 'Altima', 2013, 2023],
  ].map(([make, model, from, to], i) => ({ id: i + 1, make, model, from, to }));
  const widgetCfg = () => Object.assign({ enabled: true, title: 'Find parts for your vehicle', select: 'Select', search: 'Search', reset: 'Reset selection', remember: false }, store.json(K.widget, {}) || {});
  const options = () => { const v = store.json(K.options, null); return Array.isArray(v) ? v : OPT_SEED; };
  const hashOf = (y, mk, md) => [...(y + mk + md)].reduce((s, c) => s + c.charCodeAt(0), 0);
  let veh = null, ymmEl = null, pick = { y: '', mk: '', md: '' };
  function drawYmm() {
    if (document.body.dataset.page !== 'collection') return;
    const c = widgetCfg(), host = $('.sf-results');
    if (!c.enabled) { if (ymmEl) { ymmEl.remove(); ymmEl = null; } if (veh) { veh = null; S.setFilter(null); } return; }
    if (!ymmEl) { ymmEl = document.createElement('section'); ymmEl.className = 'sfx-ymm'; ymmEl.setAttribute('aria-label', c.title); host.prepend(ymmEl); }
    const ops = options(), years = [...new Set(ops.flatMap(o => Array.from({ length: o.to - o.from + 1 }, (_, i) => o.from + i)))].sort((a, b) => b - a);
    const makes = [...new Set(ops.filter(o => pick.y && o.from <= +pick.y && +pick.y <= o.to).map(o => o.make))].sort();
    const models = [...new Set(ops.filter(o => pick.y && o.make === pick.mk && o.from <= +pick.y && +pick.y <= o.to).map(o => o.model))].sort();
    const sel = (id, label, list, v, dis) => `<label class="sfx-ymm__f"><span class="sfx-sr">${esc(c.select)} ${label}</span><select id="${id}" class="sfx-sel"${dis ? ' disabled' : ''}><option value="">${esc(c.select)} ${label}</option>${list.map(x => `<option${String(x) === String(v) ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`;
    const savedList = c.remember ? store.json(K.saved, []) : [];
    ymmEl.innerHTML = `<h2 class="sfx-ymm__h">${esc(c.title)}</h2><div class="sfx-ymm__row">${sel('sfx-y', 'year', years, pick.y, false)}${sel('sfx-mk', 'make', makes, pick.mk, !pick.y)}${sel('sfx-md', 'model', models, pick.md, !pick.mk)}<button type="button" class="sfx-btn" data-ymm-go${pick.md ? '' : ' disabled'}>${esc(c.search)}</button><button type="button" class="sfx-link" data-ymm-reset${pick.y || veh ? '' : ' hidden'}>${esc(c.reset)}</button></div>
      ${veh ? `<p class="sfx-ymm__on" role="status">Showing parts for <strong>${esc(veh.y + ' ' + veh.mk + ' ' + veh.md)}</strong></p>` : ''}
      ${c.remember && savedList.length ? `<div class="sfx-ymm__saved"><span class="sfx-ymm__lab">Your vehicles</span>${savedList.map((v, i) => `<button type="button" class="sfx-vchip" data-veh="${i}">${esc(v.y + ' ' + v.mk + ' ' + v.md)}</button>`).join('')}</div>` : ''}`;
  }
  function runVehicle(v) {
    const h = hashOf(v.y, v.mk, v.md), f = p => (p.order + h) % 3 === 0;
    veh = v; pick = { y: v.y, mk: v.mk, md: v.md }; S.setFilter(f);
    const n = PRODUCTS.filter(f).length, hist = store.json(K.history, []); hist.push({ t: new Date().toISOString(), y: v.y, mk: v.mk, md: v.md, r: n }); store.set(K.history, JSON.stringify(hist.slice(-2000)));
    if (widgetCfg().remember) { const list = store.json(K.saved, []).filter(x => !(x.y === v.y && x.mk === v.mk && x.md === v.md)); list.unshift(v); store.set(K.saved, JSON.stringify(list.slice(0, 5))); }
    drawYmm();
  }
  document.addEventListener('change', e => {
    if (!ymmEl || !ymmEl.contains(e.target)) return;
    if (e.target.id === 'sfx-y') pick = { y: e.target.value, mk: '', md: '' }; else if (e.target.id === 'sfx-mk') pick = { ...pick, mk: e.target.value, md: '' }; else if (e.target.id === 'sfx-md') pick = { ...pick, md: e.target.value }; else return;
    drawYmm(); const f = $('#' + e.target.id, ymmEl); if (f) f.focus();
  });
  document.addEventListener('click', e => {
    if (!ymmEl || !ymmEl.contains(e.target)) return;
    if (e.target.closest('[data-ymm-go]')) runVehicle({ ...pick });
    else if (e.target.closest('[data-ymm-reset]')) { pick = { y: '', mk: '', md: '' }; veh = null; S.setFilter(null); drawYmm(); }
    else { const v = e.target.closest('[data-veh]'); if (v) runVehicle(store.json(K.saved, [])[+v.dataset.veh]); }
  });

  /* ---------- follow the admin tab ---------- */
  window.addEventListener('storage', e => { if (!e.key || [K.grid, K.compare].includes(e.key)) { paintWish(); syncCompare(); decorateAll(); } if (!e.key || [K.widget, K.options].includes(e.key)) drawYmm(); });
  paintCart(); paintWish(); syncCompare(); decorateAll(); drawYmm();
})();
