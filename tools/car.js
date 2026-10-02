const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  await page.bringToFront(); await page.setViewportSize({ width: 1440, height: 1500 });
  await page.goto('https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf?country=VN', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  const app = page.frames().find(f => f !== page.mainFrame());
  const t = () => app.evaluate(() => { const c = document.querySelector('.recommend-app-carousel'); return c.style.transform + ' slides=' + getComputedStyle(c).getPropertyValue('--fdt-recommend-slides') + ' | ' + [...c.querySelectorAll('h3')].map(h => h.textContent.slice(0, 6)).join(','); });
  for (let i = 0; i < 8; i++) { console.log(i * 2, 's', await t()); await page.waitForTimeout(2000); }
  // wrap behaviour
  const prev = app.locator('button[aria-label="Previous app"]'), next = app.locator('button[aria-label="Next app"]');
  for (let i = 0; i < 5; i++) { await prev.click(); await page.waitForTimeout(500); console.log('prev', await t()); }
  for (let i = 0; i < 5; i++) { await next.click(); await page.waitForTimeout(500); console.log('next', await t()); }
  process.exit(0);
})();
