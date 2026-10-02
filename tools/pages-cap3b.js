// First look at YMM / Advanced features / Filter & product grid design (+ its inner tabs) / Collection booster / Search booster.
// Read-only: loads pages and clicks tabs only.
const fs = require('fs'); const { chromium } = require('playwright');
const BASE = 'https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf';
const JOBS = [
  { key: 'filter-booster', path: '/filter', clickTab: 'Collection booster' },
  { key: 'search-booster', path: '/search', clickTab: 'Search booster' },
];
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = b.contexts()[0]; ctx.pages().slice(1).forEach(p => p.close().catch(() => {}));
  const page = ctx.pages()[0]; await page.bringToFront();
  const appFrame = () => page.frames().find(f => f !== page.mainFrame());
  const capture = async (key, note) => {
    for (const w of [1440, 390]) { await page.setViewportSize({ width: w, height: w === 1440 ? 1500 : 3200 }); await page.waitForTimeout(2200); await page.screenshot({ path: `cap/pages/${key}-${w}.png` }); }
    await page.setViewportSize({ width: 1440, height: 1500 }); await page.waitForTimeout(1500);
    const info = await appFrame().evaluate(() => {
      const sheets = [...document.styleSheets].map(s => { let t = ''; try { t = [...s.cssRules].map(r => r.cssText).join('\n'); } catch (e) {} return { href: s.href, t }; }).filter(s => !/crisp|fonts\/inter/.test(s.href || ''));
      const tabs = [...document.querySelectorAll('ul.Polaris-Tabs [role=tab]')].map(t => t.getAttribute('aria-label') + (t.getAttribute('aria-selected') === 'true' ? '*' : ''));
      return { href: location.pathname + location.search.replace(/hmac=[^&]*/, 'hmac=…').slice(0, 80), html: (document.querySelector('#app') || document.body).outerHTML, tabs, sheets: sheets.map(s => (s.href || 'inline').split('/').pop() + ':' + s.t.length), css: sheets.map(s => s.t).join('\n/*---*/\n') };
    });
    fs.writeFileSync(`cap/pages/${key}.html`, info.html); fs.writeFileSync(`cap/pages/${key}.css`, info.css);
    console.log(`${key.padEnd(22)} ${note || ''} | frame: ${info.href} | tabs: ${info.tabs.join(' / ') || '-'} | html ${info.html.length} | sheets ${info.sheets.join(', ')}`);
    return info;
  };
  for (const j of JOBS) {
    await page.setViewportSize({ width: 1440, height: 1500 });
    await page.goto(BASE + j.path, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000);
    if (j.clickTab) { await appFrame().locator('ul.Polaris-Tabs [role=tab]', { hasText: j.clickTab }).first().click(); await page.waitForTimeout(6000); }
    const info = await capture(j.key);
    if (j.walkTabs) {
      const labels = info.tabs.map(t => t.replace('*', ''));
      for (let i = 1; i < labels.length; i++) {
        await appFrame().locator('ul.Polaris-Tabs [role=tab]').nth(i).click(); await page.waitForTimeout(5000);
        await capture(`${j.key}-tab${i + 1}`, `(tab "${labels[i]}")`);
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '?country=VN', { waitUntil: 'domcontentloaded' });
  process.exit(0);
})();
