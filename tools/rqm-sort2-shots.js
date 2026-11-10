// Pictures for the RQM "Sort By - Phase 2" (Rating, Review, metafield sorts) taken from the demo (sort.html). Files are numbered NN-name.png and written to
// "RQM Images - Sort Phase 2/" (repo root, not committed). Run: node tools/rqm-sort2-shots.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'), OUT = path.join(root, 'RQM Images - Sort Phase 2');
const U = f => pathToFileURL(path.join(root, f)).href;

// red rounded box + numbered badge drawn in the page, so the screenshot carries it
const MARK = `window.__mark = (el, n) => { if (typeof el === 'string') el = document.querySelector(el); if (!el) return false;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const p = 4, d = document.createElement('div'); d.className = 'rqm-mark';
  d.style.cssText = 'position:absolute;z-index:99998;pointer-events:none;border:3px solid #e51c00;border-radius:10px;left:' + (r.left + scrollX - p) + 'px;top:' + (r.top + scrollY - p) + 'px;width:' + (r.width + p * 2) + 'px;height:' + (r.height + p * 2) + 'px';
  document.body.appendChild(d);
  if (n) { const b = document.createElement('div'); b.className = 'rqm-mark'; b.textContent = n; b.style.cssText = 'position:absolute;z-index:99999;pointer-events:none;width:22px;height:22px;border-radius:11px;background:#e51c00;color:#fff;font:700 13px/22px Inter,sans-serif;text-align:center;left:' + (r.left + scrollX - p - 8) + 'px;top:' + (r.top + scrollY - p - 10) + 'px'; document.body.appendChild(b); }
  return true; };`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.readdirSync(OUT).filter(f => /\.png$/.test(f)).forEach(f => fs.unlinkSync(path.join(OUT, f)));
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 2300 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  let n = 0; const list = [];
  const open = async (width = 1440, height = 2300) => {
    await p.setViewportSize({ width, height });
    await p.goto(U('sort.html') + '?reset=1'); await p.waitForSelector('#so-rows');
    await p.addStyleTag({ content: '#toast{display:none!important}.m-fab,.sk,.chat-bubble{display:none!important}.so-savebar{opacity:0!important}*{transition:none!important;animation:none!important}' });
    await p.evaluate(MARK);
  };
  const mark = async marks => { await p.evaluate(() => document.querySelectorAll('.rqm-mark').forEach(e => e.remove())); for (const [sel, k] of marks || []) if (!(await p.evaluate(([s, k2]) => window.__mark(s, k2), [sel, k]))) console.log('FAIL mark', sel); };
  const file = name => path.join(OUT, String(++n).padStart(2, '0') + '-' + name + '.png');
  const done = (f, title) => { list.push(path.basename(f) + '  ' + title); console.log('shot', path.basename(f), ' ', title); };
  const shotModal = async (name, title, marks) => { await mark(marks); const f = file(name); await p.locator('.mf-modal').screenshot({ path: f }); done(f, title); };
  // the table card (+ the banner above when there is one): the Sort page below "Default sort by value"
  const shotTable = async (name, title, marks, { from = 'Rating' } = {}) => {
    await mark(marks); const f = file(name);
    const box = await p.evaluate(() => { const c = [...document.querySelectorAll('.so-card')][1].getBoundingClientRect(); return { x: Math.max(0, c.left - 24), y: c.top + scrollY - 24, w: c.width + 48, h: c.height + 48 }; });
    await p.screenshot({ path: f, fullPage: true, clip: { x: box.x, y: box.y, width: box.w, height: box.h } }); done(f, title);
  };
  const row = k => p.locator(`.table-row[data-key="${k}"]`);
  const sw = k => row(k).locator('[data-act=toggle]');
  const closeModal = () => p.locator('[data-m=cancel]').click();

  // 1 table: Rating + Review rows with the info icon and its tooltip
  await open();
  await row('rating_desc').scrollIntoViewIfNeeded();
  await row('rating_desc').locator('.sort-label-info').hover(); await p.waitForTimeout(150);
  await mark([['.table-row[data-key=rating_desc] .sort-label-info', 1], ['.table-row[data-key=rating_desc] .so-t', 2]]);
  { const f = file('table-rating-review'), r = await row('rating_desc').boundingBox(), r2 = await row('review_desc').boundingBox();
    await p.screenshot({ path: f, fullPage: true, clip: { x: Math.max(0, r.x - 24), y: r.y - 70, width: Math.min(r.width + 48, 1440 - r.x + 24), height: r2.y + r2.height - r.y + 62 } }); done(f, 'Dong Rating + Review trong bang: icon (i) + tooltip, cot Type'); }

  // 2-5 the app window
  await sw('rating_desc').click(); await p.waitForSelector('.mf-modal');
  await shotModal('rating-modal-first-open', 'Bat Rating lan dau: window Edit tu mo, chua chon app, Rating van OFF', [['.so-apps__h', 1], ['.so-apps__grid', 2]]);
  await p.locator('[data-m=ok]').click();
  await shotModal('rating-modal-error', 'Bam Save khi chua chon app: loi inline, window van mo', [['#so-app-error', 1]]);
  await p.locator('.so-app', { hasText: 'Judge.me' }).click();
  await shotModal('rating-modal-judgeme', 'Chon Judge.me: box co vien dam, chi 1 app duoc chon', [['.so-app:has(input[value=judgeme])', 1]]);
  await p.locator('.so-app', { hasText: 'Yotpo' }).click();
  await shotModal('rating-modal-yotpo', 'Doi sang Yotpo: chi 1 app duoc chon tai 1 thoi diem', [['.so-app:has(input[value=yotpo])', 1]]);
  await p.locator('[data-m=ok]').click(); await p.waitForTimeout(150);

  // 6 Review: no window the second time, the app is shared
  await sw('review_desc').click(); await p.waitForTimeout(150);
  await shotTable('table-rating-review-on', 'Rating bat sau khi chon app; Review bat luon khong hien window (dung chung app)', [['.table-row[data-key=rating_desc] [data-act=toggle]', 1], ['.table-row[data-key=review_desc] [data-act=toggle]', 2]]);
  await row('review_desc').locator('[data-act=edit]').click(); await p.waitForSelector('.mf-modal');
  await shotModal('review-modal-shared-app', 'Edit Review: app dang chon (Yotpo) hien san, doi o day thi Rating doi theo', [['.so-app:has(input[value=yotpo])', 1]]);
  await closeModal();

  // 8-9 sync banner after Save
  await p.locator('[data-b=save]').click(); await p.waitForTimeout(900);
  await p.evaluate(() => window.scrollTo(0, 0)); const top = await p.locator('.so-stack').boundingBox();
  await mark([['.mf-banner--warn', 1]]);
  { const f = file('sync-banner-collecting'); await p.screenshot({ path: f, clip: { x: Math.max(0, top.x - 24), y: Math.max(0, top.y - 12), width: top.width + 48, height: 260 } }); done(f, 'Sau Save (doi app): banner vang Collecting data'); }
  await p.waitForTimeout(6200);
  await mark([['.mf-banner--ok', 1]]);
  { const f = file('sync-banner-done'); await p.screenshot({ path: f, clip: { x: Math.max(0, top.x - 24), y: Math.max(0, top.y - 12), width: top.width + 48, height: 260 } }); done(f, 'Collect xong: banner xanh, co nut X'); }
  await p.locator('[data-act=banner-done]').click();


  // Metafield page: the sample number metafields (Decimal, Integer, Rating) the Sort page offers
  { await p.goto(U('metafield.html')); await p.waitForTimeout(900); await p.addStyleTag({ content: '#toast{display:none!important}.m-fab,.sk,.chat-bubble{display:none!important}*{transition:none!important}' });
    await p.evaluate(MARK); const t = p.locator('.fdt-metafield-table'); await t.scrollIntoViewIfNeeded();
    const f = file('metafield-page-samples'); await t.screenshot({ path: f }); done(f, 'Trang Metafield: cac metafield mau kieu so (Decimal, Integer, Rating) da luu, dung cho Sort'); }
  await p.goto(U('sort.html')); await p.waitForSelector('#so-rows'); await p.addStyleTag({ content: '#toast{display:none!important}.m-fab,.sk,.chat-bubble{display:none!important}.so-savebar{opacity:0!important}*{transition:none!important;animation:none!important}' }); await p.evaluate(MARK);

  // Add metafield sort
  await mark([['[data-act=add-mf]', 1]]);
  { const f = file('add-metafield-button'), c = await p.locator('.so-tablehead').boundingBox();
    await p.screenshot({ path: f, clip: { x: Math.max(0, c.x - 24), y: c.y - 24, width: c.width + 48, height: 190 } }); done(f, 'Nut "Add metafield sort" o dong caption phia tren bang'); }
  const addMf = async (id, { desc = true, asc = true, labels = {}, snap } = {}) => {
    await p.locator('[data-act=add-mf]').click(); await p.waitForSelector('.mf-modal'); await p.locator('#so-mf-pick').selectOption(id);
    if (!asc) await p.locator('input[data-dir=asc]').uncheck(); if (!desc) await p.locator('input[data-dir=desc]').uncheck();
    for (const [d, v] of Object.entries(labels)) await p.locator('#so-mf-label-' + d).fill(v);
    if (snap) await shotModal(snap[0], snap[1], [['#so-mf-pick', 1], ['.so-dirs', 2]]);
    await p.locator('[data-m=ok]').click(); await p.waitForTimeout(120);
  };
  await addMf('popularity', { snap: ['add-metafield-modal-integer', 'Add metafield sort: Popularity score (Integer), 2 chieu mac dinh'] });
  await addMf('net_weight', { snap: ['add-metafield-modal-decimal', 'Add metafield sort: Net weight (g) (Decimal), 2 chieu mac dinh'] });
  await addMf('customer_rating', { asc: false, labels: { desc: 'Best customer rated' }, snap: ['add-metafield-modal-rating-one-direction', 'Customer rating (Rating): bo tick "Low to high", chi them 1 dong, label tu dat'] });
  const K = { popDesc: 'metafield_number_integer_custom_popularity_desc', wtAsc: 'metafield_number_decimal_custom_net_weight_asc', crDesc: 'metafield_rating_custom_customer_rating_desc' };
  for (const k of Object.values(K)) await sw(k).click();
  await shotTable('table-metafield-rows', 'Cac dong metafield sort moi o cuoi bang (Integer, Decimal, Rating): bat/tat, kep tha, Edit + Delete', [['.table-row[data-key=' + K.popDesc + ']', 1], ['.table-row[data-key=' + K.wtAsc + ']', 2], ['.table-row[data-key=' + K.crDesc + ']', 3]]);
  await row(K.wtAsc).locator('[data-act=edit]').click(); await p.waitForSelector('.mf-modal');
  await shotModal('edit-metafield-modal', 'Edit dong metafield sort: chi doi Label, ghi ro metafield + kieu', [['.so-note:last-of-type', 1]]);
  await closeModal();
  await row('metafield_number_integer_custom_popularity_asc').locator('[data-act=delete]').click(); await p.waitForSelector('.mf-modal');
  await shotModal('delete-metafield-sort-modal', 'Xoa dong metafield sort: hoi lai truoc khi xoa', []);
  await closeModal();

  // the sample storefront follows the Sort page: every product has the values, so each option gives a real order
  await p.locator('[data-b=save]').click(); await p.waitForTimeout(900);
  const sf = async (label, name, title, note) => {
    await p.goto(U('storefront.html')); await p.waitForSelector('.sf-card'); await p.addStyleTag({ content: '.m-fab,.sk,.chat-bubble,.sf-announce{display:none!important}*{transition:none!important}' });
    await p.locator('#sf-sort').selectOption({ label }); await p.waitForTimeout(200); await p.evaluate(MARK);
    await mark([['#sf-sort', 1], ['.sf-card:first-child .sf-card__sortval', 2]]);
    const r = await p.locator('.sf-results').boundingBox(), c = await p.locator('.sf-card').nth(3).boundingBox();
    const f = file(name); await p.screenshot({ path: f, fullPage: true, clip: { x: r.x - 12, y: r.y - 12, width: r.width + 24, height: c.y + c.height - r.y + 24 } }); done(f, title);
  };
  await sf('Rating', 'storefront-sort-rating', 'Storefront sap xep theo Rating: moi san pham co rating, cao -> thap (dong sao duoi gia la phan demo them de kiem tra)');
  await sf('Review', 'storefront-sort-review', 'Storefront sap xep theo Review: so luong review cao -> thap');
  await sf('Popularity score high to low', 'storefront-sort-integer-metafield', 'Storefront sap xep theo metafield Integer (Popularity score) cao -> thap');
  await sf('Net weight (g) low to high', 'storefront-sort-decimal-metafield', 'Storefront sap xep theo metafield Decimal (Net weight) thap -> cao');
  await sf('Best customer rated', 'storefront-sort-rating-metafield', 'Storefront sap xep theo metafield kieu Rating (Customer rating) cao -> thap, label tu dat');

  // empty: no number metafield saved
  await p.goto(U('sort.html')); await p.waitForSelector('#so-rows');
  await p.evaluate(() => localStorage.setItem('findter.metafields.v1', JSON.stringify([{ id: 'snowboard', applies: ['search'] }])));
  await p.reload(); await p.waitForSelector('#so-rows'); await p.addStyleTag({ content: '#toast{display:none!important}*{transition:none!important}' });
  await p.locator('[data-act=add-mf]').click(); await p.waitForSelector('.mf-modal');
  await shotModal('add-metafield-modal-empty', 'Chua luu metafield kieu so nao: window bao + link sang trang Metafield, nut Add bi khoa', []);
  await p.evaluate(() => { localStorage.removeItem('findter.metafields.v1'); localStorage.removeItem('findter.sortConfig.v1'); localStorage.removeItem('findter.sortSync.v1'); });

  // phone
  await open(390, 900);
  await sw('rating_desc').click(); await p.waitForSelector('.mf-modal'); await p.locator('.so-app', { hasText: 'Judge.me' }).click();
  await shotModal('rating-modal-phone', 'Window Rating tren dien thoai: 2 app xep doc', []);

  // phone: the Add metafield sort window
  await p.locator('[data-m=cancel]').click();
  await p.evaluate(() => localStorage.removeItem('findter.sortConfig.v1')); await open(390, 900);
  await p.locator('[data-act=add-mf]').click(); await p.waitForSelector('.mf-modal');
  await shotModal('add-metafield-modal-phone', 'Window Add metafield sort tren dien thoai: 2 huong + label xep doc', []);
  await p.locator('[data-m=cancel]').click();

  // Delete that would leave a page with no valid option: the reason is inside the window, Delete is off
  await open();
  await p.locator('[data-act=add-mf]').click(); await p.waitForSelector('.mf-modal'); await p.locator('#so-mf-pick').selectOption('popularity'); await p.locator('[data-m=ok]').click();
  const pop = 'metafield_number_integer_custom_popularity_desc'; await sw(pop).click(); for (const k of ['created_at', 'price_low_high', 'price_high_low']) await sw(k).click();
  await row(pop).locator('[data-act=delete]').click(); await p.waitForSelector('.mf-modal');
  await shotModal('delete-metafield-sort-blocked', 'Xoa bi chan (trang chi con 1 option hop le): ly do hien do trong window, nut Delete bi khoa, khong dung toast', [['#so-del-error', 1]]);
  await p.locator('[data-m=cancel]').click();

  fs.writeFileSync(path.join(OUT, 'list.txt'), list.join('\n'));
  console.log(errs.length ? 'ERRORS: ' + errs.join('; ') : 'no page errors'); await b.close();
})().catch(e => { console.error('CRASH', e); process.exit(1); });
