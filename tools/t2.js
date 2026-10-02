const { chromium } = require('playwright');
const to = (p, ms = 8000) => Promise.race([p, new Promise(r => setTimeout(() => r('TIMEOUT'), ms))]);
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const pages = b.contexts()[0].pages(); console.log('pages', pages.map(p => p.url().slice(0, 70)));
  const page = pages[0];
  console.log('front', await to(page.bringToFront()));
  console.log('main eval', await to(page.evaluate(() => document.visibilityState + ' ' + innerWidth + 'x' + innerHeight)));
  const app = page.frames().find(f => f !== page.mainFrame());
  console.log('app eval', await to(app.evaluate(() => document.visibilityState + ' ' + document.querySelectorAll('*').length)));
  console.log('shot', await to(page.screenshot({ path: 'now.png' }), 12000));
  process.exit(0);
})();
