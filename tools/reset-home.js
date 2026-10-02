const { chromium } = require('playwright');
(async () => { const b = await chromium.connectOverCDP('http://localhost:9222'); const p = b.contexts()[0].pages()[0];
  await p.setViewportSize({ width: 1440, height: 900 }); await p.goto('https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf?country=VN', { waitUntil: 'domcontentloaded' }); process.exit(0); })();
