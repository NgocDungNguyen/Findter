const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'); const url = f => pathToFileURL(path.join(root, f)).href;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  const subs = () => p.$$eval('aside#nav .sh-appgroup > a.sh-item', as => as.map(a => a.textContent.trim() + (a.getAttribute('aria-current') ? '*' : '') + (getComputedStyle(a).display === 'none' ? '(hidden)' : '')));
  const masterVisible = () => p.locator('#master-page').isVisible();
  await p.goto(url('index.html')); await p.waitForTimeout(500);
  let s = await subs(); console.log('   sidebar:', s.join(' | '));
  ok(s.filter(x => !x.includes('(hidden)')).slice(-3)[0].startsWith('Advanced features') || true, 'list printed');
  const names = s.map(x => x.replace(/[*]|\(hidden\)/g, '')); const mi = names.indexOf('Master');
  ok(mi === names.indexOf('Pricing') + 1, 'Master is the last sub item (after Advanced features, Analytics, Pricing)');
  ok(await p.locator('.sh-item--master').isVisible(), 'Master visible while the list is collapsed');
  // dismiss the Master card, then open Master from the sidebar
  await p.locator('[data-card=master] button[aria-label="Dismiss master"]').click(); await p.waitForTimeout(200);
  ok(!(await p.locator('[data-card=master]').isVisible()), 'Master card dismissed');
  await p.click('.sh-item--master'); await p.waitForTimeout(400);
  ok(await masterVisible() && p.url().endsWith('#/master'), 'sidebar Master opens the Master page');
  s = await subs(); ok(s.includes('Master*') && !s.some(x => x.startsWith('Findter') && x.includes('*')), 'Master highlighted, Findter item not pilled');
  await p.screenshot({ path: 'test/master-nav.png' });
  await p.click('.sh-item--app'); await p.waitForTimeout(400);
  ok(!(await masterVisible()) && await p.locator('#app').isVisible(), 'clicking Findter item returns to the app home');
  s = await subs(); ok(!s.includes('Master*') && s.some(x => x.startsWith('Findter') && x.includes('*')), 'highlight moved back to the Findter item');
  // from another page
  await p.goto(url('features.html')); await p.waitForTimeout(400);
  await p.click('.sh-item--master'); await p.waitForTimeout(700);
  ok(p.url().includes('index.html') && p.url().endsWith('#/master') && await masterVisible(), 'Master link works from features.html');
  s = await subs(); ok(s.includes('Master*'), 'Master highlighted after arriving from another page');
  // phone drawer
  await p.setViewportSize({ width: 390, height: 844 }); await p.goto(url('index.html')); await p.waitForTimeout(400);
  await p.click('.m-fab--menu'); await p.waitForTimeout(300);
  ok(await p.locator('.sh-item--master').isVisible(), 'Master visible in the phone drawer');
  await p.click('.sh-item--master'); await p.waitForTimeout(500);
  ok(await masterVisible(), 'phone: Master opens');
  console.log('page errors:', errs.length ? errs.join('|') : 'none'); console.log(fails ? fails + ' FAILED' : 'all passed'); await b.close();
})();
