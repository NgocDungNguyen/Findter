// Live sidebar: what does "View more" reveal? (read-only: expand / collapse the menu only)
const fs = require('fs'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = b.contexts()[0]; ctx.pages().slice(1).forEach(p => p.close().catch(() => {}));
  const page = ctx.pages()[0]; await page.bringToFront();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf/filter', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(7000);
  const items = () => page.evaluate(() => [...document.querySelectorAll('.sh-appgroup, nav')].length && [...document.querySelectorAll('nav a, nav button')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.y > 530 && r.y < 900; }).map(e => `${Math.round(e.getBoundingClientRect().y)} ${e.tagName.toLowerCase()} "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 40)}" href=${e.getAttribute('href') || ''}`));
  console.log('BEFORE:\n' + (await items()).join('\n'));
  await page.screenshot({ path: 'cap/pages/nav-before.png', clip: { x: 0, y: 500, width: 230, height: 400 } });
  const vm = page.getByRole('button', { name: 'View more', exact: true }); await vm.click(); await page.waitForTimeout(900);
  console.log('\nAFTER View more:\n' + (await items()).join('\n'));
  await page.screenshot({ path: 'cap/pages/nav-after.png', clip: { x: 0, y: 500, width: 230, height: 400 } });
  // keep the markup of the expanded group for the icons
  const html = await page.evaluate(() => { const a = [...document.querySelectorAll('nav a')].find(x => x.innerText.trim() === 'Analytics' && x.getBoundingClientRect().y > 530); const p = [...document.querySelectorAll('nav a')].find(x => x.innerText.trim() === 'Pricing'); return { analytics: a ? a.outerHTML : null, pricing: p ? p.outerHTML : null }; });
  fs.writeFileSync('cap/pages/nav-expanded.json', JSON.stringify(html, null, 1));
  const vl = page.getByRole('button', { name: 'View less', exact: true }); if (await vl.count()) { await vl.click(); await page.waitForTimeout(700); console.log('\nAFTER View less:\n' + (await items()).join('\n')); }
  process.exit(0);
})();
