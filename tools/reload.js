const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const app = page.frames().find(f => f !== page.mainFrame());
  console.log('app', await Promise.race([app.evaluate(() => document.readyState + ' ' + !!document.querySelector('.ft-welcome__title')), new Promise(r => setTimeout(() => r('TIMEOUT'), 8000))]));
  process.exit(0);
})();
