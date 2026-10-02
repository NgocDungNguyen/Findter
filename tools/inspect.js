const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const pages = b.contexts().flatMap(c => c.pages());
  console.log('tabs:', pages.map(p => p.url()));
  const page = pages.find(p => p.url().includes('findter')) || pages[0];
  console.log('using:', page.url(), '| title:', await page.title());
  console.log('frames:'); page.frames().forEach(f => console.log(' -', f.url().slice(0,140)));
  await page.screenshot({ path: 'shot-viewport.png' });
  await page.screenshot({ path: 'shot-full.png', fullPage: true });
  await b.close();
})();
