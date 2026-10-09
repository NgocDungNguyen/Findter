// Master -> Promotion (the only place a promotion is created) + the homepage Promotion block + its place in Master -> Home
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const svg = (w, h, c, t) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${c}"/><text x="50%" y="50%" font-size="48" text-anchor="middle" fill="#222">${t}</text></svg>`;
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route('**/BFCM_Promotion*', r => { const m = /Mobile/.test(r.request().url()); r.fulfill({ contentType: 'image/svg+xml', body: m ? svg(740, 370, '#ffd9c2', 'BFCM mobile') : svg(1266, 320, '#ffd9c2', 'BFCM desktop') }); });
  await ctx.route('https://img.test/**', r => r.fulfill({ contentType: 'image/svg+xml', body: svg(900, 300, '#cfe3ff', 'wide 3:1') }));
  await ctx.addInitScript(() => { window.__copies = []; window.__opened = []; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copies.push(t); } }, configurable: true }); const o = window.open; window.open = (u, ...rest) => { window.__opened.push(u); return null; }; });
  let popups = 0; ctx.on('page', () => { popups++; });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/ERR_|Failed to load/.test(m.text()) && errs.push(m.text()));
  const goHome = async () => { await p.goto(url + '#/'); await p.waitForTimeout(500); };
  const plan = async name => { await p.click(`.demo-btn[data-key=plan][data-val="${name}"]`); await p.waitForTimeout(150); };
  const promoVisible = () => p.locator('[data-card=promotion]').isVisible().catch(() => false);
  const recVisible = async () => (await p.locator('[data-card=rec] .Polaris-Box').first().isVisible());
  const box = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: +r.width.toFixed(2), h: +r.height.toFixed(2), top: r.top, left: r.left }; }, sel);
  const copies = () => p.evaluate(() => window.__copies.slice());

  // ---------------------------------------------------------------- seed + Master list
  await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.goto(url + '#/master/promotion'); await p.waitForTimeout(500);
  const tabs = await p.locator('.mt-tab').allInnerTexts(); ok(tabs[tabs.length - 1] === 'Promotion', 'Master has a "Promotion" tab (last): ' + tabs.join(' | '));
  ok((await p.locator('.prm-head h2').innerText()) === 'Homepage promotions', 'list title "Homepage promotions"');
  const rows = await p.locator('.prm-row').count(); ok(rows === 1, 'one seeded promotion (the official BFCM banner)');
  const r0 = (await p.locator('.prm-row').first().innerText()).replace(/\s+/g, ' '); console.log('   row:', r0);
  ok(/BFCM/.test(r0) && /promo-bfcm/.test(r0) && /Development store/.test(r0) && /Trial/.test(r0) && /Free/.test(r0) && /Dec 3, 2026, 11:59 PM/.test(r0) && /Live/.test(r0), 'row shows name, SKU, shop types, deadline and Live');
  const seedUrls = await p.evaluate(() => JSON.parse(localStorage.getItem('findter.promotions.v1') || 'null'));
  ok(seedUrls === null, 'nothing is stored until the admin saves (defaults are used)');
  ok(await p.locator('.prm-row .prm-thumb img').first().getAttribute('src') === 'https://cdn.shopify.com/s/files/1/0765/0302/3847/files/BFCM_Promotion_Banner_Homepage_-_Desktop.png?v=1791510617', 'thumbnail = the official desktop banner URL');
  ok(await p.locator('[data-prm=edit]').first().isVisible() && await p.locator('[data-prm=delete]').first().isVisible(), 'edit and delete icons are visible');
  ok(await p.locator('[data-prm=save-order]').isDisabled(), 'Save priority is disabled until the order changes');
  await p.screenshot({ path: 'test/prm-list.png' });

  // ---------------------------------------------------------------- Master -> Home: no "Add promotion banner"; the Promotion block is movable
  await p.goto(url + '#/master/home'); await p.waitForTimeout(500);
  ok(await p.locator('.hl-add').count() === 0 && await p.locator('#promo-modal').count() === 0 && !(await p.locator('#hl').innerText()).includes('Add promotion banner'), 'Master -> Home has no "Add promotion banner" button or modal');
  const side = s => p.locator('.hl-list[data-side=' + s + '] .hl-item').evaluateAll(els => els.map(e => e.dataset.id).join());
  ok(await side('left') === 'guide,data,promotion,rec,master' && await side('mobile') === 'status,sync,guide,help,data,promotion,rec,master' && await side('right') === 'status,help,sync', 'a "Promotion" block is listed in the Left column and the Mobile phone order (not in the right column)');
  ok((await p.locator('.hl-item[data-id=promotion]').first().innerText()).includes('Created in the Promotion tab') && await p.locator('[data-act=hl-manage]').count() === 2, 'the block says it is created in the Promotion tab and has a Manage button');
  await p.locator('.hl-list[data-side=left] [data-act=hl-manage]').click(); await p.waitForTimeout(300); ok(p.url().endsWith('#/master/promotion'), 'Manage opens the Promotion tab');
  await p.goto(url + '#/master/home'); await p.waitForTimeout(400);
  const promoItem = p.locator('.hl-list[data-side=left] .hl-item[data-id=promotion]');
  await promoItem.focus(); await p.keyboard.press('Shift+ArrowRight'); await p.waitForTimeout(150);
  ok(await side('left') === 'guide,data,promotion,rec,master' && await side('right') === 'status,help,sync', 'Shift+ArrowRight does NOT move the Promotion block into the right column');
  { const a = await promoItem.boundingBox(), r = await p.locator('.hl-list[data-side=right]').boundingBox(); await p.mouse.move(a.x + 40, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(r.x + r.width / 2, r.y + 20, { steps: 8 }); await p.mouse.move(r.x + r.width / 2, r.y + r.height - 10, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(250); }
  ok(await side('right') === 'status,help,sync' && (await side('left')).includes('promotion'), 'dragging it over the right column is refused');
  if (await p.locator('[data-act=hl-discard]').isEnabled()) await p.click('[data-act=hl-discard]');            // the refused drag may still have re-ordered the left column
  await p.locator('.hl-list[data-side=left] .hl-item[data-id=promotion]').focus(); await p.keyboard.press('Shift+ArrowUp'); await p.waitForTimeout(150);
  ok(await side('left') === 'guide,promotion,data,rec,master' && await p.locator('[data-act=hl-save]').isEnabled(), 'Shift+ArrowUp moves it up in the left column (a draft until Save)');
  await goHome(); ok((await p.evaluate(() => [...document.querySelectorAll('#app .Polaris-Layout:not(.mobile-layout) [data-card]')].filter(c => c.offsetParent !== null).map(c => c.dataset.card).slice(0, 4).join())) === 'guide,data,promotion,rec', 'the homepage keeps the old position until Save');
  await p.goto(url + '#/master/home'); await p.waitForTimeout(400);
  ok(await side('left') === 'guide,promotion,data,rec,master', 'the draft is still there after visiting the homepage (hash navigation)'); await p.click('[data-act=hl-save]'); await p.waitForTimeout(300);
  await goHome(); ok((await p.evaluate(() => [...document.querySelectorAll('#app .Polaris-Layout:not(.mobile-layout) [data-card]')].filter(c => c.offsetParent !== null).map(c => c.dataset.card).slice(0, 4).join())) === 'guide,promotion,data,rec', 'after Save the Promotion block sits where the admin put it');
  await p.goto(url + '#/master/home'); await p.click('[data-act=hl-reset]'); await p.click('[data-act=hl-save]'); await p.waitForTimeout(300);

  // ---------------------------------------------------------------- homepage, Trial shop
  await goHome();
  ok(await promoVisible() && await recVisible(), 'Trial shop: the Promotion block shows and Recommended apps stays where it was');
  const order = await p.evaluate(() => [...document.querySelectorAll('#app .Polaris-Layout:not(.mobile-layout) [data-card]')].filter(c => c.offsetParent !== null).map(c => c.dataset.card).join(','));
  ok(order === 'guide,data,promotion,rec,master,status,help,sync', 'desktop order: guide, data insight, promotion, recommended apps, master | status, help, sync  (' + order + ')');
  const sz = await box('.pr-media'); ok(sz && Math.abs(sz.w - 633.33) < 1 && Math.abs(sz.h - 160) < 1, 'desktop banner 633.33 x 160 (' + sz.w + ' x ' + sz.h + ')');
  ok(await p.locator('.pr-foot').count() === 0 && await p.locator('.pr-hit').count() === 1, 'the banner itself is the link; there is no button under it');
  ok(await p.locator('.pr-ctl [data-pr=prev]').count() === 0, 'a single promotion has no arrows');
  ok(await p.locator('.pr-img').getAttribute('alt') === 'BFCM', 'name is the banner alt text');
  await p.screenshot({ path: 'test/prm-home.png' });

  // ---------------------------------------------------------------- targeting by shop type
  for (const [name, shown] of [['Starter', false], ['Free', true], ['Development', true], ['Paid before', false], ['Service', false], ['Trial', true]]) {
    await plan(name); ok((await promoVisible()) === shown && (await recVisible()), `plan "${name}" (${name === 'Starter' ? 'Subscription' : name === 'Development' ? 'Development store' : name}): promotion ${shown ? 'shown' : 'hidden'}, Recommended apps always shown`);
  }

  // ---------------------------------------------------------------- banner click with a promo code + an in-app shortcut
  const tabs0 = popups; await p.evaluate(() => { navigator.clipboard.writeText = async t => { sessionStorage.setItem('__copied', t); }; });
  await p.click('.pr-hit'); await p.waitForURL(/pricing\.html/).catch(() => {}); await p.waitForTimeout(400);
  ok(p.url().includes('pricing.html') && popups === tabs0, '"/pricing" opens pricing.html in the same tab (no new tab)');
  ok(await p.evaluate(() => sessionStorage.getItem('__copied')) === 'BFCM2025', 'banner click: the code is copied');
  ok(await p.locator('.cn-pill.is-on').innerText().then(t => t === 'Code: BFCM2025 copied successfully'), 'notice on the landing page: "Code: BFCM2025 copied successfully"');
  const nt = await box('.cn-pill'); ok(nt && nt.top >= 54 && nt.top < 90, 'the notice sits right under the header');
  await goHome();

  // ---------------------------------------------------------------- add promotions in Master (the three other modes + validation)
  const addPromo = async (cfg) => {
    await p.goto(url + '#/master/promotion/new'); await p.waitForTimeout(300);
    await p.fill('#pr-name', cfg.name); await p.fill('#pr-sku', cfg.sku); await p.fill('#pr-deadline', '2026-12-31T23:59');
    await p.fill('#pr-desktop', cfg.desktop || 'https://img.test/d.svg'); await p.fill('#pr-mobile', cfg.mobile || 'https://img.test/m.svg');
    for (const t of cfg.types || ['Trial']) await p.check(`[data-type="${t}"]`);
    if (cfg.link !== undefined) await p.fill('#pr-link', cfg.link); if (cfg.code !== undefined) await p.fill('#pr-code', cfg.code);
    await p.waitForTimeout(450);
  };
  // form basics
  await p.goto(url + '#/master/promotion/new'); await p.waitForTimeout(300);
  ok(await p.locator('.prm-titlebar h1').innerText() === 'Add promotion' && await p.locator('[data-prm=save]').isDisabled(), 'Add promotion page: Save disabled while empty');
  ok(await p.locator('.prm-hint', { hasText: '1266 × 320 px (shown at 633 × 160)' }).count() === 1 && await p.locator('.prm-hint', { hasText: '740 × 370 px (shown at 370 × 185)' }).count() === 1, 'image size hints match the spec');
  ok(await p.locator('[data-field=link] .prm-label').innerText() === 'Link' && await p.locator('[data-field=code] .prm-label').innerText() === 'Promo code (optional)' && await p.locator('[data-f=action]').count() === 0 && !(await p.locator('body').innerText()).includes('Copy a promo code'), 'only the open-a-link action is left: "Link" required, "Promo code (optional)", no action choice');
  await p.fill('#pr-name', 'x'); await p.fill('#pr-sku', 'Bad SKU'); await p.fill('#pr-link', 'not a link'); await p.click('#pr-desktop'); await p.fill('#pr-desktop', 'nope'); await p.click('#pr-mobile'); await p.click('#pr-name'); await p.waitForTimeout(200);
  const errTxt = (await p.locator('.prm-err').allInnerTexts()).filter(Boolean).join(' | '); console.log('   errors:', errTxt);
  ok(/lowercase/i.test(errTxt) && /https:\/\//.test(errTxt), 'invalid SKU / link / image show inline errors');
  await p.fill('#pr-sku', 'promo-bfcm'); await p.click('#pr-name'); await p.waitForTimeout(150);
  ok((await p.locator('[data-field=sku] .prm-err').innerText()) === 'This SKU is already used', 'duplicate SKU is rejected');
  ok(await p.locator('[data-prm=save]').isDisabled(), 'Save stays disabled while there are errors');
  await p.click('[data-prm=upload]'); ok(await p.locator('#toast').innerText().then(t => /Upload is not part/.test(t)), 'Upload button explains it is not in this copy');
  await p.click('[data-prm=cancel]'); ok(p.url().endsWith('#/master/promotion'), 'Cancel goes back to the list');

  await addPromo({ name: 'Link only', sku: 'promo-link', link: 'https://example.com/offer' });
  ok(await p.locator('[data-prm=save]').isEnabled(), 'valid form -> Save enabled'); await p.click('[data-prm=save]'); await p.waitForTimeout(300);
  await addPromo({ name: 'Link and code', sku: 'promo-linkcode', link: 'https://example.com/code', code: 'SAVE10' }); await p.click('[data-prm=save]'); await p.waitForTimeout(300);
  await addPromo({ name: 'Second', sku: 'promo-second', link: 'https://example.com/second', code: 'ONLYCODE' }); await p.click('[data-prm=save]'); await p.waitForTimeout(300);
  ok(await p.locator('.prm-row').count() === 4, 'three promotions added (4 in the list)');
  const needLink = await (async () => { await p.goto(url + '#/master/promotion/new'); await p.waitForTimeout(250); await p.fill('#pr-name', 'n'); await p.fill('#pr-sku', 'promo-x'); await p.fill('#pr-desktop', 'https://img.test/d.svg'); await p.fill('#pr-mobile', 'https://img.test/m.svg'); await p.check('[data-type="Trial"]'); await p.waitForTimeout(300); return p.locator('[data-prm=save]').isDisabled(); })();
  ok(needLink, 'Open a link without a link -> cannot save');
  await p.fill('#pr-link', 'https://example.com/x'); await p.waitForTimeout(200); ok(await p.locator('[data-prm=save]').isEnabled(), 'a link without a promo code can be saved (the code is optional)');

  // ---------------------------------------------------------------- each mode on the homepage (one at a time)
  const only = async sku => {                       // keep just one live promotion for Trial by closing the others
    await p.goto(url + '#/master/promotion'); await p.waitForTimeout(300);
    await p.evaluate(s => { const all = JSON.parse(localStorage.getItem('findter.promotions.v1')); localStorage.setItem('findter.promotionsDismissed.v1', JSON.stringify(all.map(x => x.sku).filter(k => k !== s))); }, sku);
    await goHome();
  };
  // link only: whole banner is the link, no footer, no code
  await only('promo-link');
  ok(await p.locator('.pr-hit').getAttribute('href') === 'https://example.com/offer' && await p.locator('.pr-hit').getAttribute('target') === '_blank' && (await p.locator('.pr-hit').getAttribute('rel')).includes('noopener'), 'Open a link: the banner is a link that opens in a new tab');
  ok(await p.locator('.pr-foot').count() === 0, 'Open a link without a code: nothing under the banner');
  const before = popups; await p.click('.pr-hit'); await p.waitForTimeout(400);
  ok(popups === before + 1 && (await copies()).filter(c => c !== 'BFCM2025').length === 0 && await p.locator('.cn-pill.is-on').count() === 0, 'clicking it opens the tab, copies nothing, shows no code note');
  // link + code: copy, then go, note on the page
  await only('promo-linkcode');
  ok(await p.locator('.pr-foot').count() === 0, 'Open a link + code: still no button under the banner');
  await p.evaluate(() => { window.__opened.length = 0; window.__copies.length = 0; }); await p.click('.pr-hit'); await p.waitForTimeout(400);
  ok((await copies()).join() === 'SAVE10' && (await p.evaluate(() => window.__opened.join())) === 'https://example.com/code', 'clicking the banner copies SAVE10 and opens the link');
  ok(await p.locator('.cn-pill.is-on').innerText().then(t => /Code: SAVE10 copied successfully/.test(t)), 'and shows "Code: SAVE10 copied successfully"');
  await p.evaluate(() => localStorage.removeItem('findter.promotionsDismissed.v1'));

  // ---------------------------------------------------------------- carousel with mixed actions: the height must not jump
  await p.goto(url + '#/master/promotion'); await p.evaluate(() => localStorage.setItem('findter.promotionsDismissed.v1', JSON.stringify(['promo-linkcode', 'promo-second']))); await goHome();
  const slides = await p.locator('.pr-slide').count(); ok(slides === 2, 'two live promotions -> two slides');
  ok(await p.locator('.pr-ctl [data-pr=prev]').isVisible() && await p.locator('.pr-ctl [data-pr=next]').isVisible() && await p.locator('.pb-dot').count() === 2, 'arrows and dots appear');
  const measure = () => p.evaluate(() => ({ viewport: document.querySelector('.pr-viewport').getBoundingClientRect().height, slides: [...document.querySelectorAll('.pr-slide')].map(s => +s.getBoundingClientRect().height.toFixed(1)), card: document.querySelector('[data-card=promotion]').getBoundingClientRect().height, idx: [...document.querySelectorAll('.pr-slide')].findIndex(s => !s.hasAttribute('inert')) }));
  const m0 = await measure(); await p.click('[data-pr=next]'); await p.waitForTimeout(500); const m1 = await measure(); await p.click('[data-pr=next]'); await p.waitForTimeout(500); const m2 = await measure(); await p.click('[data-pr=prev]'); await p.waitForTimeout(500); const m3 = await measure();
  console.log('   heights', JSON.stringify([m0, m1, m2, m3].map(m => [m.viewport, m.card, m.idx])));
  ok(m0.slides[0] === m0.slides[1], 'both slides have the same height even though only one has the code row (' + m0.slides.join(' / ') + ')');
  ok(m0.viewport === m1.viewport && m1.viewport === m2.viewport && m2.viewport === m3.viewport && m0.card === m1.card && m1.card === m2.card && m2.card === m3.card, 'clicking the arrows never changes the block height (' + [m0, m1, m2, m3].map(m => m.card).join(' → ') + ')');
  ok(m0.idx === 0 && m1.idx === 1 && m2.idx === 0 && m3.idx === 1, 'arrows move between slides and wrap around');
  ok((await p.locator('.pr-slide[inert]').count()) === 1 && (await p.locator('.pr-slide[aria-hidden=true]').count()) === 1, 'the hidden slide is not reachable by keyboard / screen readers');
  const linkFirst = await p.locator('.pr-slide:not([inert])').getAttribute('data-sku'); console.log('   showing', linkFirst);
  await p.screenshot({ path: 'test/prm-carousel.png' });

  // ---------------------------------------------------------------- priority: drag / keyboard + Save priority
  await p.goto(url + '#/master/promotion'); await p.waitForTimeout(300);
  const names = () => p.locator('.prm-row').evaluateAll(els => els.map(e => e.dataset.sku).join());
  ok(await names() === 'promo-bfcm,promo-link,promo-linkcode,promo-second', 'list order = priority order');
  await p.locator('.prm-row[data-sku=promo-link]').focus(); await p.keyboard.press('Shift+ArrowUp'); await p.waitForTimeout(150);
  ok(await names() === 'promo-link,promo-bfcm,promo-linkcode,promo-second' && await p.locator('[data-prm=save-order]').isEnabled(), 'Shift+ArrowUp moves a row up and enables Save priority');
  await goHome(); ok((await p.locator('.pr-slide').first().getAttribute('data-sku')) === 'promo-bfcm', 'the homepage keeps the old order until Save priority');
  await p.goto(url + '#/master/promotion'); await p.waitForTimeout(300);
  await p.locator('.prm-row[data-sku=promo-second]').dragTo(p.locator('.prm-row[data-sku=promo-bfcm]'), { targetPosition: { x: 200, y: 5 } }); await p.waitForTimeout(250);
  const afterDrag = await names(); console.log('   after drag:', afterDrag); ok(afterDrag.split(',')[0] === 'promo-second', 'dragging a row to the top works');
  await p.locator('.prm-row[data-sku=promo-link]').focus(); // keep it deterministic for the save check below
  await p.click('[data-prm=save-order]'); await p.waitForTimeout(250);
  ok(await p.locator('[data-prm=save-order]').isDisabled(), 'Save priority saves and disables itself');
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('findter.promotions.v1')).map(x => x.sku).join()); ok(saved === afterDrag, 'the new order is stored (' + saved + ')');
  await p.evaluate(() => localStorage.removeItem('findter.promotionsDismissed.v1')); await goHome();
  ok((await p.locator('.pr-slide').first().getAttribute('data-sku')) === afterDrag.split(',')[0], 'after Save priority the topmost promotion is shown first');

  // ---------------------------------------------------------------- close (X): permanent, per promotion; Reset brings them back
  const n0 = await p.locator('.pr-slide').count();
  await p.click('.pr-ctl [data-pr=close]'); await p.waitForTimeout(250);
  ok(await p.locator('.pr-slide').count() === n0 - 1, 'X closes the promotion that is showing and the next one remains');
  await p.reload(); await p.waitForTimeout(500); ok(await p.locator('.pr-slide').count() === n0 - 1, 'it stays closed after a reload');
  while (await p.locator('.pr-ctl [data-pr=close]').count()) { await p.click('.pr-ctl [data-pr=close]'); await p.waitForTimeout(150); }
  ok(!(await promoVisible()) && await recVisible(), 'when every promotion is closed the Promotion block is gone (no empty gap) and Recommended apps is untouched');
  await p.goto(url + '#/master/promotion'); await p.click('[data-prm=reset-dismissed]'); await goHome(); ok(await promoVisible(), '"Reset closed banners" brings them back');

  // ---------------------------------------------------------------- edit: SKU locked, Enabled / deadline control the status
  await p.goto(url + '#/master/promotion/edit/promo-bfcm'); await p.waitForTimeout(400);
  ok(await p.locator('.prm-titlebar h1').innerText() === 'Edit promotion' && await p.locator('#pr-sku').isDisabled() && (await p.locator('#pr-sku').inputValue()) === 'promo-bfcm', 'Edit promotion: SKU is locked');
  ok(await p.locator('[data-prm=save]').isDisabled(), 'Save is disabled until something changes');
  ok(await p.locator('[data-type="Trial"]').isChecked() && !(await p.locator('[data-type="Subscription"]').isChecked()) && (await p.locator('#pr-link').inputValue()) === '/pricing' && (await p.locator('#pr-code').inputValue()) === 'BFCM2025', 'form is filled from the promotion (types, action, link /pricing, code BFCM2025)');
  await p.screenshot({ path: 'test/prm-edit.png', fullPage: true });
  await p.uncheck('[data-f=enabled]'); await p.waitForTimeout(150); ok(await p.locator('[data-prm=save]').isEnabled(), 'changing Enabled enables Save');
  await p.click('[data-prm=save]'); await p.waitForTimeout(300);
  ok((await p.locator('.prm-row[data-sku=promo-bfcm] .prm-badge').innerText()) === 'Disabled', 'disabled promotion -> status "Disabled"');
  await p.evaluate(() => localStorage.setItem('findter.promotionsDismissed.v1', JSON.stringify(['promo-link', 'promo-linkcode', 'promo-second']))); await goHome(); ok(!(await promoVisible()), 'a disabled promotion is not shown');
  await p.goto(url + '#/master/promotion/edit/promo-bfcm'); await p.check('[data-f=enabled]'); await p.fill('#pr-deadline', '2020-01-01T00:00'); await p.waitForTimeout(150); await p.click('[data-prm=save]'); await p.waitForTimeout(300);
  ok((await p.locator('.prm-row[data-sku=promo-bfcm] .prm-badge').innerText()) === 'Expired', 'past deadline -> status "Expired"');
  await goHome(); ok(!(await promoVisible()), 'an expired promotion is not shown');
  await p.goto(url + '#/master/promotion/edit/promo-bfcm'); await p.fill('#pr-deadline', '2026-12-03T23:59'); await p.click('[data-prm=save]'); await p.waitForTimeout(300);

  // ---------------------------------------------------------------- delete
  await p.locator('.prm-row[data-sku=promo-second] [data-prm=delete]').click(); await p.waitForTimeout(200);
  ok(await p.locator('#dm-title').innerText() === 'Delete promotion?', 'delete asks for confirmation');
  await p.click('[data-act=dm-cancel]'); ok(await p.locator('.prm-row[data-sku=promo-second]').count() === 1, 'Cancel keeps it');
  await p.locator('.prm-row[data-sku=promo-second] [data-prm=delete]').click(); await p.click('[data-act=dm-delete]'); await p.waitForTimeout(200);
  ok(await p.locator('.prm-row[data-sku=promo-second]').count() === 0, 'Delete removes it');

  // ---------------------------------------------------------------- instant: delete everything, then create one promotion
  await p.goto(url + '#/master/promotion'); await p.waitForTimeout(300);
  while (await p.locator('[data-prm=delete]').count()) { await p.locator('[data-prm=delete]').first().click(); await p.click('[data-act=dm-delete]'); await p.waitForTimeout(200); }
  await p.goto(url + '#/master/home'); await p.waitForTimeout(400);
  ok(await side('left') === 'guide,data,rec,master' && await side('mobile') === 'status,sync,guide,help,data,rec,master', 'no promotion left -> the Promotion block is gone from the Home lists');
  await goHome(); ok(await p.locator('[data-card=promotion]').count() === 1 && !(await promoVisible()), 'and nothing is left on the homepage');
  await addPromo({ name: 'Brand new', sku: 'promo-new', link: 'https://example.com/new', types: ['Trial', 'Free'] }); await p.click('[data-prm=save]'); await p.waitForTimeout(300);
  await goHome(); ok(await promoVisible(), 'a promotion is on the homepage right after it is created (no Save anywhere else)');
  ok((await p.evaluate(() => [...document.querySelectorAll('#app .Polaris-Layout:not(.mobile-layout) [data-card]')].filter(c => c.offsetParent !== null).map(c => c.dataset.card).slice(0, 4).join())) === 'guide,data,promotion,rec', 'the new block lands between Data insight and Recommended apps');
  await p.goto(url + '#/master/home'); await p.waitForTimeout(400);
  ok(await side('left') === 'guide,data,promotion,rec,master' && await side('mobile') === 'status,sync,guide,help,data,promotion,rec,master', 'and the Promotion block shows up in the Left column and in the Mobile phone order at once');

  // ---------------------------------------------------------------- phone
  await p.evaluate(() => localStorage.removeItem('findter.promotionsDismissed.v1'));
  await p.setViewportSize({ width: 390, height: 844 }); await goHome(); await p.waitForTimeout(400);
  ok(await promoVisible(), 'phone: promotion shown');
  const mb = await box('.pr-media'); ok(mb && Math.abs(mb.w - 370) < 1 && Math.abs(mb.h - 185) < 1, 'phone banner 370 x 185 (' + mb.w + ' x ' + mb.h + ')');
  const imgSrc = await p.locator('.pr-slide.pr-slide >> nth=0').locator('.pr-img').getAttribute('src'); console.log('   phone image:', imgSrc.slice(-40));
  const mOrder = await p.evaluate(() => [...document.querySelectorAll('.mobile-layout [data-card]')].filter(c => c.offsetParent !== null).map(c => c.dataset.card).join(','));
  ok(mOrder === 'status,sync,guide,help,data,promotion,rec,master', 'phone order: status, sync, guide, help, data insight, promotion, recommended apps, master (' + mOrder + ')');
  await p.screenshot({ path: 'test/prm-mobile.png' });
  await p.goto(url + '#/master/promotion'); await p.waitForTimeout(400);
  ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'phone: the Promotion tab does not scroll the page sideways');
  await p.evaluate(() => localStorage.clear());
  console.log('page errors:', errs.length ? errs.join(' | ') : 'none'); console.log(fails ? fails + ' FAILED' : 'all passed'); await b.close();
})();
