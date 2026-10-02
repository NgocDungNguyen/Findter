const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  await page.bringToFront();
  for (const w of [1100, 1000, 900, 800, 769, 768, 700, 600]) {
    await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(1500);
    const r = await page.evaluate(() => ({ nav: !!document.querySelector('nav') && document.querySelector('nav').getBoundingClientRect().width, menuBtn: !!document.querySelector('button[aria-label="Menu"]') }));
    const app = page.frames().find(f => f !== page.mainFrame());
    const o = await app.evaluate(() => [...document.querySelectorAll('h2,h3')].filter(h => /Findter app status|Onboarding guide|Help/.test(h.textContent)).map(h => h.textContent.trim().slice(0, 12) + '@' + Math.round(h.getBoundingClientRect().x) + ',' + Math.round(h.getBoundingClientRect().y)).join(' ; '));
    console.log(w, JSON.stringify(r), o);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  process.exit(0);
})();
