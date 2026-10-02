const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  await page.bringToFront();
  await page.goto('https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf?country=VN', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  const app = page.frames().find(f => f !== page.mainFrame());
  console.log(await app.evaluate(() => document.querySelector('.ft-welcome__title')?.textContent));
  process.exit(0);
})();
