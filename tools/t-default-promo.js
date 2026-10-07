// Default promotion banners: left column (633.33x160) + phones (370x185, right under Recommended apps)
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  p.on('requestfailed', r => /promo-.*default/.test(r.url()) && errs.push('image failed: ' + r.url()));
  const order = sel => p.evaluate(s => [...document.querySelectorAll(s + ' [data-card]')].filter(c => c.offsetParent !== null).map(c => c.dataset.card.replace(/^promo:/, 'P:')).join(','), sel);
  const size = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: +r.width.toFixed(2), h: +r.height.toFixed(2), img: e.querySelector('img') && e.querySelector('img').naturalWidth }; }, sel);
  // ---- desktop, first visit (empty storage)
  await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
  const left = await order('#app .Polaris-Layout:not(.mobile-layout)'); console.log('   desktop blocks:', left);
  ok(left === 'guide,data,P:default-left,rec,master,status,help,sync', 'desktop order: left = guide, data, promo banner, recommended apps, master | right = status, help, sync');
  ok(await p.locator('[data-card="promo:default-left"]').isVisible(), 'desktop: the default left banner is shown');
  ok(!(await p.locator('[data-card="promo:default-mobile"]').isVisible()), 'desktop: the phone banner is NOT shown');
  const L = await size('[data-card="promo:default-left"] .pb-slide'); console.log('   left', JSON.stringify(L));
  ok(L && Math.abs(L.w - 633.33) < 1 && Math.abs(L.h - 160) < 1 && L.img === 1267, 'left banner 633.33 x 160, image loaded (1267 px wide source)');
  const inLeft = await p.evaluate(() => { const c = document.querySelector('[data-card="promo:default-left"]'), g = document.querySelector('[data-card=guide]'); return c.getBoundingClientRect().left === g.getBoundingClientRect().left && c.closest('.Polaris-Layout__Section').parentElement === g.closest('.Polaris-Layout__Section').parentElement; });
  ok(inLeft, 'it sits in the left column');
  await p.evaluate(() => { localStorage.setItem('findter.homeLayout.v2', JSON.stringify({ left: ['master', 'rec', 'data', 'guide'], right: ['status', 'help', 'sync'], mobile: [] })); }); await p.reload(); await p.waitForTimeout(600);
  ok((await order('#app .Polaris-Layout:not(.mobile-layout)')).startsWith('master,rec,data,P:default-left,guide'), 'saved desktop order: the banner is inserted right after Data insight');
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(600);
  await p.screenshot({ path: 'test/default-promo-desktop.png', fullPage: false });
  // ---- close it: gone until reload (comes back, like the other blocks)
  await p.locator('[data-card="promo:default-left"]').scrollIntoViewIfNeeded();
  await p.click('[data-card="promo:default-left"] .pb-x'); await p.waitForTimeout(200);
  ok(!(await p.locator('[data-card="promo:default-left"]').isVisible()), 'X closes the banner');
  // ---- phone
  await p.setViewportSize({ width: 390, height: 844 }); await p.reload(); await p.waitForTimeout(800);
  const mob = await order('.mobile-layout'); console.log('   phone order:', mob);
  ok(mob === 'status,sync,guide,help,data,P:default-mobile,rec,master', 'phone order: status, sync, guide, help, data, promo banner, recommended apps, master');
  const M = await size('[data-card="promo:default-mobile"] .pb-slide'); console.log('   mobile', JSON.stringify(M));
  ok(M && Math.abs(M.w - 370) < 1 && Math.abs(M.h - 185) < 1 && M.img === 740, 'phone banner 370 x 185, image loaded');
  ok(!(await p.locator('[data-card="promo:default-left"]').isVisible()), 'phone: the left banner is NOT shown');
  const w = await p.evaluate(() => [...new Set([...document.querySelectorAll('.mobile-layout > .Polaris-Layout__Section')].map(s => Math.round(s.getBoundingClientRect().width)))]); ok(w.length === 1, 'phone: every block has the same width (' + w + ')');
  await p.locator('[data-card="promo:default-mobile"]').scrollIntoViewIfNeeded(); await p.screenshot({ path: 'test/default-promo-mobile.png' });
  // ---- an admin who already saved an order gets the phone banner under Recommended apps too
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('findter.homeLayout.v2', JSON.stringify({ left: ['guide', 'rec', 'data', 'master'], right: ['status', 'help', 'sync'], mobile: ['master', 'data', 'rec', 'guide', 'help', 'sync', 'status'] })); });
  await p.reload(); await p.waitForTimeout(700);
  const mob2 = await order('.mobile-layout'); console.log('   phone order (saved order):', mob2);
  ok(mob2 === 'master,data,P:default-mobile,rec,guide,help,sync,status', 'saved phone order: the banner is inserted right after Data insight');
  // ---- editor: both default banners are listed, can be deleted, and stay deleted
  await p.setViewportSize({ width: 1440, height: 900 }); await p.evaluate(() => localStorage.clear()); await p.goto(url + '#/master/home'); await p.reload(); await p.waitForTimeout(700);
  const items = await p.locator('.hl-item[data-id^="promo:"]').evaluateAll(els => els.map(e => e.dataset.id + ' @' + e.closest('.hl-col').className.replace(/.*hl-col--/, '')));
  console.log('   editor lists:', items.join(' | '));
  ok(items.length === 2 && items.some(i => /default-left @left/.test(i)) && items.some(i => /default-mobile @mobile/.test(i)), 'editor lists the default banner under Left column and under Mobile phone order');
  const mobItems = await p.locator('.hl-col--mobile .hl-item').evaluateAll(els => els.map(e => e.dataset.id)); ok(mobItems.join() === 'status,sync,guide,help,data,promo:default-mobile,rec,master', 'editor: phone order has the banner under Data insight, above Recommended apps');
  await p.locator('.hl-col--left .hl-item[data-id="promo:default-left"] [data-act=hl-delete]').click(); await p.locator('[data-act=dm-delete]').click(); await p.waitForTimeout(200);
  await p.locator('.hl-col--mobile .hl-item[data-id="promo:default-mobile"] [data-act=hl-delete]').click(); await p.locator('[data-act=dm-delete]').click(); await p.waitForTimeout(200);
  await p.click('[data-act=hl-save]'); await p.waitForTimeout(300);
  await p.goto(url + '#/'); await p.reload(); await p.waitForTimeout(600);
  ok(await p.locator('[data-card^="promo:"]').count() === 0, 'deleted + saved: no default banners come back after a reload');
  await p.evaluate(() => localStorage.clear());
  console.log('page errors:', errs.length ? errs.join('|') : 'none'); console.log(fails ? fails + ' FAILED' : 'all passed'); await b.close();
})();
