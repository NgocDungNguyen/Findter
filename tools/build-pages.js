// Builds the stand-alone pages + assets/ from the finished index.html (shell) and the captured page markup.
// Run after `node build.js`:   node build-pages.js
const fs = require('fs'); const path = require('path'); const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const rd = p => fs.readFileSync(path.join(__dirname, p), 'utf8');
/* Draft features (Settings > A/B testing, Search > Preview search) are built only while their source files exist: tools/build/abtest.js, tools/build/preview.js (+ draft-ab-preview.css). Without them the pages, the Settings card and the Search tab are left out. */
const HAS_AB = fs.existsSync(path.join(__dirname, 'build', 'abtest.js')), HAS_PREVIEW = fs.existsSync(path.join(__dirname, 'build', 'preview.js')), HAS_DRAFT_CSS = fs.existsSync(path.join(__dirname, 'build', 'draft-ab-preview.css'));

// flat: false = plain Polaris capture (wrapped by the pg-* classes); flat: true = Shopify web components flattened from the live app (cap/pages/<key>.flat.html)
const ALL_PAGES = [
  { key: 'filter', file: 'filter.html', active: 'Filter' },
  { key: 'search', file: 'search.html', active: 'Search', script: ['assets/catalog.js', 'assets/ui.js', 'assets/pl.js', 'assets/suggest.js'] },   // + the No results / Zero character suggestion cards (suggest.js)
  { key: 'settings', file: 'settings.html', active: 'Settings', custom: 'settings' },                                  // written by hand: the Settings page (cards)
  { key: 'metafield', file: 'metafield.html', active: 'Settings' },
  { key: 'merchandising', file: 'merchandising.html', active: 'Merchandising', custom: 'merch', script: ['assets/catalog.js', 'assets/ui.js', 'assets/pl.js', 'assets/merch.js'] },   // written by hand, rebuilt in Polaris from the Boost prototype
  { key: 'search-redirect', file: 'search-redirect.html', active: 'Settings', custom: 'redirect', script: ['assets/ui.js', 'assets/pl.js', 'assets/settings-more.js'] },
  { key: 'ab-testing', file: 'ab-testing.html', active: 'Settings', custom: 'ab', script: ['assets/catalog.js', 'assets/ui.js', 'assets/abtest.js'] },
  { key: 'separated-variants', file: 'separated-variants.html', active: 'Settings', custom: 'variants', script: ['assets/ui.js', 'assets/pl.js', 'assets/settings-more.js'] },
  { key: 'filter-booster', file: 'filter-boost.html', active: 'Filter', flat: true },
  { key: 'search-booster', file: 'search-boost.html', active: 'Search', flat: true },
  { key: 'ymm', file: 'ymm.html', active: 'Year Make Model', custom: 'ymm', script: ['assets/ui.js', 'assets/pl.js', 'assets/ymm.js'] },     // written by hand: options, widget labels, remember vehicle, import, history
  { key: 'features', file: 'features.html', active: 'Advanced features', flat: true, script: 'assets/features-extra.js' },
  { key: 'design', file: 'design.html', active: 'Settings', flat: true, script: 'assets/watermark-card.js' },
  { key: 'pricing', file: 'pricing.html', active: 'Pricing', srcdoc: true },
  { key: 'sort', file: 'sort.html', active: 'Settings', custom: true, script: 'assets/sort.js' },       // written by hand (no capture): ported from the app's Settings/SortBody.jsx
  { key: 'search-translation', file: 'search-translation.html', active: 'Search', custom: 'extra', script: 'assets/extra.js' },    // written by hand: ported from the app's pages/search/locales.jsx
  { key: 'search-preview', file: 'search-preview.html', active: 'Search', custom: 'preview', script: ['assets/catalog.js', 'assets/ui.js', 'assets/preview.js'] },     // Search > Preview search (written by hand)
  { key: 'search-synonym', file: 'search-synonym.html', active: 'Search', custom: 'extra', script: 'assets/extra.js' },        // ported from components/Synonym/*
  { key: 'filter-translate', file: 'filter-translate.html', active: 'Filter', custom: 'extra', script: 'assets/extra.js' },  // ported from pages/filter/set/[name]/translations.jsx + TranslationEditor.jsx
  { key: 'filter-set', file: 'filter-set.html', active: 'Filter', custom: 'extra', script: 'assets/extra.js' },                 // the filter set's own page (read-only Default filter set); its Translations button opens filter-translate.html
  { key: 'design-tab2', file: 'design-product-grid.html', active: 'Settings', flat: true },
];
const PAGES = ALL_PAGES.filter(p => !(p.key === 'ab-testing' && !HAS_AB) && !(p.key === 'search-preview' && !HAS_PREVIEW));
// tabs that are separate pages
const TAB_PAGES = { 'Manage filter set': 'filter.html', 'Collection booster': 'filter-boost.html', 'Search settings': 'search.html', 'Search booster': 'search-boost.html', 'Translations': 'search-translation.html', 'Synonyms search': 'search-synonym.html', 'Preview search': 'search-preview.html', 'Filter design': 'design.html', 'Product grid design': 'design-product-grid.html' };
const APP_ASSETS = 'https://findter-production.flintverse.com/assets/';
const CHEVRON = '<span type="chevron-right" class="pg-chevron" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M5.72 12.53a.75.75 0 0 1 0-1.06l3.47-3.47-3.47-3.47a.749.749 0 1 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06 0"></path></svg></span>';

/* ---------- shared assets ---------- */
const home = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8')).window.document;
fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
const css = [...home.querySelectorAll('style')].map(s => s.textContent).join('\n') + '\n' + rd('build/pages.css') + '\n' + rd('build/sort.css') + String.fromCharCode(10) + rd('build/extra.css') + String.fromCharCode(10) + (HAS_DRAFT_CSS ? rd('build/draft-ab-preview.css') + String.fromCharCode(10) : '') + rd('build/polaris-extra.css');
fs.writeFileSync(path.join(root, 'assets', 'common.css'), css);

// shell behaviour = the first part of the home script (nav, menus, search, Sidekick, chat); home-only features are stubbed
const app = rd('build/app.js'); const cut = app.indexOf('  /* ---------- app: collapsibles');
if (cut < 0) throw new Error('shell/app split marker not found in build/app.js');
let shell = app.slice(0, cut).replace("'use strict';", "'use strict';\n  const updateCarousel = () => {}, closeDatePicker = () => {}, hideTip = () => {}, closeThemeModal = () => {};   // home-page features that do not exist on these pages");
shell += '\n  window.__shell = { toast, closePops, sendChat, replyChat, replyChoices, toggleChat, openChatWith: (text, reply) => { toggleChat(true); sendChat(text); if (reply) setTimeout(() => replyChat(reply), 800); } };\n  applyNav();\n})();\n';
fs.writeFileSync(path.join(root, 'assets', 'shell.js'), shell);
fs.writeFileSync(path.join(root, 'assets', 'pages.js'), rd('build/pages.js'));
fs.writeFileSync(path.join(root, 'assets', 'sort.js'), rd('build/sort.js'));
fs.writeFileSync(path.join(root, 'assets', 'extra.js'), rd('build/extra.js'));
fs.writeFileSync(path.join(root, 'assets', 'code-notice.js'), rd('build/code-notice.js'));
fs.writeFileSync(path.join(root, 'assets', 'demo.js'), rd('build/demo.js'));
fs.writeFileSync(path.join(root, 'assets', 'watermark.js'), rd('build/watermark.js'));
fs.writeFileSync(path.join(root, 'assets', 'watermark-card.js'), rd('build/watermark-card.js'));
for (const n of ['ui', 'pl', 'catalog', 'merch', 'settings-more', 'suggest', 'ymm', 'features-extra'].concat(HAS_PREVIEW ? ['preview'] : [], HAS_AB ? ['abtest'] : [])) fs.writeFileSync(path.join(root, 'assets', n + '.js'), rd('build/' + n + '.js'));

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
  if (sub.classList.contains('sh-item--extra')) {                           // Pricing lives under "View more": open it so the active item is visible
    aside.querySelector('.sh-appgroup').classList.add('is-expanded'); const more = aside.querySelector('.sh-item--more'); more.setAttribute('aria-expanded', 'true'); more.querySelector('.sh-item__label').textContent = 'View less';
  }
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
// Pricing: the capture is the whole admin; the app itself is the iframe's srcdoc (Shopify web components as declarative shadow DOM, so it renders as it is).
// Only the app is kept: the admin chrome (and its staging-app menu links) is replaced by this copy's own shell.
const pricingDoc = () => { const raw = new JSDOM(rd('cap/pages/pricing.raw.html')).window.document; return new JSDOM(raw.querySelector('main iframe').getAttribute('srcdoc')).window.document; };
function pricingCss() {
  const f = pricingDoc(), own = [...f.querySelectorAll('head style')].map(s => s.textContent).filter(t => !/^@font-face|^\.crisp-client|^\.sf-hidden/.test(t));
  const tail = f.querySelector('body > style'); if (tail) own.push(tail.textContent.replace(/:root\{--shopify-safe-area-inset-bottom:66px\}body::after\{[^}]*\}/, ''));
  return own.join(String.fromCharCode(10));
}
function pricingContent() {
  const app = pricingDoc().querySelector('#app'); if (!app) throw new Error('pricing: #app not found in the capture');
  app.querySelectorAll('a[href]').forEach(a => { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); });      // the only link is the public docs page
  return app.outerHTML;
}
// Sort: header + the container sort.js fills (the page is drawn by script, like the app's SortBody)
function sortContent() {
  return '<div id="app"><div class="pg-contents"><main class="pg-main"><div class="pg-grid"><div class="pg-stack so-page"><div class="fdt-header"><h1 class="fdt-header__title">Custom sort options</h1><p class="fdt-header__description"><a class="fdt-header__link" href="' + GUIDE + 'advanced-features/custom-sort-options" target="_blank" rel="noopener noreferrer">Sort guidelines here</a></p></div><div id="so-body"></div></div></div></main></div></div>';
}
/* Search tabs: the capture only has "Search settings" and "Search booster"; the real app also shows Translations and Synonyms Search (pages/search/locales.jsx, synonym.jsx).
   active = the id of the tab to mark as current (new pages); omitted on the captured pages, which keep their own. */
const GUIDE = 'https://flintverse.gitbook.io/docs/findter-custom-filter-search/user-guide/';
function addSearchTabs(root, active) {
  const ul = root.querySelector('ul.Polaris-Tabs'); if (!ul) throw new Error('search tabs: tab list not found');
  root.querySelectorAll('.Polaris-Tabs__TabsMeasurer, .Polaris-Tabs__DisclosureTab').forEach(e => e.remove());
  const tpl = [...ul.querySelectorAll('.Polaris-Tabs__Tab')].pop().closest('li');
  for (const [id, label] of [['locales', 'Translations'], ['synonym-search', 'Synonyms search']].concat(HAS_PREVIEW ? [['preview-search', 'Preview search']] : [])) {
    const li = tpl.cloneNode(true), b = li.querySelector('.Polaris-Tabs__Tab');
    b.id = id; b.setAttribute('aria-label', label); b.querySelector('.Polaris-Text--root').textContent = label; ul.appendChild(li);
  }
  ul.querySelectorAll('.Polaris-Tabs__Tab').forEach(b => { if (b.id === 'locales' || b.id === 'synonym-search' || b.id === 'preview-search') { b.classList.remove('Polaris-Tabs__Tab--active'); b.setAttribute('aria-selected', 'false'); b.setAttribute('tabindex', '-1'); } });
  if (active) ul.querySelectorAll('.Polaris-Tabs__Tab').forEach(b => { const on = b.id === active; b.classList.toggle('Polaris-Tabs__Tab--active', on); b.setAttribute('aria-selected', String(on)); b.setAttribute('tabindex', on ? '0' : '-1'); });
}
const guideLink = (href, text) => `<p class="fdt-header__description"><a class="fdt-header__link" href="${href}" target="_blank" rel="noopener noreferrer">${text}</a></p>`;
const BACK_ICON = '<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M17 10a.75.75 0 0 1-.75.75H6.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 1 1 1.06 1.06L6.56 9.25h9.69A.75.75 0 0 1 17 10Z"></path></svg>';
// Search > Translations, Search > Synonyms Search, Filter set > Translate: header + (tabs) + the container extra.js fills
function extraContent(p) {
  let head = '', tabs = '', kind = '';
  if (p.key === 'filter-translate') {
    kind = 'filter-translate';
    head = `<div class="fdt-header"><div class="ex-titlebar ex-titlebar--split"><div class="ex-titlebar__l"><a class="ex-back" href="filter-set.html" aria-label="Back"><span class="Polaris-Icon">${BACK_ICON}</span></a><div class="ex-titlebar__text"><h1 class="fdt-header__title">Translate Default filter set</h1><p class="fdt-header__description"><a class="fdt-header__link" href="${GUIDE}advanced-features/auto-translate" target="_blank" rel="noopener noreferrer">Multi-language filter guidelines here</a></p></div></div></div></div>`;
  } else if (p.key === 'filter-set') {
    kind = 'filter-set';
    head = `<div class="fdt-header"><div class="ex-titlebar ex-titlebar--split"><div class="ex-titlebar__l"><a class="ex-back" href="filter.html" aria-label="Back"><span class="Polaris-Icon">${BACK_ICON}</span></a><div><h1 class="fdt-header__title">Default filter set</h1>${guideLink(GUIDE + 'create-and-set-up-filters/filter-overview-and-access', 'Filter set guidelines here')}</div></div><a class="ex-btn" href="filter-translate.html">Translations</a></div></div>`;
  } else {
    const doc = new JSDOM(`<body>${rd('cap/pages/search.html')}</body>`).window.document, stack = doc.querySelector('s-stack');
    const inner = doc.createElement('div'); [...stack.childNodes].forEach(n => inner.appendChild(n));
    const tabSection = inner.querySelector('.fdt-menu-tabs').closest('.Polaris-Layout__Section');
    const translation = p.key === 'search-translation';
    kind = translation ? 'translations' : 'synonyms';
    addSearchTabs(tabSection, translation ? 'locales' : 'synonym-search'); markTabs(tabSection);
    tabs = `<div class="Polaris-Layout">${tabSection.outerHTML}</div>`;
    head = translation
      ? `<div class="fdt-header"><h1 class="fdt-header__title">Search</h1>${guideLink(GUIDE + 'advanced-features/auto-translate', 'Multi-language search guidelines here')}</div>`
      : `<div class="fdt-header"><h1 class="fdt-header__title">Search</h1><p class="fdt-header__description"><a class="fdt-header__link" href="${GUIDE}advanced-features/synonym-search" target="_blank" rel="noopener noreferrer">Synonyms search guidelines here</a></p></div>`;
  }
  return `<div id="app"><div class="pg-contents"><main class="pg-main"><div class="pg-grid"><div class="pg-stack ex-page">${head}${tabs}<div id="ex-body" data-page="${kind}"></div></div></div></main></div></div>`;
}
/* ---------- Settings: one sidebar item that opens its own page (settings.html): a card per settings page, each with a name and a one-line description.
   The four pages (Metafield, Filter design, Product grid & card, Custom sort) keep a back arrow before their title that returns to Settings, like the app's sub pages. ---------- */
const SETTINGS_ICONS = {
  metafield: '<path d="M4 5.5h12M4 10h12M4 14.5h7"/>',
  'ab-testing': '<path d="M4 16V9m4 7V5m4 11v-5m4 5V7"/>',
  'search-redirect': '<path d="M4 10h11m0 0-4-4m4 4-4 4"/>',
  'separated-variants': '<rect x="3.5" y="4.5" width="5" height="11" rx="1"/><rect x="11.5" y="4.5" width="5" height="11" rx="1"/>',
  design: '<path d="M4 6h7M15 6h1M4 14h1M9 14h7"/><circle cx="13" cy="6" r="1.75"/><circle cx="7" cy="14" r="1.75"/>',
  'design-tab2': '<rect x="4" y="4" width="5" height="5" rx="1"/><rect x="11" y="4" width="5" height="5" rx="1"/><rect x="4" y="11" width="5" height="5" rx="1"/><rect x="11" y="11" width="5" height="5" rx="1"/>',
  sort: '<path d="M7 16V4m0 0L4 7m3-3 3 3M13 4v12m0 0-3-3m3 3 3-3"/>',
};
const SETTINGS_PAGES_ALL = [   // key, name, one-line description, file
  ['metafield', 'Metafield', 'Choose the product metafields shoppers can filter and search by.', 'metafield.html'],
  ['design', 'Filter design', 'Set the filter layout, colors and text, and see it in a live preview.', 'design.html'],
  ['design-tab2', 'Product grid &amp; card', 'Change the product grid, the card elements, badges and buttons.', 'design-product-grid.html'],
  ['sort', 'Custom sort', 'Choose which sort options shoppers see and in what order.', 'sort.html'],
  ['search-redirect', 'Search redirect', 'Send shoppers to a page when they search for certain keywords.', 'search-redirect.html'],
  ['ab-testing', 'A/B testing', 'Compare your setup and results across two periods.', 'ab-testing.html'],
  ['separated-variants', 'Separated variant products', 'Show each variant as its own product in collections.', 'separated-variants.html'],
];
const SETTINGS_PAGES = SETTINGS_PAGES_ALL.filter(t => t[0] !== 'ab-testing' || HAS_AB);
const isSettingsPage = key => SETTINGS_PAGES.some(t => t[0] === key);
const pageWrap = (inner, cls = 'pl-page') => '<div id="app"><div class="pg-contents"><main class="pg-main"><div class="pg-grid"><div class="pg-stack ' + cls + '">' + inner + '</div></div></main></div></div>';
function settingsContent() {
  const BOXV = n => '--pc-box-padding-block-start-xs:var(--p-space-' + n + ');--pc-box-padding-block-end-xs:var(--p-space-' + n + ');--pc-box-padding-inline-start-xs:var(--p-space-' + n + ');--pc-box-padding-inline-end-xs:var(--p-space-' + n + ')';
  const card = ([k, name, desc, href]) => '<a class="pl-setcard" href="' + href + '" data-nav="page"><div class="Polaris-ShadowBevel" style="--pc-shadow-bevel-z-index:32;--pc-shadow-bevel-content-xs:&quot;&quot;;--pc-shadow-bevel-box-shadow-xs:var(--p-shadow-100);--pc-shadow-bevel-border-radius-xs:var(--p-border-radius-300)"><div class="Polaris-Box" style="--pc-box-background:var(--p-color-bg-surface);--pc-box-min-height:100%;--pc-box-overflow-x:clip;--pc-box-overflow-y:clip;' + BOXV('400') + '">'
    + '<div class="Polaris-InlineStack" style="--pc-inline-stack-align:start;--pc-inline-stack-block-align:start;--pc-inline-stack-wrap:nowrap;--pc-inline-stack-gap-xs:var(--p-space-300);--pc-inline-stack-flex-direction-xs:row"><span class="pl-setcard__ico" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false">' + SETTINGS_ICONS[k] + '</svg></span>'
    + '<div class="Polaris-BlockStack" style="--pc-block-stack-order:column;--pc-block-stack-gap-xs:var(--p-space-050);flex:1;min-width:0"><span class="Polaris-Text--root Polaris-Text--headingSm">' + name + '</span><span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued">' + desc + '</span></div><span class="pl-setcard__go" aria-hidden="true">' + CHEVRON + '</span></div></div></div></a>';
  return '<div id="app"><div class="pg-contents"><main class="pg-main"><div class="pg-grid"><div class="pg-stack pl-page"><div class="fdt-header"><h1 class="fdt-header__title">Settings</h1></div>'
    + '<nav class="pl-settings" aria-label="Settings pages">' + SETTINGS_PAGES.map(card).join('') + '</nav></div></div></main></div></div>';
}
function withSettings(key, html) {                                            // html = the page's content (#app ...); puts a back arrow (to Settings) before the page's own title
  const doc = new JSDOM('<body>' + html + '</body>').window.document;
  const head = doc.querySelector('.fdt-header'); if (!head) throw new Error(key + ': page header not found');
  const own = head.querySelector('h1'); if (!own) throw new Error(key + ': page title not found');
  const t = { design: 'Filter design', 'design-tab2': 'Product grid &amp; card' }[key]; // the other pages keep their own title
  if (t) own.innerHTML = t;
  const bar = doc.createElement('div'); bar.className = 'ex-titlebar ex-titlebar--split';
  bar.innerHTML = '<div class="ex-titlebar__l"><a class="ex-back" href="settings.html" data-nav="page" aria-label="Back to Settings"><span class="Polaris-Icon">' + BACK_ICON + '</span></a><div class="ex-titlebar__text"></div></div>';
  const text = bar.querySelector('.ex-titlebar__text'); while (head.firstChild) text.appendChild(head.firstChild); head.appendChild(bar);
  const tabs = doc.querySelector('.fdt-menu-tabs'); if (tabs) tabs.closest('.Polaris-Layout__Section').remove();   // the two design tabs are now two cards on the Settings page
  return doc.body.innerHTML;
}
// Search > Preview search: the Search header + tabs (Preview search current) and the container preview.js fills
function previewContent() {
  const doc = new JSDOM(`<body>${rd('cap/pages/search.html')}</body>`).window.document, stack = doc.querySelector('s-stack');
  const inner = doc.createElement('div'); [...stack.childNodes].forEach(n => inner.appendChild(n));
  const tabSection = inner.querySelector('.fdt-menu-tabs').closest('.Polaris-Layout__Section');
  addSearchTabs(tabSection, 'preview-search'); markTabs(tabSection);
  return '<div id="app"><div class="pg-contents"><main class="pg-main"><div class="pg-grid"><div class="pg-stack so-page mc-page"><div class="fdt-header"><h1 class="fdt-header__title">Search</h1>' + guideLink(GUIDE + 'advanced-features/synonym-search', 'Search guidelines here') + '</div><div class="Polaris-Layout">' + tabSection.outerHTML + '</div><div id="sp-root" data-mfp></div></div></div></main></div></div>';
}
/* Advanced features: one more card, Product compare (the switch is wired by features-extra.js; it turns the compare option on for the storefront) */
function addCompareCard(doc) {
  const g = doc.querySelector('.display-features-grid'); if (!g) throw new Error('features: grid not found');
  const card = g.firstElementChild.cloneNode(true);
  const img = card.querySelector('img.display-features-thumbnail'); img.setAttribute('src', 'assets/img/feature-compare.svg'); img.setAttribute('alt', 'Product compare');
  const v = card.querySelector('video'); if (v) v.remove();
  const o = card.querySelector('.display-features-preview-overlay'); if (o) o.remove();
  card.querySelector('h3').textContent = 'Product compare';
  const sw = card.querySelector('.pg-switch'); sw.setAttribute('aria-label', 'Turn Product compare on or off'); sw.setAttribute('data-feature', 'compare'); sw.removeAttribute('checked');
  const tip = card.querySelector('[data-polaris-tooltip-activator]'); if (tip) tip.remove();
  g.appendChild(card);
}
function contentFor(p) {
  const html = contentRaw(p);
  return isSettingsPage(p.key) ? withSettings(p.key, html) : html;
}
function contentRaw(p) {
  if (p.custom === 'settings') return settingsContent();
  if (p.custom === 'ymm') return pageWrap('<div class="fdt-header"><h1 class="fdt-header__title">Year Make Model</h1><p class="fdt-header__description"><a class="fdt-header__link" href="' + GUIDE + 'advanced-features/year-make-model-ymm" target="_blank" rel="noopener noreferrer">Year Make Model guidelines here</a></p></div><div id="ym-root" data-mfp></div>');
  if (p.custom === 'merch') return pageWrap('<div id="mc-root" data-mfp></div>');
  if (p.custom === 'ab') return pageWrap('<div class="fdt-header"><h1 class="fdt-header__title">A/B testing</h1><p class="fdt-header__description">Compare how your setup and results changed between two periods.</p></div><div id="ab-root" data-mfp></div>', 'so-page mc-page');
  if (p.custom === 'redirect') return pageWrap('<div class="fdt-header"><h1 class="fdt-header__title">Search redirect</h1></div><div id="sr-root" data-mfp></div>');
  if (p.custom === 'variants') return pageWrap('<div class="fdt-header"><h1 class="fdt-header__title">Separated variant products</h1></div><div id="sv-root" data-mfp></div>');
  if (p.custom === 'preview') return previewContent();
  if (p.custom === 'extra') return extraContent(p);
  if (p.custom) return sortContent();
  if (p.srcdoc) return pricingContent();
  if (p.flat) {
    const doc = new JSDOM(`<body>${rd(`cap/pages/${p.key}.flat.html`)}</body>`).window.document;
    doc.querySelectorAll('#PolarisPortalsContainer, .Polaris-Tabs__TabsMeasurer, .Polaris-Tabs__DisclosureTab').forEach(e => e.remove());
    doc.querySelectorAll('[aria-owns]').forEach(e => e.removeAttribute('aria-owns'));
    doc.querySelectorAll('[data-state]').forEach(e => e.removeAttribute('data-state'));
    if (p.key === 'search-booster') addSearchTabs(doc);
    if (p.key === 'features') addCompareCard(doc);
    markTabs(doc);
    chatWiring(p, doc, doc.body);
    return doc.querySelector('#app').outerHTML.split(APP_ASSETS).join('assets/img/');
  }
  const doc = new JSDOM(`<body>${rd(`cap/pages/${p.key}.html`)}</body>`).window.document;
  const stack = doc.querySelector('s-stack');
  const inner = doc.createElement('div'); [...stack.childNodes].forEach(n => inner.appendChild(n));
  inner.querySelectorAll('#PolarisPortalsContainer, .Polaris-Tabs__TabsMeasurer, .Polaris-Tabs__DisclosureTab').forEach(e => e.remove());
  inner.querySelectorAll('s-icon[type="chevron-right"]').forEach(e => { const w = doc.createElement('span'); w.innerHTML = CHEVRON; e.replaceWith(w.firstChild); });
  inner.querySelectorAll('[aria-owns]').forEach(e => e.removeAttribute('aria-owns'));
  inner.querySelectorAll('[data-state]').forEach(e => e.removeAttribute('data-state'));
  if (p.key === 'search') addSearchTabs(inner);
  markTabs(inner);
  chatWiring(p, doc, inner);
  return `<div id="app"><div class="pg-contents"><main class="pg-main"><div class="pg-grid"><div class="pg-stack">${inner.innerHTML}</div></div></main></div></div>`;
}
// the original app mislabels two tabs (aria-label "Search" / "Search booster" on other tabs), so the visible text decides; the label is then corrected
/* "Contact us" / "Let us know" links open the chat with the request already sent (pages.js sends the message + the auto reply, keyed by data-chat).
   Filter and Search pages (both tabs each) show the same info banner right under the tabs, copied from the Search page so box, icon, fonts and radius are identical;
   The design pages also get it under the tabs (the old "Got feedback..." banner at the bottom is removed). Filter's replaces the old "Got feedback or a feature request?" banner. "Book a call with us" is a normal link that opens a new tab. */
const CALENDLY = 'https://calendly.com/flintverse-bsscommerce/30min';
function contactBanner(doc, root, kind) {
  let html = new JSDOM(`<body>${rd('cap/pages/search.html')}</body>`).window.document.querySelector('.Polaris-Banner').closest('.Polaris-Layout__Section').outerHTML;
  const swap = (a, b) => { if (!html.includes(a)) throw new Error('banner text not found: ' + a); html = html.split(a).join(b); };
  if (kind === 'filter') swap('custom search solution', 'custom filter solution');
  if (kind === 'design') swap('a custom search solution?', 'a custom design?');
  swap('<button type="button" class="Polaris-Link Polaris-Link--monochrome">Contact us</button>', `<button type="button" class="Polaris-Link Polaris-Link--monochrome" data-chat="${kind}">Contact us</button>`);
  const w = doc.createElement('div'); w.innerHTML = html; const banner = w.firstElementChild;
  const old = [...root.querySelectorAll('.Polaris-Banner')].map(b => b.closest('.Polaris-Layout__Section') || b);          // the old "Got feedback or a feature request?" banner
  if (kind === 'design' && old.length !== 1) throw new Error('design: expected 1 old banner, found ' + old.length);
  if (kind !== 'search') old.forEach(o => o.remove());
  root.querySelector('.fdt-menu-tabs').closest('.Polaris-Layout__Section').after(banner);                                  // right under the tabs
  return banner;
}
// the "Remove “Powered by Findter” badge" row (watermark-card.js): at the top of the Filter layout card, right under its description
function watermarkRow(doc, root) {
  const fl = [...root.querySelectorAll('h2')].find(e => e.textContent.trim() === 'Filter layout'); if (!fl) throw new Error('Filter layout card not found');
  const h = doc.createElement('div'); h.hidden = true; h.className = 'wm-host'; h.setAttribute('data-wm-card', '');
  fl.closest('.Polaris-Box').after(h);
}
function chatWiring(p, doc, root) {
  const mark = (el, kind) => { if (!el) throw new Error(p.key + ': chat link not found for ' + kind); el.setAttribute('data-chat', kind); };
  const inBanner = label => [...root.querySelectorAll('.Polaris-Banner button, .Polaris-Banner a')].find(b => b.textContent.trim() === label);
  switch (p.key) {
    case 'filter': case 'filter-booster': contactBanner(doc, root, 'filter'); break;
    case 'search-booster': contactBanner(doc, root, 'search'); break;
    case 'search': mark(inBanner('Contact us'), 'search'); break;                                   // Search settings no longer carries the badge card (it lives on Filter design)
    case 'metafield': mark(root.querySelector('a.fdt-header__link:not([href])'), 'metafield'); break;            // "For additional metafields, please contact us"
    case 'features': mark(root.querySelector('.fdt-contact-us-link').closest('a'), 'feature'); break;            // "Contact us now" in the bottom banner
    case 'design': contactBanner(doc, root, 'design'); watermarkRow(doc, root); break;       // Filter design: the badge card sits under the banner, above the Filter layout and Live preview columns
    case 'design-tab2': contactBanner(doc, root, 'design'); break;                                 // both design tabs: under the tabs (replaces the bottom "Got feedback..." banner)
  }
  root.querySelectorAll('a[href*=calendly]').forEach(l => l.setAttribute('href', CALENDLY));
}
// the original app mislabels two tabs (aria-label "Search" / "Search booster" on other tabs), so the visible text decides; the label is then corrected
function markTabs(root) { root.querySelectorAll('.Polaris-Tabs__Tab').forEach(t => { const lab = t.querySelector('.Polaris-Text--root'), txt = (lab ? lab.textContent : '').replace(/\s+/g, ' ').trim(), href = TAB_PAGES[txt] || TAB_PAGES[t.getAttribute('aria-label')]; if (href) { t.setAttribute('data-href', href); if (TAB_PAGES[txt]) t.setAttribute('aria-label', txt); } }); }

for (const p of PAGES) {
  const flatCss = p.srcdoc ? `<style>
/* Pricing app (from the capture) */
${pricingCss()}
</style>
` : p.flat ? `<style>\n/* generated classes for this page (flattened Shopify web components) */\n${pruneFlat(rd(`cap/pages/${p.key}.flat.css`)).split(APP_ASSETS).join('assets/img/')}\n</style>\n` : '';
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
<script src="assets/code-notice.js"></script>
<script src="assets/demo.js"></script>
<script src="assets/watermark.js"></script>
<script src="assets/shell.js"></script>
<script src="assets/pages.js"></script>
${[].concat(p.script || []).map(s => `<script src="${s}"></script>
`).join('')}
</body>
</html>
`;
  fs.writeFileSync(path.join(root, p.file), html);
  console.log('wrote', p.file.padEnd(26), (html.length / 1024).toFixed(0) + ' KB');
}
// Sample storefront: a stand-alone collection page with the header search (hand-written, not a capture) to test where the "Powered by Findter" badge goes
fs.writeFileSync(path.join(root, 'storefront.html'), rd('build/storefront.html'));
// ... and the search results page: the same header and filter bar, the search template's own heading and results (build/storefront-search.html)
{
  const page = rd('build/storefront.html'), aside = page.match(/<aside class="sf-filters"[\s\S]*?<\/aside>/)[0];
  const main = rd('build/storefront-search.html').replace('<!--filters-->', () => aside);
  fs.writeFileSync(path.join(root, 'storefront-search.html'), page.replace(/<main class="sf-main">[\s\S]*?<\/main>/, () => main)
    .replace('<title>Catalog – Sample store</title>', '<title>Search – Sample store</title>').replace(' aria-current="page"', '').replace('data-page="collection"', 'data-page="search"'));
}
fs.writeFileSync(path.join(root, 'assets', 'storefront.css'), rd('build/storefront.css'));
fs.writeFileSync(path.join(root, 'assets', 'img', 'feature-compare.svg'), rd('build/feature-compare.svg'));
fs.writeFileSync(path.join(root, 'assets', 'storefront.js'), rd('build/storefront.js'));
fs.writeFileSync(path.join(root, 'assets', 'storefront-ext.js'), rd('build/storefront-ext.js'));
fs.writeFileSync(path.join(root, 'assets', 'storefront-ext.css'), rd('build/storefront-ext.css'));
for (const n of ['black', 'white']) fs.writeFileSync(path.join(root, 'assets', 'img', 'findter-logo-' + n + '.webp'), fs.readFileSync(path.join(__dirname, 'build', 'findter-logo-' + n + '.webp')));      // the app's logo as a plain glyph: white on the dark search-widget badge, black on the filter badges
console.log('wrote storefront.html + assets/storefront.css, storefront.js');
console.log('wrote assets/common.css', (css.length / 1024).toFixed(0) + ' KB, assets/shell.js, assets/pages.js');
