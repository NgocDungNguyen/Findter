/* Filter & product grid design > Filter design: the "Filter layout" options (Desktop: Vertical, Horizontal, Off-canvas) choose how the sample storefront shows its filters.
   Saved in localStorage (findter.filterLayout) like the other demo settings; the real app saves it per shop. Mobile is always Off-canvas, so that option stays checked. */
(() => {
  'use strict';
  const KEY = 'findter.filterLayout', NAMES = { Vertical: 'vertical', Horizontal: 'horizontal', 'Off-canvas': 'offcanvas' };
  const inputs = {}; let mobile = null;
  document.querySelectorAll('.Polaris-Choice__Label').forEach(l => {
    const name = l.textContent.trim(), input = l.closest('label') && l.closest('label').querySelector('input[type=checkbox]');
    if (!input || !NAMES[name]) return;
    if (inputs[name]) { if (name === 'Off-canvas' && !mobile) mobile = input; return; }       // the first of each is Desktop; the second Off-canvas is Mobile
    inputs[name] = input;
  });
  let current = 'vertical'; try { const v = localStorage.getItem(KEY); if (Object.values(NAMES).includes(v)) current = v; } catch (e) { /* storage blocked */ }
  const show = () => Object.entries(inputs).forEach(([n, i]) => { i.checked = NAMES[n] === current; i.setAttribute('aria-checked', String(i.checked)); });
  show();
  Object.entries(inputs).forEach(([n, i]) => i.addEventListener('change', () => { current = NAMES[n]; try { localStorage.setItem(KEY, current); } catch (e) { /* storage blocked */ } show(); }));
  if (mobile) { mobile.checked = true; mobile.addEventListener('change', () => { mobile.checked = true; }); }
})();
