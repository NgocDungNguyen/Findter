const fs = require('fs'); const postcss = require('postcss');
// Collect every class token seen in any captured state
const used = new Set(['p-theme-light', 'Polaris-ThemeProvider--themeContainer']);
for (const f of fs.readdirSync('cap').filter(f => f.endsWith('.html'))) {
  const h = fs.readFileSync('cap/' + f, 'utf8');
  for (const m of h.matchAll(/class="([^"]+)"/g)) m[1].split(/\s+/).forEach(c => used.add(c));
}
console.log('used classes', used.size);
function keepSelector(sel) {
  const stripped = sel.replace(/:(not|is|where|has)\((?:[^()]|\([^()]*\))*\)/g, '');
  const cls = [...stripped.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]);
  return cls.every(c => used.has(c));
}
function trim(css) {
  const root = postcss.parse(css);
  root.walkRules(rule => {
    if (rule.parent && rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    const keep = rule.selectors.filter(keepSelector);
    if (!keep.length) rule.remove(); else rule.selectors = keep;
  });
  root.walkAtRules(a => { if (['media', 'supports', 'layer'].includes(a.name) && (!a.nodes || !a.nodes.length)) a.remove(); });
  return root.toString();
}
const out = {};
for (const [name, file] of [['polaris', 'cap/css-3.css'], ['app1', 'cap/css-1.css'], ['app2', 'cap/css-2.css'], ['carousel', 'cap/css-4.css'], ['chart', 'cap/css-5.css']]) {
  const t = trim(fs.readFileSync(file, 'utf8')); out[name] = t; console.log(name, fs.readFileSync(file, 'utf8').length, '->', t.length);
}
// page-specific stylesheets of the stand-alone pages: everything except Polaris, the home app css and the chart css, de-duplicated
const SEP = '\n/*---*/\n', seen = new Set(), extra = [];
for (const f of fs.readdirSync('cap/pages').filter(f => /\.css$/.test(f) && !/\.flat\.css$/.test(f))) {
  for (const part of fs.readFileSync('cap/pages/' + f, 'utf8').split(SEP)) {
    if (!part.trim() || [472514, 13135, 4936].includes(part.length) || seen.has(part)) continue;
    seen.add(part); extra.push(part);
  }
}
out.extra = extra.map(trim).join('\n'); console.log('extra page stylesheets:', extra.length, '->', out.extra.length);
fs.writeFileSync('cap/css-extra.txt', String(extra.length));
fs.writeFileSync('cap/trimmed.json', JSON.stringify(out));
