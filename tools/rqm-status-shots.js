// Checks the Findter app status box against the RQM "Update: Findter Block app status" (PMS #877, v3) and captures one
// annotated picture per case into "RQM Images - App status/NN.png" (repo root, not committed).
// Run: ELECTRON_RUN_AS_NODE=1 Code.exe tools/rqm-status-shots.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'), OUT = path.join(root, 'RQM Images - App status');
const home = pathToFileURL(path.join(root, 'index.html')).href;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fmt = (days, lang = 'en') => { const d = new Date(Date.now() + days * 864e5); return new Intl.DateTimeFormat(lang, { month: 'short' }).format(d) + ' ' + d.getDate() + ', ' + d.getFullYear(); };

// mark(): red rounded box + numbered badge around an element, drawn in the page so the screenshot carries it
const MARK = `window.__mark = (el, n) => { if (typeof el === 'string') el = document.querySelector(el); if (!el) return;
  let r = el.getBoundingClientRect(); if (!r.width || !r.height) { const k = [...el.querySelectorAll('*')].map(c => c.getBoundingClientRect()).filter(q => q.width && q.height); const L = Math.min(...k.map(q => q.left)), T = Math.min(...k.map(q => q.top)), Rr = Math.max(...k.map(q => q.right)), B = Math.max(...k.map(q => q.bottom)); r = { left: L, top: T, right: Rr, bottom: B, width: Rr - L, height: B - T }; } const p = 4, d = document.createElement('div'); d.className = 'rqm-mark';
  d.style.cssText = 'position:absolute;z-index:99998;pointer-events:none;border:3px solid #e51c00;border-radius:10px;left:' + (r.left + scrollX - p) + 'px;top:' + (r.top + scrollY - p) + 'px;width:' + (r.width + p * 2) + 'px;height:' + (r.height + p * 2) + 'px';
  document.body.appendChild(d);
  if (n) { const b = document.createElement('div'); b.className = 'rqm-mark'; b.textContent = n; b.style.cssText = 'position:absolute;z-index:99999;pointer-events:none;width:22px;height:22px;border-radius:50%;background:#e51c00;color:#fff;font:700 13px/22px Inter,Arial,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff;left:' + (Math.min(r.right + p - 11, innerWidth - 26) + scrollX) + 'px;top:' + (r.top + scrollY - p - 11) + 'px'; document.body.appendChild(b); } };`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.readdirSync(OUT).filter(f => /^\d+\.png$/.test(f)).forEach(f => fs.unlinkSync(path.join(OUT, f)));
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  let shot = 0; const list = [];
  const open = async (demo, extra) => {
    await p.goto(home); await p.evaluate(d => { localStorage.clear(); localStorage.setItem('findter.demoStatus', JSON.stringify(d)); localStorage.setItem('findter.promotionsDismissed.v1', JSON.stringify(['promo-bfcm'])); }, Object.assign({ plan: 'Trial', sub: 'active', days: 14, over: 'normal', lang: 'en' }, demo));
    await p.reload(); await p.waitForTimeout(600);
    await p.addStyleTag({ content: '.chat-bubble,.chat-panel,.m-fab,#toast{display:none!important}*{transition:none!important;animation:none!important}' });
    await p.evaluate(MARK);
    if (extra) await extra();
  };
  const card = async () => (await p.locator('[data-card=status]').innerText()).replace(/\s+/g, ' ');
  const tone = sel => p.$eval('[data-card=status] ' + sel, e => (e.className.match(/st-tone--(\w+)/) || [])[1] || 'none');
  const banner = () => p.evaluate(() => { const e = document.querySelector('[data-limit-banner]'); return e ? e.dataset.limitBanner : null; });
  // capture: the status card (and the limit / sync banner when `wide`), marks on the given rows
  const capture = async (title, marks, { wide = false, full = false, also = [] } = {}) => {
    await p.evaluate(() => document.querySelectorAll('.rqm-mark').forEach(e => e.remove()));
    for (const [sel, n] of marks) await p.evaluate(([s, k]) => window.__mark(s, k), [sel, n]);
    const name = String(++shot).padStart(2, '0') + '.png', file = path.join(OUT, name);
    if (full) await p.screenshot({ path: file });
    else {
      const box = await p.evaluate(([w, more]) => { const els = [document.querySelector('[data-card=status]'), ...more.map(s => document.querySelector(s))]; if (w) els.push(...document.querySelectorAll('.sy-host:not(:empty)'));
        let a = 1e9, t = 1e9, r = -1e9, bt = -1e9; els.forEach(e => { const q = e.getBoundingClientRect(); a = Math.min(a, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); bt = Math.max(bt, q.bottom); });
        return { x: Math.max(0, a - 18 + scrollX), y: Math.max(0, t - 18 + scrollY), width: r - a + 36, height: bt - t + 36 }; }, [wide, also]);
      await p.screenshot({ path: file, clip: box, fullPage: true });
    }
    list.push(name + '  ' + title); console.log('   shot ' + name + '  ' + title);
  };
  const S = '[data-st=plan] [data-s=s-badge] > div', D = '[data-st=date] .st-badge', I = '[data-st=indexed] .st-badge';
  const R = k => '[data-card=status] [data-st=' + k + ']';

  // 01 whole homepage, Trial (where the box sits)
  await open({}); let t = await card();
  ok(/Plan Trial Expires on/.test(t) && t.includes(fmt(14)) && /Products indexed 1,595 \/ 50,000/.test(t), 'Trial: Plan Trial, Expires on ' + fmt(14) + ', 1,595 / 50,000');
  ok(/Search & filter core Active Search suggestion Active/.test(t), 'App embed + Search suggestion unchanged (BR-18)');
  ok(await tone(S) === 'blue' && await tone(D) === 'blue' && await tone(I) === 'green', 'Trial tones: blue / blue / green');
  await capture('Homepage desktop: vị trí box Findter app status (Trial)', [['[data-card=status]', 1]], { full: true });
  // 02 Trial > 7 days
  await capture('Trial, còn hơn 7 ngày: Trial xanh dương, Expires on xanh dương, Products indexed xanh lá', [[R('plan'), 1], [R('date'), 2], [R('indexed'), 3]]);
  // 03 Trial <= 7 days
  await open({ days: 3 }); ok(await tone(D) === 'orange', 'Trial 3 days left: Expires on orange');
  await capture('Trial, còn 7 ngày trở xuống: Expires on chuyển cam', [[R('date'), 1]]);
  // 04 Trial not started
  await open({ plan: 'Trial not started' }); t = await card();
  ok(/Plan Trial Products indexed 1,595 \/ 50,000/.test(t) && !/Expires on/.test(t), 'Trial not started: Trial, no date row, y = 50,000');
  await capture('Trial chưa bắt đầu / đang tạm dừng: hiện Trial, không có dòng ngày', [[R('plan'), 1], [R('indexed'), 2]]);
  // 05 Advanced trial + Store limit reached
  await open({ over: 'over' }); t = await card();
  ok(/Plan Advanced trial/.test(t) && /52,480 \/ 50,000/.test(t) && await tone(S) === 'orange' && await tone(I) === 'orange', 'Trial over 50,000: Advanced trial (orange), 52,480 / 50,000 orange');
  ok(await banner() === 'reached', 'Advanced trial: "Store limit reached" banner');
  await capture('Advanced trial (trial > 50,000 sản phẩm): badge cam, banner Store limit reached', [[R('plan'), 1], [R('indexed'), 2], ['[data-limit-banner]', 3]], { wide: true });
  // 06 Starter, active
  await open({ plan: 'Starter' }); t = await card();
  ok(/Plan Starter Renew on/.test(t) && /1,595 \/ 3,000/.test(t) && await tone(S) === 'green' && await tone(D) === 'green', 'Starter: Renew on green, 1,595 / 3,000');
  await capture('Plan trả phí: tên plan xanh lá, Renew on xanh lá, y = giới hạn của plan', [[R('plan'), 1], [R('date'), 2], [R('indexed'), 3]]);
  // 07 Starter <= 7 days
  await open({ plan: 'Starter', days: 7 }); ok(await tone(D) === 'orange', 'Starter 7 days left: Renew on orange');
  await capture('Plan trả phí, còn 7 ngày trở xuống: Renew on chuyển cam', [[R('date'), 1]]);
  // 08 cancelled
  await open({ plan: 'Starter', sub: 'cancelled' }); t = await card();
  ok(/Plan Starter Ends on/.test(t) && await tone(D) === 'blue', 'Cancelled: Ends on (blue)');
  await capture('Plan đã cancel: Ends on + ngày cuối kỳ (xanh dương)', [[R('date'), 1]]);
  // 09 downgraded
  await open({ plan: 'Starter', sub: 'downgraded' }); t = await card();
  ok(/Plan Starter Renew on/.test(t) && !/Ends on/.test(t), 'Downgraded: still Renew on (the day the new plan starts)');
  await capture('Plan đã downgrade: giữ plan hiện tại, Renew on = ngày plan mới bắt đầu', [[R('plan'), 1], [R('date'), 2]]);
  // 10 Starter over limit + reminder banner
  await open({ plan: 'Starter', over: 'over' }); t = await card();
  ok(/5,480 \/ 3,000/.test(t) && await tone(I) === 'orange' && await banner() === 'reminder', 'Starter over limit: orange + reminder banner');
  await capture('Plan trả phí vượt giới hạn: Products indexed cam, banner nhắc upgrade', [[R('indexed'), 1], ['[data-limit-banner]', 2]], { wide: true });
  // 11 Enterprise
  await open({ plan: 'Enterprise' }); t = await card();
  ok(/1,595 \/ ∞/.test(t) && await tone(I) === 'green', 'Enterprise: 1,595 / ∞ green');
  await capture('Plan không giới hạn sản phẩm: x / ∞', [[R('indexed'), 1]]);
  // 12 Free
  await open({ plan: 'Free' }); t = await card();
  ok(/Plan Free Products indexed 240 \/ 300/.test(t) && !/Expires on|Renew on/.test(t), 'Free: no date row, 240 / 300');
  await capture('Free: không có dòng ngày, y = 300', [[R('plan'), 1], [R('indexed'), 2]]);
  // 13 Free over limit
  await open({ plan: 'Free', over: 'over' });
  ok(/360 \/ 300/.test(await card()) && await banner() === 'reached', 'Free over 300: orange + Store limit reached');
  await capture('Free (chưa từng trả phí) vượt 300: Products indexed cam, banner Store limit reached', [[R('indexed'), 1], ['[data-limit-banner]', 2]], { wide: true });
  // 14 Paid before over limit: no banner
  await open({ plan: 'Paid before', over: 'over' });
  ok(/Plan Free/.test(await card()) && await banner() === null && await tone(I) === 'orange', 'Paid before over 300: orange, no app-wide banner');
  await capture('Free (từng trả phí, plan đã hết hạn) vượt 300: Products indexed cam, không có banner chung', [[R('indexed'), 1]]);
  // 15 Development
  await open({ plan: 'Development' }); t = await card();
  ok(/Plan Development Products indexed 1,595 \/ 50,000/.test(t) && await tone(S) === 'blue', 'Development: blue, no date row, 50,000');
  await capture('Development store: badge Development xanh dương, không có dòng ngày, y = 50,000', [[R('plan'), 1], [R('indexed'), 2]]);
  // 16 Legacy
  await open({ plan: 'Legacy' }); ok(/Plan Legacy/.test(await card()) && await tone(S) === 'gray', 'Legacy: gray');
  await capture('Legacy: badge xám, không có dòng ngày', [[R('plan'), 1]]);
  // 17 Legacy over limit
  await open({ plan: 'Legacy', over: 'over' }); ok(await banner() === 'over', 'Legacy over limit: "You\'re over your product limit"');
  await capture('Legacy / store cài trước 20/07/2026 vượt giới hạn: banner You\'re over your product limit', [[R('indexed'), 1], ['[data-limit-banner]', 2]], { wide: true });
  // 18 approaching (90%)
  await open({ plan: 'Starter', over: 'near' }); t = await card();
  ok(/2,760 \/ 3,000/.test(t) && await tone(I) === 'green' && await banner() === 'approaching', '90%: still green, "almost at your product limit" banner');
  await capture('Đạt 90% giới hạn: Products indexed vẫn xanh lá, banner You\'re almost at your product limit', [[R('indexed'), 1], ['[data-limit-banner]', 2]], { wide: true });
  // 19 Manual sync running
  await open({});
  await p.locator('[data-card=sync] button.Polaris-Button').click(); await p.waitForTimeout(300);
  ok(await tone(I) === 'orange', 'Manual sync running: Products indexed orange');
  await capture('Đang sync: Products indexed cam dù chưa vượt giới hạn', [[R('indexed'), 1], ['[data-card=sync] .Polaris-Badge', 2]], { wide: true, also: ['[data-card=sync]'] });
  await p.waitForTimeout(8600); ok(await tone(I) === 'green', 'Sync done: Products indexed back to green');
  // 20 French month name
  await open({ lang: 'fr' }); t = await card();
  ok(t.includes(fmt(14, 'fr')), 'French: date ' + fmt(14, 'fr'));
  await capture('Ngôn ngữ tiếng Pháp: tên tháng đổi theo ngôn ngữ, ngày và năm giữ nguyên', [[R('date'), 1]]);
  // 21 Japanese month name
  await open({ lang: 'ja' }); ok((await card()).includes(fmt(14, 'ja')), 'Japanese: date ' + fmt(14, 'ja'));
  await capture('Ngôn ngữ tiếng Nhật: tên tháng đổi theo ngôn ngữ', [[R('date'), 1]]);
  // 22 phone
  await p.setViewportSize({ width: 390, height: 900 }); await open({});
  ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'phone: no horizontal overflow');
  await capture('Mobile: box Findter app status ở đầu trang', [['[data-card=status]', 1]], { full: true });
  // 23 the demo bar itself (how to test)
  await p.setViewportSize({ width: 1440, height: 1000 }); await open({});
  await p.click('.demo-toggle'); await p.waitForTimeout(200);
  await p.evaluate(() => window.__mark('.demo-panel', 1));
  const dbox = await p.evaluate(() => { const r = document.querySelector('.demo-panel').getBoundingClientRect(); return { x: 0, y: 0, width: innerWidth, height: r.bottom + 16 }; });
  const dname = String(++shot).padStart(2, '0') + '.png'; await p.screenshot({ path: path.join(OUT, dname), clip: dbox });
  list.push(dname + '  Thanh Demo data trên demo web: chọn loại store, trạng thái plan, số ngày, số sản phẩm, ngôn ngữ'); console.log('   shot ' + dname);

  fs.writeFileSync(path.join(OUT, 'list.txt'), list.join('\n') + '\n');
  console.log('page errors:', errs.length ? errs.join(' | ') : 'none'); console.log(fails ? fails + ' FAILED' : 'all passed'); await b.close();
})();
