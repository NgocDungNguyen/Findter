const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const out = n => path.join(__dirname, 'test', n + '.png');
const log = (...a) => console.log(...a);
const svg = (n, h, c) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${h}" viewBox="0 0 1200 ${h}"><rect width="1200" height="${h}" fill="${c}"/><text x="50%" y="50%" fill="#fff" font-family="Arial" font-size="${h / 4}" text-anchor="middle" dominant-baseline="middle">Banner ${n}</text></svg>`;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1200 } });
  await ctx.route('https://img.test/**', r => { const n = +(r.request().url().match(/b(\d)/) || [])[1] || 1; r.fulfill({ contentType: 'image/svg+xml', body: svg(n, [300, 400, 250][n % 3], ['#d4380d', '#096dd9', '#389e0d'][(n - 1) % 3]) }); });
  const errs = []; const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 200))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  await p.goto(url + '#/master/home'); await p.waitForTimeout(900);
  const names = side => p.locator(`.hl-list[data-side=${side}] .hl-name`).allInnerTexts();
  const cards = () => p.evaluate(() => [...document.querySelectorAll('[data-card]')].filter(c => c.offsetParent !== null).map(c => c.dataset.card.replace(/^promo:.*/, 'PROMO')).join(','));
  const addPromo = async (side, name, n) => { await p.locator(`.hl-col--${side} .hl-add`).click(); await p.waitForTimeout(250); await p.fill('#pm-name', name); await p.fill('input[data-f=url][data-i="0"]', `https://img.test/b${n}.svg`); await p.locator('[data-act=pm-save]').click(); await p.waitForTimeout(350); };

  log('1. tabs            :', (await p.locator('.mt-tab').allInnerTexts()).join(' | '));
  log('   Promotion banner tab present:', (await p.locator('.mt-tab', { hasText: 'Promotion banner' }).count()) > 0);
  log('2. sections        :', await p.locator('.hl-col h3').evaluateAll(e => e.map(h => h.firstChild.textContent)), '| add buttons:', await p.locator('.hl-col .hl-add').count(), '(one inside each section:', await p.locator('.hl-col .hl-add').evaluateAll(e => e.map(x => x.dataset.target + '@' + x.closest('.hl-col').dataset.group).join(',')) + ')');
  log('3. default mobile  :', (await names('mobile')).join(' > '));
  await p.screenshot({ path: out('v-01-home-tab') });
  // 4. add under each section
  await p.locator('.hl-col--left .hl-add').click(); await p.waitForTimeout(250);
  log('4. modal           :', await p.locator('#pm-title').innerText(), '| section chip:', await p.locator('#pm-target').innerText(), '| "shown at once" present:', (await p.getByText('shown at once').count()) > 0, '| seg buttons:', await p.locator('.pm-seg').count());
  await p.screenshot({ path: out('v-02-modal-left') });
  await p.locator('.pm__x').click();
  await addPromo('left', 'Left promo', 1); await addPromo('right', 'Right promo', 2); await addPromo('mobile', 'Phone promo', 3);
  log('   left            :', (await names('left')).join(' | '));
  log('   right           :', (await names('right')).join(' | '));
  log('   mobile          :', (await names('mobile')).join(' | '));
  log('   chips on items  :', await p.locator('.hl-list[data-side=mobile] .hl-tag').count(), 'promo in mobile list;', await p.locator('.hl-list[data-side=left] .hl-tag').count(), 'in left;', await p.locator('.hl-list[data-side=right] .hl-tag').count(), 'in right');
  await p.screenshot({ path: out('v-03-home-tab-with-promos') });
  // 5. promos are confined to their group: try dragging the mobile promo into the left column
  const mp = await p.locator('.hl-list[data-side=mobile] .hl-item[data-id^="promo:"]').boundingBox(), lt = await p.locator('.hl-list[data-side=left] .hl-item').first().boundingBox();
  await p.mouse.move(mp.x + 30, mp.y + 20); await p.mouse.down(); await p.mouse.move(mp.x + 40, mp.y + 10, { steps: 3 }); await p.mouse.move(lt.x + 100, lt.y + 5, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(200);
  log('5. mobile promo dragged to left column ->', 'left has', (await names('left')).includes('Phone promo') ? 'IT (BAD)' : 'no phone promo (ok)', '| mobile still has it:', (await names('mobile')).includes('Phone promo'));
  // 6. reorder the mobile list: drag Master to the top
  const ma = await p.locator('.hl-list[data-side=mobile] .hl-item[data-id=master]').boundingBox(), ms = await p.locator('.hl-list[data-side=mobile] .hl-item[data-id=status]').boundingBox();
  await p.mouse.move(ma.x + 30, ma.y + 20); await p.mouse.down(); await p.mouse.move(ma.x + 40, ma.y + 10, { steps: 3 }); await p.mouse.move(ms.x + 100, ms.y + 4, { steps: 14 }); await p.mouse.up(); await p.waitForTimeout(200);
  log('6. mobile list     :', (await names('mobile')).join(' > '), '| desktop lists untouched:', (await names('left')).join(',') === 'Onboarding guide,Recommended apps,Data insight,Master,Left promo');
  await p.locator('[data-act=hl-save]').click(); await p.waitForTimeout(300);
  // 7. desktop homepage: left/right promos visible, phone promo not
  await p.goto(url); await p.waitForTimeout(900);
  log('7. desktop home     :', await cards());
  // 8. phone homepage
  await p.setViewportSize({ width: 390, height: 2600 }); await p.waitForTimeout(900);
  log('8. phone home       :', await cards());
  await p.screenshot({ path: out('v-04-phone-home') });
  // 9. widths at three phone sizes
  for (const w of [360, 390, 430]) {
    await p.setViewportSize({ width: w, height: 2600 }); await p.waitForTimeout(700);
    const m = await p.evaluate(() => { const cw = document.querySelector('.sh-scroll').clientWidth; const rows = [...document.querySelectorAll('[data-card]')].filter(c => c.offsetParent !== null).map(c => { const r = c.getBoundingClientRect(); return { id: c.dataset.card.replace(/^promo:.*/, 'PROMO'), left: Math.round(r.left * 10) / 10, width: Math.round(r.width * 10) / 10, gap: Math.round((cw - r.right) * 10) / 10 }; }); return { cw, vw: innerWidth, rows }; });
    const uniq = k => [...new Set(m.rows.map(r => r[k]))];
    log(`9. ${w}px phone      : scroll width ${m.cw} | lefts ${JSON.stringify(uniq('left'))} widths ${JSON.stringify(uniq('width'))} right gaps ${JSON.stringify(uniq('gap'))} | blocks ${m.rows.length} | all equal & centred = ${uniq('left').length === 1 && uniq('width').length === 1 && uniq('gap').length === 1 && uniq('left')[0] === uniq('gap')[0]}`);
  }
  // 10. persistence across reload (phone order)
  await p.setViewportSize({ width: 390, height: 2600 }); await p.reload(); await p.waitForTimeout(900);
  log('10. after reload    :', await cards());
  // 11. reset to default restores the requested default phone order (+ promos at the end of their section)
  await p.setViewportSize({ width: 1440, height: 1200 }); await p.goto(url + '#/master/home'); await p.waitForTimeout(700);
  await p.locator('[data-act=hl-reset]').click(); log('11. reset (draft)  :', (await names('mobile')).join(' > '));
  await p.locator('[data-act=hl-save]').click();
  // 12. delete all promos from each section
  for (let i = 0; i < 3; i++) { await p.locator('.hl-item[data-id^="promo:"] [data-act=hl-delete]').first().click(); await p.locator('[data-act=dm-delete]').click(); await p.waitForTimeout(250); }
  await p.locator('[data-act=hl-save]').count();
  log('12. after deleting  : left', (await names('left')).length, 'right', (await names('right')).length, 'mobile', (await names('mobile')).join(' > '));
  log('page errors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
