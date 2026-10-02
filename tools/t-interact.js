const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const out = n => path.join(__dirname, 'test', n + '.png');
(async () => {
  const b = await chromium.launch();
  const errs = []; const log = (...a) => console.log(...a);
  const mk = async (w, h) => { const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 160))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 160))); await p.goto(url); await p.waitForTimeout(1500); return p; };
  const step = async (name, fn) => { try { await fn(); } catch (e) { log('FAIL', name, e.message.split('\n')[0]); } };

  /* ---- desktop ---- */
  let p = await mk(1440, 1500);
  await step('guide', async () => { await p.locator('[data-card=guide] .title-collapsible').first().click(); await p.waitForTimeout(800); await p.screenshot({ path: out('i-01-guide-open') }); log('guide open h=', await p.locator('#Onboarding\\ guide').evaluate(e => e.getBoundingClientRect().height)); });
  await step('inner', async () => { await p.locator('[data-card=guide] .grid-guide').nth(1).click(); await p.waitForTimeout(800); await p.screenshot({ path: out('i-02-inner-collapsed') }); await p.locator('[data-card=guide] .grid-guide').nth(1).click(); await p.waitForTimeout(700); });
  await step('guide-close', async () => { await p.locator('[data-card=guide] .title-collapsible').first().click(); await p.waitForTimeout(800); });
  await step('carousel', async () => { const t = () => p.locator('.recommend-app-carousel').evaluate(e => e.style.transform); const a = await t(); await p.locator('button[aria-label="Next app"]').click(); await p.waitForTimeout(600); const b2 = await t(); await p.locator('button[aria-label="Previous app"]').click(); await p.locator('button[aria-label="Previous app"]').click(); await p.waitForTimeout(600); log('carousel', a, '->', b2, '-> wrap', await t()); });
  await step('datepicker', async () => { await p.locator('.date-picker-activator button').click(); await p.waitForTimeout(500); await p.screenshot({ path: out('i-03-datepicker') }); await p.getByRole('button', { name: 'Last 7 days' }).click(); await p.waitForTimeout(300); await p.screenshot({ path: out('i-04-datepicker-7d') }); await p.getByRole('button', { name: 'Apply' }).click(); await p.waitForTimeout(300); log('activator label:', await p.locator('.date-picker-activator button').innerText()); });
  await step('tooltip', async () => { await p.locator('[data-card=data] .ft-card-header-underline').first().hover(); await p.waitForTimeout(400); await p.screenshot({ path: out('i-05-tooltip') }); await p.mouse.move(5, 5); });
  await step('menus', async () => {
    await p.locator('.sh-more').click(); await p.waitForTimeout(300); await p.screenshot({ path: out('i-06-more') }); await p.keyboard.press('Escape');
    await p.locator('.sh-account').click(); await p.waitForTimeout(300); await p.screenshot({ path: out('i-07-account') }); await p.keyboard.press('Escape');
    await p.locator('.sh-bottom .js-bell').click(); await p.waitForTimeout(300); await p.screenshot({ path: out('i-08-alerts') }); await p.keyboard.press('Escape');
    await p.locator('.js-skplus').click(); await p.waitForTimeout(300); await p.screenshot({ path: out('i-09-skmenu') }); await p.keyboard.press('Escape');
  });
  await step('search', async () => { await p.keyboard.press('Control+k'); await p.waitForTimeout(400); await p.screenshot({ path: out('i-10-search') }); await p.keyboard.press('Escape'); });
  await step('dismiss', async () => { await p.locator('[data-card=rec] button[aria-label="Dismiss recommended apps"]').click(); await p.locator('[data-card=guide] button[aria-label="Close"]').click(); await p.waitForTimeout(300); await p.screenshot({ path: out('i-11-dismissed') }); });
  await step('reload-restores', async () => { await p.reload(); await p.waitForTimeout(1200); log('after reload, cards visible:', await p.locator('[data-card]:visible').count()); });
  await step('collapse', async () => { await p.locator('.sh-collapse').click(); await p.waitForTimeout(500); await p.screenshot({ path: out('i-12-collapsed') }); });
  await p.close();

  /* ---- modal ---- */
  p = await mk(1440, 900);
  await step('modal', async () => { await p.evaluate(() => { location.hash = '#select-theme'; }); await p.waitForTimeout(500); await p.screenshot({ path: out('i-13-modal') }); await p.selectOption('#modal-select-theme select', { index: 1 }); log('next enabled:', await p.locator('#modal-select-theme [data-act=next]').isEnabled()); });
  await p.close();

  /* ---- mid widths ---- */
  p = await mk(800, 900); await step('800', async () => { await p.screenshot({ path: out('i-14-w800') }); }); await p.close();
  p = await mk(1000, 900); await step('1000', async () => { await p.screenshot({ path: out('i-15-w1000') }); }); await p.close();

  /* ---- mobile ---- */
  p = await mk(390, 844);
  await step('mobile', async () => { await p.screenshot({ path: out('i-20-mobile') }); await p.screenshot({ path: out('i-21-mobile-full'), fullPage: false }); await p.locator('.m-fab--menu').click(); await p.waitForTimeout(700); await p.screenshot({ path: out('i-22-mobile-menu') }); });
  await p.close();
  p = await mk(390, 2600); await step('mobile-full', async () => { await p.screenshot({ path: out('i-23-mobile-tall') }); log('mobile order:', (await p.locator('[data-card]').evaluateAll(els => els.map(e => e.dataset.card))).join(',')); });
  await p.close();
  log('page errors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
