// v3: no Promotion banner tab, no "shown at once", 3-section Home editor (left / right / mobile), per-section Add buttons, uniform mobile widths
const fs = require('fs');
const swap = (src, from, to) => { if (!src.includes(from)) throw new Error('anchor not found: ' + from.slice(0, 90)); return src.split(from).join(to); };

/* ---- script: install new block ---- */
const block = fs.readFileSync('build/master-block-v3.js', 'utf8');
fs.writeFileSync('build/master-block.js', block);
let app = fs.readFileSync('build/app.js', 'utf8');
const marker = '  /* ---------- layout: card placement';
app = app.slice(0, app.indexOf(marker)) + block;
fs.writeFileSync('build/app.js', app);

/* ---- build.js ---- */
let b = fs.readFileSync('build.js', 'utf8');
// 1. drop the Promotion banner panel
const ps = b.indexOf("\n  + '<div data-panel=\"promo\" hidden>'");
const pe = b.indexOf("\n  + '</div></div></div>';", ps);
if (ps < 0 || pe < 0) throw new Error('promo panel markers not found');
b = b.slice(0, ps) + b.slice(pe);
// 2. Home panel: copy, header button, three sections each with its own Add button
b = swap(b, 'Drag and drop each block to change its order, or move it to the other column. Add promotion banners here too, then click Save to apply the new order to the homepage.', 'Drag and drop blocks to set their order. Desktop has a left and a right column, and phones have their own order. Add a promotion banner under the section it should appear in, then click Save to apply the order to the homepage.');
b = swap(b, "<span class=\"hl-status\" hidden>Unsaved changes</span>' + btn('Secondary', 'Add promotion banner', 'data-act=\"pm-new\"') + '</div></div>", "<span class=\"hl-status\" hidden>Unsaved changes</span></div></div>");
b = swap(b, "colHTML('left', 'Left column') + colHTML('right', 'Right column')", "colHTML('left', 'Left column', 'desktop', 'Desktop') + colHTML('right', 'Right column', 'desktop', 'Desktop') + colHTML('mobile', 'Mobile phone order', 'mobile', 'Phones, screens up to 489px wide')");
const cs = b.indexOf('const colHTML = ');
const ce = b.indexOf('\n', cs);
b = b.slice(0, cs) + "const colHTML = (side, title, group, sub) => '<div class=\"hl-col hl-col--' + side + '\" data-group=\"' + group + '\"><h3>' + title + '<span class=\"hl-count\" data-side=\"' + side + '\"></span></h3><p class=\"hl-sub\">' + sub + '</p><div class=\"hl-list\" role=\"list\" data-side=\"' + side + '\"></div><button type=\"button\" class=\"hl-add\" data-target=\"' + side + '\">+ Add promotion banner</button></div>';" + b.slice(ce);
// 3. modal: no "shown at once", show which section the banner belongs to
b = b.replace(/<div class="pm-field"><span class="pm-label" id="pm-seg-l">[\s\S]*?<\/button><\/span><\/div>/, '');
b = swap(b, '<p class="pm-hint">The homepage columns are narrow, so showing 1 banner at once works best.</p>', '');
b = swap(b, '<div class="pm-card"><h3>Promotion banner</h3>', '<div class="pm-card"><h3>Promotion banner</h3><p class="pm-target-row">Shown in <strong id="pm-target"></strong></p>');
fs.writeFileSync('build.js', b);

/* ---- css ---- */
let css = fs.readFileSync('build/master.css', 'utf8');
css = css.split('\n').filter(l => !/^\.pl[-{ ]|^\.pl\b|^\.pm-seg|^\.pl-/.test(l)).join('\n');
css = css.replace(/@media \(max-width:620px\)\{\.pl-row[^\n]*\n/, '@media (max-width:620px){.hl-head{flex-wrap:wrap}}\n');
if (!css.includes('.hl-add')) css += `
/* ===== Home tab: three sections ===== */
.hl-sub{margin:-6px 4px 10px;color:#8a8a8a;font-size:12px;line-height:16px}
.hl-add{appearance:none;display:flex;align-items:center;justify-content:center;width:100%;height:32px;margin-top:8px;border:1px dashed #8a8a8a;border-radius:10px;background:transparent;color:#303030;font:inherit;font-weight:550;cursor:pointer}
.hl-add:hover{background:#fff;border-color:#303030}
.hl-add:focus-visible{outline:2px solid #005bd3;outline-offset:1px}
.hl-col--mobile{grid-column:1 / -1}
.hl-col--mobile .hl-list,.hl-col--mobile .hl-add{max-width:440px;margin-left:auto;margin-right:auto}
.hl-col--mobile .hl-add{margin-top:8px}
.pm-target-row{margin:2px 0 0;color:#616161;font-size:12px;line-height:16px}
.pm-target-row strong{color:#303030}

/* ===== Phones: every block shares one width and is centred (measured on the live app: 10px either side) ===== */
@media (max-width:489px){
  .sh-scroll{scrollbar-width:none}
  .sh-scroll::-webkit-scrollbar{display:none}
  #app .mobile-layout{margin:0!important;padding:0 10px!important;display:flex!important;flex-direction:column;flex-wrap:nowrap;align-items:stretch;justify-content:flex-start;gap:16px}
  #app .mobile-layout[hidden]{display:none!important}
  #app .mobile-layout > .Polaris-Layout__Section{margin:0!important;max-width:none!important;min-width:0!important;width:100%;flex:none!important}
  #app .mobile-layout > .Polaris-Layout__Section > [data-card]{width:100%}
}
`;
fs.writeFileSync('build/master.css', css);
console.log('patched v3');
