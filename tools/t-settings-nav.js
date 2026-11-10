// Settings nav check: sidebar rows (5 items + View more, YMM on/off, expand), the Settings page (a card per settings page),
// the back arrow on each of the four pages, active highlight, phone width.
// usage: node tools/t-settings-nav.js [outDir]    (screenshots go to outDir when given)
const { chromium } = require('playwright'); const path = require('path');
const root = path.resolve(__dirname, '..'); const HAS_AB = require('fs').existsSync(path.join(root, 'tools', 'build', 'abtest.js')); const out = process.argv[2];
const url = f => 'file:///' + path.join(root, f).split(path.sep).join('/');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  let b; try { b = await chromium.launch({ channel: 'msedge' }); } catch (e) { b = await chromium.launch(); }
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const rows = () => pg.$$eval('.sh-appgroup > a.sh-item--sub, .sh-appgroup > .sh-item--more', els => els.filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent.trim()));
  await pg.goto(url('index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload();
  let r = await rows();
  ok(JSON.stringify(r) === JSON.stringify(['Filter', 'Search', 'Settings', 'Year Make Model', 'Merchandising', 'Advanced features', 'View more']), 'collapsed, YMM on: 6 items + View more');
  await pg.click('.sh-item--more'); r = await rows();
  ok(JSON.stringify(r) === JSON.stringify(['Filter', 'Search', 'Settings', 'Year Make Model', 'Merchandising', 'Advanced features', 'Analytics', 'Pricing', 'Master', 'View less']), 'expanded: Analytics, Pricing, Master (prototype tool), View less');
  if (out) await pg.screenshot({ path: path.join(out, 'nav-expanded.png'), clip: { x: 0, y: 0, width: 260, height: 760 } });
  await pg.click('.sh-item--more'); r = await rows(); ok(r.at(-1) === 'View more' && !r.includes('Analytics'), 'View less folds them away again');
  await pg.evaluate(() => FindterDemo.set('ymm', 'off')); r = await rows();
  ok(JSON.stringify(r) === JSON.stringify(['Filter', 'Search', 'Settings', 'Merchandising', 'Advanced features', 'View more']), 'YMM off: item hidden');
  await pg.evaluate(() => FindterDemo.reset());
  ok((await rows()).includes('Year Make Model'), 'Reset brings YMM back');

  // sidebar Settings -> the Settings page
  await pg.click('aside#nav .sh-item--sub:has-text("Settings")'); await pg.waitForURL(/settings\.html/); ok(true, 'sidebar Settings opens settings.html');
  await pg.waitForTimeout(300);
  const cards = await pg.$$eval('.pl-setcard', e => e.map(x => [x.querySelector('.Polaris-Text--headingSm').textContent.trim(), x.querySelector('.Polaris-Text--bodyMd').textContent.trim().length > 10, x.getAttribute('href')]));
  ok(JSON.stringify(cards.map(c => c[0])) === JSON.stringify(['Metafield', 'Filter design', 'Product grid & card', 'Custom sort', 'Search redirect'].concat(HAS_AB ? ['A/B testing'] : [], ['Separated variant products'])) && cards.every(c => c[1]), 'Settings page: cards with a name and a description');
  ok((await pg.$eval('.sh-item--sub[aria-current=page]', e => e.textContent.trim())) === 'Settings' && (await pg.$$eval('h1', e => e.map(x => x.textContent.trim()))).join() === 'Settings', 'Settings highlighted, one h1 "Settings"');
  if (out) await pg.screenshot({ path: path.join(out, 'settings.png') });

  for (const [href, title] of [['metafield.html', 'Metafield'], ['design.html', 'Filter design'], ['design-product-grid.html', 'Product grid & card'], ['sort.html', 'Custom sort options'], ['search-redirect.html', 'Search redirect'], ...(HAS_AB ? [['ab-testing.html', 'A/B testing']] : []), ['separated-variants.html', 'Separated variant products']]) {
    await pg.goto(url('settings.html')); await pg.click('.pl-setcard[href="' + href + '"]'); await pg.waitForURL(new RegExp(href.replace('.', '\\.') + '$')); await pg.waitForTimeout(400);
    const h1 = await pg.$$eval('h1', e => e.map(x => x.textContent.trim()));
    const nav = await pg.$eval('.sh-item--sub[aria-current=page]', e => e.textContent.trim());
    const back = await pg.$eval('a.ex-back', e => [e.getAttribute('href'), e.getAttribute('aria-label')]);
    ok(h1.length === 1 && h1[0] === title && nav === 'Settings' && back[0] === 'settings.html' && back[1] === 'Back to Settings', href + ': title "' + title + '", back arrow to Settings, sidebar Settings');
    if (out) await pg.screenshot({ path: path.join(out, href.replace('.html', '') + '.png') });
    await pg.click('a.ex-back'); await pg.waitForURL(/settings\.html$/); ok(true, '  back arrow returns to Settings');
  }
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 });
  for (const f of ['settings.html', 'design.html']) {
    await m.goto(url(f)); await m.waitForTimeout(400);
    ok(!(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'phone 390: ' + f + ' has no horizontal page scroll');
    if (out) await m.screenshot({ path: path.join(out, f.replace('.html', '') + '-phone.png') });
  }
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join('|') : ''));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
