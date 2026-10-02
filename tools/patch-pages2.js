// Step 2 for the extra pages: local copies of the app's own images, CSS trimming for the new pages, sidebar "View more / View less"
const fs = require('fs'); const https = require('https'); const path = require('path');
const swap = (src, from, to) => { if (!src.includes(from)) throw new Error('anchor not found: ' + from.slice(0, 90)); return src.split(from).join(to); };

/* ---- 1. the app's own images -> assets/img/ ---- */
const IMGS = ['preview-5396ce01.png', 'preview-2-a586acf8.png', 'vertical_static-fe0090d7.png', 'horizontal_static-b9c604a9.png', 'off_canvas_static-0821cd88.png', 'empty-project-90185747.svg', 'emptystate-files-10e84ca8.png'];
const dir = path.join(__dirname, '..', 'assets', 'img'); fs.mkdirSync(dir, { recursive: true });
const get = name => new Promise((res, rej) => https.get('https://findter-production.flintverse.com/assets/' + name, r => {
  if (r.statusCode !== 200) return rej(new Error(name + ' -> HTTP ' + r.statusCode));
  const out = fs.createWriteStream(path.join(dir, name)); r.pipe(out); out.on('finish', () => res(name));
}).on('error', rej));

(async () => {
  for (const n of IMGS) if (!fs.existsSync(path.join(dir, n))) console.log('downloaded', await get(n));
  console.log('images ready:', IMGS.map(n => n + ' ' + fs.statSync(path.join(dir, n)).size).join(', '));

  /* ---- 2. new page markup into cap/ (class scan) ---- */
  for (const k of ['ymm', 'features', 'design', 'design-tab2', 'filter-booster', 'search-booster']) fs.copyFileSync(`cap/pages/${k}.flat.html`, `cap/page-${k}.flat.html`);

  /* ---- 3. trim.js: every page-specific stylesheet (deduplicated) replaces the hand-picked p1..p4 ---- */
  let t = fs.readFileSync('trim.js', 'utf8');
  if (!t.includes("css-extra")) {
    t = swap(t, ", ['p1', 'cap/css-p1.css'], ['p2', 'cap/css-p2.css'], ['p3', 'cap/css-p3.css'], ['p4', 'cap/css-p4.css']]", ']');
    t = swap(t, "fs.writeFileSync('cap/trimmed.json', JSON.stringify(out));", `// page-specific stylesheets of the stand-alone pages: everything except Polaris, the home app css and the chart css, de-duplicated
const SEP = '\\n/*---*/\\n', seen = new Set(), extra = [];
for (const f of fs.readdirSync('cap/pages').filter(f => /\\.css$/.test(f) && !/\\.flat\\.css$/.test(f))) {
  for (const part of fs.readFileSync('cap/pages/' + f, 'utf8').split(SEP)) {
    if (!part.trim() || [472514, 13135, 4936].includes(part.length) || seen.has(part)) continue;
    seen.add(part); extra.push(part);
  }
}
out.extra = extra.map(trim).join('\\n'); console.log('extra page stylesheets:', extra.length, '->', out.extra.length);
fs.writeFileSync('cap/css-extra.txt', String(extra.length));
fs.writeFileSync('cap/trimmed.json', JSON.stringify(out));`);
  }
  fs.writeFileSync('trim.js', t);

  let b = fs.readFileSync('build.js', 'utf8');
  b = swap(b, 'css.p1, css.p2, css.p3, css.p4, pruneFlat', 'css.extra, pruneFlat');

  /* ---- 4. sidebar: real pages + "View more" reveals Analytics / Pricing ---- */
  b = swap(b, "const PAGE_LINKS = { Filter: 'filter.html', Search: 'search.html', Metafield: 'metafield.html' };",
    "const PAGE_LINKS = { Filter: 'filter.html', Search: 'search.html', Metafield: 'metafield.html', 'Year Make Model': 'ymm.html', 'Filter & product grid design': 'design.html', 'Advanced features': 'features.html' };");
  b = swap(b, '<button class="sh-item sh-item--more" type="button"><span class="sh-item__label">View more</span></button>',
    '<a class="sh-item sh-item--sub sh-item--extra" href="#"><span class="sh-item__label">Analytics</span></a>\n      <a class="sh-item sh-item--sub sh-item--extra" href="#"><span class="sh-item__label">Pricing</span></a>\n      <button class="sh-item sh-item--more" type="button" aria-expanded="false"><span class="sh-item__label">View more</span></button>');
  fs.writeFileSync('build.js', b);

  let a = fs.readFileSync('build/app.js', 'utf8');
  if (!a.includes('setNavExpanded')) {
    a = swap(a, '  /* ---------- nav links ---------- */', `  /* ---------- sidebar: "View more" reveals Analytics / Pricing, "View less" folds them away again ---------- */
  const navGroup = $('.sh-appgroup'), moreBtn = $('.sh-item--more');
  function setNavExpanded(on, save = true) {
    navGroup.classList.toggle('is-expanded', on);
    moreBtn.querySelector('.sh-item__label').textContent = on ? 'View less' : 'View more'; moreBtn.setAttribute('aria-expanded', String(on));
    if (save) { try { localStorage.setItem('findter.navExpanded', on ? '1' : ''); } catch (e) { /* storage blocked */ } }
  }
  try { if (localStorage.getItem('findter.navExpanded')) setNavExpanded(true, false); } catch (e) { /* storage blocked */ }

  /* ---------- nav links ---------- */`);
    a = swap(a, "    if (a.dataset.nav === 'page') return;                    // real page (filter.html, search.html, metafield.html)\n    e.preventDefault();", "    if (a.dataset.nav === 'page') return;                    // real page (filter.html, search.html, ...)\n    e.preventDefault();\n    if (a.classList.contains('sh-item--more')) { setNavExpanded(!navGroup.classList.contains('is-expanded')); return; }");
  }
  fs.writeFileSync('build/app.js', a);

  let c = fs.readFileSync('build/shell.css', 'utf8');
  if (!c.includes('.sh-item--extra')) c += '\n/* sidebar: items hidden until "View more" */\n.sh-item--extra{display:none}\n.sh-appgroup.is-expanded .sh-item--extra{display:flex}\n';
  fs.writeFileSync('build/shell.css', c);
  console.log('step 2 patched');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
