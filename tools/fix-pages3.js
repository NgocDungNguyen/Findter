const fs = require('fs');
const swap = (src, from, to) => { if (!src.includes(from)) throw new Error('anchor not found: ' + from.slice(0, 80)); return src.split(from).join(to); };
// 1. flattener: drop visually-hidden helper text from shadow DOMs
let f = fs.readFileSync('flatten-page.js', 'utf8');
if (!f.includes("'visually-hidden'")) f = swap(f, "      if (tag === 'svg') return node.outerHTML;", "      if (node.classList && node.classList.contains('visually-hidden')) return '';\n      if (tag === 'svg') return node.outerHTML;");
fs.writeFileSync('flatten-page.js', f);
// 2. page builder: same border / text-decoration clean-up the home page gets
let b = fs.readFileSync('build-pages.js', 'utf8');
if (!b.includes('pruneFlat')) {
  b = swap(b, "/* ---------- page content ---------- */", `/* ---------- generated-class clean-up (same rules as the home page build) ---------- */
function pruneFlat(c) {
  return c.split('\n').map(line => {
    const m = line.match(/^(\.[a-z]+\d+)\{(.*)\}$/); if (!m) return line;
    let props = m[2].split(';');
    if (!props.some(p => /^border-(top|right|bottom|left)-width/.test(p))) props = props.filter(p => !/^border-(top|right|bottom|left)-(color|style)/.test(p));
    if (!props.some(p => p.startsWith('text-decoration-line'))) props = props.filter(p => !/^text-decoration-(style|color)/.test(p));
    return m[1] + '{' + props.join(';') + '}';
  }).join('\n');
}

/* ---------- page content ---------- */`);
  b = swap(b, "${rd(`cap/pages/${p.key}.flat.css`).split(APP_ASSETS)", "${pruneFlat(rd(`cap/pages/${p.key}.flat.css`)).split(APP_ASSETS)");
}
fs.writeFileSync('build-pages.js', b);
// 3. the "View more" rule must live in master.css (shell.css is cut at its icon-rail marker when assembled)
let s = fs.readFileSync('build/shell.css', 'utf8'); s = s.replace(/\n\/\* sidebar: items hidden until "View more" \*\/[\s\S]*$/, '\n'); fs.writeFileSync('build/shell.css', s);
let m = fs.readFileSync('build/master.css', 'utf8');
if (!m.includes('.sh-item--extra')) m += '\n/* sidebar: Analytics / Pricing stay hidden until "View more" */\n.sh-item--extra{display:none}\n.sh-appgroup.is-expanded .sh-item--extra{display:flex}\n';
fs.writeFileSync('build/master.css', m);
console.log('patched');
