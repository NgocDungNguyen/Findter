// Step 1 for the Filter / Search / Metafield pages: feed their markup + stylesheets into the CSS trim, make sidebar links real links
const fs = require('fs');
const swap = (src, from, to) => { if (!src.includes(from)) throw new Error('anchor not found: ' + from.slice(0, 90)); return src.split(from).join(to); };

/* captured markup -> cap/ so trim.js sees every class these pages use (desktop + phone table variants) */
for (const k of ['filter', 'search', 'metafield']) fs.copyFileSync(`cap/pages/${k}.html`, `cap/page-${k}.html`);
for (const k of ['filter', 'metafield']) fs.copyFileSync(`cap/pages/${k}-table-mob.html`, `cap/page-${k}-table-mob.html`);

/* the page-specific app stylesheets (the capture joined them with a separator, in load order) */
const SEP = '\n/*---*/\n';
const f = fs.readFileSync('cap/pages/filter.css', 'utf8').split(SEP), m = fs.readFileSync('cap/pages/metafield.css', 'utf8').split(SEP);
// filter: [Polaris, index-8a6c (= home), index-4646, index-c8a5, index-523c, chart style]; metafield: [Polaris, index-8a6c, MetafieldBody, chart style]
fs.writeFileSync('cap/css-p1.css', f[2]); fs.writeFileSync('cap/css-p2.css', f[3]); fs.writeFileSync('cap/css-p3.css', f[4]); fs.writeFileSync('cap/css-p4.css', m[2]);
console.log('page css parts:', [f[2], f[3], f[4], m[2]].map(s => s.length).join(', '));

let t = fs.readFileSync('trim.js', 'utf8');
if (!t.includes('css-p1')) t = swap(t, "['chart', 'cap/css-5.css']]", "['chart', 'cap/css-5.css'], ['p1', 'cap/css-p1.css'], ['p2', 'cap/css-p2.css'], ['p3', 'cap/css-p3.css'], ['p4', 'cap/css-p4.css']]");
fs.writeFileSync('trim.js', t);

let b = fs.readFileSync('build.js', 'utf8');
if (!b.includes('css.p1')) b = swap(b, 'css.chart, pruneFlat', 'css.chart, css.p1, css.p2, css.p3, css.p4, pruneFlat');
// sidebar: Filter / Search / Metafield are real pages now
if (!b.includes('PAGE_LINKS')) {
  b = swap(b, "const subs = ['Filter', 'Search', 'Metafield', 'Year Make Model', 'Filter & product grid design', 'Advanced features'];",
    "const subs = ['Filter', 'Search', 'Metafield', 'Year Make Model', 'Filter & product grid design', 'Advanced features'];\nconst PAGE_LINKS = { Filter: 'filter.html', Search: 'search.html', Metafield: 'metafield.html' };");
  b = swap(b, "${subs.map(s => `<a class=\"sh-item sh-item--sub\" href=\"#\"><span class=\"sh-item__label\">${s.replace(/&/g, '&amp;')}</span></a>`).join('')}",
    "${subs.map(s => PAGE_LINKS[s] ? `<a class=\"sh-item sh-item--sub\" href=\"${PAGE_LINKS[s]}\" data-nav=\"page\"><span class=\"sh-item__label\">${s}</span></a>` : `<a class=\"sh-item sh-item--sub\" href=\"#\"><span class=\"sh-item__label\">${s.replace(/&/g, '&amp;')}</span></a>`).join('')}");
}
fs.writeFileSync('build.js', b);

let a = fs.readFileSync('build/app.js', 'utf8');
if (!a.includes("dataset.nav === 'page'")) a = swap(a, "$$('.sh-nav a, .sh-nav .sh-item--more, .sh-nav .sh-section').forEach(a => a.addEventListener('click', e => {\n    e.preventDefault();", "$$('.sh-nav a, .sh-nav .sh-item--more, .sh-nav .sh-section').forEach(a => a.addEventListener('click', e => {\n    if (a.dataset.nav === 'page') return;                    // real page (filter.html, search.html, metafield.html)\n    e.preventDefault();");
fs.writeFileSync('build/app.js', a);
console.log('step 1 patched');
