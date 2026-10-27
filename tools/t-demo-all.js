// Demo data bar on every page: present, same controls, and the choice follows you from page to page
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'); const url = f => pathToFileURL(path.join(root, f)).href;
const PAGES = ['index.html', 'filter.html', 'filter-boost.html', 'search.html', 'search-boost.html', 'metafield.html', 'sort.html', 'ymm.html', 'features.html', 'design.html', 'design-product-grid.html', 'pricing.html'];
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1900, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(p.url().split('/').pop() + ': ' + e.message));
  await p.goto(url('index.html')); await p.evaluate(() => localStorage.clear());
  for (const f of PAGES) {
    await p.goto(url(f)); await p.waitForTimeout(250);
    const r = await p.evaluate(() => { const h = document.querySelector('.sh-top'), d = document.querySelector('.demo-bar'), m = document.querySelector('.sh-more');
      if (!d) return null; const a = d.getBoundingClientRect(), c = h.getBoundingClientRect(), mm = m.getBoundingClientRect();
      return { btn: d.querySelectorAll('.demo-btn').length, sel: d.querySelectorAll('.demo-select').length, n: document.querySelectorAll('.demo-bar').length, fits: a.right <= mm.left + 1 && a.left >= c.left && a.height <= c.height }; });
    ok(r && r.n === 1 && r.btn === 15 && r.sel === 2 && r.fits, f + ': one demo bar in the header (15 buttons, 2 drop-downs, fits at 1900px)');
  }
  // the choice follows the merchant from page to page
  await p.goto(url('search.html')); await p.selectOption('.demo-select[data-key=plan]', 'Free'); await p.waitForTimeout(80);
  for (const f of ['filter.html', 'metafield.html', 'pricing.html', 'index.html']) {
    await p.goto(url(f)); await p.waitForTimeout(250);
    const v = await p.evaluate(() => document.querySelector('.demo-select[data-key=plan]').value);
    ok(v === 'Free', f + ': Store is still "Free" after choosing it on search.html');
  }
  ok(await p.evaluate(() => document.querySelector('[data-card=status] [data-st=plan]').textContent.includes('Free')), 'index.html: Findter app status box shows the Free plan');
  // two open tabs follow each other
  const q = await ctx.newPage(); await q.goto(url('sort.html')); await q.waitForTimeout(250);
  await p.goto(url('features.html')); await p.waitForTimeout(250); await p.selectOption('.demo-select[data-key=plan]', 'Starter'); await p.waitForTimeout(250);
  ok(await q.evaluate(() => document.querySelector('.demo-select[data-key=plan]').value) === 'Starter', 'an already open tab follows a change made in another tab');
  // narrow screens: the "Demo data" drop-down on a normal page
  await p.setViewportSize({ width: 1024, height: 800 }); await p.goto(url('search.html')); await p.waitForTimeout(250);
  ok(await p.locator('.demo-toggle').isVisible() && !(await p.locator('.demo-panel').isVisible()), 'search.html at 1024px: "Demo data" button, panel closed');
  await p.click('.demo-toggle'); ok(await p.locator('.demo-panel').isVisible(), 'search.html at 1024px: the button opens the panel');
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'search.html at 390px: no horizontal page scroll with the panel open');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
