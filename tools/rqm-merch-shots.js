// Pictures for the RQM "Boost / Demote / Hide" (Merchandising projects, rds_shopify-707), taken from the Findter demo (merchandising.html). Files are numbered
// NN-name.png and written to "RQM Images - Merchandising/" (repo root, not committed); the same folder gets list.txt (number, file, title) for the Images tab.
// Run: node tools/rqm-merch-shots.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'), OUT = path.join(root, 'RQM Images - Merchandising');
const URL0 = pathToFileURL(path.join(root, 'merchandising.html')).href;

// red rounded box + numbered badge drawn in the page, so the screenshot carries it (same look as the earlier RQM pictures)
const MARK = `window.__mark = (el, n) => { if (typeof el === 'string') el = document.querySelector(el); if (!el) return false;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const p = 4, d = document.createElement('div'); d.className = 'rqm-mark';
  d.style.cssText = 'position:fixed;z-index:99998;pointer-events:none;border:3px solid #e51c00;border-radius:10px;left:' + (r.left - p) + 'px;top:' + (r.top - p) + 'px;width:' + (r.width + p * 2) + 'px;height:' + (r.height + p * 2) + 'px';
  document.body.appendChild(d);
  if (n) { const b = document.createElement('div'); b.className = 'rqm-mark'; b.textContent = n; b.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;width:22px;height:22px;border-radius:11px;background:#e51c00;color:#fff;font:700 13px/22px Inter,sans-serif;text-align:center;left:' + (r.left - p - 8) + 'px;top:' + (r.top - p - 10) + 'px'; document.body.appendChild(b); }
  return true; };`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.readdirSync(OUT).filter(f => /\.(png|txt)$/.test(f)).forEach(f => fs.unlinkSync(path.join(OUT, f)));
  let b; try { b = await chromium.launch({ channel: 'msedge' }); } catch (e) { b = await chromium.launch(); }
  const errs = []; const ctx = await b.newContext({ viewport: { width: 1440, height: 2600 }, deviceScaleFactor: 1.5 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  let n = 0; const list = [];
  const fresh = async (hash, w = 1440, h = 2600) => {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(URL0); await p.evaluate(() => localStorage.clear()); await p.goto(URL0 + (hash || '')); await p.waitForSelector('#mc-root .pl-stack');
    await p.addStyleTag({ content: '.m-fab,.sk,.chat-bubble,.sh-side-bar,#sidekick,.sh-sidekick{display:none!important}*{transition:none!important;animation:none!important}' });
    await p.evaluate(MARK); await p.waitForTimeout(150);
  };
  const mark = async marks => { await p.evaluate(() => document.querySelectorAll('.rqm-mark').forEach(e => e.remove())); for (const [sel, k] of marks || []) if (!(await p.evaluate(([s, k2]) => window.__mark(s, k2), [sel, k]))) console.log('FAIL mark', sel); };
  const file = name => path.join(OUT, String(++n).padStart(2, '0') + '-' + name + '.png');
  const done = (f, title) => { list.push(path.basename(f).replace(/\.png$/, '') + '\t' + title); console.log('shot', path.basename(f), ' ', title); };
  // the page content (title .. last card); withBar also takes the Unsaved changes bar above it
  const shotPage = async (name, title, marks, { bar = false, extraBottom = 0 } = {}) => {
    await mark(marks); const f = file(name);
    const box = await p.evaluate(({ bar, extraBottom }) => {
      const r = document.querySelector('#mc-root').getBoundingClientRect(), top = bar ? document.querySelector('.so-savebar').getBoundingClientRect().top : Math.max(0, r.top - 8);
      const main = document.querySelector('.sh-main').getBoundingClientRect();
      return { x: Math.max(0, main.left), y: top, w: main.width, h: r.bottom - top + 24 + extraBottom };
    }, { bar, extraBottom });
    await p.screenshot({ path: f, clip: { x: box.x, y: box.y, width: box.w, height: Math.min(box.h, 2500) } }); done(f, title);
  };
  const shotEl = async (name, title, sel, marks, pad = 16) => {
    await mark(marks); const f = file(name); const bb = await p.locator(sel).first().boundingBox();
    await p.screenshot({ path: f, clip: { x: Math.max(0, bb.x - pad), y: Math.max(0, bb.y - pad), width: bb.width + pad * 2, height: bb.height + pad * 2 } }); done(f, title);
  };
  const click = s => p.click(s);
  const row = id => `.pl-row[data-id="${id}"]`;

  // 1 list: Collection page tab
  await fresh('#collection');
  await shotPage('list-collection', 'Collection page: danh sách project (Manage projects)', [[row(1) + ' .pl-handle', 1], [row(1) + ' .ft-switch-btn', 2], [row(1) + ' .pl-name', 3], [row(1) + ' td:nth-child(4)', 4], [row(2) + ' td:nth-child(6)', 5], [row(2) + ' .ft-switch-btn', 6], [row(1) + ' .pl-actions', 7], ['[data-act=add]', 8]]);
  // 2 list: Search result page tab
  await click('#mc-tab-search'); await p.waitForTimeout(150);
  await shotPage('list-search', 'Search result page: danh sách project', [[row(1) + ' td:nth-child(4)', 1], [row(2) + ' td:nth-child(6)', 2], ['#mc-tab-search', 3]]);
  // 3 empty state
  await fresh('#collection'); await p.evaluate(() => { localStorage.setItem('findter.merch.collection.v3', '[]'); }); await p.goto(URL0 + '#collection'); await p.reload(); await p.waitForSelector('#mc-root .pl-stack'); await p.addStyleTag({ content: '.m-fab,.sk,.chat-bubble{display:none!important}*{transition:none!important}' }); await p.evaluate(MARK);
  await shotPage('empty-state', 'Chưa có project nào: empty state', [['[data-act=add]', 1]]);
  // 4 builder: new (top of the page)
  await fresh('#collection/new');
  await shotPage('builder-new', 'Add a new project: trang builder, một cột (Status, Project details, Rules)', [['.ex-back', 1], ['#mc-title', 2], ['#mc-status', 3], ['#mc-status + .Polaris-ShadowBevel', 4]]);
  // 5 unsaved changes bar
  await p.fill('#mc-name', 'Holiday jewelry push'); await p.waitForTimeout(100);
  await shotPage('save-bar', 'Thanh Unsaved changes (Discard / Save) chỉ hiện sau khi có thay đổi', [['.so-savebar [data-b=discard]', 1], ['.so-savebar [data-b=save]', 2]], { bar: true });
  // 6 where it applies: collection
  await click('[data-act=apply][data-v=specific]'); await p.selectOption('#mc-collection', 'Skin care'); await p.waitForTimeout(100);
  await shotEl('where-collection', 'Where it applies (Collection page): All collections / One collection', '#mc-apply', [['#mc-apply .Polaris-ButtonGroup', 1], ['#mc-collection', 2]], 24);
  // 7 where it applies: search terms
  await fresh('#search/new'); await click('[data-act=apply][data-v=specific]'); await p.fill('#mc-term', 'cream, lotion, Cream'); await click('[data-act=addterm]'); await p.waitForTimeout(100);
  await shotEl('where-search', 'Where it applies (Search result page): Specific terms, Contains / Is exactly, chip, cảnh báo term trùng', '#mc-apply', [['#mc-apply .Polaris-ButtonGroup', 1], ['#mc-match', 2], ['#mc-terms', 3], ['#mc-dup', 4]], 24);
  // 8 rules: tabs + switch (Boost on)
  await fresh('#collection/new'); await click('[data-sw=rule]'); await p.waitForTimeout(100);
  await shotEl('rules-tabs', 'Rules: tab Boost / Demote / Hide theo thứ tự ưu tiên (mặc định Hide > Demote > Boost), badge On / Off, switch bật rule', '#mc-root .pl-stack > .Polaris-ShadowBevel:last-of-type', [['#mc-rtabs', 1], ['.mc-rtab[data-id=hide] .pl-handle', 2], ['#mc-rpanel .pl-box--tint', 3]], 16);
  // 9 rule off
  await click('#mc-rt-demote'); await p.waitForTimeout(100);
  await shotEl('rule-off', 'Rule đang Off: khung nét đứt "Demote is off for this project."', '#mc-root .pl-stack > .Polaris-ShadowBevel:last-of-type', [['#mc-rpanel .pl-box--tint', 1], ['.mc-dash', 2]], 16);
  // 10 pick products
  await click('#mc-rt-boost'); await p.fill('#mc-name', 'Skin care spotlight'); await click('[data-act=apply][data-v=specific]'); await p.selectOption('#mc-collection', 'Skin care'); await p.waitForTimeout(100);
  await p.check('input[data-pid="1"]'); await p.check('input[data-pid="2"]'); await p.waitForTimeout(100);
  await shotEl('pick-products', 'Pick products: tối đa 6, chip, ô tìm, scope theo collection, câu preview', '#mc-root .pl-stack > .Polaris-ShadowBevel:last-of-type', [['[data-act=pmode][data-v=specific]', 1], ['#mc-scope', 2], ['#mc-count', 3], ['#mc-chips', 4], ['#mc-summary', 5]], 16);
  // 11 conflict (same product in Boost and Hide)
  await click('#mc-rt-hide'); await click('[data-sw=rule]'); await p.check('input[data-pid="1"]'); await p.waitForTimeout(100);
  await shotPage('conflict', 'Cùng 1 sản phẩm ở Boost và Hide: banner cảnh báo, rule Hide thắng (đứng trước)', [['.pl-warnbanner', 1], ['.mc-rtab[data-id=boost] .mc-warnic', 2], ['#mc-rtabs', 3]]);
  // 12 attributes
  await fresh('#search/new'); await click('[data-sw=rule]'); await click('[data-act=pmode][data-v=attributes]'); await click('[data-act=gadd]'); await p.waitForTimeout(100);
  await p.selectOption('#mc-root .mc-group:nth-of-type(1) select[data-k=attr]', 'Inventory').catch(() => {}); await p.waitForTimeout(100);
  await shotEl('attributes', 'By attributes: Condition group, điều kiện, Match groups using (All groups / Any group), thứ tự group', '#mc-root .pl-stack > .Polaris-ShadowBevel:last-of-type', [['#mc-rpanel [data-act=rel]', 1], ['.mc-group .pl-handle', 2], ['.mc-group .mc-gname', 3], ['.mc-group [data-act=cadd]', 4], ['[data-act=gadd]', 5]], 16);
  // 13 errors
  await fresh('#collection/new'); await p.selectOption('#mc-market', 'United States'); await click('.so-savebar [data-b=save]'); await p.waitForTimeout(100); await click('[data-sw=rule]'); await click('.so-savebar [data-b=save]'); await p.waitForTimeout(150);
  await shotPage('errors', 'Lỗi hiện ngay dưới field sau khi bấm Save (project name, rule chưa chọn sản phẩm); Save tự nhảy tới tab có lỗi', [['#err-name', 1], ['#mc-name', 2], ['#err-products', 3]]);
  // 14 leave dialog
  await fresh('#collection/new'); await p.fill('#mc-name', 'x'); await click('[data-act=back]'); await p.waitForTimeout(150);
  await shotEl('leave-dialog', 'Back khi có thay đổi chưa lưu: "Unsaved changes" - Cancel / Leave page', '.mf-modal', [], 0);
  // 15 delete dialog
  await fresh('#collection'); await click(row(1) + ' [data-act=delete]'); await p.waitForTimeout(150);
  await shotEl('delete-dialog', 'Delete: "Delete this project?" - Cancel / Delete (nút đỏ)', '.mf-modal', [], 0);
  // 16 saved: stays on the page + toast
  await fresh('#collection/new'); await p.fill('#mc-name', 'Skin care spotlight'); await click('[data-sw=rule]'); await click('[data-act=apply][data-v=specific]'); await p.selectOption('#mc-collection', 'Skin care'); await p.check('input[data-pid="1"]');
  await p.setViewportSize({ width: 1440, height: 1000 }); await click('.so-savebar [data-b=save]'); await p.waitForTimeout(250);
  await mark([['#mc-title', 1], ['#toast', 2]]); { const f = file('saved'); await p.screenshot({ path: f }); done(f, 'Sau khi Save: ở lại trang "Edit project", toast "Project saved", thanh Unsaved changes biến mất'); }
  // 17 phone: list + builder
  await fresh('#collection', 390, 844);
  { await mark([]); const f = file('phone-list'); await p.screenshot({ path: f, fullPage: false }); done(f, 'Điện thoại (390px): danh sách, bảng cuộn ngang trong card'); }
  await fresh('#collection/new', 390, 3200); await click('[data-sw=rule]'); await p.waitForTimeout(100);
  await shotPage('phone-builder', 'Điện thoại (390px): builder một cột, rule tab xếp theo thứ tự ưu tiên', []);
  fs.writeFileSync(path.join(OUT, 'list.txt'), list.join('\n') + '\n');
  console.log(errs.length ? 'PAGE ERRORS: ' + errs.join(' | ') : 'no page errors', '-', n, 'pictures in', OUT);
  await b.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
