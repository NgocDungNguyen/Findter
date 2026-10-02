const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const out = n => path.join(__dirname, 'test', n + '.png');
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1100 } });
  const errs = []; const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 200))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  await p.goto(url); await p.waitForTimeout(1200);
  const cols = () => p.evaluate(() => {
    const ids = (host) => [...host.children].map(c => (c.matches('[data-card]') ? c : c.querySelector('[data-card]'))).filter(Boolean).map(c => c.dataset.card + (c.hidden ? '(hidden)' : ''));
    const left = document.querySelector('#app > .Polaris-Layout:not([hidden]) .Polaris-Layout .Polaris-Layout, #app .Polaris-Layout .Polaris-Layout'); const right = document.querySelector('.Polaris-Layout__Section--oneThird > .Polaris-BlockStack');
    return 'LEFT=' + ids(left).join(',') + '  RIGHT=' + ids(right).join(',');
  });
  const dragItem = async (fromId, toSelector, where = 'before') => {
    const from = await p.locator(`.hl-col[data-group=desktop] .hl-item[data-id=${fromId}]`).boundingBox(); const to = await p.locator(toSelector).boundingBox();
    await p.mouse.move(from.x + 30, from.y + from.height / 2); await p.mouse.down();
    await p.mouse.move(from.x + 40, from.y + from.height / 2 + 5, { steps: 3 });
    const ty = where === 'before' ? to.y + 4 : where === 'after' ? to.y + to.height - 4 : to.y + to.height / 2;
    await p.mouse.move(to.x + to.width / 2, ty, { steps: 12 }); await p.waitForTimeout(150);
    return async () => { await p.mouse.up(); await p.waitForTimeout(200); };
  };

  log('1. default      ', await cols());
  await p.screenshot({ path: out('m-01-home-with-master-card') });
  // 2. open Master page via the card button
  await p.locator('[data-card=master] [data-act=open-master]').click(); await p.waitForTimeout(500);
  log('2. hash         ', await p.evaluate(() => location.hash), '| app hidden:', await p.locator('#app').isHidden(), '| master visible:', await p.locator('#master-page').isVisible());
  await p.screenshot({ path: out('m-02-master-page') });
  log('   tabs        ', (await p.locator('.mt-tab').allInnerTexts()).join(' | '));
  // 3. Home tab
  await p.locator('.mt-tab', { hasText: 'Home' }).click(); await p.waitForTimeout(400);
  log('3. hash         ', await p.evaluate(() => location.hash));
  await p.screenshot({ path: out('m-03-home-tab') });
  // 4. drag: Master above Data insight (same column)
  let drop = await dragItem('master', '.hl-col[data-group=desktop] .hl-item[data-id=data]', 'before'); await p.screenshot({ path: out('m-04-dragging') }); await drop();
  log('4. draft L     ', await p.locator('.hl-list[data-side=left] .hl-item').evaluateAll(e => e.map(i => i.dataset.id).join(',')), '| save enabled:', await p.locator('[data-act=hl-save]').isEnabled());
  // 5. drag: Help & Support from right column into left column, between guide and rec
  drop = await dragItem('help', '.hl-col[data-group=desktop] .hl-item[data-id=rec]', 'before'); await drop();
  log('5. draft L/R   ', await p.locator('.hl-list[data-side=left] .hl-item').evaluateAll(e => e.map(i => i.dataset.id).join(',')), '/', await p.locator('.hl-list[data-side=right] .hl-item').evaluateAll(e => e.map(i => i.dataset.id).join(',')));
  // 6. drag: Onboarding guide to the end of the right column
  drop = await dragItem('guide', '.hl-list[data-side=right]', 'after'); await drop();
  log('6. draft L/R   ', await p.locator('.hl-list[data-side=left] .hl-item').evaluateAll(e => e.map(i => i.dataset.id).join(',')), '/', await p.locator('.hl-list[data-side=right] .hl-item').evaluateAll(e => e.map(i => i.dataset.id).join(',')));
  await p.screenshot({ path: out('m-05-draft') });
  log('   homepage before save:', await cols());
  // 7. save
  await p.locator('[data-act=hl-save]').click(); await p.waitForTimeout(300);
  log('7. after save   ', await cols(), '| status hidden:', await p.locator('.hl-status').isHidden());
  // 8. back to the homepage
  await p.locator('.sh-appgroup a[aria-current=page]').first().click(); await p.waitForTimeout(500);
  log('8. hash         ', JSON.stringify(await p.evaluate(() => location.hash)), '| app visible:', await p.locator('#app').isVisible());
  await p.screenshot({ path: out('m-06-home-reordered') });
  // 9. persistence
  await p.reload(); await p.waitForTimeout(1000);
  log('9. after reload ', await cols());
  // 10. mobile order for a customised layout
  await p.setViewportSize({ width: 390, height: 2600 }); await p.waitForTimeout(800);
  log('10. mobile order', (await p.locator('[data-card]').evaluateAll(e => e.map(c => c.dataset.card))).join(','));
  await p.setViewportSize({ width: 1440, height: 1100 }); await p.waitForTimeout(600);
  log('    back desktop', await cols());
  // 11. keyboard reorder + reset to default + save
  await p.goto(url + '#/master/home'); await p.waitForTimeout(800);
  await p.locator('.hl-list[data-side=left] .hl-item[data-id=master]').focus(); await p.keyboard.press('Shift+ArrowRight'); await p.waitForTimeout(150);
  log('11. kbd R       ', await p.locator('.hl-list[data-side=right] .hl-item').evaluateAll(e => e.map(i => i.dataset.id).join(',')));
  await p.locator('[data-act=hl-reset]').click(); await p.locator('[data-act=hl-save]').click(); await p.waitForTimeout(300);
  await p.goto(url); await p.waitForTimeout(900);
  log('12. reset+save  ', await cols());
  // 13. dismiss Master card, then reload restores it
  await p.locator('[data-card=master] button[aria-label="Dismiss master"]').click(); await p.waitForTimeout(200);
  log('13. dismissed   ', await cols()); await p.screenshot({ path: out('m-07-dismissed') });
  await p.reload(); await p.waitForTimeout(800); log('    after reload ', await cols());
  // 14. mobile master page
  await p.setViewportSize({ width: 390, height: 844 }); await p.goto(url + '#/master/home'); await p.waitForTimeout(900); await p.screenshot({ path: out('m-08-mobile-home-tab') });
  log('page errors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
