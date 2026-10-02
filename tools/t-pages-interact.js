const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'); const U = f => pathToFileURL(path.join(root, f)).href;
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1100 } });
  const errs = []; const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 160))); p.on('console', m => m.type() === 'error' && !/ERR_|404/.test(m.text()) && errs.push(m.text().slice(0, 160)));
  const where = () => p.evaluate(() => location.pathname.split('/').pop() + ' | active: ' + [...document.querySelectorAll('.sh-appgroup a[aria-current=page], .sh-appgroup a.sh-item--parent')].map(a => a.textContent.trim() + (a.getAttribute('aria-current') ? '*' : '')).join(', '));
  const toast = async () => (await p.locator('#toast.show').count()) ? p.locator('#toast').innerText() : '(none)';

  /* sidebar navigation between real pages */
  await p.goto(U('index.html')); await p.waitForTimeout(800);
  log('home           :', await where());
  await p.locator('.sh-item--sub', { hasText: /^Filter$/ }).click(); await p.waitForTimeout(700); log('-> Filter       :', await where());
  await p.locator('.sh-item--sub', { hasText: /^Search$/ }).click(); await p.waitForTimeout(700); log('-> Search       :', await where());
  await p.locator('.sh-item--sub', { hasText: /^Metafield$/ }).click(); await p.waitForTimeout(700); log('-> Metafield    :', await where());
  await p.locator('.sh-appgroup .sh-item--parent').click(); await p.waitForTimeout(800); log('-> app item     :', await where());
  await p.locator('.sh-item--sub', { hasText: /^Year Make Model$/ }).click(); await p.waitForTimeout(300); log('other sub item  :', await toast());

  /* Filter page */
  await p.goto(U('filter.html')); await p.waitForTimeout(800);
  const sw = p.locator('.ft-switch-btn:not(.disabled) .slider-toggle').first(); const before = await sw.getAttribute('class');
  await p.locator('.ft-switch-btn:not(.disabled)').first().click(); log('Filter  toggle   :', before, '->', await sw.getAttribute('class'));
  log('Filter  disabled toggle stays:', await p.locator('.ft-switch-btn.disabled .slider-toggle').first().getAttribute('class'));
  await p.locator('button', { hasText: 'Add filter set' }).click(); log('Filter  add      :', await toast());
  await p.locator('button[aria-label="Edit"]').first().click(); await p.waitForTimeout(100); log('Filter  edit     :', await toast());
  await p.locator('.Polaris-Tabs__Tab', { hasText: 'Collection booster' }).click(); await p.waitForTimeout(100); log('Filter  tab      :', await toast());

  /* Search page */
  await p.goto(U('search.html')); await p.waitForTimeout(800);
  const saveDisabled = () => p.locator('button.Polaris-Button--variantPrimary', { hasText: 'Save' }).evaluate(b => b.classList.contains('Polaris-Button--disabled'));
  log('Search  save disabled initially:', await saveDisabled());
  await p.locator('.ft-checkbox').nth(1).uncheck(); log('Search  after unticking SKU: save disabled =', await saveDisabled(), '| ticked boxes:', await p.locator('.ft-checkbox:checked').count());
  await p.locator('button.Polaris-Button--variantPrimary', { hasText: 'Save' }).click(); await p.waitForTimeout(100); log('Search  save click:', await toast(), '| disabled again =', await saveDisabled());
  await p.locator('[aria-controls="adv-search-title"]').click(); await p.waitForTimeout(100); log('Search  row chevron:', await toast());

  /* Metafield page */
  await p.goto(U('metafield.html')); await p.waitForTimeout(800);
  await p.fill('input[placeholder="Search for metafield"]', 'color'); log('Metafield search typed:', await p.inputValue('input[placeholder="Search for metafield"]'), '| footer:', await p.locator('.Polaris-DataTable__Footer').innerText());

  /* phone: drawer shows the real links; condensed table arrows work */
  await p.goto(U('filter.html')); await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(900);
  const nav0 = await p.evaluate(() => { const r = document.querySelector('.Polaris-DataTable__ScrollContainer'); return { sl: r.scrollLeft, cond: document.querySelector('.Polaris-DataTable--condensed') !== null, pips: document.querySelectorAll('.Polaris-DataTable__Pip').length, vis: document.querySelectorAll('.Polaris-DataTable__Pip--visible').length }; });
  await p.locator('.Polaris-DataTable__Navigation button').nth(1).click(); await p.waitForTimeout(700);
  const nav1 = await p.evaluate(() => ({ sl: Math.round(document.querySelector('.Polaris-DataTable__ScrollContainer').scrollLeft), vis: document.querySelectorAll('.Polaris-DataTable__Pip--visible').length, rightDisabled: document.querySelectorAll('.Polaris-DataTable__Navigation button')[1].classList.contains('Polaris-Button--disabled') }));
  log('Phone   table condensed:', JSON.stringify(nav0), '-> after right arrow', JSON.stringify(nav1));
  await p.locator('.m-fab--menu').click(); await p.waitForTimeout(700);
  log('Phone   drawer active sub item:', await p.locator('.sh-item--sub[aria-current=page]').innerText(), '| Search link href:', await p.locator('.sh-item--sub', { hasText: /^Search$/ }).getAttribute('href'));
  await p.screenshot({ path: path.join(__dirname, 'test', 'pg-drawer.png') });
  await p.locator('.sh-item--sub', { hasText: /^Search$/ }).click(); await p.waitForTimeout(700); log('Phone   drawer -> Search:', await where());
  /* collapsed rail on a page */
  await p.setViewportSize({ width: 790, height: 800 }); await p.waitForTimeout(700); await p.screenshot({ path: path.join(__dirname, 'test', 'pg-rail.png') });
  log('page errors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
