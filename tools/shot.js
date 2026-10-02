const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  page.on('dialog', d => { console.log('DIALOG', d.type(), d.message()); });
  console.log(page.url());
  await Promise.race([page.screenshot({ path: 'now.png' }), new Promise(r => setTimeout(r, 10000))]);
  process.exit(0);
})();
