// "Powered by Findter" badge: Master -> Features setting, Search settings card, chat request, sample storefront
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'); const url = f => pathToFileURL(path.join(root, f)).href;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1900, height: 1000 } });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(p.url().split('/').pop() + ': ' + e.message));
  await p.goto(url('index.html')); await p.evaluate(() => localStorage.clear());
  const store = async v => { await p.selectOption('.demo-select[data-key=plan]', v); await p.waitForTimeout(60); };
  const card = () => p.locator('[data-wm-card]:not([hidden])');
  const busy = async () => (await p.locator('[data-wm-btn]').getAttribute('aria-disabled')) === 'true';

  /* ---- Master -> Features ---- */
  await p.goto(url('index.html') + '#/master/features'); await p.waitForTimeout(400);
  ok(await p.locator('[data-panel=features] [data-wm-master]').isVisible(), 'Master → Features shows the badge setting');
  ok(await p.locator('[data-panel=load]').isHidden(), 'the empty "Load" panel is not shown on Features');
  const heads = await p.$$eval('[data-panel=features] .prm-card > h2, [data-panel=features] .prm-card > .ft-head > h2', h => h.map(x => x.textContent));
  ok(heads.join('|') === 'Features|Recommended Apps|Powered by Findter badge', 'the badge container comes after Features and Recommended Apps (' + heads.join('|') + ')');
  ok(await p.locator('[data-wm-master] [data-wm-act=save]').count() === 1 && await p.locator('[data-wm-master] .Polaris-Button').count() === 1, 'the badge container has its own Save button, no Discard');
  ok(await p.locator('[data-wm=enabled]').isChecked(), 'feature is on by default');
  const types = await p.$$eval('[data-wm-type]', i => i.map(x => x.dataset.wmType + ':' + x.checked));
  ok(types.join() === 'Subscription:true,Development store:false,Trial:true,Paid before:true,Service:true,Free:true', 'six shop types, Development store unticked by default (' + types.join(' ') + ')');
  ok(await p.locator('[data-wm-act=save]').isDisabled(), 'Save is disabled until something changes');
  await p.uncheck('[data-wm-type="Free"]');
  ok(await p.locator('.mt-tab[data-tab=features].has-changes').count() === 1 && await p.locator('[data-wm-act=save]').isEnabled(), 'a change marks the tab and enables Save');
  await p.check('[data-wm-type="Free"]'); ok(await p.locator('[data-wm-act=save]').isDisabled(), 'putting the saved value back disables Save again');
  await p.uncheck('[data-wm=enabled]'); ok(await p.locator('[data-wm-type="Free"]').isDisabled(), 'turning the feature off dims the shop types');
  await p.check('[data-wm=enabled]');
  for (const t of ['Subscription', 'Trial', 'Paid before', 'Service', 'Free']) await p.uncheck(`[data-wm-type="${t}"]`);
  ok(/at least one/.test(await p.textContent('[data-wm-err]')) && await p.locator('[data-wm-act=save]').isDisabled(), 'feature on with no shop type: error, Save disabled');
  await p.reload(); await p.waitForTimeout(400);

  /* ---- Search settings card, per store type ---- */
  await p.goto(url('search.html')); await p.waitForTimeout(400);
  const order = await p.evaluate(() => [...document.querySelector('.Polaris-Layout').children].map(s => s.hasAttribute('data-wm-card') ? 'card' : /custom search solution/.test(s.textContent) ? 'banner' : /Search field/.test(s.textContent) ? 'fields' : 'other'));
  ok(order.join() === 'other,banner,card,fields', 'card sits between the info banner and "Search field" (' + order.join(' > ') + ')');
  const shape = async v => { await store(v); return p.evaluate(() => { const c = document.querySelector('[data-wm-card]'); const bt = c.querySelector('[data-wm-btn]'); return c.hidden ? 'hidden' : bt ? (bt.getAttribute('aria-disabled') === 'true' ? 'button-busy' : 'button') : c.querySelector('.wm-badge') ? 'removed' : '?'; }); };
  const want = { Trial: 'button', Free: 'button', 'Paid before': 'button', Service: 'button', Starter: 'button', Enterprise: 'button', Development: 'hidden' };
  for (const [plan, w] of Object.entries(want)) { const got = await shape(plan); ok(got === w, `${plan}: ${w} (${got})`); }
  await store('Free');
  ok((await p.locator('[data-wm-card] button').count()) === 1 && (await p.locator('[data-wm-btn]').textContent()).trim() === 'Remove' && (await p.locator('[data-wm-card] input').count()) === 0, 'the card has one text button "Remove" and no switch');
  await store('Free'); await p.hover('.wm-label .mf-tip'); await p.waitForTimeout(100);
  const tip = await p.evaluate(() => { const t = document.querySelector('.wm-label .mf-tip'), bub = t.querySelector('.mf-tip__bubble'), r = bub.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, el = document.elementFromPoint(x, y); const ic = t.querySelector('svg').getBoundingClientRect(), tx = document.querySelector('#wm-label').getBoundingClientRect(); return { shown: getComputedStyle(bub).display !== 'none', onTop: !!el && bub.contains(el), dy: Math.abs((ic.top + ic.height / 2) - (tx.top + tx.height / 2)) }; });
  ok(tip.shown && tip.onTop, 'tooltip: the bubble shows in full on hover, not cut by the card border');
  ok(tip.dy <= 0.5, 'tooltip: the icon is centred on the label text (off by ' + tip.dy + 'px)');
  await p.mouse.move(5, 5);
  const banners = await p.locator('.Polaris-Banner').count(); ok(banners === 1, 'the new card is not a banner (one banner on the page)');
  const msgs = () => p.locator('.chat-panel__body .chat-msg').allTextContents();
  const toastNow = () => p.textContent('#toast');

  /* ---- Trial / Free: one click -> chat opens, message goes out, then the badge is removed ---- */
  await store('Free');
  const before = (await msgs()).length;
  await p.click('[data-wm-btn]'); await p.waitForTimeout(150);
  ok(await busy(), 'Free: the button reads "Removing…" while the chat works');
  ok(await p.locator('.chat-panel.open').count() === 1, 'Free: turning the button on opens the chat');
  ok(!/not part of this copy/.test(await toastNow()), 'no "not part of this copy" toast');
  let m = await msgs(); ok(m.length === before + 1 && /remove the “Powered by Findter” badge/.test(m[m.length - 1]), 'Free: the shop’s message is sent by itself');
  ok(await p.locator('.chat-choice').count() === 0, 'Free: no Yes / No question in the chat');
  ok(!(await p.evaluate(() => FindterWatermark.removed())) && await p.locator('.wm-badge').count() === 0, 'Free: nothing is removed in the first moment (loading)');
  await p.waitForTimeout(1400);
  m = await msgs(); ok(m.length === before + 2 && /The “Powered by Findter” badge is now removed/.test(m[m.length - 1]) && /Just reply here/.test(m[m.length - 1]), 'Free: then the auto reply "The badge is now removed…" inviting a reply');
  ok(await p.evaluate(() => FindterWatermark.removed()) && await p.locator('.wm-badge').isVisible() && await p.locator('[data-wm-btn]').count() === 0, 'Free: badge removed, the button becomes the green "Removed" badge (no way back)');
  ok(await p.locator('.demo-btn[data-key=wm][data-val=removed]').getAttribute('aria-pressed') === 'true', 'the demo bar Badge group follows (Removed)');
  await p.click('.demo-btn[data-key=wm][data-val=shown]'); await p.waitForTimeout(100);
  ok(await p.locator('[data-wm-btn]').isVisible() && !(await busy()), 'demo bar Badge = Shown: the Remove button is back');
  ok(await p.locator('.demo-group[aria-label=CSE]').count() === 0, 'the demo bar has no CSE group any more');

  /* ---- Trial and Free (never paid) go through the chat ---- */
  for (const plan of ['Trial']) {
    await store(plan); const n = (await msgs()).length;
    await p.click('[data-wm-btn]'); await p.waitForTimeout(1500);
    ok((await msgs()).length === n + 2 && await p.locator('.wm-badge').isVisible(), plan + ': message, auto reply, "Removed"');
    await p.click('.demo-btn[data-key=wm][data-val=shown]');
  }

  /* ---- a shop that has paid (Subscription, Paid before, Service): one click, no chat ---- */
  for (const plan of ['Starter', 'Paid before', 'Service']) {
    await store(plan);
    const b3 = (await msgs()).length;
    await p.click('[data-wm-btn]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => FindterWatermark.removed()) && await p.locator('.wm-badge').isVisible() && await p.locator('[data-wm-btn]').count() === 0, plan + ': the button becomes "Removed" right away');
    ok((await msgs()).length === b3 && await p.locator('.chat-choice').count() === 0, plan + ': the chat is not touched');
    await p.click('.demo-btn[data-key=wm][data-val=shown]');
  }

  /* ---- demo bar Reset ---- */
  await store('Starter'); await p.click('[data-wm-btn]'); await p.waitForTimeout(200);
  ok(await p.locator('.wm-badge').isVisible(), 'before Reset: a paid store with the badge removed shows "Removed"');
  await p.click('.demo-reset'); await p.waitForTimeout(150);
  const st = await p.evaluate(() => JSON.stringify(FindterDemo.DEMO));
  ok(st === '{"plan":"Trial","sub":"active","days":14,"over":"normal","lang":"en","wm":"shown"}', 'Reset: every demo value is back to its start value (' + st + ')');
  ok(await p.locator('[data-wm-btn]').isVisible() && !(await busy()) && await p.locator('.wm-badge').count() === 0, 'Reset: the card shows the Remove button (no "Removed")');
  for (const v of ['Trial', 'Free', 'Starter']) { await store(v); ok(await p.locator('[data-wm-btn]').isVisible() && await p.locator('.wm-badge').count() === 0, 'after Reset, ' + v + ' shows the Remove button (not "Removed")'); }
  await store('Free'); await p.click('[data-wm-btn]'); await p.waitForTimeout(200);
  await p.click('.demo-reset'); await p.waitForTimeout(1600);
  ok(!(await busy()) && await p.locator('.wm-badge').count() === 0, 'Reset in the middle of a request: the button is idle, nothing ends up removed');
  await store('Free');

  /* ---- a shop that spams the button: one request, one message, one reply ---- */
  const hi = () => p.getByText(/Hi, I would like to remove/).count();
  await p.click('.demo-reset'); await p.waitForTimeout(150); await store('Free');
  const h0 = await hi(), r0 = await p.getByText(/is now removed from your storefront/).count();   // the chat keeps what earlier checks put in it
  for (let i = 0; i < 4; i++) { await p.click('[data-wm-btn]', { force: true }); await p.waitForTimeout(40); }
  ok(await busy(), 'clicking the button again while the request runs changes nothing');
  await p.waitForTimeout(1600);
  ok(await hi() === h0 + 1 && await p.getByText(/is now removed from your storefront/).count() === r0 + 1 && await p.locator('.wm-badge').isVisible(), 'clicking many times: one message from the shop, one auto reply, one "Removed"');
  await p.click('.demo-reset'); await p.waitForTimeout(150); await store('Free');

  /* ---- Master -> Features on a phone: the chat launcher does not cover the Save button of the last container ---- */
  const ph = await ctx.newPage(); ph.on('pageerror', e => errs.push('phone: ' + e.message)); await ph.setViewportSize({ width: 390, height: 800 });
  await ph.goto(url('index.html') + '#/master/features'); await ph.waitForTimeout(500);
  await ph.evaluate(() => { const sc = document.querySelector('.sh-scroll'); if (sc) sc.scrollTop = sc.scrollHeight; window.scrollTo(0, document.body.scrollHeight); }); await ph.waitForTimeout(300);
  const hit = await ph.evaluate(() => { const s = document.querySelector('[data-wm-act=save]'), f = document.querySelector('.m-fab'); if (!s || !f) return 'missing'; const a = s.getBoundingClientRect(), c = f.getBoundingClientRect(); return !(a.right < c.left || a.left > c.right || a.bottom < c.top || a.top > c.bottom); });
  ok(hit === false, 'phone: the chat launcher does not sit on the badge container Save button (' + hit + ')');
  await ph.close();

  /* ---- Filter design page: the same card, right under the info banner and above the Filter layout / Live preview columns ---- */
  await p.goto(url('design.html')); await p.waitForTimeout(500);
  ok(await p.evaluate(() => { const c = document.querySelector('[data-wm-card]'), b = document.querySelector('.Polaris-Banner').closest('.Polaris-Layout__Section'); return !!c && !c.hidden && c.previousElementSibling === b && /Remove “Powered by Findter” badge/.test(c.textContent); }), 'Filter design: the badge card sits right under the info banner');
  ok(await p.evaluate(() => { const c = document.querySelector('[data-wm-card]').getBoundingClientRect(), t = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === 'Filter layout'); return !!t && c.bottom <= t.getBoundingClientRect().top; }), 'Filter design: the card is above the Filter layout and Live preview columns');
  await p.goto(url('search.html')); await p.waitForTimeout(300);

  /* ---- sample storefront ---- */
  const sf = await ctx.newPage(); sf.on('pageerror', e => errs.push('storefront: ' + e.message));
  await sf.goto(url('storefront.html')); await sf.waitForTimeout(300);
  const powered = () => sf.locator('#sf-powered').isVisible();
  ok(await sf.locator('.sf-card').count() === 12, 'storefront: collection page with 12 products');
  await sf.click('#sf-open-search'); await sf.fill('#sf-q', 'cosm'); await sf.waitForTimeout(150);
  ok(await sf.evaluate(() => { const a = document.querySelector('.sf-announce').getBoundingClientRect(), x = a.left + 20, y = a.top + a.height / 2, el = document.elementFromPoint(x, y); return !!el && el.closest('.sf-search') !== null; }), 'storefront: the white search bar covers the "Welcome to our store" bar');
  ok(await sf.locator('.sf-suggest__item').count() === 5 && await sf.locator('#sf-suggest-all').textContent().then(t => /Search for “cosm”/.test(t)), 'storefront: typing "cosm" shows 5 product suggestions and "Search for “cosm”"');
  ok(await powered(), 'storefront: Free store, badge shown under the suggestions');
  const g = await sf.evaluate(() => { const box = document.querySelector('.sf-suggest__box').getBoundingClientRect(), w = document.querySelector('#sf-powered').getBoundingClientRect(); return { dr: Math.abs(w.right - box.right), below: w.top >= box.bottom - 1 }; });
  ok(await sf.evaluate(() => { const i = document.querySelector('.sf-powered__logo'), t = document.querySelector('#sf-powered span'); return i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().right <= t.getBoundingClientRect().left; }), 'storefront: the app logo loads and sits left of "Powered by Findter"');
  ok(g.dr <= 1 && g.below, 'storefront: badge is under the box, aligned to its right corner (outside the box)');
  await p.bringToFront(); await p.click('[data-wm-btn]'); await p.waitForTimeout(1600);
  await sf.waitForTimeout(300); ok(!(await powered()), 'storefront (open tab) follows: badge gone after the removal');
  await p.click('.demo-btn[data-key=wm][data-val=shown]'); await sf.waitForTimeout(300); ok(await powered(), 'storefront: Badge = Shown brings it back');
  await store('Development'); await sf.waitForTimeout(300); ok(!(await powered()), 'storefront: Development store never shows the badge (not ticked in Master)');
  await store('Starter'); await sf.waitForTimeout(300); ok(await powered(), 'storefront: paid store shows it until the button is used');
  // the same badge at the end of the filter bar (collection) and, on the search results page, also at the end of the results
  ok(await sf.locator('.sf-powered--filter').isVisible() && await sf.evaluate(() => { const b = document.querySelector('.sf-powered--filter').getBoundingClientRect(), last = [...document.querySelectorAll('.sf-group')].pop().getBoundingClientRect(); return b.top >= last.bottom && b.width > 200; }), 'storefront: the badge also shows under the last filter group');
  const sr = await ctx.newPage(); sr.on('pageerror', e => errs.push('search page: ' + e.message));
  await sr.goto(url('storefront-search.html') + '?q=cosm'); await sr.waitForTimeout(300);
  ok(await sr.locator('.sf-card').count() >= 12 && /72 products/.test(await sr.locator('#sf-count').textContent()) && await sr.locator('#sf-sr-q').inputValue() === 'cosm', 'search results page: "cosm" finds 72 products, the first 12 shown, the term in the search field');
  ok(await sr.locator('.sf-powered--filter').isVisible() && await sr.locator('.sf-ticker').isVisible(), 'search results page: the badge shows at the end of the filter bar and as the running line under the results');
    const tk = () => sr.evaluate(() => { const t = document.querySelector('.sf-ticker').getBoundingClientRect(); return { bottom: Math.round(t.bottom), top: Math.round(t.top), w: Math.round(t.width), left: Math.round(t.left), ih: innerHeight, cw: document.documentElement.clientWidth }; });
  let t0 = await tk(); ok(t0.w === t0.cw && t0.left === 0, 'search results page: the running line spans the full width');
  ok(Math.abs(t0.bottom - t0.ih) <= 1, 'search results page: at the top the running line is stuck to the bottom of the screen');
  // scroll down: more products keep loading until all 72 are shown, the line stays on the bottom of the screen the whole way
  let stuck = true, n = 0;
  for (let i = 0; i < 40; i++) { await sr.evaluate(() => scrollBy(0, innerHeight * 0.8)); await sr.waitForTimeout(80); const t = await tk(); const cards = await sr.locator('.sf-card').count(); if (cards < 72 && Math.abs(t.bottom - t.ih) > 1) stuck = false; n = cards; if (cards >= 72 && await sr.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 2)) break; }
  ok(n === 72, 'search results page: scrolling down keeps loading products until all 72 are shown (' + n + ')');
  ok(stuck, 'search results page: the running line stays stuck to the bottom of the screen while there is more to scroll');
  await sr.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await sr.waitForTimeout(150);
  const te = await sr.evaluate(() => { const t = document.querySelector('.sf-ticker').getBoundingClientRect(), f = document.querySelector('.sf-store-footer').getBoundingClientRect(), c = [...document.querySelectorAll('.sf-card')].pop().getBoundingClientRect(); return { tb: Math.round(t.bottom), ft: Math.round(f.top), ih: innerHeight, cardAbove: c.bottom <= t.top + 1 }; });
  ok(Math.abs(te.tb - te.ft) <= 1 && te.tb < te.ih - 20 && te.cardAbove, 'search results page: at the very bottom the line stops sticking and rests between the last product and the store footer');
  await sr.evaluate(() => scrollBy(0, -500)); await sr.waitForTimeout(150); const tu = await tk();
  ok(Math.abs(tu.bottom - tu.ih) <= 1, 'search results page: scrolling back up, the line sticks to the bottom of the screen again');
  await sr.evaluate(() => scrollTo(0, 0));
  ok(await sr.evaluate(() => { const tr = document.querySelector('.sf-ticker__track'); const a = getComputedStyle(tr); return a.animationName === 'sf-ticker' && tr.querySelectorAll('.sf-ticker__item').length >= 10; }), 'search results page: the running line animates with the mark repeated');
  const tx0 = await sr.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.sf-ticker__track')).transform).m41); await sr.waitForTimeout(500);
  ok(await sr.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.sf-ticker__track')).transform).m41) > tx0, 'search results page: the line moves to the right');
  await sr.click('#sf-open-search'); await sr.fill('#sf-q', 'rose'); await sr.keyboard.press('Enter'); await sr.waitForURL(/q=rose/);
  ok(await sr.locator('.sf-card').count() === 1, 'search results page: Enter in the header search opens the results for the new term');
  await store('Development'); await sr.reload(); await sr.waitForTimeout(300);
  ok(await sr.locator('.sf-powered--filter').isHidden() && await sr.locator('.sf-ticker').isHidden(), 'search results page: a Development store shows no badge anywhere');
  await sr.setViewportSize({ width: 390, height: 800 }); await store('Starter'); await sr.reload(); await sr.waitForTimeout(300);
  ok(await sr.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'search results page at 390px: no horizontal scroll');
  await sr.close();
  // Master turns the feature off
  await p.goto(url('index.html') + '#/master/features'); await p.waitForTimeout(400); await p.uncheck('[data-wm=enabled]'); await p.click('[data-wm-act=save]'); await sf.waitForTimeout(300);
  ok(!(await powered()), 'storefront: Master → Features off (saved) removes the badge for everyone');
  await p.goto(url('search.html')); await p.waitForTimeout(300); ok(await p.locator('[data-wm-card]').isHidden(), 'search settings: the card is gone while the feature is off');
  await p.goto(url('index.html') + '#/master/features'); await p.waitForTimeout(300); await p.check('[data-wm=enabled]'); await p.click('[data-wm-act=save]');
  await sf.fill('#sf-q', ''); await sf.keyboard.press('Escape'); ok(await sf.locator('#sf-search').isHidden(), 'storefront: Esc closes the search');

  /* ---- sidebar + phone ---- */
  await p.goto(url('search.html')); await p.waitForTimeout(300);
  const link = p.locator('.sh-item.sh-expanded-only:has-text("Online Store")');
  const [pop] = await Promise.all([ctx.waitForEvent('page'), link.click()]);
  ok(/storefront\.html$/.test(pop.url()), 'Online Store (Sales channels) opens the storefront in a new tab');
  await sf.setViewportSize({ width: 390, height: 800 }); await sf.reload(); await sf.waitForTimeout(300);
  ok(await sf.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'storefront at 390px: no horizontal scroll');
  await p.setViewportSize({ width: 390, height: 800 }); await p.goto(url('search.html')); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'search settings at 390px: no horizontal scroll');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
