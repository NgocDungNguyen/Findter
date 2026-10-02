// v4: draft + Save for everything, uniform widths up to 767px, banner arrows + X overlay, clearer desktop/mobile banner wording
const fs = require('fs');
const swap = (src, from, to) => { if (!src.includes(from)) throw new Error('anchor not found: ' + from.slice(0, 100)); return src.split(from).join(to); };

/* ======== master-block.js ======== */
let m = fs.readFileSync('build/master-block.js', 'utf8');

// mobile layout = the whole mobile shell range (<= 767px), not only phones <= 489px
m = swap(m, 'if (mq.xs.matches) {', 'if (mq.mobile.matches) {');
m = swap(m, "mq.xs.addEventListener('change', applyOrder);", "mq.mobile.addEventListener('change', applyOrder);");

// reconcile() works on any promo list (saved or draft)
m = swap(m, 'function reconcile(l) {', 'function reconcile(l, pl = promos) {');
m = swap(m, "promos.filter(p => p.target !== 'mobile').map(promoKey)", "pl.filter(p => p.target !== 'mobile').map(promoKey)");
m = swap(m, "promos.filter(p => p.target === 'mobile').map(promoKey)", "pl.filter(p => p.target === 'mobile').map(promoKey)");
m = swap(m, "(promoOf(id).target === 'right' ? 'right' : 'left')", "(pl.find(p => promoKey(p) === id).target === 'right' ? 'right' : 'left')");

// draft promos: the editor / modal work on a copy; only Save publishes it
m = swap(m, 'const promoOf = id => promos.find(p => promoKey(p) === id);', "const clonePromos = l => l.map(p => ({ ...p, banners: p.banners.map(b => ({ ...b })) }));\n  let draftPromos = clonePromos(promos);\n  const promoOf = id => draftPromos.find(p => promoKey(p) === id);");

// Home tab keeps its unsaved draft while you switch tabs
m = swap(m, "if (id === 'home') { draft = cloneLayout(savedLayout); renderHL(); }", "if (id === 'home') renderHL();");

m = swap(m, 'const setBtn = (b, disabled) =>', "const isDirty = () => !sameLayout(draft, savedLayout) || JSON.stringify(draftPromos) !== JSON.stringify(promos);\n  const setBtn = (b, disabled) =>");
m = swap(m, `    const dirty = !sameLayout(draft, savedLayout);
    setBtn($('[data-act=hl-save]'), !dirty); setBtn($('[data-act=hl-discard]'), !dirty); setBtn($('[data-act=hl-reset]'), sameLayout(draft, reconcile(DEFAULT_LAYOUT)));
    $('.hl-status').hidden = !dirty;`, `    const dirty = isDirty();
    setBtn($('[data-act=hl-save]'), !dirty); setBtn($('[data-act=hl-discard]'), !dirty); setBtn($('[data-act=hl-reset]'), sameLayout(draft, reconcile(DEFAULT_LAYOUT, draftPromos)));
    $('.hl-status').hidden = !dirty;
    const homeTab = $('.mt-tab[data-tab=home]'); if (homeTab) homeTab.classList.toggle('has-changes', dirty);`);

// Save publishes layout AND banners; Discard reverts both
const s1 = m.indexOf("  $('[data-act=hl-save]').addEventListener('click', () => {");
const s2 = m.indexOf("  $('[data-act=hl-reset]').addEventListener('click'");
const s3 = m.indexOf('\n', s2);
if (s1 < 0 || s2 < 0) throw new Error('save block not found');
m = m.slice(0, s1) + `  $('[data-act=hl-save]').addEventListener('click', () => {
    promos = clonePromos(draftPromos); lsSet(LS_PROMOS, promos);
    savedLayout = reconcile(cloneLayout(draft), promos); lsSet(LS_LAYOUT, savedLayout);
    syncPromoCards();                                   // rebuilds the banner blocks and re-places everything on the homepage
    draft = cloneLayout(savedLayout); draftPromos = clonePromos(promos);
    renderHL(); toast('Saved. The homepage now uses this layout');
  });
  $('[data-act=hl-discard]').addEventListener('click', () => { draft = cloneLayout(savedLayout); draftPromos = clonePromos(promos); renderHL(); });
  $('[data-act=hl-reset]').addEventListener('click', () => { draft = reconcile(DEFAULT_LAYOUT, draftPromos); renderHL(); });` + m.slice(s3);

// modal save / delete only touch the draft
m = swap(m, `      const i = promos.findIndex(x => x.id === next.id); if (i >= 0) promos[i] = next; else promos.push(next);
      lsSet(LS_PROMOS, promos); if (i < 0) lastAdded = { id: promoKey(next), side: next.target };
      syncPromoCards(); afterPromosChanged(); closePromoModal();
      toast(i >= 0 ? 'Promotion banner updated' : \`Promotion banner added to \${SECTION_LABEL[next.target]}\`);`, `      const i = draftPromos.findIndex(x => x.id === next.id); if (i >= 0) draftPromos[i] = next; else draftPromos.push(next);
      if (i < 0) lastAdded = { id: promoKey(next), side: next.target };
      afterPromosChanged(); closePromoModal();
      toast(i >= 0 ? 'Banner updated in your draft. Click Save to apply it.' : \`Banner added to \${SECTION_LABEL[next.target]} in your draft. Click Save to apply it.\`);`);
m = swap(m, "promos = promos.filter(x => x.id !== delId); lsSet(LS_PROMOS, promos); closeConfirm(); syncPromoCards(); afterPromosChanged(); toast('Promotion banner deleted');", "draftPromos = draftPromos.filter(x => x.id !== delId); closeConfirm(); afterPromosChanged(); toast('Banner removed in your draft. Click Save to apply it.');");
m = swap(m, 'function afterPromosChanged() { draft = reconcile(draft); if', 'function afterPromosChanged() { draft = reconcile(draft, draftPromos); if');
m = swap(m, 'This can’t be undone.`', 'It disappears from the homepage when you click Save.`');
m = swap(m, "$('#pm-target').textContent = SECTION_LABEL[form.target];", "$('#pm-target').textContent = SECTION_LABEL[form.target];\n    $('#pm-target-note').textContent = form.target === 'mobile' ? ' Used on phones only. Desktop uses its own banners.' : ' Used on desktop only. Phones use their own banners.';");

// unsaved-changes guard
m = swap(m, "  Object.keys(cardEls).forEach(k => { if (k.startsWith('promo:')) delete cardEls[k]; });", "  addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });\n  Object.keys(cardEls).forEach(k => { if (k.startsWith('promo:')) delete cardEls[k]; });");

// banner block: arrows when there is more than one banner, X overlay on every banner
m = swap(m, "    viewport.addEventListener('pointerenter', stop); viewport.addEventListener('pointerleave', start);", "    box.addEventListener('pointerenter', stop); box.addEventListener('pointerleave', start);");
m = swap(m, "    renderPromo(rt); start();\n  }\n  function renderPromo(rt, instant) {", `    const x = mk('button', 'pb-x', { type: 'button', 'aria-label': 'Close promotion banner' });
    x.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
    x.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); stop(); card.hidden = true; });   // comes back on reload, like the other blocks
    box.appendChild(x);
    if (p.banners.length > 1) {
      const nav = (dir, label, d) => { const b = mk('button', 'pb-nav pb-nav--' + dir, { type: 'button', 'aria-label': label }); b.innerHTML = d; b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); step(rt, dir === 'next' ? 1 : -1); start(); }); box.appendChild(b); };
      nav('prev', 'Previous banner', '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg>');
      nav('next', 'Next banner', '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>');
    }
    renderPromo(rt); start();
  }
  function renderPromo(rt, instant) {`);
fs.writeFileSync('build/master-block.js', m);

/* ---- app.js: re-splice ---- */
let app = fs.readFileSync('build/app.js', 'utf8');
const marker = '  /* ---------- layout: card placement';
app = app.slice(0, app.indexOf(marker)) + m;
fs.writeFileSync('build/app.js', app);

/* ======== build.js ======== */
let b = fs.readFileSync('build.js', 'utf8');
b = swap(b, "'Desktop') + colHTML('right', 'Right column', 'desktop', 'Desktop')", "'Desktop only. Banners added here are not shown on phones') + colHTML('right', 'Right column', 'desktop', 'Desktop only. Banners added here are not shown on phones')");
b = swap(b, "'Phones, screens up to 489px wide'", "'Phones only, up to 767px wide. Banners added here are not shown on desktop'");
b = swap(b, '<span class="hl-hint">Keyboard: focus a block, then Shift + arrow keys to move it.</span>', '<span class="hl-hint">Nothing changes on the homepage until you click Save. Keyboard: focus a block, then Shift + arrow keys to move it.</span>');
b = swap(b, 'Drag and drop blocks to set their order. Desktop has a left and a right column, and phones have their own order. Add a promotion banner under the section it should appear in, then click Save to apply the order to the homepage.', 'Drag and drop blocks to set their order. Desktop has a left and a right column, and phones have their own order and their own banners. Add a promotion banner under the section it should appear in. Everything you change here is a draft until you click Save.');
b = swap(b, '<p class="pm-target-row">Shown in <strong id="pm-target"></strong></p>', '<p class="pm-target-row">Shown in <strong id="pm-target"></strong>.<span id="pm-target-note"></span></p>');
b = swap(b, 'data-act="pm-save" disabled><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Save</span>', 'data-act="pm-save" disabled><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Save banner</span>');
// the single-column "mobile" layout covers the whole mobile shell range, so the page padding goes with it
b = swap(b, '.sp-grid{padding-left:0!important;padding-right:0!important}[data-card=guide]', '[data-card=guide]');
b = swap(b, '.chev{transition:transform .2s ease}', '@media (max-width:767px){.sp-grid{padding-left:0!important;padding-right:0!important}}\n.chev{transition:transform .2s ease}');
fs.writeFileSync('build.js', b);

/* ======== css ======== */
let css = fs.readFileSync('build/master.css', 'utf8');
css = swap(css, '@media (max-width:489px){\n  .sh-scroll{scrollbar-width:none}', '@media (max-width:767px){\n  .sh-scroll{scrollbar-width:none}');
css = swap(css, '#app .mobile-layout > .Polaris-Layout__Section{margin:0!important;max-width:none!important;min-width:0!important;width:100%;flex:none!important}', '#app .mobile-layout > .Polaris-Layout__Section{box-sizing:border-box;margin:0!important;padding:0 10px!important;max-width:none!important;min-width:0!important;width:100%;flex:none!important}');
if (!css.includes('.pb-nav')) css += `
/* ===== Banner arrows + close overlay ===== */
.pb-nav,.pb-x{position:absolute;z-index:3;appearance:none;border:0;padding:0;display:flex;align-items:center;justify-content:center;border-radius:50%;cursor:pointer}
.pb-nav{top:50%;transform:translateY(-50%);width:30px;height:30px;background:#ffffffe6;color:#303030;box-shadow:0 1px 5px #0000004d}
.pb-nav:hover{background:#fff}
.pb-nav--prev{left:8px}
.pb-nav--next{right:8px}
.pb-nav svg,.pb-x svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.pb-x{top:8px;right:8px;width:26px;height:26px;background:#000000a6;color:#fff}
.pb-x:hover{background:#000000d9}
.pb-nav:focus-visible,.pb-x:focus-visible{outline:2px solid #005bd3;outline-offset:2px}
.mt-tab.has-changes::after{content:"";display:inline-block;width:6px;height:6px;margin-left:6px;border-radius:50%;background:#e8590c;vertical-align:middle}
`;
fs.writeFileSync('build/master.css', css);
console.log('patched v4');
