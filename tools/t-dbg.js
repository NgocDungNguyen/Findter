const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 1200 } });
  await p.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href); await p.waitForTimeout(1200);
  console.log(await p.evaluate(() => {
    const out = []; let e = document.querySelector('[data-card=status]');
    while (e && e !== document.body) { const r = e.getBoundingClientRect(), c = getComputedStyle(e); out.push(`${e.tagName.toLowerCase()}.${(e.className || '').toString().slice(0, 34).padEnd(34)} left=${String(Math.round(r.left)).padStart(3)} w=${String(Math.round(r.width)).padStart(3)} pad=${c.paddingLeft}/${c.paddingRight} mar=${c.marginLeft}/${c.marginRight} disp=${c.display}`); e = e.parentElement; }
    return out.join('\n');
  }));
  await b.close();
})();
