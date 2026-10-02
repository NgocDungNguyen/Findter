// One-off patch: rebuild the s-select flattening, its CSS, and its JS
const fs = require('fs');

// 1. flatten.js — new s-select branch
let s = fs.readFileSync('flatten.js', 'utf8');
const a = s.indexOf("if (tag === 's-select') {");
const e = s.indexOf('const isS = tag.startsWith');
const repl = [
  "if (tag === 's-select') {",
  "        const sel = node.shadowRoot && node.shadowRoot.querySelector('select');",
  "        const optEls = [...node.querySelectorAll('s-option')];",
  "        const selVal = (sel && sel.value) || (optEls[0] && optEls[0].getAttribute('value'));",
  "        const cur = optEls.find(o => o.getAttribute('value') === selVal) || optEls[0];",
  "        const opts = optEls.map(o => '<option value=\"' + o.getAttribute('value') + '\"' + (o === cur ? ' selected' : '') + '>' + esc(o.textContent.trim()) + '</option>').join('');",
  "        const arrow = '<svg viewBox=\"0 0 20 20\" class=\"fs-select__ic\"><path d=\"M10.884 4.323a1.25 1.25 0 0 0-1.768 0l-2.646 2.647a.75.75 0 0 0 1.06 1.06l2.47-2.47 2.47 2.47a.75.75 0 1 0 1.06-1.06z\"/><path d=\"m7.53 12.03 2.47 2.47 2.47-2.47a.75.75 0 1 1 1.06 1.06l-2.646 2.647a1.25 1.25 0 0 1-1.768 0l-2.646-2.647a.75.75 0 1 1 1.06-1.06z\"/></svg>';",
  "        return '<span class=\"fs-select\"><span class=\"fs-select__value\">' + esc(cur ? cur.textContent.trim() : '') + '</span>' + arrow + '<select aria-label=\"' + (node.getAttribute('label') || '') + '\">' + opts + '</select></span>';",
  "      }",
  "      ",
].join('\n');
s = s.slice(0, a) + repl + s.slice(e);
fs.writeFileSync('flatten.js', s);

// 2. build.js — CSS for the new structure
let b = fs.readFileSync('build.js', 'utf8');
const i = b.indexOf('.fs-select{position:relative');
const j = b.indexOf('[data-s=s-button][variant=primary] button:hover');
const css = [
  '.fs-select{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:8px;width:100%;min-height:32px;padding:6px 8px 6px 12px;border-radius:8px;background:#fdfdfd;box-shadow:inset 0 0 0 .66px #8a8a8a;color:#303030;cursor:pointer}',
  '.fs-select:hover{background:#fafafa}',
  '.fs-select:focus-within{outline:2px solid #005bd3;outline-offset:1px}',
  '.fs-select__value{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
  '.fs-select__ic{width:16px;height:16px;fill:#616161;pointer-events:none}',
  '.fs-select select{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font:inherit;border:0;margin:0}',
  '',
].join('\n');
b = b.slice(0, i) + css + b.slice(j);
fs.writeFileSync('build.js', b);

// 3. app.js — keep the visible value in sync with the native select
let app = fs.readFileSync('build/app.js', 'utf8');
const marker = '/* ---------- app: links & buttons ---------- */';
const hook = "$$('.fs-select select').forEach(sel => sel.addEventListener('change', () => { sel.parentElement.querySelector('.fs-select__value').textContent = sel.selectedOptions[0].textContent; }));\n\n  ";
if (!app.includes('fs-select__value')) app = app.replace(marker, hook + marker);
fs.writeFileSync('build/app.js', app);
console.log('patched; app hook present:', app.includes('fs-select__value'));
