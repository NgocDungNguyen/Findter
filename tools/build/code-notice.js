/* Promotion shortcuts + the "Code: … copied successfully" notice.
   Stand-alone on purpose: index.html inlines it, every other page loads assets/code-notice.js, so the notice can be shown on whichever page a promotion lands on.
   - routes: the "/shortcut" links an admin can type in a promotion (Master -> Promotion). They open inside the app, in the SAME tab.
   - go(link, code): opens a link for a promotion. Shortcut -> same tab (the notice is queued and shown on the landing page, near the header);
     https:// link -> new tab (that site is not ours, so the notice is shown here); unknown shortcut -> nothing opens, the notice is shown here.
   In the real app the landing page is the app's own route and the queue is a query flag; here it is sessionStorage. */
(() => {
  'use strict';
  const KEY = 'findter.codeNotice', SHOW_MS = 4500, MAX_AGE = 30000;
  const routes = {
    '/': 'index.html', '/home': 'index.html',
    '/filter': 'filter.html', '/filter-booster': 'filter-boost.html',
    '/search': 'search.html', '/search-booster': 'search-boost.html',
    '/metafield': 'metafield.html', '/ymm': 'ymm.html', '/features': 'features.html',
    '/design': 'design.html', '/product-grid': 'design-product-grid.html',
    '/pricing': 'pricing.html',
  };
  const resolve = link => {                                   // "/Filter/?x=1" -> "filter.html" (or '' when it is not a known shortcut)
    const p = String(link || '').trim().split(/[?#]/)[0].toLowerCase().replace(/(.)\/+$/, '$1');
    return Object.prototype.hasOwnProperty.call(routes, p) ? routes[p] : '';
  };

  const css = document.createElement('style');
  css.textContent = '.cn-pill{position:fixed;top:62px;left:50%;z-index:2147483000;transform:translate(-50%,-8px);max-width:calc(100vw - 32px);box-sizing:border-box;padding:10px 24px;border-radius:999px;background:#1a1a1a;color:#fff;font:550 14px/20px -apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,sans-serif;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.25);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}'
    + '.cn-pill.is-on{opacity:1;transform:translate(-50%,0)}@media (prefers-reduced-motion:reduce){.cn-pill{transition:none}}';
  document.head.appendChild(css);

  let pill, timer;
  const show = code => {
    if (!code) return;
    if (!pill) { pill = document.createElement('div'); pill.className = 'cn-pill'; pill.setAttribute('role', 'status'); document.body.appendChild(pill); }
    pill.textContent = 'Code: ' + code + ' copied successfully';
    void pill.offsetWidth; pill.classList.add('is-on');
    clearTimeout(timer); timer = setTimeout(() => pill.classList.remove('is-on'), SHOW_MS);
  };
  const queue = code => { try { sessionStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() })); } catch (e) { /* storage blocked: the notice is simply not carried over */ } };
  const takeQueued = () => {
    try { const q = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); return q && q.code && Date.now() - q.at < MAX_AGE ? q.code : ''; } catch (e) { return ''; }
  };
  // returns 'same-tab' | 'new-tab' | 'unknown'
  const go = (link, code) => {
    const file = resolve(link);
    if (file) { if (code) queue(code); location.assign(file); return 'same-tab'; }
    if (/^\/(?!\/)/.test(link)) { show(code); return 'unknown'; }
    window.open(link, '_blank', 'noopener,noreferrer'); show(code); return 'new-tab';
  };

  window.__codeNotice = { routes, resolve, show, go };
  const queued = takeQueued(); if (queued) show(queued);      // we just landed from a promotion
})();
