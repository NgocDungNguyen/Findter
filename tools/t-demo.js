// Demo bar in the header (Plan / Date / Indexed) -> badge colours of the Findter app status box + banner sizes of the promotion banners
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const BLUE = 'rgb(213, 235, 255)', GREEN = 'rgb(175, 254, 191)', ORANGE = 'rgb(255, 214, 164)';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(500);
  const pick = async (key, val) => { await p.click(`.demo-btn[data-key=${key}][data-val="${val}"]`); await p.waitForTimeout(80); };
  const state = () => p.evaluate(() => {
    const bg = e => getComputedStyle(e).backgroundColor, card = document.querySelector('[data-card=status]');
    const pl = card.querySelector('[data-st=plan] [data-s=s-badge] > div'), dt = card.querySelector('[data-st=date]'), ix = card.querySelector('[data-st=indexed] .st-badge');
    return { plan: pl.textContent.trim(), planBg: bg(pl), label: dt.querySelector('p').textContent.trim(), date: dt.querySelector('.st-badge').textContent.trim(), dateBg: bg(dt.querySelector('.st-badge')), idx: ix.textContent.trim(), idxBg: bg(ix) };
  });
  const bar = await p.evaluate(() => { const h = document.querySelector('.sh-top'), d = document.querySelector('.demo-bar').getBoundingClientRect(), m = document.querySelector('.sh-more').getBoundingClientRect(), t = document.querySelector('.sh-top__title').getBoundingClientRect(); return { fits: d.left >= t.right && d.right <= m.left && h.scrollWidth <= h.clientWidth, buttons: document.querySelectorAll('.demo-btn').length }; });
  ok(bar.fits && bar.buttons === 10, 'demo bar sits in the header between the title and the menu (10 buttons)');
  // ---- Trial
  await pick('plan', 'Trial'); await pick('days', 14); await pick('over', false);
  let s = await state(); console.log('   Trial/14d/normal ->', JSON.stringify(s));
  ok(s.plan === 'Trial' && s.planBg === BLUE, 'Trial: plan badge blue #d5ebff');
  ok(s.label === 'Expires on' && s.dateBg === BLUE, 'Trial 14d: "Expires on", date badge blue #d5ebff');
  ok(s.idx === '1,595 / 50,000' && s.idxBg === GREEN, 'Trial normal: "1,595 / 50,000" green #affebf');
  for (const d of [7, 3, 1]) { await pick('days', d); s = await state(); ok(s.label === 'Expires on' && s.dateBg === ORANGE, `Trial ${d}d left: date badge orange #ffd6a4`); }
  const end = new Date(Date.now() + 864e5).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); ok(s.date === end, `1d left shows tomorrow's date (${s.date})`);
  await pick('days', 14); await pick('over', true); s = await state(); console.log('   Trial/over ->', s.idx, s.idxBg);
  ok(s.idx === '51,240 / 50,000' && s.idxBg === ORANGE, 'Trial over limit: "51,240 / 50,000" orange #ffd6a4');
  // ---- Starter
  await pick('plan', 'Starter'); await pick('over', false); await pick('days', 14); s = await state(); console.log('   Starter/14d/normal ->', JSON.stringify(s));
  ok(s.plan === 'Starter' && s.planBg === GREEN, 'Starter: plan badge green #affebf');
  ok(s.label === 'Renew on' && s.dateBg === GREEN, 'Starter 14d: row says "Renew on", badge green #affebf');
  ok(s.idx === '1,595 / 3,000' && s.idxBg === GREEN, 'Starter normal: "1,595 / 3,000" green #affebf');
  for (const d of [7, 3, 1]) { await pick('days', d); s = await state(); ok(s.label === 'Renew on' && s.dateBg === ORANGE, `Starter ${d}d left: Renew on badge orange #ffd6a4`); }
  await pick('over', true); s = await state(); ok(s.idx === '4,240 / 3,000' && s.idxBg === ORANGE, 'Starter over limit: "4,240 / 3,000" orange #ffd6a4');
  ok(s.planBg === GREEN, 'plan badge stays green while the other options change');
  // ---- Free: green plan badge, limit 300, no date row, not affected by the days-left buttons
  await pick('over', false); await pick('days', 14); await pick('plan', 'Free');
  const free = () => p.evaluate(() => { const card = document.querySelector('[data-card=status]'), row = card.querySelector('[data-st=date]'), pl = card.querySelector('[data-st=plan] [data-s=s-badge] > div'), ix = card.querySelector('[data-st=indexed] .st-badge'); return { plan: pl.textContent.trim(), planBg: getComputedStyle(pl).backgroundColor, dateShown: row.offsetParent !== null, rows: [...card.querySelectorAll('[data-st]')].filter(e => e.offsetParent !== null).map(e => e.querySelector('p').textContent.trim()), idx: ix.textContent.trim(), idxBg: getComputedStyle(ix).backgroundColor }; });
  let f = await free(); console.log('   Free ->', JSON.stringify(f));
  ok(f.plan === 'Free' && f.planBg === GREEN, 'Free: plan badge green #affebf');
  ok(!f.dateShown && !f.rows.some(r => /Expires on|Renew on/.test(r)), 'Free: no Expires on / Renew on row (' + f.rows.join(', ') + ')');
  ok(f.idx === '240 / 300' && f.idxBg === GREEN, 'Free normal: limit 300 -> "240 / 300" green #affebf');
  ok(await p.locator('.demo-btn[data-key=days]').first().isDisabled(), 'Free: the 14d/7d/3d/1d buttons are disabled');
  await p.locator('.demo-btn[data-key=days][data-val="1"]').click({ force: true }); await p.waitForTimeout(80);
  f = await free(); ok(!f.dateShown && f.planBg === GREEN && f.idxBg === GREEN, 'Free: clicking days left changes nothing');
  await pick('over', true); f = await free(); ok(f.idx === '360 / 300' && f.idxBg === ORANGE, 'Free over limit: "360 / 300" orange #ffd6a4');
  await pick('over', false);
  await pick('plan', 'Starter'); s = await state(); ok(s.label === 'Renew on' && s.dateBg === GREEN, 'back to Starter: the date row is back, still on 14d (the 1d click on Free did nothing)');
  await pick('days', 14);
  // ---- Development: blue plan badge, limit 50,000, no date row, not affected by the days-left buttons
  await pick('plan', 'Development'); await pick('over', false);
  f = await free(); console.log('   Development ->', JSON.stringify(f));
  ok(f.plan === 'Development' && f.planBg === BLUE, 'Development: plan badge blue #d5ebff, text "Development"');
  ok(!f.dateShown && !f.rows.some(r => /Expires on|Renew on/.test(r)), 'Development: no Expires on / Renew on row (' + f.rows.join(', ') + ')');
  ok(f.idx === '1,595 / 50,000' && f.idxBg === GREEN, 'Development normal: "1,595 / 50,000" green #affebf');
  ok(await p.locator('.demo-btn[data-key=days]').first().isDisabled(), 'Development: the 14d/7d/3d/1d buttons are disabled');
  await pick('over', true); f = await free(); ok(f.idx === '51,240 / 50,000' && f.idxBg === ORANGE, 'Development over limit: "51,240 / 50,000" orange #ffd6a4');
  await pick('over', false);
  // ---- the limit follows the plan
  await pick('over', false); await pick('plan', 'Trial'); s = await state(); ok(s.idx === '1,595 / 50,000', 'back to Trial: limit back to 50,000');
  // ---- indexing in progress: Products indexed turns orange, then back to its rule colour
  await pick('days', 14); await p.click('[data-card=sync] button.Polaris-Button'); await p.waitForTimeout(300);
  s = await state(); ok(s.idxBg === ORANGE, 'while indexing: Products indexed orange');
  await p.waitForTimeout(8500); s = await state(); ok(s.idxBg === GREEN, 'indexing done: Products indexed back to green #affebf');
  await p.screenshot({ path: 'test/demo-1440.png' });
  // ---- persistence
  await pick('plan', 'Starter'); await pick('days', 3); await p.reload(); await p.waitForTimeout(400);
  s = await state(); ok(s.plan === 'Starter' && s.dateBg === ORANGE, 'choice is remembered after a reload');
  ok(await p.locator('.demo-btn[aria-pressed=true]').count() === 3, 'one pressed button per group (3)');
  // ---- narrower screens: popover
  await p.setViewportSize({ width: 1024, height: 800 }); await p.waitForTimeout(300);
  ok(await p.locator('.demo-toggle').isVisible() && !(await p.locator('.demo-panel').isVisible()), '1024px: "Demo data" button, panel closed');
  await p.click('.demo-toggle'); await p.waitForTimeout(150);
  ok(await p.locator('.demo-panel').isVisible(), 'panel opens'); await p.click('.demo-btn[data-key=plan][data-val=Trial]'); await p.waitForTimeout(100);
  ok((await state()).plan === 'Trial', 'popover buttons work');
  await p.screenshot({ path: 'test/demo-1024.png' });
  await p.mouse.click(700, 600); await p.waitForTimeout(150); ok(!(await p.locator('.demo-panel').isVisible()), 'click outside closes the panel');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  await p.click('.demo-toggle'); await p.waitForTimeout(150);
  const ph = await p.evaluate(() => { const r = document.querySelector('.demo-panel').getBoundingClientRect(); return { fits: r.right <= innerWidth + 1 && r.left >= -1, over: document.documentElement.scrollWidth > innerWidth }; });
  ok(ph.fits && !ph.over, 'phone: panel fits the screen, page does not scroll sideways');
  await p.screenshot({ path: 'test/demo-390.png' });
  // ---- promotion banner sizes (left column 633.33 x 160, phone 370 x 185)
  const IMG = 'https://img.test/banner.svg';   // served by the test browser: a square 800x800 image, so the cover-crop is visible
  await p.route('https://img.test/**', r => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#7aa7ff"/></svg>' }));
  const promo = (id, target) => ({ id, name: id, target, interval: 5, banners: [{ url: IMG, link: '' }] });
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.evaluate(promos => { localStorage.setItem('findter.promos.v2', JSON.stringify(promos)); }, [promo('pl', 'left'), promo('pr', 'right'), promo('pm', 'mobile')]);
  await p.reload(); await p.waitForTimeout(600);
  const size = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; }, sel);
  const L = await size('[data-card="promo:pl"] .pb-slide'); console.log('   left banner', JSON.stringify(L));
  ok(L && Math.abs(L.w - 633.33) < 1 && Math.abs(L.h - 160) < 1, 'desktop left banner = 633.33 x 160');
  await p.setViewportSize({ width: 1200, height: 900 }); await p.waitForTimeout(300);
  const L2 = await size('[data-card="promo:pl"] .pb-slide'); ok(L2 && Math.abs(L2.w / L2.h - 633.33 / 160) < 0.02, 'narrower desktop keeps the same ratio (' + L2.w + ' x ' + L2.h + ')');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
  const M = await size('[data-card="promo:pm"] .pb-slide'); console.log('   mobile banner', JSON.stringify(M));
  ok(M && Math.abs(M.w - 370) < 1 && Math.abs(M.h - 185) < 1, 'phone banner = 370 x 185');
  await p.screenshot({ path: 'test/promo-mobile.png' });
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(400);
  await p.screenshot({ path: 'test/promo-desktop.png' });
  const img = await p.evaluate(() => { const i = document.querySelector('[data-card="promo:pl"] img'); return getComputedStyle(i).objectFit; }); ok(img === 'cover', 'image fills the banner (cover)');
  await p.evaluate(() => localStorage.clear());
  console.log('page errors:', errs.length ? errs.join('|') : 'none'); console.log(fails ? fails + ' FAILED' : 'all passed'); await b.close();
})();
