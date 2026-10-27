// Pictures for the RQM "Findter_Update subtext + menu inapp": the left menu and the guideline links on Custom sort, Synonyms Search, Metafield and Translate filter set.
// "before" pictures are the demo with the old texts put back in the page (what the real app shows today); "after" pictures are the demo as built.
// Writes "RQM Images - Menu/NN-name.png" (repo root, not committed); the list is printed at the end. Run: node tools/rqm-menu-shots.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'), OUT = path.join(root, 'RQM Images - Menu');
const U = f => pathToFileURL(path.join(root, f)).href;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

// red rounded box + numbered badge drawn in the page, so the screenshot carries it
const MARK = `window.__mark = (el, n) => { if (typeof el === 'string') el = document.querySelector(el); if (!el) return false;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const p = 4, d = document.createElement('div'); d.className = 'rqm-mark';
  d.style.cssText = 'position:absolute;z-index:99998;pointer-events:none;border:3px solid #e51c00;border-radius:10px;left:' + (r.left + scrollX - p) + 'px;top:' + (r.top + scrollY - p) + 'px;width:' + (r.width + p * 2) + 'px;height:' + (r.height + p * 2) + 'px';
  document.body.appendChild(d);
  if (n) { const b = document.createElement('div'); b.className = 'rqm-mark'; b.textContent = n; b.style.cssText = 'position:absolute;z-index:99999;pointer-events:none;width:22px;height:22px;border-radius:50%;background:#e51c00;color:#fff;font:700 13px/22px Inter,Arial,sans-serif;text-align:center;left:' + (r.left + scrollX - p - 11) + 'px;top:' + (r.top + scrollY - p - 11) + 'px'; document.body.appendChild(b); }
  return true; };
  window.__navItem = label => [...document.querySelectorAll('.sh-item--sub')].find(a => a.textContent.trim() === label);
  window.__oldNav = () => { const set = (from, to) => { const a = window.__navItem(from); if (a) a.querySelector('.sh-item__label').textContent = to; }; set('Custom sort', 'Sort'); set('Filter and grid design', 'Filter & product grid design'); };
  window.__noLink = () => { document.querySelectorAll('.fdt-header a.fdt-header__link[target]').forEach(a => { const p = a.parentElement; if (p.children.length === 1 && p.textContent.trim() === a.textContent.trim()) p.remove(); else { if (a.previousSibling && a.previousSibling.nodeType === 3) a.previousSibling.textContent = a.previousSibling.textContent.trimEnd(); a.remove(); } }); };`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.readdirSync(OUT).filter(f => /\.png$/.test(f)).forEach(f => fs.unlinkSync(path.join(OUT, f)));
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  let shot = 0; const list = [];
  const open = async (file, { width = 1440, height = 900, before } = {}) => {
    await p.setViewportSize({ width, height });
    await p.goto(U(file)); await p.waitForTimeout(700);
    await p.addStyleTag({ content: '#toast{display:none!important}.m-fab,.sk,.chat-bubble{display:none!important}*{transition:none!important;animation:none!important}' });
    await p.evaluate(MARK);
    if (before === 'nav' || before === 'both') await p.evaluate(() => window.__oldNav());
    if (before === 'link' || before === 'both') await p.evaluate(() => window.__noLink());
  };
  // clip: 'header' = page header + the first block under it, none = the whole window
  const capture = async (name, title, marks, clip) => {
    await p.evaluate(() => document.querySelectorAll('.rqm-mark').forEach(e => e.remove()));
    for (const [sel, n] of marks) {
      ok(await p.evaluate(([s, k]) => window.__mark(s, k), [sel, n]), '   mark ' + n + ' ' + sel);
    }
    const file = path.join(OUT, String(++shot).padStart(2, '0') + '-' + name + '.png');
    if (!clip) await p.screenshot({ path: file });
    else {
      const box = await p.evaluate(kind => {
        const h = document.querySelector('.fdt-header').getBoundingClientRect(), main = document.querySelector('#app .pg-grid, #app .pg-stack, #app').getBoundingClientRect();
        const x = Math.max(0, Math.max(main.left, h.left) - 30); return { x, y: Math.max(0, h.top - 24), width: Math.min(Math.max(main.width, h.width) + 60, innerWidth - x), height: h.height + 190 };
      }, clip);
      await p.screenshot({ path: file, clip: box });
    }
    list.push(path.basename(file) + '  ' + title); console.log('   shot ' + path.basename(file) + '  ' + title);
  };
  const markItem = async (label, n) => { const ok1 = await p.evaluate(([l, k]) => { const a = window.__navItem(l); return a ? window.__mark(a, k) : false; }, [label, n]); ok(ok1, '   mark ' + n + ' menu ' + label); };
  const captureNav = async (name, title, items) => {
    await p.evaluate(() => document.querySelectorAll('.rqm-mark').forEach(e => e.remove()));
    for (const [l, n] of items) await markItem(l, n);
    const file = path.join(OUT, String(++shot).padStart(2, '0') + '-' + name + '.png');
    const q = await p.evaluate(() => { const r = document.querySelector('.sh-appgroup').getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top - 20), width: r.width + 40, height: r.height + 40 }; });
    await p.screenshot({ path: file, clip: q });
    list.push(path.basename(file) + '  ' + title); console.log('   shot ' + path.basename(file) + '  ' + title);
  };

  // ---- 1-2 left menu
  await open('sort.html', { before: 'nav' });
  await captureNav('menu-before', 'Menu trai hien tai (real-app): "Sort" va "Filter & product grid design"', [['Sort', 1], ['Filter & product grid design', 2]]);
  await open('sort.html');
  await captureNav('menu-after', 'Menu trai moi: "Custom sort" va "Filter and grid design"', [['Custom sort', 1], ['Filter and grid design', 2]]);

  // ---- 3-4 Custom sort page
  await open('sort.html', { before: 'both' });
  await p.evaluate(() => { document.querySelector('.fdt-header__title').textContent = 'Sort'; });   // the heading the real app shows today
  await capture('custom-sort-before', 'Trang Custom sort hien tai (real-app): heading "Sort", chi co subtext', [['.fdt-header__title', 1], ['.fdt-header__description', 2]], 'header');
  await open('sort.html');
  await capture('custom-sort-after', 'Trang Custom sort moi: heading "Custom sort options" + link guideline cung dong sau subtext', [['.fdt-header__title', 1], ['a.fdt-header__link', 2]], 'header');

  // ---- 5-6 Synonyms Search
  await open('search-synonym.html', { before: 'link' });
  await capture('synonyms-before', 'Synonyms Search hien tai (real-app): chi co subtext, chua co link guideline', [['.fdt-header__description', 1]], 'header');
  await open('search-synonym.html');
  await capture('synonyms-after', 'Synonyms Search moi: link "Synonyms search guideline here" cung dong sau subtext', [['a.fdt-header__link', 1]], 'header');

  // ---- 7-9 Metafield
  await open('metafield.html', { before: 'link' });
  await p.evaluate(() => { const g = document.querySelector('[data-mf-search-guide]'); if (g) g.hidden = true; });
  await capture('metafield-before', 'Metafield hien tai (real-app): chi co subtext "Metafield guidelines here! ..." (du da bat Search)', [['.fdt-header__description', 1]], 'header');
  await open('metafield.html');
  await capture('metafield-after-on', 'Metafield moi, DA bat Search by metafield (co metafield text tick Search): them dong "Search by metafield guideline here" duoi subtext', [['[data-mf-search-guide]', 1]], 'header');
  await p.evaluate(() => localStorage.setItem('findter.metafields.v1', JSON.stringify([{ id: 'multi', applies: ['filter'] }, { id: 'height', applies: ['filter'] }])));
  await p.reload(); await p.waitForTimeout(500); await p.addStyleTag({ content: '#toast{display:none!important}.m-fab,.sk,.chat-bubble{display:none!important}' }); await p.evaluate(MARK);
  await capture('metafield-after-off', 'Metafield moi, CHUA bat Search (chi co Filter): khong co dong guideline, khong co khoang trong thua', [['.fdt-header__description', 1]], 'header');
  await p.evaluate(() => localStorage.removeItem('findter.metafields.v1'));

  // ---- 10-11 Translate filter set
  await open('filter-translate.html', { before: 'link' });
  await capture('translate-before', 'Translate filter set hien tai (real-app): chi co subtext', [['.fdt-header__description', 1]], 'header');
  await open('filter-translate.html');
  await capture('translate-after', 'Translate filter set moi: link "Multi-language filter value guideline here" cung dong sau subtext', [['a.fdt-header__link', 1]], 'header');

  // ---- 12 Filter and grid design page: menu changed, page heading kept
  await open('design.html');
  await markItem('Filter and grid design', 1); await p.evaluate(() => window.__mark('.fdt-header__title', 2));
  { const file = path.join(OUT, String(++shot).padStart(2, '0') + '-design-menu-after.png'); await p.screenshot({ path: file }); list.push(path.basename(file) + '  Trang Filter and grid design: menu doi ten, heading trang van la "Filter & product grid design"'); console.log('   shot ' + path.basename(file)); }

  // ---- 13-16 phone width
  for (const [file, name, title, sels] of [
    ['sort.html', 'mobile-custom-sort', 'Dien thoai (390px): Custom sort, link xuong dong gon', [['.fdt-header__title', 1], ['a.fdt-header__link', 2]]],
    ['search-synonym.html', 'mobile-synonyms', 'Dien thoai (390px): Synonyms Search', [['a.fdt-header__link', 1]]],
    ['metafield.html', 'mobile-metafield', 'Dien thoai (390px): Metafield, dong "Search by metafield guideline here"', [['[data-mf-search-guide]', 1]]],
    ['filter-translate.html', 'mobile-translate', 'Dien thoai (390px): Translate filter set', [['a.fdt-header__link', 1]]],
  ]) {
    await open(file, { width: 390, height: 640 });
    await capture(name, title, sels);
  }
  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log('\n' + list.join('\n') + '\n' + (fails ? fails + ' FAILED' : 'all marks placed'));
  process.exit(fails ? 1 : 0);
})();
