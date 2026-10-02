const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href + '#/master'); await p.waitForTimeout(700);
  console.log('tab rows at 1440:', await p.evaluate(() => new Set([...document.querySelectorAll('.mt-tab')].map(t => Math.round(t.getBoundingClientRect().top))).size));
  await p.setViewportSize({ width: 390, height: 1200 }); await p.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href + '#/master/home'); await p.waitForTimeout(700);
  console.log('mobile horizontal overflow:', await p.evaluate(() => { const g = document.querySelector('.hl-grid').getBoundingClientRect(), c = document.querySelector('[data-panel=home] .Polaris-Box').getBoundingClientRect(); return `grid right ${Math.round(g.right)} vs card right ${Math.round(c.right)}`; }));
  await b.close(); })();
