/* Sample storefront (collection page + header search with suggestions), for testing where the "Powered by Findter" badge goes.
   The badge shows under the suggestions box (right corner, outside the box) while FindterWatermark.onStorefront() is true: the feature is on in
   Master -> Features, the shop's type is ticked, and the badge was not removed. It follows the admin tab live (storage events). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const WM = window.FindterWatermark;
  const PRODUCTS = [
    ['Hydrating Face Serum', 'Skin care', 34, 'in'], ['Vitamin C Brightening Cream', 'Skin care', 29, 'in'], ['Gentle Foaming Cleanser', 'Skin care', 18, 'in'],
    ['Rose Water Toner', 'Skin care', 16, 'out'], ['Matte Liquid Lipstick', 'Makeup', 22, 'in'], ['Daily Sunscreen SPF 50', 'Skin care', 27, 'in'],
    ['Overnight Repair Mask', 'Skin care', 31, 'out'], ['Eye Contour Gel', 'Skin care', 26, 'in'], ['Hand Cream Trio', 'Body', 21, 'in'],
    ['Cocoa Body Lotion', 'Body', 19, 'in'], ['Hair Repair Oil', 'Hair', 24, 'out'], ['Cotton Makeup Pads', 'Makeup', 9, 'in'],
  ].map(([title, type, price, stock], i) => ({ title, type, price, stock, vendor: 'Demo Cosmetics', sku: String(10001 + i) }));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const money = n => '$' + n.toFixed(2);

  /* ---------- collection ---------- */
  $('#sf-count').textContent = PRODUCTS.length + ' products';
  $('#sf-grid').innerHTML = PRODUCTS.map(p => '<li class="sf-card"><div class="sf-card__img">' + (p.stock === 'out' ? '<span class="sf-tag">Unavailable</span>' : '') + '</div>'
    + '<p class="sf-card__title">' + esc(p.title) + '</p><p class="sf-card__meta">' + p.sku + '</p><p class="sf-card__meta">' + esc(p.vendor) + '</p><p class="sf-card__price">' + money(p.price) + '</p>'
    + '<button type="button" class="sf-card__btn"' + (p.stock === 'out' ? ' disabled' : '') + '>' + (p.stock === 'out' ? 'Sold out' : 'Add to cart') + '</button></li>').join('');
  if (matchMedia('(max-width:749px)').matches) document.querySelectorAll('.sf-group').forEach(g => g.removeAttribute('open'));

  /* ---------- header search ---------- */
  const header = $('#sf-header'), panel = $('#sf-search'), scrim = $('#sf-scrim'), q = $('#sf-q'), openBtn = $('#sf-open-search');
  const suggest = $('#sf-suggest'), list = $('#sf-suggest-list'), all = $('#sf-suggest-all'), clear = $('#sf-clear'), powered = $('#sf-powered');
  const setOpen = open => {
    panel.hidden = !open; scrim.hidden = !open; header.classList.toggle('is-searching', open); openBtn.setAttribute('aria-expanded', String(open));
    if (open) q.focus(); else { q.value = ''; update(); openBtn.focus(); }
  };
  function update() {
    const term = q.value.trim(), t = term.toLowerCase();
    q.closest('.sf-search__field').classList.toggle('has-value', !!term); clear.hidden = !term;
    if (!term) { suggest.hidden = true; q.setAttribute('aria-expanded', 'false'); showBadge(); return; }
    const hits = PRODUCTS.filter(p => (p.title + ' ' + p.type + ' ' + p.vendor).toLowerCase().split(/\s+/).some(w => w.startsWith(t)) || p.title.toLowerCase().includes(t)).slice(0, 5);
    list.innerHTML = hits.length
      ? '<p class="sf-suggest__head">Products</p>' + hits.map(p => '<a class="sf-suggest__item" href="#"><span class="sf-suggest__img"></span><span><span class="sf-suggest__title">' + esc(p.title) + '</span><span class="sf-suggest__price">' + money(p.price) + '</span></span></a>').join('')
      : '<p class="sf-suggest__none">No results for “' + esc(term) + '”</p>';
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
  suggest.addEventListener('click', e => { if (e.target.closest('a')) e.preventDefault(); });
  WM.onChange(showBadge);                                                                      // Master, the store type or the badge changed in the admin tab
  update();
})();
