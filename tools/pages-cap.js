// First look at the Filter / Search / Metafield pages of the live app: screenshots + DOM + stylesheets (read-only, no clicks inside the app)
const fs = require('fs'); const { chromium } = require('playwright');
const TARGETS = [['filter', 'Filter'], ['search', 'Search'], ['metafield', 'Metafield']];
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = b.contexts()[0];
  ctx.pages().slice(1).forEach(p => p.close().catch(() => {}));
  const page = ctx.pages()[0]; await page.bringToFront();
  await page.setViewportSize({ width: 1440, height: 1100 });
  const hrefs = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('nav a')].filter(a => ['Filter', 'Search', 'Metafield', 'Year Make Model', 'Advanced features'].includes(a.innerText.trim())).map(a => [a.innerText.trim(), a.getAttribute('href')])));
  console.log('sidebar links:', JSON.stringify(hrefs));
  fs.mkdirSync('cap/pages', { recursive: true });
  for (const [key, label] of TARGETS) {
    const href = hrefs[label]; if (!href) { console.log('no link for', label); continue; }
    await page.goto('https://admin.shopify.com' + href, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(9000);
    const app = page.frames().find(f => f !== page.mainFrame());
    if (!app) { console.log(key, 'no app frame'); continue; }
    for (const w of [1440, 390]) {
      await page.setViewportSize({ width: w, height: w === 1440 ? 1500 : 2600 }); await page.waitForTimeout(2500);
      await page.screenshot({ path: `cap/pages/${key}-${w}.png` });
    }
    await page.setViewportSize({ width: 1440, height: 1500 }); await page.waitForTimeout(2000);
    const info = await app.evaluate(() => {
      const sheets = [...document.styleSheets].map(s => { let t = ''; try { t = [...s.cssRules].map(r => r.cssText).join('\n'); } catch (e) {} return { href: s.href, len: t.length, t }; }).filter(s => !/crisp|fonts\/inter/.test(s.href || ''));
      return { url: location.pathname + location.search.slice(0, 40), title: document.title, html: document.querySelector('#app') ? document.querySelector('#app').outerHTML : document.body.outerHTML, sheets: sheets.map(s => ({ href: s.href, len: s.len })), css: sheets.map(s => s.t).join('\n/*---*/\n') };
    });
    fs.writeFileSync(`cap/pages/${key}.html`, info.html); fs.writeFileSync(`cap/pages/${key}.css`, info.css);
    console.log(key, '| url', info.url, '| html', info.html.length, '| sheets', JSON.stringify(info.sheets));
  }
  await page.goto('https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf?country=VN', { waitUntil: 'domcontentloaded' });
  process.exit(0);
})();
