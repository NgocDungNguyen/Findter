// One-off patch: add the Master card, Master UI page and layout editor to the build
const fs = require('fs');
const swap = (src, from, to) => { if (!src.includes(from)) throw new Error('anchor not found: ' + from.slice(0, 60)); return src.split(from).join(to); };

/* ---- app.js ---- */
let app = fs.readFileSync('build/app.js', 'utf8');
app = swap(app, "const dismiss = card => { const wrap = card.closest('.Polaris-Layout__Section') || card; wrap.style.display = 'none'; };", "const dismiss = card => { card.hidden = true; };");
const marker = '  /* ---------- layout: mobile card order ---------- */';
if (app.includes(marker)) app = app.slice(0, app.indexOf(marker));
else if (!app.includes('layout: card placement')) throw new Error('layout marker missing');
if (!app.includes('layout: card placement')) app += fs.readFileSync('build/master-block.js', 'utf8');
fs.writeFileSync('build/app.js', app);

/* ---- build.js ---- */
let b = fs.readFileSync('build.js', 'utf8');
if (!b.includes('data-card="master"')) {
  const cardCode = `
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
const colHTML = (side, title) => '<div class="hl-col"><h3>' + title + '<span class="hl-count" data-side="' + side + '"></span></h3><div class="hl-list" role="list" data-side="' + side + '"></div></div>';
const masterPageHtml = '<div id="master-page" hidden><div class="mp-wrap"><h1 class="mp-title">Master UI</h1><div class="ft-welcome mp-hero"><h1 class="ft-welcome__title">\\u{1F44B} Master Control \\u{1F44B}</h1><p class="ft-welcome__subtitle">Internal devops console \\u2014 manage indexing, features, server tiers, and payments across every shop.</p></div><div class="mt-tabs"></div><div class="mp-panels">'
  + '<div data-panel="load">' + mpCard('<div class="mp-load">' + btn('Primary', 'Load', 'data-act="load"') + '</div>', ';--pc-box-padding-block-start-xs: 0;--pc-box-padding-block-end-xs: 0') + '</div>'
  + '<div data-panel="home" hidden>' + mpCard('<div class="hl-head"><div><h2 class="Polaris-Text--root Polaris-Text--headingMd">Homepage layout</h2><p class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued">Drag and drop each block to change its order, or move it to the other column. Click Save to apply the new order to the homepage.</p></div><span class="hl-status" hidden>Unsaved changes</span></div><div class="hl-grid" id="hl">' + colHTML('left', 'Left column') + colHTML('right', 'Right column') + '</div><div class="hl-foot"><span class="hl-hint">Keyboard: focus a block, then Shift + arrow keys to move it.</span><div class="hl-actions">' + btn('Tertiary', 'Reset to default', 'data-act="hl-reset"') + btn('Secondary', 'Discard changes', 'data-act="hl-discard"') + btn('Primary', 'Save', 'data-act="hl-save"') + '</div></div>') + '</div>'
  + '</div></div></div>';
`;
  b = swap(b, "const appHtml = doc.querySelector('#app').outerHTML;", cardCode + "\nconst appHtml = doc.querySelector('#app').outerHTML;");
}
b = swap(b, '<div class="sh-scroll">${appHtml}</div>', '<div class="sh-scroll">${appHtml}${masterPageHtml}</div>');
if (!b.includes("bld('master.css')")) b = swap(b, 'appExtra, shellCss]', "appExtra, shellCss, bld('master.css')]");
fs.writeFileSync('build.js', b);
console.log('patched app.js + build.js');
