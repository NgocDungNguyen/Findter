/* Advanced features: the Product compare switch. On = the storefront shows "Compare with" in the toolbar (storefront-ext.js reads findter.feature.compare). Off by default. */
(() => {
  'use strict';
  const sw = document.querySelector('.pg-switch[data-feature=compare]'); if (!sw) return;
  const KEY = 'findter.feature.compare';
  try { sw.checked = localStorage.getItem(KEY) === '1'; } catch (e) { /* storage blocked */ }
  sw.addEventListener('change', () => { try { localStorage.setItem(KEY, sw.checked ? '1' : '0'); } catch (e) { /* storage blocked */ } if (window.__shell) window.__shell.toast(sw.checked ? 'Product compare is on' : 'Product compare is off'); });
})();
