// Assembles ../index.html from captured pieces (see tools/cap) + hand-written shell (tools/build)
const fs = require('fs'); const path = require('path'); const { JSDOM } = require('jsdom');
const cap = f => fs.readFileSync(path.join(__dirname, 'cap', f), 'utf8');
const bld = f => fs.readFileSync(path.join(__dirname, 'build', f), 'utf8');
const css = JSON.parse(cap('trimmed.json'));
const icons = JSON.parse(cap('iconmap.json')), iconsRaw = JSON.parse(cap('icons.json')), assets = JSON.parse(cap('assets.json'));

/* ---------- 1. app markup: patch flattened DOM ---------- */
let flat = cap('flat.html').replace('<!--MODAL-->', '');
const dom = new JSDOM(`<body>${flat}</body>`); const doc = dom.window.document;
const grids = [...doc.querySelectorAll('[data-s="s-grid"] > span')];
grids.forEach(g => g.classList.add('sp-grid'));
if (grids[1]) grids[1].setAttribute('style', 'grid-template-columns:minmax(0,966px)');
const CARDS = { 'Onboarding guide': 'guide', 'Recommended apps': 'rec', 'Data insight': 'data', 'Findter app status': 'status', 'Help & Support': 'help', 'Sync recent updates': 'sync' };
doc.querySelectorAll('.Polaris-ShadowBevel').forEach(b => { const h = b.querySelector('h2,h3'); const k = h && CARDS[h.textContent.trim()]; if (k && !b.querySelector('[data-card]')) b.setAttribute('data-card', k); });
// The original defaults to all four onboarding steps expanded (my capture was taken after I had toggled some),
// so normalise: expanded panels + the 'chevron-down' glyph (taken from the one step that was still expanded).
const steps = [...doc.querySelectorAll('[data-card=guide] .bss-setup-guide')];
const chevOf = s => s.querySelector('.title-collapsible [data-s=s-icon]');
const isDown = el => /M3.72 6.47/.test(el.innerHTML);
const downHtml = (steps.map(chevOf).find(isDown) || chevOf(steps[0])).innerHTML;
steps.forEach(s => {
  const c = s.querySelector('.Polaris-Collapsible');
  c.classList.remove('Polaris-Collapsible--isFullyClosed'); c.setAttribute('aria-hidden', 'false');
  c.setAttribute('style', 'transition-duration: 500ms; transition-timing-function: ease-in-out; max-height: none; overflow: visible;');
  s.querySelector('.grid-guide').setAttribute('aria-expanded', 'true');
  chevOf(s).innerHTML = downHtml;
});
doc.querySelectorAll('img#fdt-mask').forEach(e => e.remove());

// ---- Master card (left column, after Data insight) + Master UI page markup ----
const attr = s => s.replace(/"/g, '&quot;');
const recBevel = doc.querySelector('[data-card=rec]');
const BEVEL = attr(recBevel.getAttribute('style')), BOX = attr(recBevel.firstElementChild.getAttribute('style'));
const xBtn = recBevel.querySelector('button[aria-label="Dismiss recommended apps"]').cloneNode(true); xBtn.setAttribute('aria-label', 'Dismiss master');
const BTN = 'Polaris-Button Polaris-Button--pressable';
const btn = (variant, label, extra = '') => '<button class="' + BTN + ' Polaris-Button--variant' + variant + ' Polaris-Button--sizeMedium Polaris-Button--textAlignCenter" type="button" ' + extra + '><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">' + label + '</span></button>';
const mpCard = (inner, boxExtra = '') => '<div class="Polaris-ShadowBevel" style="' + BEVEL + '"><div class="Polaris-Box" style="' + BOX + boxExtra + '">' + inner + '</div></div>';
const masterCard = '<div class="Polaris-ShadowBevel" data-card="master" style="' + BEVEL + '"><div class="Polaris-Box" style="' + BOX + '"><div class="Polaris-BlockStack" style="--pc-block-stack-order: column; --pc-block-stack-gap-xs: var(--p-space-300);"><div class="Polaris-InlineStack" style="--pc-inline-stack-align: space-between; --pc-inline-stack-block-align: center; --pc-inline-stack-wrap: nowrap; --pc-inline-stack-gap-xs: var(--p-space-200); --pc-inline-stack-flex-direction-xs: row;"><h2 class="Polaris-Text--root Polaris-Text--headingMd">Master</h2>' + xBtn.outerHTML + '</div><div class="Polaris-InlineStack" style="--pc-inline-stack-wrap: wrap; --pc-inline-stack-flex-direction-xs: row;">' + btn('Secondary', 'Master', 'data-act="open-master"') + '</div></div></div></div>';
const dataSec = doc.querySelector('[data-card=data]').closest('.Polaris-Layout__Section');
const masterSec = doc.createElement('div'); masterSec.className = 'Polaris-Layout__Section'; masterSec.innerHTML = masterCard; dataSec.after(masterSec);
const colHTML = (side, title, group, sub) => '<div class="hl-col hl-col--' + side + '" data-group="' + group + '"><h3>' + title + '<span class="hl-count" data-side="' + side + '"></span></h3><p class="hl-sub">' + sub + '</p><div class="hl-list" role="list" data-side="' + side + '"></div><button type="button" class="hl-add" data-target="' + side + '">+ Add promotion banner</button></div>';
const masterPageHtml = '<div id="master-page" hidden><div class="mp-wrap"><h1 class="mp-title">Master UI</h1><div class="ft-welcome mp-hero"><h1 class="ft-welcome__title">\u{1F44B} Master Control \u{1F44B}</h1><p class="ft-welcome__subtitle">Internal devops console \u2014 manage indexing, features, server tiers, and payments across every shop.</p></div><div class="mt-tabs"></div><div class="mp-panels">'
  + '<div data-panel="load">' + mpCard('<div class="mp-load">' + btn('Primary', 'Load', 'data-act="load"') + '</div>', ';--pc-box-padding-block-start-xs: 0;--pc-box-padding-block-end-xs: 0') + '</div>'
  + '<div data-panel="home" hidden>' + mpCard('<div class="hl-head"><div><h2 class="Polaris-Text--root Polaris-Text--headingMd">Homepage layout</h2><p class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued">Drag and drop blocks to set their order. Desktop has a left and a right column, and phones have their own order and their own banners. Add a promotion banner under the section it should appear in. Everything you change here is a draft until you click Save.</p></div><div class="hl-head__side"><span class="hl-status" hidden>Unsaved changes</span></div></div><div class="hl-grid" id="hl">' + colHTML('left', 'Left column', 'desktop', 'Desktop only. Banners added here are not shown on phones') + colHTML('right', 'Right column', 'desktop', 'Desktop only. Banners added here are not shown on phones') + colHTML('mobile', 'Mobile phone order', 'mobile', 'Phones only, up to 767px wide. Banners added here are not shown on desktop') + '</div><div class="hl-foot"><span class="hl-hint">Nothing changes on the homepage until you click Save. Keyboard: focus a block, then Shift + arrow keys to move it.</span><div class="hl-actions">' + btn('Tertiary', 'Reset to default', 'data-act="hl-reset"') + btn('Secondary', 'Discard changes', 'data-act="hl-discard"') + btn('Primary', 'Save', 'data-act="hl-save"') + '</div></div>') + '</div>'

  + '</div></div></div>';

const appHtml = doc.querySelector('#app').outerHTML;
console.log('cards tagged:', [...doc.querySelectorAll('[data-card]')].map(e => e.dataset.card).join(','));

/* ---------- 2. CSS ---------- */
function pruneFlat(c) {
  return c.split('\n').map(line => {
    const m = line.match(/^(\.f\d+)\{(.*)\}$/); if (!m) return line;
    let props = m[2].split(';');
    const hasBorderW = props.some(p => /^border-(top|right|bottom|left)-width/.test(p));
    if (!hasBorderW) props = props.filter(p => !/^border-(top|right|bottom|left)-(color|style)/.test(p));
    if (!props.some(p => p.startsWith('text-decoration-line'))) props = props.filter(p => !/^text-decoration-(style|color)/.test(p));
    return `${m[1]}{${props.join(';')}}`;
  }).join('\n');
}
const appExtra = `
.sp-grid{justify-content:center}
.ft-welcome__title{font-size:clamp(24px,calc(var(--app-w) * .03),30px)}
@media (max-width:489px){.Polaris-ShadowBevel{--pc-shadow-bevel-border-radius-xs:var(--p-border-radius-0)!important}[data-card=guide] .Polaris-InlineStack:has(>.fdt-progress-bar){flex-wrap:wrap!important}}
@media (max-width:767px){.sp-grid{padding-left:0!important;padding-right:0!important}}
.chev{transition:transform .2s ease}.chev-r.is-open{transform:rotate(90deg)}.chev-d.is-collapsed{transform:rotate(-90deg)}
.fs-select{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:8px;width:100%;min-height:32px;padding:6px 8px 6px 12px;border-radius:8px;background:#fdfdfd;box-shadow:inset 0 0 0 .66px #8a8a8a;color:#303030;cursor:pointer}
.fs-select:hover{background:#fafafa}
.fs-select:focus-within{outline:2px solid #005bd3;outline-offset:1px}
.fs-select__value{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.fs-select__ic{width:20px;height:20px;margin-right:-2px;fill:#616161;pointer-events:none}
.fs-select select{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font:inherit;border:0;margin:0}
[data-s=s-button][variant=primary] button:hover{background:#1a1a1a!important}
[data-s=s-button][variant=secondary] button:hover{background:#fafafa!important}
[data-s=s-link]:hover a,[data-s=s-link]:hover button{text-decoration:underline}
button.Polaris-Button--disabled{pointer-events:none}
#app{min-height:100%}
[hidden]{display:none!important}
:where([data-s]) button{margin:0;padding:0;border:0;background:none;font:inherit;color:inherit;appearance:none;-webkit-appearance:none;cursor:pointer;text-align:inherit}
:where([data-s]) a{color:inherit;text-decoration:none}
[data-s=s-icon] svg,[data-s=s-internal-icon] svg{fill:currentColor;stroke:none;display:block;width:100%;height:100%}
:where([data-s=s-icon],[data-s=s-internal-icon]){width:16px;height:16px;flex:none}
[data-s=s-icon],[data-s=s-internal-icon]{display:inline-flex;vertical-align:middle}
:where([data-s]) ul{margin:0}
:where([data-s=s-button]) button{min-height:28px;min-width:28px}
:where([data-s=s-icon],[data-s=s-internal-icon])[size=small]{width:12px;height:12px}
:where([data-s=s-icon],[data-s=s-internal-icon])[size=large]{width:20px;height:20px}
[data-s=s-icon]>span,[data-s=s-internal-icon]>span{display:flex;width:100%;height:100%}
[data-s=s-badge] [data-s=s-icon]{flex:none}
`;
const shellCss = bld('shell.css').replace(/\/\* ===== Icon rail between[\s\S]*$/, '') + `
body.nav-collapsed .sh-expanded-only{display:none}
.sh-expanded-only+.sh-expanded-only{}
`;
const allCss = [css.polaris, css.app1, css.app2, css.carousel, css.chart, css.extra, pruneFlat(cap('flat.css')), appExtra, shellCss, bld('master.css')].join('\n');

/* ---------- 3. icons & templates ---------- */
const rootOnly = s => s.replace(/<svg([^>]*)>/, (m, a) => '<svg' + a.replace(/ (width|height)="[^"]*"/g, '') + '>');
const strip = s => rootOnly(s.replace(/s*xmlns="[^"]*"/g, '').replace(/ class="[^"]*"/g, '')).replace(/<svg width="100%" height="100%"/, '<svg');
const ic = (name, extra = '') => `<span class="ic ${extra}" aria-hidden="true">${strip(icons[name] || '')}</span>`;
function fromMask(svg) { const imgs = [...svg.matchAll(/href="data:image\/svg\+xml;utf8,([^"]+)"/g)].map(m => decodeURIComponent(m[1])); const inner = imgs.map(s => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')).join(''); return `<svg viewBox="0 0 20 20">${inner}</svg>`; }
const custom = name => `<span class="ic ic--20 ic--fill" aria-hidden="true">${fromMask(iconsRaw.nav.find(n => n.text === name).svg)}</span>`;
const bell = `<span class="ic ic--raw" aria-hidden="true">${strip(assets.bell)}</span>`;
const skSvg = rootOnly(assets.sk.replace(/s*xmlns="[^"]*"/g, ''));
const e02 = cap('e-02-datepicker-custom.html'), e05 = cap('e-05-tooltip-conversion.html');
const T = {
  check: (e02.match(/Polaris-OptionList-Option__Icon"><span class="Polaris-Icon">(<svg[\s\S]*?<\/svg>)/) || [])[1],
  tipChevron: (e05.match(/data-polaris-layer="true"[^>]*>(<svg[\s\S]*?<\/svg>)/) || [])[1],
};
const hdr = e02.match(/Polaris-DatePicker__Header">([\s\S]*?)<\/div><div class="Polaris-DatePicker__MonthLayout/)[1];
[T.prev, T.next] = [...hdr.matchAll(/<span class="Polaris-Icon">(<svg[\s\S]*?<\/svg>)/g)].map(m => m[1]);
console.log('templates:', Object.entries(T).map(([k, v]) => k + ':' + (v ? v.length : 'MISSING')).join(' '));

/* ---------- 4. shell markup ---------- */
const navMain = [['Home', 'home'], ['Orders', 'order'], ['Products', 'product'], ['Customers', 'person'], ['Growth', 'gauge'], ['Discounts', 'discount'], ['Content', 'content'], ['Markets', 'markets'], ['Finance', 'bank'], ['Analytics', 'chart-vertical']];
const item = ([label, icon]) => `<a class="sh-item" href="#" ${''}>${ic(icon)}<span class="sh-item__label">${label}</span></a>`;
const appIcon = 'https://cdn.shopify.com/s/files/applications/393b6ef120968ea1931a5ec86b58d041_200x200.png?v=1753934348';
const smartIcon = 'https://cdn.shopify.com/s/files/applications/f44b43e81ef89598c0de05c8ea6dcf80_200x200.png?v=1543569774';
const subs = ['Filter', 'Search', 'Metafield', 'Year Make Model', 'Filter & product grid design', 'Advanced features'];
const PAGE_LINKS = { Filter: 'filter.html', Search: 'search.html', Metafield: 'metafield.html', 'Year Make Model': 'ymm.html', 'Filter & product grid design': 'design.html', 'Advanced features': 'features.html' };
const alertsData = [
  ['Permissions', 'Sep 7 at 2:34 PM', 'New collaborator request for your store', 'Review collaborator request from collaborator@example.com.', false],
  ['Billing', 'Sep 7 at 2:30 PM', 'Let us know if you’ve registered for a tax number', 'Update your billing settings if you have a tax number for your business.', true],
  ['Settings', 'Sep 7 at 1:37 PM', 'Privacy settings are automated', 'Privacy settings are configured and will stay in sync with the latest recommendations as you set up your store. See updates in the store activity log.', true],
  ['Point of Sale', 'Aug 21 at 1:00 PM', 'Your free trial of POS Pro has ended', 'Select a POS subscription to continue selling in person.', true],
  ['Point of Sale', 'Aug 18 at 6:02 PM', 'Your free trial of POS Pro ends in 3 days', 'Your account will automatically switch to POS Lite.', true],
];

const xIcon = ic('x');
const field = (label, id, extra) => '<label class="pm-field"><span class="pm-label">' + label + '</span>' + extra + '</label>';
const promoModals = `
<div class="scrim scrim--modal" id="scrim-promo"></div>
<div class="pm" id="promo-modal" role="dialog" aria-modal="true" aria-labelledby="pm-title" hidden>
  <div class="pm__head"><h2 id="pm-title">Add promotion banner</h2><button type="button" class="pm__x" data-act="pm-close" aria-label="Close">${xIcon}</button></div>
  <div class="pm__body">
    <div class="pm-card"><h3>Promotion banner</h3><p class="pm-target-row">Shown in <strong id="pm-target"></strong>.<span id="pm-target-note"></span></p>
      <label class="pm-field"><span class="pm-label">Name</span><span class="pm-input"><input id="pm-name" maxlength="40" autocomplete="off"><span class="pm-count">0/40</span></span></label>
    </div>
    <div class="pm-card"><h3>Banners</h3>
      <div id="pm-banners"></div>
      <button type="button" class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter pm-add" data-act="pm-add"><span class="Polaris-Button__Icon"><span class="Polaris-Icon">${ic('plus')}</span></span><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Add more banner</span></button>
    </div>
    <div class="pm-card"><h3>Slideshow</h3>
      
      <label class="pm-field"><span class="pm-label">Seconds between slides</span><span class="pm-input pm-input--short"><input id="pm-interval" type="number" min="1" max="60" step="1" inputmode="numeric" value="5"><span class="pm-suffix">sec</span></span><span class="pm-err">Enter a whole number between 1 and 60</span></label>
      <p class="pm-hint pm-hint-slide"></p>
    </div>
  </div>
  <div class="pm__foot"><button type="button" class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter" data-act="pm-cancel"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Cancel</span></button><button type="button" class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantPrimary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter Polaris-Button--disabled" data-act="pm-save" disabled><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Save banner</span></button></div>
</div>
<div class="scrim scrim--modal" id="scrim-confirm"></div>
<div class="modal" id="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="dm-title" hidden style="z-index:110">
  <div class="modal__head"><span id="dm-title">Delete promotion banner?</span><button class="sh-iconbtn" style="color:#616161;width:24px;height:24px" data-act="dm-close" aria-label="Close">${xIcon}</button></div>
  <div class="modal__body" id="dm-text"></div>
  <div class="modal__foot"><button class="mbtn" data-act="dm-cancel">Cancel</button><button class="mbtn mbtn--danger" data-act="dm-delete">Delete</button></div>
</div>`;

const shell = `
<aside class="sh-nav" id="nav" aria-label="Main navigation">
  <div class="sh-nav__top">
    <a class="sh-logo" href="#" aria-label="Shopify"><img src="https://cdn.shopify.com/shopifycloud/web/assets/v1/vite/client/en/assets/shopify-glyph-color-2026-65613845c170.svg" alt="Shopify"><button class="sh-expand" aria-label="Expand navigation">${ic('layout-sidebar-left')}</button></a>
    <button class="sh-iconbtn sh-collapse" aria-label="Collapse navigation">${ic('layout-sidebar-left')}</button>
    <div class="sh-only-mobile m-pill"><button class="sh-iconbtn js-settings" aria-label="Settings" data-toast="Settings is not part of this copy">${ic('settings')}</button><button class="sh-iconbtn js-bell" aria-label="Alerts">${bell}</button></div>
    <button class="m-avatar js-account" aria-label="My Store Admin">BRG</button>
  </div>
  <button class="sh-search js-search" aria-label="Search">${ic('search')}<span class="sh-search__label">Search</span><kbd>Ctrl K</kbd></button>
  <nav class="sh-list">
    ${navMain.map(item).join('')}
    <div class="sh-divider"></div>
    <button class="sh-section" type="button">Sales channels ${ic('chevron-right')}</button>
    <a class="sh-item sh-expanded-only" href="#">${custom('Online Store')}<span class="sh-item__label">Online Store</span><span class="sh-item__actions"><button class="sh-iconbtn" aria-label="Edit theme">${ic('edit')}</button><button class="sh-iconbtn" aria-label="View your online store">${ic('view')}</button></span></a>
    <a class="sh-item sh-expanded-only" href="#">${custom('Agentic')}<span class="sh-item__label">Agentic</span></a>
    <a class="sh-item sh-only-collapsed" href="#">${custom('Online Store')}</a>
    <div class="sh-divider"></div>
    <button class="sh-section sh-section--apps" type="button">Apps ${ic('chevron-right')}</button>
    <a class="sh-item sh-only-collapsed sh-appsrail" href="#" aria-current="page">${ic('apps')}</a>
    <div class="sh-appgroup">
      <a class="sh-item" href="#" aria-current="page"><img class="sh-appicon" src="${appIcon}" alt=""><span class="sh-item__label">Findter Filter &amp; Search</span></a>
      ${subs.map(s => PAGE_LINKS[s] ? `<a class="sh-item sh-item--sub" href="${PAGE_LINKS[s]}" data-nav="page"><span class="sh-item__label">${s}</span></a>` : `<a class="sh-item sh-item--sub" href="#"><span class="sh-item__label">${s.replace(/&/g, '&amp;')}</span></a>`).join('')}
      <a class="sh-item sh-item--sub sh-item--extra" href="#"><span class="sh-item__label">Analytics</span></a>
      <a class="sh-item sh-item--sub sh-item--extra" href="#"><span class="sh-item__label">Pricing</span></a>
      <button class="sh-item sh-item--more" type="button" aria-expanded="false"><span class="sh-item__label">View more</span></button>
      <a class="sh-item" href="#">${custom('MS Barcode Labels')}<span class="sh-item__label">MS Barcode Labels</span></a>
      <a class="sh-item" href="#"><img class="sh-appicon" src="${smartIcon}" alt=""><span class="sh-item__label">Smart Filter &amp; Search</span><i class="sh-dot"></i><button class="sh-iconbtn sh-pin" aria-label="Pin to your navigation">${ic('pin')}</button></a>
    </div>
  </nav>
  <div class="sh-bottom">
    <a class="sh-item" href="#" style="margin-top:0">${ic('settings')}<span class="sh-item__label">Settings</span></a>
    <button class="sh-account js-account" aria-label="My Store Admin"><span class="sh-avatar">BRG</span><span class="sh-account__name">brgmnnlukas</span></button>
    <button class="sh-iconbtn sh-bell js-bell" aria-label="Alerts Feed - 0 unseen alerts">${bell}</button>
  </div>
</aside>

<div class="sh-main" id="main">
  <header class="sh-top"><img src="${appIcon}" alt=""><span class="sh-top__title">Findter Filter &amp; Search</span><button class="sh-more" aria-label="More actions">${ic('menu-horizontal')}</button></header>
  <div class="sh-scroll">${appHtml}${masterPageHtml}</div>
</div>

<div class="sk" role="search">
  <span class="sk__avatar">${skSvg}</span>
  <input class="sk__input" name="sidekickMessage" placeholder="Work with Sidekick" aria-label="Work with Sidekick" autocomplete="off" maxlength="5000">
  <button class="sh-iconbtn js-skplus" aria-label="Add files and more">${ic('plus')}</button>
  <button class="sh-iconbtn" aria-label="Voice">${ic('sidekick-voice')}</button>
  <span class="sk__sep"></span>
  <button class="sh-iconbtn" aria-label="Open Sidekick">${ic('layout-sidebar-right')}</button>
</div>
<button class="m-fab m-fab--menu" aria-label="Menu">${ic('layout-sidebar-left')}</button>
<button class="m-fab m-fab--sk" aria-label="Sidekick"><span class="sk__avatar" style="width:34px;height:34px">${skSvg}</span></button>

<button class="chat-bubble" aria-label="Open chat"><svg viewBox="0 0 24 24"><path d="M5 4h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-7l-5 4v-4H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zm2.5 4.5a.9.9 0 0 0 0 1.8h9a.9.9 0 0 0 0-1.8zm0 3.5a.9.9 0 0 0 0 1.8h5.5a.9.9 0 0 0 0-1.8z"/></svg></button>
<div class="chat-panel" role="dialog" aria-label="Chat"><div class="chat-panel__head">Findter support<small>We usually reply within a few minutes</small></div><div class="chat-panel__body"><div class="chat-msg">Hi! 👋 How can we help you with Findter today?</div></div><div class="chat-panel__foot"><input placeholder="Compose your message…" aria-label="Message"></div></div>

<!-- menus -->
<div class="pop menu-light" id="menu-more" role="menu">
  <button role="menuitem" data-toast="Manage app is not part of this copy">${ic('apps')}Manage app</button>
  <button role="menuitem" data-toast="Opens Get support">${ic('question-circle')}Get support</button>
  <button role="menuitem" data-toast="Unpin is not part of this copy">${ic('pin-filled')}Unpin from your navigation</button>
  <button role="menuitem" class="danger" data-toast="Uninstall is disabled in this copy">${ic('delete')}Uninstall</button>
</div>
<div class="pop menu-light" id="menu-sk" role="menu" style="min-width:240px;width:240px">
  <button data-toast="Files">${ic('file')}Files</button>
  <button data-toast="Upload from device">${ic('upload')}Upload from device</button>
  <button data-toast="Mention">${ic('mention')}Mention<span class="right"><span class="kbd">@</span>${ic('chevron-right')}</span></button>
  <button data-toast="Skills">${ic('bolt')}Skills<span class="right"><span class="kbd">/</span>${ic('chevron-right')}</span></button>
  <hr>
  <button data-toast="Generate apps">${ic('generated-app')}Generate apps<span class="right"><span class="toggle"></span></span></button>
  <button data-toast="Apps">${ic('apps')}Apps<span class="right"><span class="count-badge">8</span>${ic('chevron-right')}</span></button>
</div>
<div class="pop menu-dark" id="menu-account" style="width:302px">
  <div class="row row--hl"><span class="sh-avatar" style="width:24px;height:24px;line-height:24px;font-size:8px;border-radius:7px">BRG</span><span style="flex:1">brgmnnlukas</span>${ic('code')}</div>
  <div class="row" data-toast="Create store is not part of this copy">${ic('plus-circle')}Create store</div>
  <hr>
  <div class="who"><span class="av">MA</span><div><b>My Store Admin</b><small>owner@example.com</small></div></div>
  <div class="row" data-toast="Opens Help Center">${ic('question-circle')}Help Center</div>
  <div class="row" data-act="logout">${ic('exit')}Log out</div>
</div>
<div class="pop menu-dark alerts" id="menu-alerts">
  <div class="alerts__head"><span>Alerts</span><button class="sh-iconbtn" style="width:28px;height:28px" aria-label="Filter">${ic('filter')}</button><button class="sh-iconbtn" style="width:28px;height:28px" aria-label="Mark all as read">${ic('check-circle')}</button></div>
  <div style="max-height:calc(100vh - 260px);overflow:auto">${alertsData.map(a => `<div class="alert"><div class="alert__meta">${a[4] ? '<i></i>' : ''}<span>${a[0]} • ${a[1]}</span></div><b>${a[2]}</b><p>${a[3]}</p></div>`).join('')}</div>
  <div class="alerts__foot">No more alerts</div>
</div>

<!-- search overlay -->
<div class="scrim" id="scrim-search"><div class="cmd" role="dialog" aria-label="Search">
  <div class="cmd__input">${ic('search', 'ic--20')}<input id="cmd-input" placeholder="Search" aria-label="Search" autocomplete="off"><span class="ic">${strip(icons.filter)}</span></div>
  <div class="cmd__chips">${['Apps', 'Customers', 'Orders', 'Products', 'Sales channels'].map(c => `<button class="cmd__chip">${c}</button>`).join('')}</div>
  <div class="cmd__empty">Find anything in brgmnnlukas</div>
  <div class="cmd__foot">Open <kbd>↵</kbd></div>
</div></div>

<!-- theme modal (open with #select-theme) -->
<div class="scrim scrim--modal" id="scrim-modal"></div>
<div class="modal" id="modal-select-theme" role="dialog" aria-label="Select your theme">
  <div class="modal__head"><span>Select your theme</span><button class="sh-iconbtn" style="color:#616161;width:24px;height:24px" data-act="close-modal" aria-label="Close">${ic('x')}</button></div>
  <div class="modal__body">
    <div class="mbanner"><span class="ic ic--20"><svg viewBox="0 0 20 20" style="width:20px;height:20px"><path d="M10 14a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-.75.75"/><path d="M9 7a1 1 0 1 1 2 0 1 1 0 0 1-2 0"/><path fill-rule="evenodd" d="M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0m-1.5 0a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg></span>
      <div style="padding-right:24px"><div><b>Supported themes:</b> View the <a href="https://flintverse.gitbook.io/docs/findter-custom-filter-search/user-guide/findter-custom-filter-and-search/supported-shopify-themes" target="_blank" rel="noopener">list of supported themes</a> currently supported by our app.</div><div>If your theme is not listed, please contact us <a href="#" data-s="s-link" commandfor="modal-select-theme">via live chat</a> for assistance.</div></div>
      <button class="sh-iconbtn x" style="color:#003a5a;width:20px;height:20px" aria-label="Dismiss">${ic('x')}</button></div>
    <div>Please choose a duplicate/draft theme to test the app before going live.</div>
    <div style="margin-top:16px;font-weight:650">Theme selection</div>
    <label class="msel"><select aria-label="Select a theme"><option value="" selected disabled>Select a theme</option><option value="gid://shopify/OnlineStoreTheme/165579620595">Horizon Globo Filter  (live)</option><option value="gid://shopify/OnlineStoreTheme/188572500211">Updated copy of Horizon</option><option value="gid://shopify/OnlineStoreTheme/164856758515">Horizon</option></select><svg viewBox="0 0 20 20"><path d="M10.884 4.323a1.25 1.25 0 0 0-1.768 0l-2.646 2.647a.75.75 0 0 0 1.06 1.06l2.47-2.47 2.47 2.47a.75.75 0 1 0 1.06-1.06z"/><path d="m7.53 12.03 2.47 2.47 2.47-2.47a.75.75 0 1 1 1.06 1.06l-2.646 2.647a1.25 1.25 0 0 1-1.768 0l-2.646-2.647a.75.75 0 1 1 1.06-1.06"/></svg></label>
  </div>
  <div class="modal__foot"><button class="mbtn" data-act="close-modal">Close</button><button class="mbtn mbtn--primary" data-act="next" disabled>Next</button></div>
</div>
${promoModals}
<div class="toast" id="toast" role="status"></div>`;

/* ---------- 5. final page ---------- */
const html = `<!doctype html>
<html lang="en" class="p-theme-light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>brgmnnlukas · Findter Filter &amp; Search · Shopify</title>
<link rel="icon" href="${appIcon}">
<link rel="stylesheet" href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css" crossorigin>
<style>
${allCss}
</style>
</head>
<body>
${shell}
<script>window.__TPL=${JSON.stringify(T)};</script>
<script>
${bld('app.js')}
</script>
</body>
</html>
`;
const out = path.join(__dirname, '..', 'index.html');
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
