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

  /* ---- the badge card (on Filter design, not on Search settings), per store type ---- */
  await p.goto(url('design.html')); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector('[data-wm-card]')), 'the card is on Filter design');
  await p.goto(url('search.html')); await p.waitForTimeout(300); ok(await p.evaluate(() => !document.querySelector('[data-wm-card]')) && !(await p.getByText('Remove “Powered by Findter” badge').count()), 'Search settings no longer has the card');
  await p.goto(url('design.html')); await p.waitForTimeout(400);
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
  await p.goto(url('design.html')); await p.waitForTimeout(300);

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
  await store('Development'); await sf.waitForTimeout(300); ok(!(await powered()) && await sf.locator('.sf-powered--filter').isHidden(), 'storefront: Development store never shows the badge or the filter-bar mark (not ticked in Master)');
  await store('Starter'); await sf.waitForTimeout(300); ok(await powered(), 'storefront: paid store shows it until the button is used');
  // the same badge at the end of the filter bar (collection) and, on the search results page, also at the end of the results
  ok(await sf.locator('.sf-powered--filter').isVisible() && await sf.evaluate(() => { const b = document.querySelector('.sf-powered--filter').getBoundingClientRect(), last = [...document.querySelectorAll('.sf-group')].pop().getBoundingClientRect(); return b.top >= last.bottom && b.width > 200; }), 'storefront: the badge also shows under the last filter group');
  let cn = 0; for (let i = 0; i < 40 && cn < 72; i++) { await sf.evaluate(() => scrollBy(0, innerHeight * 0.8)); await sf.waitForTimeout(80); cn = await sf.locator('.sf-card').count(); }
  ok(cn === 72, 'storefront: scrolling the collection keeps loading products until all 72 are shown (' + cn + ')');
  await sf.evaluate(() => scrollTo(0, 0));
  const sr = await ctx.newPage(); sr.on('pageerror', e => errs.push('search page: ' + e.message));
  await sr.goto(url('storefront-search.html') + '?q=cosm'); await sr.waitForTimeout(300);
  ok(await sr.locator('.sf-card').count() >= 12 && /72 products/.test(await sr.locator('#sf-count').textContent()) && await sr.locator('#sf-sr-q').inputValue() === 'cosm', 'search results page: "cosm" finds 72 products, the first 12 shown, the term in the search field');
  ok(await sr.locator('.sf-powered--filter').isVisible(), 'search results page: the badge shows at the end of the filter bar');
  let n = 0; for (let i = 0; i < 40 && n < 72; i++) { await sr.evaluate(() => scrollBy(0, innerHeight * 0.8)); await sr.waitForTimeout(80); n = await sr.locator('.sf-card').count(); }
  ok(n === 72, 'search results page: scrolling down keeps loading products until all 72 are shown (' + n + ')');
  await sr.click('#sf-open-search'); await sr.fill('#sf-q', 'rose'); await sr.keyboard.press('Enter'); await sr.waitForURL(/q=rose/);
  ok(await sr.locator('.sf-card').count() === 1, 'search results page: Enter in the header search opens the results for the new term');
  await store('Development'); await sr.reload(); await sr.waitForTimeout(300);
  ok(await sr.locator('.sf-powered--filter').isHidden(), 'search results page: a Development store shows no badge anywhere');
  await sr.setViewportSize({ width: 390, height: 800 }); await store('Starter'); await sr.reload(); await sr.waitForTimeout(300);
  ok(await sr.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'search results page at 390px: no horizontal scroll');
  await sr.close();
  ok(await sf.evaluate(u => [...document.querySelectorAll('.sf-powered')].length >= 2 && [...document.querySelectorAll('.sf-powered')].every(a => a.tagName === 'A' && a.getAttribute('href') === u && a.target === '_blank' && /noopener/.test(a.rel)), 'https://apps.shopify.com/findter-custom-filter-search?utm_source=trademark&utm_medium=referral'), 'storefront: every badge is a link to the app listing (new tab)');
  await sf.evaluate(() => document.querySelector('.sf-powered--filter').scrollIntoView({ block: 'center' })); await sf.waitForTimeout(150);
  ok(await sf.evaluate(() => { const sc = document.querySelector('#sf-scrim'), was = sc.hidden; sc.hidden = true; const vis = [...document.querySelectorAll('.sf-powered')].filter(e => { const q = e.getBoundingClientRect(); return q.width > 0 && q.top >= 0 && q.bottom <= innerHeight; }); const res = vis.length >= 1 && vis.every(e => { const q = e.getBoundingClientRect(); return [[q.left + 2, q.top + q.height / 2], [q.right - 2, q.top + q.height / 2], [q.left + q.width / 2, q.top + 3], [q.left + q.width / 2, q.bottom - 3], [q.left + q.width / 2, q.top + q.height / 2]].every(([x, y]) => { const t = document.elementFromPoint(x, y); return !!t && t.closest('a.sf-powered') === e; }); }); sc.hidden = was; return res; }), 'storefront: a click anywhere on a badge (edges, padding, logo or text) opens the link');
  // Master turns the feature off
  await p.goto(url('index.html') + '#/master/features'); await p.waitForTimeout(400); await p.uncheck('[data-wm=enabled]'); await p.click('[data-wm-act=save]'); await sf.waitForTimeout(300);
  ok(!(await powered()), 'storefront: Master → Features off (saved) removes the badge for everyone');
  await p.goto(url('design.html')); await p.waitForTimeout(300); ok(await p.locator('[data-wm-card]').isHidden(), 'Filter design: the card is gone while the feature is off');
  await p.goto(url('index.html') + '#/master/features'); await p.waitForTimeout(300); await p.check('[data-wm=enabled]'); await p.click('[data-wm-act=save]');
  await sf.fill('#sf-q', ''); await sf.keyboard.press('Escape'); ok(await sf.locator('#sf-search').isHidden(), 'storefront: Esc closes the search');

  /* ---- filter layouts: Filter design chooses, the storefront follows (Vertical / Horizontal / Off-canvas; phones are always Off-canvas) ---- */
  await p.goto(url('design.html')); await p.waitForTimeout(400);
  const pick = n => p.locator('label.Polaris-Choice', { hasText: new RegExp('^' + n + '$') }).first().click();
  const stored = () => p.evaluate(() => localStorage.getItem('findter.filterLayout'));
  const checks = () => p.evaluate(() => ['Vertical', 'Horizontal', 'Off-canvas'].map(n => [...document.querySelectorAll('label')].find(l => l.textContent.trim() === n).querySelector('input').checked));
  ok((await checks()).join() === 'true,false,false', 'Filter design: Vertical is the layout chosen by default');
  await pick('Horizontal'); ok(await stored() === 'horizontal' && (await checks()).join() === 'false,true,false', 'Filter design: choosing Horizontal saves it and unticks the others');
  await sf.bringToFront(); await sf.waitForTimeout(300);
  ok(await sf.evaluate(() => document.body.dataset.filterLayout === 'horizontal' && getComputedStyle(document.querySelector('.sf-filters')).display === 'none') && await sf.locator('.sf-hbar').isVisible(), 'storefront (open tab) follows: the horizontal bar replaces the sidebar');
  ok(await sf.evaluate(() => { const last = [...document.querySelectorAll('.sf-hbtn')].pop().getBoundingClientRect(), b = document.querySelector('.sf-powered--hbar').getBoundingClientRect(); const sameRow = Math.abs((b.top + b.height / 2) - (last.top + last.height / 2)) < 6; return b.width > 0 && (sameRow ? b.left >= last.right : b.top >= last.bottom - 1); }), 'horizontal layout: the badge comes right after the last dropdown (same row, or the next row when the row is full)');
  await sf.click('.sf-hbtn'); ok(await sf.locator('.sf-hpanel:not([hidden])').count() === 1, 'horizontal layout: a dropdown opens');
  await p.bringToFront(); await pick('Off-canvas'); ok(await stored() === 'offcanvas', 'Filter design: choosing Off-canvas saves it');
  await sf.bringToFront(); await sf.waitForTimeout(300);
  ok(await sf.locator('#sf-open-drawer').isVisible() && await sf.evaluate(() => getComputedStyle(document.querySelector('.sf-filters')).display === 'none'), 'off-canvas layout: a Filter button replaces the sidebar');
  await sf.click('#sf-open-drawer'); await sf.waitForTimeout(150); await sf.evaluate(() => { document.querySelector('.sf-drawer__body').scrollTop = 1e5; }); await sf.waitForTimeout(100);
  const dr = await sf.evaluate(() => { const g = [...document.querySelectorAll('.sf-drawer__body .sf-group')].pop().getBoundingClientRect(), b = document.querySelector('.sf-drawer .sf-powered--filter').getBoundingClientRect(), fo = document.querySelector('.sf-drawer__foot').getBoundingClientRect(); return { vis: b.width > 0, below: b.top >= g.bottom - 1, aboveFoot: b.bottom <= fo.top + 1 }; });
  ok(dr.vis && dr.below && dr.aboveFoot, 'off-canvas layout: the drawer shows the badge after the last filter, above the "View items" button');
  await sf.click('.sf-drawer__close'); ok(await sf.locator('#sf-drawer').isHidden(), 'off-canvas layout: the X closes the drawer');
  await p.bringToFront(); await pick('Vertical'); ok(await stored() === 'vertical', 'Filter design: choosing Vertical again');
  // phones: always Off-canvas, whatever the shop chose
  const ph3 = await ctx.newPage(); ph3.on('pageerror', e => errs.push('phone layouts: ' + e.message)); await ph3.setViewportSize({ width: 390, height: 800 });
  await ph3.goto(url('storefront.html')); await ph3.waitForTimeout(400);
  ok(await ph3.evaluate(() => document.body.dataset.filterLayout === 'offcanvas' && getComputedStyle(document.querySelector('.sf-filters')).display === 'none') && /Filter and sort/.test(await ph3.locator('#sf-open-drawer').innerText()), 'phone: the storefront uses Off-canvas even when the shop chose Vertical ("Filter and sort")');
  await ph3.click('#sf-open-drawer'); await ph3.waitForTimeout(150); await ph3.evaluate(() => { document.querySelector('.sf-drawer__body').scrollTop = 1e5; }); await ph3.waitForTimeout(100);
  ok(await ph3.locator('.sf-drawer__sort').isVisible() && await ph3.locator('.sf-drawer .sf-powered--filter').isVisible(), 'phone: the drawer has the sort options and the badge after the last filter');
  ok(await ph3.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'phone: off-canvas storefront has no horizontal scroll');
  await ph3.close();


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
