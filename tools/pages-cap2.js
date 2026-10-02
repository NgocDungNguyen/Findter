// Compare the Filter table markup at desktop vs phone width (read-only) and save the phone variants
const fs = require('fs'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0]; await page.bringToFront();
  for (const key of ['filter', 'metafield']) {
    await page.setViewportSize({ width: 1440, height: 1500 });
    await page.goto('https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf/' + key, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(8500);
    const app = () => page.frames().find(f => f !== page.mainFrame());
    const grab = () => app().evaluate(() => { const t = document.querySelector('.manage-filter-set-table, .fdt-metafield-table'); return t ? t.outerHTML : null; });
    const desk = await grab();
    await page.setViewportSize({ width: 390, height: 1500 }); await page.waitForTimeout(2500);
    const mob = await grab();
    fs.writeFileSync(`cap/pages/${key}-table-desk.html`, desk || ''); fs.writeFileSync(`cap/pages/${key}-table-mob.html`, mob || '');
    const cls = h => new Set([...(h || '').matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/)));
    const d = cls(desk), m = cls(mob);
    console.log(key, 'desk', (desk || '').length, 'mob', (mob || '').length);
    console.log('  only on phone  :', [...m].filter(c => !d.has(c)).join(' '));
    console.log('  only on desktop:', [...d].filter(c => !m.has(c)).join(' '));
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf?country=VN', { waitUntil: 'domcontentloaded' });
  process.exit(0);
})();
