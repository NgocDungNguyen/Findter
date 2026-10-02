const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const pages = b.contexts()[0].pages(); console.log('pages:', pages.map(p => p.url().slice(0, 90)));
  const p = pages[0]; console.log('frames:', p.frames().map(f => f.url().slice(0, 80)));
  console.log('title:', await p.title());
  console.log('body text:', (await p.evaluate(() => document.body.innerText.slice(0, 200))).replace(/\n/g, ' | '));
  process.exit(0);
})();
