// One-off patch: Promotion banner blocks (tab, modal, homepage slider)
const fs = require('fs');
const swap = (src, from, to) => { if (!src.includes(from)) throw new Error('anchor not found: ' + from.slice(0, 70)); return src.split(from).join(to); };

/* ---- app.js: replace everything from the layout block on ---- */
let app = fs.readFileSync('build/app.js', 'utf8');
const marker = '  /* ---------- layout: card placement';
if (!app.includes(marker)) throw new Error('layout marker missing in app.js');
app = app.slice(0, app.indexOf(marker)) + fs.readFileSync('build/master-block.js', 'utf8');
fs.writeFileSync('build/app.js', app);

/* ---- build.js ---- */
let b = fs.readFileSync('build.js', 'utf8');
if (!b.includes('data-panel="promo"')) {
  const promoPanel = `
  + '<div data-panel="promo" hidden>' + mpCard('<div class="hl-head"><div><h2 class="Polaris-Text--root Polaris-Text--headingMd">Promotion banners</h2><p class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--subdued">Image banners shown on the homepage. Each block is as wide as its column. Choose its column and position in the Home tab.</p></div>' + btn('Primary', 'Add promotion banner', 'data-act="pm-new"') + '</div><div id="promo-list" class="pl"></div>') + '</div>'`;
  b = swap(b, "  + '</div></div></div>';", promoPanel + "\n  + '</div></div></div>';");
}
if (!b.includes('id="promo-modal"')) {
  const modals = `
const xIcon = ic('x');
const field = (label, id, extra) => '<label class="pm-field"><span class="pm-label">' + label + '</span>' + extra + '</label>';
const promoModals = \`
<div class="scrim scrim--modal" id="scrim-promo"></div>
<div class="pm" id="promo-modal" role="dialog" aria-modal="true" aria-labelledby="pm-title" hidden>
  <div class="pm__head"><h2 id="pm-title">Add promotion banner</h2><button type="button" class="pm__x" data-act="pm-close" aria-label="Close">\${xIcon}</button></div>
  <div class="pm__body">
    <div class="pm-card"><h3>Promotion banner</h3>
      <label class="pm-field"><span class="pm-label">Name</span><span class="pm-input"><input id="pm-name" maxlength="40" autocomplete="off"><span class="pm-count">0/40</span></span></label>
    </div>
    <div class="pm-card"><h3>Banners</h3>
      <div id="pm-banners"></div>
      <button type="button" class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter pm-add" data-act="pm-add"><span class="Polaris-Button__Icon"><span class="Polaris-Icon">\${ic('plus')}</span></span><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Add more banner</span></button>
    </div>
    <div class="pm-card"><h3>Slideshow</h3>
      <div class="pm-field"><span class="pm-label" id="pm-seg-l">Banners shown at once</span><span class="pm-seg" role="group" aria-labelledby="pm-seg-l"><button type="button" data-v="1" aria-pressed="true">1 banner</button><button type="button" data-v="2" aria-pressed="false">2 banners</button></span></div>
      <label class="pm-field"><span class="pm-label">Seconds between slides</span><span class="pm-input pm-input--short"><input id="pm-interval" type="number" min="1" max="60" step="1" inputmode="numeric" value="5"><span class="pm-suffix">sec</span></span><span class="pm-err">Enter a whole number between 1 and 60</span></label>
      <p class="pm-hint pm-hint-slide"></p>
    </div>
  </div>
  <div class="pm__foot"><button type="button" class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter" data-act="pm-cancel"><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Cancel</span></button><button type="button" class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantPrimary Polaris-Button--sizeMedium Polaris-Button--textAlignCenter Polaris-Button--disabled" data-act="pm-save" disabled><span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Save</span></button></div>
</div>
<div class="scrim scrim--modal" id="scrim-confirm"></div>
<div class="modal" id="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="dm-title" hidden style="z-index:110">
  <div class="modal__head"><span id="dm-title">Delete promotion banner?</span><button class="sh-iconbtn" style="color:#616161;width:24px;height:24px" data-act="dm-close" aria-label="Close">\${xIcon}</button></div>
  <div class="modal__body" id="dm-text"></div>
  <div class="modal__foot"><button class="mbtn" data-act="dm-cancel">Cancel</button><button class="mbtn mbtn--danger" data-act="dm-delete">Delete</button></div>
</div>\`;
`;
  b = swap(b, "const shell = `", modals + "\nconst shell = `");
  b = swap(b, '<div class="toast" id="toast" role="status"></div>`;', '${promoModals}\n<div class="toast" id="toast" role="status"></div>`;');
}
fs.writeFileSync('build.js', b);

/* ---- master.css ---- */
let css = fs.readFileSync('build/master.css', 'utf8');
if (!css.includes('.pb-card')) css += `
/* ===== Promotion banner: homepage block ===== */
.pb-card{overflow:hidden}
.pb-box{position:relative;overflow:hidden;border-radius:inherit}
.pb-viewport{overflow:hidden}
.pb-track{display:flex;width:100%;--pb-pv:1;transition:transform .5s cubic-bezier(.4,0,.2,1)}
.pb-slide{position:relative;flex:0 0 calc(100% / var(--pb-pv));width:calc(100% / var(--pb-pv));min-height:72px;display:flex;background:#ececec}
.pb-slide + .pb-slide{box-shadow:-2px 0 0 #fff}
.pb-slide img{display:block;width:100%;height:100%;object-fit:cover;user-select:none;-webkit-user-drag:none}
.pb-link{display:flex;width:100%}
.pb-slide.is-broken{align-items:center;justify-content:center;color:#8a8a8a;font-size:12px}
.pb-dots{position:absolute;left:0;right:0;bottom:8px;display:flex;justify-content:center;gap:6px;pointer-events:none}
.pb-dots:empty{display:none}
.pb-dot{pointer-events:auto;appearance:none;border:0;padding:0;width:8px;height:8px;border-radius:50%;background:#ffffffb3;box-shadow:0 0 0 1px #0000003d;cursor:pointer}
.pb-dot.is-on{background:#fff;box-shadow:0 0 0 1px #0000008a;transform:scale(1.2)}

/* ===== Promotion banner: Master tab list ===== */
.pl{margin-top:12px}
.pl-empty{display:flex;flex-direction:column;gap:2px;align-items:center;text-align:center;padding:28px 12px;border:1px dashed #c9c9c9;border-radius:12px;color:#616161}
.pl-empty strong{color:#303030}
.pl-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid #ebebeb}
.pl-row:first-child{border-top:0}
.pl-thumb{width:96px;height:48px;border-radius:8px;object-fit:cover;background:#ececec;flex:none;box-shadow:0 0 0 1px #0000001a}
.pl-thumb.is-broken{opacity:.35}
.pl-main{flex:1;min-width:0}
.pl-name{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-meta{color:#616161;font-size:12px;line-height:16px;margin-top:2px}
.pl-actions{display:flex;gap:8px;flex:none}
.pl-del{color:#c70a24!important}
@media (max-width:620px){.pl-row{flex-wrap:wrap}.pl-actions{width:100%;justify-content:flex-end}.hl-head{flex-wrap:wrap}}
.hl-tag{background:#e0f0ff;color:#003a5a;border-radius:6px;font-size:11px;line-height:18px;padding:0 6px;font-weight:550}

/* ===== Promotion banner: add/edit modal (layout from the "Add app" reference) ===== */
.pm{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(720px,calc(100vw - 24px));max-height:calc(100vh - 48px);display:flex;flex-direction:column;background:#f1f1f1;border-radius:16px;box-shadow:0 12px 40px #0006;z-index:95;overflow:hidden;color:#303030}
.pm[hidden]{display:none}
.pm__head{display:flex;align-items:center;gap:8px;height:52px;padding:0 12px 0 20px;background:#fff;border-bottom:1px solid #e3e3e3;flex:none}
.pm__head h2{margin:0;flex:1;font-size:18px;line-height:24px;font-weight:650}
.pm__x{appearance:none;border:0;background:none;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#4a4a4a;cursor:pointer}
.pm__x:hover{background:#f1f1f1}
.pm__x:focus-visible{outline:2px solid #005bd3}
.pm__x .ic,.pm__x .ic svg{width:20px;height:20px}
.pm__body{padding:16px;overflow:auto;display:flex;flex-direction:column;gap:12px}
.pm-card{background:#fff;border-radius:12px;box-shadow:var(--p-shadow-100);padding:12px 14px 14px}
.pm-card h3{margin:0;font-size:13px;line-height:20px;font-weight:650}
.pm-field{display:block;margin-top:10px}
.pm-label{display:block;font-size:12px;line-height:16px;color:#4a4a4a;margin-bottom:4px}
.pm-input{display:flex;align-items:center;height:28px;border-radius:8px;background:#fdfdfd;box-shadow:inset 0 0 0 1px #8a8a8a}
.pm-input:focus-within{outline:2px solid #005bd3;outline-offset:1px}
.pm-input input{flex:1;min-width:0;height:100%;border:0;background:none;outline:0;padding:0 10px;font:inherit;font-size:13px;color:#303030}
.pm-input input::placeholder{color:#8a8a8a}
.pm-count,.pm-suffix{padding-right:10px;color:#616161;font-size:12px}
.pm-input--short{width:140px}
.pm-err{display:none;margin-top:4px;color:#c70a24;font-size:12px;line-height:16px}
.pm-field.is-error .pm-input{box-shadow:inset 0 0 0 1px #c70a24;background:#fff5f5}
.pm-field.is-error .pm-err{display:block}
.pm-banner{margin-top:10px;padding:2px 12px 14px;border:1px solid #e3e3e3;border-radius:10px;background:#fcfcfc}
.pm-banner__head{display:flex;align-items:center;justify-content:space-between;padding-top:8px}
.pm-banner__head strong{font-size:12px}
.pm-remove{appearance:none;border:0;background:none;color:#c70a24;font:inherit;font-size:12px;cursor:pointer;padding:2px 4px;border-radius:6px}
.pm-remove:hover{background:#fdecee}
.pm-preview{margin-top:8px;border-radius:8px;overflow:hidden;background:#ececec;max-height:140px;display:flex;justify-content:center}
.pm-preview img{display:block;max-width:100%;max-height:140px;object-fit:contain}
.pm-preview.is-broken{padding:14px;color:#8a8a8a;font-size:12px;text-align:center;align-items:center}
.pm-add{margin-top:12px}
.pm-add .Polaris-Icon{margin:0}
.pm-seg{display:inline-flex;border-radius:8px;box-shadow:inset 0 0 0 1px #8a8a8a;overflow:hidden}
.pm-seg button{appearance:none;border:0;background:#fdfdfd;font:inherit;font-weight:550;height:28px;padding:0 14px;cursor:pointer;color:#303030}
.pm-seg button + button{box-shadow:inset 1px 0 0 #8a8a8a}
.pm-seg button[aria-pressed=true]{background:#303030;color:#fff}
.pm-seg button:focus-visible{outline:2px solid #005bd3;outline-offset:-2px}
.pm-hint{margin:10px 0 0;color:#616161;font-size:12px;line-height:16px}
.pm__foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid #e3e3e3;flex:none}
.mbtn--danger{background:#c70a24;border-color:#c70a24;color:#fff;box-shadow:none}
.mbtn--danger:hover{background:#a8081e}
`;
fs.writeFileSync('build/master.css', css);
console.log('patched');
