// Product grid design tab (second tab of the design page) + full-height captures of the long pages. Read-only.
const fs = require('fs'); const { chromium } = require('playwright');
const BASE = 'https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf';
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = b.contexts()[0]; ctx.pages().slice(1).forEach(p => p.close().catch(() => {}));
  const page = ctx.pages()[0]; await page.bringToFront();
  const appFrame = () => page.frames().find(f => f !== page.mainFrame());
  await page.setViewportSize({ width: 1440, height: 1500 });
  await page.goto(BASE + '/design', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000);
  console.log('tab buttons:', await appFrame().evaluate(() => [...document.querySelectorAll('[role=tab]')].map(t => t.textContent.trim() + '|' + t.getAttribute('aria-selected') + '|' + t.className.slice(0, 40))));
  await appFrame().locator('button[role=tab]:visible', { hasText: 'Product grid design' }).first().click(); await page.waitForTimeout(6000);
  const info = await appFrame().evaluate(() => ({ href: location.pathname, html: document.querySelector('#app').outerHTML, scrollH: document.documentElement.scrollHeight }));
  console.log('design tab 2 frame:', info.href, '| html', info.html.length, '| scrollHeight', info.scrollH);
  fs.writeFileSync('cap/pages/design-tab2.html', info.html);
  for (const w of [1440, 390]) { await page.setViewportSize({ width: w, height: w === 1440 ? Math.max(1500, info.scrollH + 60) : 3400 }); await page.waitForTimeout(2500); await page.screenshot({ path: `cap/pages/design-tab2-${w}.png` }); }
  // full-height shots of the long pages (desktop + phone)
  for (const key of ['features', 'design']) {
    await page.setViewportSize({ width: 1440, height: 1500 });
    await page.goto(BASE + '/' + key, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000);
    const h = await appFrame().evaluate(() => document.documentElement.scrollHeight);
    for (const w of [1440, 390]) { await page.setViewportSize({ width: w, height: Math.min(8000, h + 120) }); await page.waitForTimeout(3000); await page.screenshot({ path: `cap/pages/${key}-full-${w}.png` }); }
    console.log(key, 'scrollHeight', h);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '?country=VN', { waitUntil: 'domcontentloaded' });
  process.exit(0);
})();
