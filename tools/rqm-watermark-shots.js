// Pictures for the RQM "Findter Watermark touchpoint" ("Powered by Findter" badge): Master -> Features (container under Recommended Apps), the Search settings card, the chat, the storefront.
// One annotated picture per case into "RQM Images - Watermark/NN.png" (repo root, not committed); the list is printed at the end.
// Run: node tools/rqm-watermark-shots.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'), OUT = path.join(root, 'RQM Images - Watermark');
const U = f => pathToFileURL(path.join(root, f)).href;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

// red rounded box + numbered badge drawn in the page, so the screenshot carries it
const MARK = `window.__mark = (el, n) => { if (typeof el === 'string') el = document.querySelector(el); if (!el) return false;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const p = 4, d = document.createElement('div'); d.className = 'rqm-mark';
  d.style.cssText = 'position:absolute;z-index:99998;pointer-events:none;border:3px solid #e51c00;border-radius:10px;left:' + (r.left + scrollX - p) + 'px;top:' + (r.top + scrollY - p) + 'px;width:' + (r.width + p * 2) + 'px;height:' + (r.height + p * 2) + 'px';
  document.body.appendChild(d);
  if (n) { const b = document.createElement('div'); b.className = 'rqm-mark'; b.textContent = n; b.style.cssText = 'position:absolute;z-index:99999;pointer-events:none;width:22px;height:22px;border-radius:50%;background:#e51c00;color:#fff;font:700 13px/22px Inter,Arial,sans-serif;text-align:center;left:' + (r.left + scrollX - p - 11) + 'px;top:' + (r.top + scrollY - p - 11) + 'px'; document.body.appendChild(b); }
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
  // clip = a selector (or two) whose box is captured with a margin; no clip = the whole window
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
  const card = '[data-wm-card]', sw = '[data-wm-switch]';
  const band = ['.Polaris-Banner', '[data-wm-card]', '.Polaris-Layout > .Polaris-Layout__Section:last-child'];   // info banner, the new card, the Search field card

  // ---- Master -> Features (taller window so the Recommended Apps + badge containers fit with their bottom edge)
  await p.setViewportSize({ width: 1440, height: 1300 });
  await open('index.html', {}, '#/master/features');
  await p.evaluate(() => document.querySelector('[data-wm-master]').scrollIntoView({ block: 'end' })); await p.waitForTimeout(200);
  await capture('Master > Features: container "Powered by Findter badge" duoi Recommended Apps (mac dinh)', [['[data-wm-master]', 1], ['[data-wm=enabled]', 2], ['[data-wm-types]', 3], ['[data-wm-act=save]', 4]], ['[data-panel=features] .prm-card:nth-of-type(2)', '[data-wm-master]']);
  await p.uncheck('[data-wm=enabled]'); await p.check('[data-wm=enabled]');
  for (const t of ['Subscription', 'Trial', 'Paid before', 'Service', 'Free']) await p.uncheck(`[data-wm-type="${t}"]`);
  await p.evaluate(() => document.querySelector('[data-wm-master]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
  await capture('Master > Features: bat tinh nang nhung khong tick shop type nao (loi, Save bi khoa)', [['[data-wm-err]', 1], ['[data-wm-act=save]', 2]], ['[data-wm-master]']);

  await p.setViewportSize({ width: 1440, height: 1000 });

  // ---- Search settings card, Trial
  await open('search.html', { plan: 'Trial' });
  await capture('Search settings (Trial): card "Remove Powered by Findter badge", cong tac tat', [[card, 1], [sw, 2], ['.wm-label .mf-tip', 3]], band);
  await p.hover('.wm-label .mf-tip'); await p.waitForTimeout(150);
  await capture('Tooltip cua card (hover)', [['.wm-label .mf-tip__bubble', 1]], band);
  await p.mouse.move(5, 5);
  await p.click(sw); await p.waitForTimeout(350);
  await capture('Trial: bat cong tac -> chat mo va tu gui tin nhan cua merchant, chua co cau hoi hay nut nao', [[sw, 1], ['.chat-panel__body', 2]]);
  await p.waitForTimeout(1400);
  await capture('Sau khoang 1 giay: tin tu dong "I have already removed..." hoi them ho tro / feedback, cong tac doi thanh badge Removed', [['.wm-badge', 1], ['.chat-panel__body', 2]]);

  // ---- paid store: same card, removed at once, no chat
  await open('search.html', { plan: 'Starter' });
  await capture('Plan tra phi (Subscription): card truoc khi bam, cong tac tat', [[card, 1], [sw, 2]], band);
  await p.click(sw); await p.waitForTimeout(500);
  await capture('Plan tra phi sau khi bam: cong tac doi thanh Removed ngay, chat khong mo', [['.wm-badge', 1]], band);

  // ---- demo bar
  await p.setViewportSize({ width: 1920, height: 400 });
  await open('search.html', { plan: 'Trial' });
  await capture('Demo data bar: Store, Badge (Shown/Removed), Reset', [['.demo-select[data-key=plan]', 1], ['.demo-group[aria-label=Badge]', 2], ['.demo-reset', 3]], ['.sh-top']);
  await p.setViewportSize({ width: 1440, height: 1000 });

  await open('search.html', { plan: 'Development' });
  await capture('Development store: khong co card (chi con banner va Search field)', [], ['.Polaris-Banner', '.Polaris-Layout > .Polaris-Layout__Section:last-child']);

  // ---- storefront
  const store = async demo => { await p.goto(U('index.html')); await p.evaluate(d => { localStorage.clear(); localStorage.setItem('findter.demoStatus', JSON.stringify(d)); }, demo); await p.goto(U('storefront.html')); await p.waitForTimeout(400); await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' }); await p.evaluate(MARK); };
  await store({ plan: 'Free' });
  await p.click('#sf-open-search'); await p.waitForTimeout(200);
  await capture('Storefront: mo o tim kiem (chua go chu)', []);
  await p.fill('#sf-q', 'cosm'); await p.waitForTimeout(250);
  await capture('Storefront: goi y tim kiem, badge "Powered by Findter" + logo duoi goc phai khung goi y', [['#sf-powered', 1], ['.sf-suggest__box', 2]]);
  await store({ plan: 'Free', wm: 'removed' });
  await p.click('#sf-open-search'); await p.fill('#sf-q', 'cosm'); await p.waitForTimeout(250);
  await capture('Storefront sau khi gan badge (Removed): khong con badge duoi khung goi y', [['.sf-suggest__box', 1]]);

  // ---- mobile
  await p.setViewportSize({ width: 390, height: 860 });
  await open('search.html', { plan: 'Trial' });
  await p.evaluate(() => document.querySelector('[data-wm-card]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
  await capture('Mobile (390px): Search settings, card khong tran ngang', [[card, 1]]);
  await store({ plan: 'Free' });
  await p.click('#sf-open-search'); await p.fill('#sf-q', 'cosm'); await p.waitForTimeout(250);
  await p.evaluate(() => document.querySelector('#sf-powered').scrollIntoView({ block: 'end' })); await p.waitForTimeout(200);
  await capture('Mobile (390px): storefront, badge duoi khung goi y', [['#sf-powered', 1]]);

  fs.writeFileSync(path.join(OUT, 'list.txt'), list.join('\n') + '\n');
  console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'page errors: none'); await b.close();
  console.log(fails || errs.length ? 'CHECK FAILED' : 'done: ' + list.length + ' pictures in ' + OUT); process.exit(fails || errs.length ? 1 : 0);
})();
