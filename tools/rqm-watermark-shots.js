// Pictures for the RQM "Findter Watermark touchpoint" ("Powered by Findter" badge): Master -> Features (container under Recommended Apps), the Remove row on Filter design, the chat, the storefront (search widget + the filter bar in each layout).
// One annotated picture per case into "RQM Images - Watermark/NN.png" (repo root, not committed); the list is printed at the end.
// Run: node tools/rqm-watermark-shots.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'), OUT = path.join(root, 'RQM Images - Watermark');
const U = f => pathToFileURL(path.join(root, f)).href;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

// red rounded box + numbered badge drawn in the page, so the screenshot carries it
const MARK = `window.__mark = (el, n) => { if (typeof el === 'string') el = document.querySelector(el); if (!el) return false;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const p = 4, d = document.createElement('div'); d.className = 'rqm-mark';
  const h = Math.min(r.height + p * 2, r.bottom <= innerHeight ? innerHeight - (r.top - p) - 3 : 1e9);   // an element that ends at the window bottom (pinned badge): keep its frame inside the shot
  d.style.cssText = 'position:absolute;z-index:2147483000;pointer-events:none;border:3px solid #e51c00;border-radius:10px;left:' + (r.left + scrollX - p) + 'px;top:' + (r.top + scrollY - p) + 'px;width:' + (r.width + p * 2) + 'px;height:' + h + 'px';
  document.body.appendChild(d);
  if (n) { const b = document.createElement('div'); b.className = 'rqm-mark'; b.textContent = n; b.style.cssText = 'position:absolute;z-index:2147483001;pointer-events:none;width:22px;height:22px;border-radius:50%;background:#e51c00;color:#fff;font:700 13px/22px Inter,Arial,sans-serif;text-align:center;left:' + (r.left + scrollX - p - 11) + 'px;top:' + (r.top + scrollY - p - 11) + 'px'; document.body.appendChild(b); }
  return true; };`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.readdirSync(OUT).filter(f => /^\d+\.png$/.test(f)).forEach(f => fs.unlinkSync(path.join(OUT, f)));
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  let shot = 0; const list = [];
  const open = async (file, demo = {}, hash = '') => {
    await p.goto(U('index.html')); await p.evaluate(d => { localStorage.clear(); localStorage.setItem('findter.demoStatus', JSON.stringify(d)); }, demo);
    await p.goto(U(file) + hash); await p.waitForTimeout(600);
    await p.addStyleTag({ content: '#toast{display:none!important}.m-fab,.sk{display:none!important}*{transition:none!important;animation:none!important}' });
    await p.evaluate(MARK);
  };
  // clip = a selector (or several) whose box is captured with a margin; no clip = the whole window
  const capture = async (title, marks, clip) => {
    await p.evaluate(() => document.querySelectorAll('.rqm-mark').forEach(e => e.remove()));
    for (const [sel, n] of marks) ok(await p.evaluate(([s, k]) => window.__mark(s, k), [sel, n]), '   mark ' + n + ' ' + sel);
    const name = String(++shot).padStart(2, '0') + '.png', file = path.join(OUT, name);
    if (!clip) await p.screenshot({ path: file });
    else {
      const box = await p.evaluate(sels => { let a = 1e9, t = 1e9, r = -1e9, bt = -1e9; sels.forEach(s => { const q = document.querySelector(s).getBoundingClientRect(); a = Math.min(a, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); bt = Math.max(bt, q.bottom); });
        return { x: Math.max(0, a - 20), y: Math.max(0, t - 20), width: r - a + 40, height: bt - t + 40 }; }, clip);
      await p.screenshot({ path: file, clip: box });
    }
    list.push(name + '  ' + title); console.log('   shot ' + name + '  ' + title);
  };
  // the Filter layout card of Filter design: tag its heading and "Desktop" so a clip can run from the heading to the start of "Desktop"
  const tagDesign = () => p.evaluate(() => { const h = [...document.querySelectorAll('h2')].find(e => e.textContent.trim() === 'Filter layout'), d = [...document.querySelectorAll('h2')].find(e => e.textContent.trim() === 'Desktop'); if (h) h.classList.add('rqm-h'); if (d) d.classList.add('rqm-d'); });
  const card = '[data-wm-card]', sw = '[data-wm-btn]', band = ['.rqm-h', '.rqm-d'];

  // ---- Master -> Features (taller window so the Recommended Apps + badge containers fit with their bottom edge)
  await p.setViewportSize({ width: 1440, height: 1300 });
  await open('index.html', {}, '#/master/features');
  await p.evaluate(() => document.querySelector('[data-wm-master]').scrollIntoView({ block: 'end' })); await p.waitForTimeout(200);
  await capture('Master > Features: container "Powered by Findter badge" duoi Recommended Apps (mac dinh): chi con muc "Remove or restore for one store", khong con cong tac, danh sach shop type, o link va nut Save', [['[data-wm-master]', 1], ['[data-wm-domain]', 2], ['[data-wm-shop=remove]', 3], ['[data-wm-shop=restore]', 4], ['[data-wm-shop=none]', 5]], ['[data-panel=features] .prm-card:nth-of-type(2)', '[data-wm-master]']);
  await p.fill('[data-wm-domain]', 'abc'); await p.locator('[data-wm-domain]').blur(); await p.waitForTimeout(150);
  await capture('Master > Features: nhap domain sai ("abc"): hien loi sau khi roi o, hai nut Remove badge va Restore badge bi khoa', [['[data-wm-domain]', 1], ['[data-wm-domain-err]', 2], ['[data-wm-shop=remove]', 3]], ['[data-wm-master]']);

  await p.setViewportSize({ width: 1440, height: 1000 });

  // ---- Filter design: the Remove row at the top of the Filter layout card, Trial
  await open('design.html', { plan: 'Trial' }); await tagDesign();
  await capture('Filter design (Trial): dong "Remove Powered by Findter badge" o dau card Filter layout, duoi mo ta, tren muc Desktop', [[card, 1], [sw, 2], ['.wm-label .mf-tip', 3]], band);
  await p.hover('.wm-label .mf-tip'); await p.waitForTimeout(150);
  await capture('Tooltip cua dong (hover)', [['.wm-label .mf-tip__bubble', 1]], band);
  await p.mouse.move(5, 5);
  await p.click(sw); await p.waitForTimeout(350);
  await capture('Trial: bam nut Remove -> chat mo va tu gui tin nhan cua merchant, nut "Removing…", chua co cau hoi hay nut nao', [[sw, 1], ['.chat-panel__body', 2]]);
  await p.waitForTimeout(1400);
  await capture('Sau khoang 1 giay: tin tu dong "The badge is now removed…" hoi them ho tro, nut doi thanh badge Removed', [['.wm-badge', 1], ['.chat-panel__body', 2]]);

  // ---- Free (has the flag): the same row as Trial; Subscription (paying at the release): no flag, no row
  await open('design.html', { plan: 'Free' }); await tagDesign();
  await capture('Store Free (co co): dong truoc khi bam, cung nut Remove nhu Trial', [[card, 1], [sw, 2]], band);
  await open('design.html', { plan: 'Starter' }); await tagDesign(); await p.waitForTimeout(300);
  await capture('Store Subscription (dang tra phi tai ngay release, khong co co): khong co dong go badge, card Filter layout bat dau bang tieu de va mo ta', [], band);

  // ---- demo bar
  await p.setViewportSize({ width: 1920, height: 400 });
  await open('design.html', { plan: 'Trial' });
  await capture('Demo data bar: Store, Badge (Shown/Removed), Reset', [['.demo-select[data-key=plan]', 1], ['.demo-group[aria-label=Badge]', 2], ['.demo-reset', 3]], ['.sh-top']);
  await p.setViewportSize({ width: 1440, height: 1000 });

  await open('design.html', { plan: 'Development' }); await tagDesign();
  await capture('Development store: khong co dong (card Filter layout bat dau bang tieu de va mo ta)', [], band);

  // ---- storefront: the badge under the search widget
  const store = async (demo, file = 'storefront.html', query = '') => { await p.goto(U('index.html')); await p.evaluate(d => { localStorage.clear(); localStorage.setItem('findter.demoStatus', JSON.stringify(d)); }, demo); await p.goto(U(file) + query); await p.waitForTimeout(400); await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' }); await p.evaluate(MARK); };
  await store({ plan: 'Free' });
  await p.click('#sf-open-search'); await p.waitForTimeout(200);
  await capture('Storefront: mo o tim kiem (chua go chu)', []);
  await p.fill('#sf-q', 'cosm'); await p.waitForTimeout(250);
  await capture('Storefront: goi y tim kiem, badge "Powered by Findter" (logo trang) duoi goc phai khung goi y, bam duoc', [['#sf-powered', 1], ['.sf-suggest__box', 2]]);
  await store({ plan: 'Free', wm: 'removed' });
  await p.click('#sf-open-search'); await p.fill('#sf-q', 'cosm'); await p.waitForTimeout(250);
  await capture('Storefront sau khi gan badge (Removed): khong con badge duoi khung goi y', [['.sf-suggest__box', 1]]);

  // ---- phone: Filter design row, then the search layer
  await p.setViewportSize({ width: 390, height: 860 });
  await open('design.html', { plan: 'Trial' });
  await p.evaluate(() => document.querySelector('[data-wm-card]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
  await capture('Mobile (390px): Filter design, dong Remove khong tran ngang', [[card, 1]]);
  await p.setViewportSize({ width: 390, height: 844 });
  await store({ plan: 'Free' });
  await p.click('#sf-open-search'); await p.fill('#sf-q', 'cosm'); await p.waitForTimeout(250);
  await capture('Mobile (390px): storefront, man hinh tim kiem day du nhu app that, badge ghim o day man hinh (dau danh sach)', [['#sf-powered', 1], ['.sf-search__wrap', 2]]);
  const scrolled = await p.evaluate(() => { const bx = document.querySelector('.sf-suggest__box'); bx.scrollTop = bx.scrollHeight; return bx.scrollTop; }); await p.waitForTimeout(200);
  ok(scrolled > 0, '   list scrolls (scrollTop ' + scrolled + ')');
  ok(await p.evaluate(() => Math.round(document.querySelector('#sf-powered').getBoundingClientRect().bottom) === innerHeight), '   badge bottom = window bottom at the end of the list');
  await capture('Mobile (390px): cuoi danh sach, san pham cuoi nam ngay tren badge, badge van o day man hinh', [['#sf-powered', 1]]);

  // ---- storefront: the badge at the end of the filter bar in each layout (search results page = the same template as Collection)
  await p.setViewportSize({ width: 1440, height: 1000 });
  await store({ plan: 'Free' }, 'storefront-search.html', '?q=cosm');
  await p.evaluate(() => document.querySelector('.sf-powered--filter').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
  await capture('Filter bar Vertical: badge duoi option cuoi cung cua sidebar (mot dong, can giua, khong nen rieng)', [['.sf-powered--filter', 1]], ['.sf-filters .sf-group:nth-last-of-type(3)', '.sf-powered--filter']);
  await store({ plan: 'Free' }, 'storefront-search.html', '?q=cosm&layout=horizontal');
  await capture('Filter bar Horizontal: badge o mot hang rieng ngay duoi tat ca dropdown, thang hang voi dropdown dau tien', [['.sf-powered--hbar', 1]], ['.sf-hbar']);
  await store({ plan: 'Free' }, 'storefront-search.html', '?q=cosm&layout=offcanvas');
  await p.click('#sf-open-drawer'); await p.waitForTimeout(250); await p.evaluate(() => { document.querySelector('.sf-drawer__body').scrollTop = 1e5; }); await p.waitForTimeout(150);
  await capture('Filter bar Off-canvas (desktop): drawer cuon toi cuoi, duong ke den giua option cuoi va badge, badge tren nut View items', [['.sf-drawer .sf-powered--filter', 1]]);
  await p.setViewportSize({ width: 390, height: 844 });
  await store({ plan: 'Free' }, 'storefront-search.html', '?q=cosm');
  await p.click('#sf-open-drawer'); await p.waitForTimeout(250); await p.evaluate(() => { document.querySelector('.sf-drawer__body').scrollTop = 1e5; }); await p.waitForTimeout(150);
  await capture('Mobile (390px): filter bar luon Off-canvas ("Filter and sort"), drawer cuon toi cuoi co badge sau option cuoi', [['.sf-drawer .sf-powered--filter', 1]]);

  // ---- Master -> Features: remove or restore for one store (a CSE types the domain of a store that cannot find the Remove row)
  await p.setViewportSize({ width: 1440, height: 1300 });
  await open('index.html', {}, '#/master/features');
  await p.evaluate(() => document.querySelector('[data-wm-shop-box]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
  await p.fill('[data-wm-domain]', 'abc-store.myshopify.com'); await p.waitForTimeout(100);
  await capture('Master > Features: muc "Remove or restore for one store" duoi cac shop type, nhap domain hop le (Shown), chi "Remove badge" sang', [['[data-wm-shop-box]', 1], ['[data-wm-domain]', 2], ['[data-wm-shop=remove]', 3], ['[data-wm-shop=restore]', 4]], ['[data-wm-master]']);
  await p.click('[data-wm-shop=remove]'); await p.waitForTimeout(150);
  await capture('Master > Features: sau khi bam Remove badge: store do Removed, "Restore badge" sang (dung de test hoac bat lai)', [['[data-wm-domain-status]', 1], ['[data-wm-shop=restore]', 2]], ['[data-wm-master]']);
  await p.click('[data-wm-shop=none]'); await p.waitForTimeout(150);
  await capture('Master > Features: sau khi bam Clear badge: store khong co cai dat badge (Not set), "Remove badge" va "Restore badge" bam duoc (dung de tao lai trang thai store da tra phi tai ngay release)', [['[data-wm-domain-status]', 1], ['[data-wm-shop=none]', 2], ['[data-wm-shop=restore]', 3]], ['[data-wm-master]']);
  fs.writeFileSync(path.join(OUT, 'list.txt'), list.join('\n') + '\n');
  console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'page errors: none'); await b.close();
  console.log(fails || errs.length ? 'CHECK FAILED' : 'done: ' + list.length + ' pictures in ' + OUT); process.exit(fails || errs.length ? 1 : 0);
})();
