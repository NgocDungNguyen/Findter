// Measures every visible block on the homepage at many "mobile" widths and reports whether they share one width / alignment
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 2600 } });
  await ctx.route('https://img.test/**', r => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300"><rect width="1200" height="300" fill="#096dd9"/></svg>' }));
  const p = await ctx.newPage();
  await p.goto(url); await p.waitForTimeout(900);
  for (const w of [320, 360, 390, 430, 489, 500, 600, 700, 767]) {
    await p.setViewportSize({ width: w, height: 2600 }); await p.waitForTimeout(600);
    const m = await p.evaluate(() => {
      const cw = document.querySelector('.sh-scroll').clientWidth;
      const rows = [...document.querySelectorAll('[data-card]')].filter(c => c.offsetParent !== null).map(c => { const r = c.getBoundingClientRect(); return { id: c.dataset.card, left: Math.round(r.left), width: Math.round(r.width), gap: Math.round(cw - r.right) }; });
      return { cw, rows };
    });
    const u = k => [...new Set(m.rows.map(r => r[k]))];
    const ok = u('left').length === 1 && u('width').length === 1 && u('gap').length === 1;
    console.log(`${String(w).padStart(3)}px  content ${m.cw}  blocks ${m.rows.length}  lefts ${JSON.stringify(u('left'))} widths ${JSON.stringify(u('width'))} gaps ${JSON.stringify(u('gap'))}  ${ok ? 'UNIFORM' : 'NOT UNIFORM <<<<'}`);
  }
  await b.close();
})();
