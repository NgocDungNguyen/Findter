const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'); const url = f => pathToFileURL(path.join(root, f)).href;
const FILES = ['index','filter','search','metafield','filter-boost','search-boost','ymm','features','design','design-product-grid'];
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  // View more / less
  await p.goto(url('index.html')); await p.waitForTimeout(500);
  const vis = async t => p.locator('aside#nav .sh-item--sub', { hasText: t }).first().isVisible();
  const label = async () => (await p.locator('.sh-item--more .sh-item__label').textContent()).trim();
  ok(!(await vis('Analytics')) && !(await vis('Pricing')) && await label() === 'View more', 'collapsed by default: Analytics/Pricing hidden, button "View more"');
  await p.click('.sh-item--more'); await p.waitForTimeout(200);
  ok(await vis('Analytics') && await vis('Pricing') && await label() === 'View less', 'after click: Analytics + Pricing visible, button "View less"');
  await p.screenshot({ path: 'test/nav-expanded.png' });
  await p.goto(url('features.html')); await p.waitForTimeout(400);
  ok(await vis('Analytics') && await label() === 'View less', 'expanded state persists to another page');
  await p.click('.sh-item--more'); await p.waitForTimeout(200);
  ok(!(await vis('Analytics')) && await label() === 'View more', 'View less folds the list back');
  await p.goto(url('index.html')); await p.waitForTimeout(400);
  ok(!(await vis('Pricing')), 'folded state persists');
  // every page: sidebar links resolve, tabs link to the right files
  const tabs = { 'filter': { 'Collection booster': 'filter-boost.html' }, 'filter-boost': { 'Manage filter set': 'filter.html' }, 'search': { 'Search booster': 'search-boost.html' }, 'search-boost': { 'Search settings': 'search.html' }, 'design': { 'Product grid design': 'design-product-grid.html' }, 'design-product-grid': { 'Filter design': 'design.html' } };
  for (const [f, m] of Object.entries(tabs)) for (const [tab, target] of Object.entries(m)) {
    await p.goto(url(f + '.html')); await p.waitForTimeout(400);
    await p.locator('.Polaris-Tabs__Tab', { hasText: tab }).first().click(); await p.waitForTimeout(500);
    ok(p.url().endsWith('/' + target), `${f}: tab "${tab}" -> ${target}`);
  }
  for (const [label, target] of [['Filter','filter.html'],['Search','search.html'],['Metafield','metafield.html'],['Year Make Model','ymm.html'],['Filter & product grid design','design.html'],['Advanced features','features.html']]) {
    await p.goto(url('index.html')); await p.waitForTimeout(300);
    await p.locator('aside#nav .sh-item--sub', { hasText: label }).first().click(); await p.waitForTimeout(500);
    ok(p.url().endsWith('/' + target), `sidebar "${label}" -> ${target}`);
    ok(await p.locator('aside#nav .sh-item--sub[aria-current=page]').first().textContent().then(t => t.trim() === label), `  ...and it is highlighted on ${target}`);
  }
  console.log('page errors:', errs.length ? errs.join('|') : 'none'); console.log(fails ? fails + ' FAILED' : 'all passed');
  await b.close();
})();
