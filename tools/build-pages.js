// Builds the stand-alone pages + assets/ from the finished index.html (shell) and the captured page markup.
// Run after `node build.js`:   node build-pages.js
const fs = require('fs'); const path = require('path'); const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const rd = p => fs.readFileSync(path.join(__dirname, p), 'utf8');

// flat: false = plain Polaris capture (wrapped by the pg-* classes); flat: true = Shopify web components flattened from the live app (cap/pages/<key>.flat.html)
const PAGES = [
  { key: 'filter', file: 'filter.html', active: 'Filter', customFilter: true },
  { key: 'search', file: 'search.html', active: 'Search' },
  { key: 'metafield', file: 'metafield.html', active: 'Metafield' },
  { key: 'filter-booster', file: 'filter-boost.html', active: 'Filter', flat: true, customFilter: true },
  { key: 'search-booster', file: 'search-boost.html', active: 'Search', flat: true },
  { key: 'ymm', file: 'ymm.html', active: 'Year Make Model', flat: true },
  { key: 'features', file: 'features.html', active: 'Advanced features', flat: true },
  { key: 'design', file: 'design.html', active: 'Filter & product grid design', flat: true },
  { key: 'design-tab2', file: 'design-product-grid.html', active: 'Filter & product grid design', flat: true },
];
// tabs that are separate pages
const TAB_PAGES = { 'Manage filter set': 'filter.html', 'Collection booster': 'filter-boost.html', 'Search settings': 'search.html', 'Search booster': 'search-boost.html', 'Filter design': 'design.html', 'Product grid design': 'design-product-grid.html' };
const APP_ASSETS = 'https://findter-production.flintverse.com/assets/';
const CHEVRON = '<span type="chevron-right" class="pg-chevron" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M5.72 12.53a.75.75 0 0 1 0-1.06l3.47-3.47-3.47-3.47a.749.749 0 1 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06 0"></path></svg></span>';

/* ---------- shared assets ---------- */
const home = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8')).window.document;
fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
const css = [...home.querySelectorAll('style')].map(s => s.textContent).join('\n') + '\n' + rd('build/pages.css');
fs.writeFileSync(path.join(root, 'assets', 'common.css'), css);

// shell behaviour = the first part of the home script (nav, menus, search, Sidekick, chat); home-only features are stubbed
const app = rd('build/app.js'); const cut = app.indexOf('  /* ---------- app: collapsibles');
if (cut < 0) throw new Error('shell/app split marker not found in build/app.js');
let shell = app.slice(0, cut).replace("'use strict';", "'use strict';\n  const updateCarousel = () => {}, closeDatePicker = () => {}, hideTip = () => {}, closeThemeModal = () => {};   // home-page features that do not exist on these pages");
shell += '\n  window.__shell = { toast, closePops, openChatWith: (text, reply) => { toggleChat(true); sendChat(text); if (reply) setTimeout(() => replyChat(reply), 800); } };\n  applyNav();\n})();\n';
fs.writeFileSync(path.join(root, 'assets', 'shell.js'), shell);
fs.writeFileSync(path.join(root, 'assets', 'pages.js'), rd('build/pages.js'));

/* ---------- shell pieces copied from index.html so every page stays in sync with it ---------- */
const pick = sel => [...home.querySelectorAll(sel)].map(e => e.outerHTML).join('\n');
const parts = {
  topbar: pick('header.sh-top'), sk: pick('.sk'), fabs: pick('.m-fab--menu') + '\n' + pick('.m-fab--sk'),
  chat: pick('.chat-bubble') + '\n' + pick('.chat-panel'), pops: pick('.pop'), search: pick('#scrim-search'), toast: pick('#toast'),
};
const title = home.querySelector('title').textContent;
const icon = home.querySelector('link[rel=icon]').getAttribute('href');

function navFor(label) {
  const aside = new JSDOM(`<body>${home.querySelector('aside#nav').outerHTML}</body>`).window.document;
  const parent = aside.querySelector('.sh-appgroup > a[aria-current=page]');
  parent.removeAttribute('aria-current'); parent.classList.add('sh-item--parent'); parent.setAttribute('href', 'index.html'); parent.setAttribute('data-nav', 'page');
  aside.querySelector('.sh-item--master').setAttribute('href', 'index.html#/master');
  const sub = [...aside.querySelectorAll('.sh-item--sub')].find(a => a.textContent.trim() === label);
  if (!sub) throw new Error('sidebar item not found: ' + label);
  sub.setAttribute('aria-current', 'page');
  const rail = aside.querySelector('.sh-appsrail'); rail.setAttribute('href', 'index.html'); rail.setAttribute('data-nav', 'page');
  return aside.querySelector('aside#nav').outerHTML;
}

/* ---------- generated-class clean-up (same rules as the home page build) ---------- */
function pruneFlat(c) {
  const NL = String.fromCharCode(10);
  const pageGrids = [];
  const body = c.split(NL).map(line => {
    const m = line.match(/^(\.[a-z]+\d+)\{(.*)\}$/); if (!m) return line;
    let props = m[2].split(';');
    if (!props.some(p => /^border-(top|right|bottom|left)-width/.test(p))) props = props.filter(p => !/^border-(top|right|bottom|left)-(color|style)/.test(p));
    if (!props.some(p => p.startsWith('text-decoration-line'))) props = props.filter(p => !/^text-decoration-(style|color)/.test(p));
    props = props.map(p => p.replace(/^grid-template-columns:(\d+px)$/, 'grid-template-columns:minmax(0,$1)'));   // fixed px column captured at 1440 -> shrinks on small screens
    if (props.some(p => /^grid-template-columns:minmax\(0,\d+px\)$/.test(p))) pageGrids.push(m[1]);
    return m[1] + '{' + props.join(';') + '}';
  }).join(NL);
  // the page container loses its side gutter on phones (same as pg-grid for the plain pages)
  return body + (pageGrids.length ? NL + '@media (max-width:767px){' + pageGrids.join(',') + '{padding-left:0;padding-right:0}}' : '');
}

/* ---------- page content ---------- */
function contentFor(p) {
  if (p.flat) {
    const doc = new JSDOM(`<body>${rd(`cap/pages/${p.key}.flat.html`)}</body>`).window.document;
    doc.querySelectorAll('#PolarisPortalsContainer, .Polaris-Tabs__TabsMeasurer, .Polaris-Tabs__DisclosureTab').forEach(e => e.remove());
    doc.querySelectorAll('[aria-owns]').forEach(e => e.removeAttribute('aria-owns'));
    doc.querySelectorAll('[data-state]').forEach(e => e.removeAttribute('data-state'));
    markTabs(doc);
    if (p.customFilter) customFilterBanner(doc, doc.body);
    return doc.querySelector('#app').outerHTML.split(APP_ASSETS).join('assets/img/');
  }
  const doc = new JSDOM(`<body>${rd(`cap/pages/${p.key}.html`)}</body>`).window.document;
  const stack = doc.querySelector('s-stack');
  const inner = doc.createElement('div'); [...stack.childNodes].forEach(n => inner.appendChild(n));
  inner.querySelectorAll('#PolarisPortalsContainer, .Polaris-Tabs__TabsMeasurer, .Polaris-Tabs__DisclosureTab').forEach(e => e.remove());
  inner.querySelectorAll('s-icon[type="chevron-right"]').forEach(e => { const w = doc.createElement('span'); w.innerHTML = CHEVRON; e.replaceWith(w.firstChild); });
  inner.querySelectorAll('[aria-owns]').forEach(e => e.removeAttribute('aria-owns'));
  inner.querySelectorAll('[data-state]').forEach(e => e.removeAttribute('data-state'));
  markTabs(inner);
  if (p.key === 'search') { const c = [...inner.querySelectorAll('.Polaris-Banner button.Polaris-Link')].find(b => b.textContent.trim() === 'Contact us'); if (!c) throw new Error('search Contact us button not found'); c.setAttribute('data-chat', 'search'); inner.querySelectorAll('.Polaris-Banner a[href*=calendly]').forEach(l => l.setAttribute('href', 'https://calendly.com/flintverse-bsscommerce/30min')); }
  if (p.customFilter) customFilterBanner(doc, inner);
  return `<div id="app"><div class="pg-contents"><main class="pg-main"><div class="pg-grid"><div class="pg-stack">${inner.innerHTML}</div></div></main></div></div>`;
}
// the original app mislabels two tabs (aria-label "Search" / "Search booster" on other tabs), so the visible text decides; the label is then corrected
/* Filter pages (both tabs): the "custom solution" info banner sits right under the tabs, copied from the Search page so the box, icon, fonts and radius are identical.
   It replaces the old "Got feedback or a feature request?" banner. "Contact us" has the chat send "Hi, I want to make a custom filter request"; "Book a call" is a normal link. */
function customFilterBanner(doc, root) {
  const src = new JSDOM(`<body>${rd('cap/pages/search.html')}</body>`).window.document.querySelector('.Polaris-Banner').closest('.Polaris-Layout__Section').outerHTML;
  let html = src;
  const swap = (a, b) => { if (!html.includes(a)) throw new Error('banner text not found: ' + a); html = html.split(a).join(b); };
  swap('custom search solution', 'custom filter solution');
  swap('<button type="button" class="Polaris-Link Polaris-Link--monochrome">Contact us</button>', '<button type="button" class="Polaris-Link Polaris-Link--monochrome" data-chat="filter">Contact us</button>');
  swap('30min?month=2026-05', '30min');
  root.querySelectorAll('.Polaris-Banner').forEach(b => (b.closest('.Polaris-Layout__Section') || b).remove());   // the old feedback banner
  const tabsSection = root.querySelector('.fdt-menu-tabs').closest('.Polaris-Layout__Section');
  const w = doc.createElement('div'); w.innerHTML = html; tabsSection.after(w.firstElementChild);
}
function markTabs(root) { root.querySelectorAll('.Polaris-Tabs__Tab').forEach(t => { const lab = t.querySelector('.Polaris-Text--root'), txt = (lab ? lab.textContent : '').replace(/\s+/g, ' ').trim(), href = TAB_PAGES[txt] || TAB_PAGES[t.getAttribute('aria-label')]; if (href) { t.setAttribute('data-href', href); if (TAB_PAGES[txt]) t.setAttribute('aria-label', txt); } }); }

for (const p of PAGES) {
  const flatCss = p.flat ? `<style>\n/* generated classes for this page (flattened Shopify web components) */\n${pruneFlat(rd(`cap/pages/${p.key}.flat.css`)).split(APP_ASSETS).join('assets/img/')}\n</style>\n` : '';
  const html = `<!doctype html>
<html lang="en" class="p-theme-light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="icon" href="${icon}">
<link rel="stylesheet" href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css" crossorigin>
<link rel="stylesheet" href="assets/common.css">
${flatCss}</head>
<body>
${navFor(p.active)}

<div class="sh-main" id="main">
  ${parts.topbar}
  <div class="sh-scroll">${contentFor(p)}</div>
</div>

${parts.sk}
${parts.fabs}
${parts.chat}
${parts.pops}
${parts.search}
${parts.toast}
<script src="assets/shell.js"></script>
<script src="assets/pages.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(root, p.file), html);
  console.log('wrote', p.file.padEnd(26), (html.length / 1024).toFixed(0) + ' KB');
}
console.log('wrote assets/common.css', (css.length / 1024).toFixed(0) + ' KB, assets/shell.js, assets/pages.js');
