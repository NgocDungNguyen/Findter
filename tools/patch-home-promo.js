// Promotion banners can be added / edited / deleted directly from the Home tab's layout editor
const fs = require('fs');
const swap = (src, from, to) => { if (!src.includes(from)) throw new Error('anchor not found: ' + from.slice(0, 80)); return src.split(from).join(to); };

/* ---- master-block.js ---- */
let m = fs.readFileSync('build/master-block.js', 'utf8');
m = swap(m,
  "${id.startsWith('promo:') ? '<span class=\"hl-tag\">Promotion</span>' : ''}<span class=\"hl-pos\">",
  "${id.startsWith('promo:') ? `<span class=\"hl-tag\">Promotion</span><span class=\"hl-acts\"><button type=\"button\" class=\"hl-act\" data-act=\"hl-edit\" data-id=\"${escHtml(id)}\" aria-label=\"Edit ${escHtml(nameOf(id))}\">Edit</button><button type=\"button\" class=\"hl-act hl-act--del\" data-act=\"hl-delete\" data-id=\"${escHtml(id)}\" aria-label=\"Delete ${escHtml(nameOf(id))}\">Delete</button></span>` : ''}<span class=\"hl-pos\">");
m = swap(m, "const item = e.target.closest('.hl-item'); if (!item || e.button > 0) return;\n    if (e.pointerType", "const item = e.target.closest('.hl-item'); if (!item || e.button > 0 || e.target.closest('.hl-act')) return;\n    if (e.pointerType");
// flash the block that was just added
m = swap(m, "  const hlRoot = $('#hl');\n  let draft = cloneLayout(savedLayout);", "  const hlRoot = $('#hl');\n  let draft = cloneLayout(savedLayout), lastAdded = null;");
m = swap(m, "    const dirty = !sameLayout(draft, savedLayout);\n    setBtn($('[data-act=hl-save]')", "    if (lastAdded) { const added = $$('.hl-item', hlRoot).find(i => i.dataset.id === lastAdded); if (added) { added.classList.add('hl-flash'); added.scrollIntoView({ block: 'nearest' }); } lastAdded = null; }\n    const dirty = !sameLayout(draft, savedLayout);\n    setBtn($('[data-act=hl-save]')");
m = swap(m, "  addEventListener('pointerup', () => endDrag(false));", `  hlRoot.addEventListener('click', e => {
    const b = e.target.closest('.hl-act'); if (!b) return;
    const pid = b.dataset.id.replace(/^promo:/, '');
    if (b.dataset.act === 'hl-edit') openPromoModal(pid); else askDelete(pid);
  });
  addEventListener('pointerup', () => endDrag(false));`);
// both entry points (Promotion tab + Home tab) open the same modal
m = swap(m, "$('[data-act=pm-new]').addEventListener('click', () => openPromoModal(null));", "$$('[data-act=pm-new]').forEach(b => b.addEventListener('click', () => openPromoModal(null)));\n  // keep the Home editor's unsaved draft in step when blocks are added / deleted while it is open\n  function afterPromosChanged() { draft = reconcile(draft); if (currentTab === 'home') renderHL(); if (currentTab === 'promotion-banner') renderPromoList(); }");
m = swap(m, "lsSet(LS_PROMOS, promos); syncPromoCards(); renderPromoList(); closePromoModal();", "lsSet(LS_PROMOS, promos); if (i < 0) lastAdded = promoKey(next); syncPromoCards(); afterPromosChanged(); closePromoModal();");
m = swap(m, "closeConfirm(); syncPromoCards(); renderPromoList(); toast('Promotion banner deleted');", "closeConfirm(); syncPromoCards(); afterPromosChanged(); toast('Promotion banner deleted');");
fs.writeFileSync('build/master-block.js', m);

/* ---- app.js: re-splice the updated block ---- */
let app = fs.readFileSync('build/app.js', 'utf8');
const marker = '  /* ---------- layout: card placement';
app = app.slice(0, app.indexOf(marker)) + m;
fs.writeFileSync('build/app.js', app);

/* ---- build.js: Home panel header button + copy, modal hint ---- */
let b = fs.readFileSync('build.js', 'utf8');
b = swap(b, "Click Save to apply the new order to the homepage.</p></div><span class=\"hl-status\" hidden>Unsaved changes</span></div>",
  "Add promotion banners here too, then click Save to apply the new order to the homepage.</p></div><div class=\"hl-head__side\"><span class=\"hl-status\" hidden>Unsaved changes</span>' + btn('Secondary', 'Add promotion banner', 'data-act=\"pm-new\"') + '</div></div>");
b = swap(b, '<p class="pm-hint pm-hint-slide"></p>', '<p class="pm-hint">The homepage columns are narrow, so showing 1 banner at once works best.</p><p class="pm-hint pm-hint-slide"></p>');
fs.writeFileSync('build.js', b);

/* ---- master.css ---- */
let css = fs.readFileSync('build/master.css', 'utf8');
if (!css.includes('.hl-acts')) css += `
/* Home tab: promotion block actions */
.hl-head__side{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.hl-acts{display:flex;gap:2px}
.hl-act{appearance:none;border:0;background:none;font:inherit;font-size:12px;font-weight:550;color:#005bd3;padding:2px 6px;border-radius:6px;cursor:pointer}
.hl-act:hover{background:#eaf4ff}
.hl-act--del{color:#c70a24}
.hl-act--del:hover{background:#fdecee}
.hl-act:focus-visible{outline:2px solid #005bd3}
.hl-flash{animation:hlflash 1.6s ease-out}
@keyframes hlflash{0%{background:#d8ecff;border-color:#005bd3}100%{background:#fff;border-color:#e3e3e3}}
@media (prefers-reduced-motion:reduce){.hl-flash{animation:none}}
`;
fs.writeFileSync('build/master.css', css);
console.log('patched');
