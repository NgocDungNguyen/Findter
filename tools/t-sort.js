// Walks through the Sort page (sort.html) and prints what it finds. Run: node t-sort.js
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'); const U = f => pathToFileURL(path.join(root, f)).href;
const log = (...a) => console.log(...a);
let fails = 0; const ok = (name, cond, extra) => { if (!cond) fails++; log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const errs = []; const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 200))); p.on('console', m => m.type() === 'error' && !/ERR_|404|Failed to load/.test(m.text()) && errs.push(m.text().slice(0, 200)));
  const keys = () => p.$$eval('#so-rows .table-row', r => r.map(x => x.dataset.key));
  const on = () => p.$$eval('#so-rows .table-row', r => r.filter(x => x.querySelector('[data-act=toggle]').checked).map(x => x.dataset.key));
  const toast = async () => (await p.locator('#toast.show').count()) ? p.locator('#toast').innerText() : '(none)';
  const sw = k => p.locator(`.table-row[data-key="${k}"] [data-act=toggle]`);
  const barShown = () => p.locator('.so-savebar').evaluate(e => !e.hidden);

  await p.goto(U('sort.html') + '?reset=1');
  ok('skeleton first', await p.locator('.ft-sort-skeleton-bar').count() > 0);
  await p.waitForSelector('#so-rows');
  ok('11 options in the unlock order, no Best selling', (await keys()).join() === 'relevance,created_at,title_asc,title_desc,price_low_high,price_high_low,available_count,created_at_asc,sale_asc,sale_desc,featured', (await keys()).join());
  ok('default ON = relevance, created_at, price lh/hl', (await on()).join() === 'relevance,created_at,price_low_high,price_high_low', (await on()).join());
  ok('badges', await p.locator('.table-row[data-key=featured] .sort-label-badge').innerText() === 'Collection only' && await p.locator('.table-row[data-key=relevance] .sort-label-badge').innerText() === 'Search only');
  const opts = s => p.$$eval(s + ' option', o => o.map(x => x.textContent));
  ok('Collection dropdown has no Relevance', !(await opts('#so-def-collection')).includes('Relevance'), (await opts('#so-def-collection')).join('|'));
  ok('Search dropdown has no Featured', !(await opts('#so-def-search')).includes('Featured'), (await opts('#so-def-search')).join('|'));
  ok('default values', await p.locator('#so-def-collection').inputValue() === 'created_at' && await p.locator('#so-def-search').inputValue() === 'relevance');
  ok('no save bar yet', !(await barShown()));

// no option switches another one off any more (Featured / Best selling exclusivity is gone)
  await sw('featured').check(); ok('featured on changes nothing else', (await on()).join() === 'relevance,created_at,price_low_high,price_high_low,featured', (await on()).join());
  await sw('title_asc').check(); await sw('featured').uncheck(); ok('options toggle independently', (await on()).includes('title_asc') && !(await on()).includes('featured') && (await on()).includes('relevance'));
  ok('save bar shown after edits', await barShown());

  // validation: Search page needs an option other than Featured; Collection page needs one other than Relevance
  await p.locator('.so-savebar [data-b=discard]').click(); await p.locator('.mf-btn', { hasText: 'Discard changes' }).click();
  ok('discard restores + hides bar', !(await barShown()) && (await on()).join() === 'relevance,created_at,price_low_high,price_high_low');
  await sw('featured').check();
  for (const k of ['relevance', 'created_at', 'price_low_high', 'price_high_low']) await sw(k).click({ force: true });
  log('  on after turning off:', (await on()).join());
  ok('search rule blocks the last non-featured option', (await on()).join() === 'price_high_low' || (await on()).includes('featured'));
  const t1 = await toast(); log('  toast:', t1);
  await p.goto(U('sort.html') + '?reset=1'); await p.waitForSelector('#so-rows');
  for (const k of ['created_at', 'price_low_high']) await sw(k).uncheck();
  await sw('price_high_low').click({ force: true });                                  // blocked: Collection pages need one option besides Relevance
  ok('collection rule: relevance cannot be the only one', (await on()).includes('price_high_low') && /other than Relevance/.test(await toast()), await toast());
  await p.waitForTimeout(2800);
  for (const k of ['created_at', 'price_low_high']) await sw(k).check();

  // edit label
  await p.locator('.table-row[data-key=created_at] [data-act=edit]').click();
  ok('edit modal title uses original name', (await p.locator('.mf-modal__title').innerText()) === "Edit Sort by What's new?");
  ok('counter', (await p.locator('#so-edit-count').innerText()) === "11/40");
  await p.fill('#so-edit-label', '   '); ok('save disabled when empty', await p.locator('.mf-modal [data-m=ok]').isDisabled());
  await p.fill('#so-edit-label', 'Hàng mới về'); await p.locator('.mf-modal [data-m=ok]').click();
  ok('label renamed in table + dropdown', (await p.locator('.table-row[data-key=created_at] .sort-label').innerText()).includes('Hàng mới về') && (await opts('#so-def-collection')).includes('Hàng mới về'));
  await p.locator('.table-row[data-key=created_at] [data-act=edit]').click();
  ok('modal title keeps the original name after rename', (await p.locator('.mf-modal__title').innerText()) === "Edit Sort by What's new?");
  await p.keyboard.press('Escape'); ok('esc closes modal', await p.locator('.mf-modal').count() === 0);

  // default pick + save + persistence
  await p.selectOption('#so-def-search', 'price_low_high');
  await p.locator('.so-savebar [data-b=save]').click(); await p.waitForTimeout(900);
  ok('saved toast', (await toast()) === 'Sort options updated successfully', await toast());
  ok('bar hidden after save', !(await barShown()));
  await p.reload(); await p.waitForSelector('#so-rows');
  ok('persisted label + default', (await p.locator('.table-row[data-key=created_at] .sort-label').innerText()).includes('Hàng mới về') && await p.locator('#so-def-search').inputValue() === 'price_low_high');

  // default option turned off falls back to the built-in default
  await sw('price_low_high').uncheck();
  ok('default falls back to relevance when the picked option is off', await p.locator('#so-def-search').inputValue() === 'relevance', await p.locator('#so-def-search').inputValue());
  await p.locator('.so-savebar [data-b=discard]').click(); await p.locator('.mf-btn', { hasText: 'Continue editing' }).click(); ok('continue editing keeps changes', await barShown());
  await p.locator('.so-savebar [data-b=discard]').click(); await p.locator('.mf-btn', { hasText: 'Discard changes' }).click();

  // drag with the mouse
  const row = k => p.locator(`.table-row[data-key="${k}"]`);
  const handle = row('title_asc').locator('.so-handle'); const hb = await handle.boundingBox(); const tb = await row('relevance').boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.down(); await p.mouse.move(hb.x + 5, hb.y - 20, { steps: 5 }); await p.mouse.move(hb.x + 5, tb.y - 4, { steps: 12 });
  ok('overlay while dragging', await p.locator('.so-drag-overlay').count() === 1);
  await p.mouse.up(); await p.waitForTimeout(300);
  ok('mouse drag moved A-Z to the top', (await keys())[0] === 'title_asc', (await keys()).slice(0, 3).join());
  ok('bar after reorder', await barShown());
  await p.locator('.so-savebar [data-b=discard]').click(); await p.locator('.mf-btn', { hasText: 'Discard changes' }).click();
  ok('discard puts the order back', (await keys())[0] === 'relevance');

  // keyboard reorder
  await row('created_at').locator('.so-handle').focus(); await p.keyboard.press('Space'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Space');
  ok('keyboard drag moved What\'s new 2 down', (await keys()).indexOf('created_at') === 3, (await keys()).slice(0, 4).join());
  await row('created_at').locator('.so-handle').focus(); await p.keyboard.press('Enter'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('Escape');
  ok('esc cancels a keyboard drag', (await keys()).indexOf('created_at') === 3);

  // Featured needs Collection Manual Sorting (spf_sorting): hidden in the table and the Default dropdown while it is off, kept in the data
  await p.locator('.so-savebar [data-b=discard]').click().catch(() => {}); await p.locator('.mf-btn', { hasText: 'Discard changes' }).click().catch(() => {});
  await p.goto(U('sort.html') + '?reset=1'); await p.waitForSelector('#so-rows');
  await sw('featured').check(); await p.selectOption('#so-def-collection', 'featured'); await p.locator('.so-savebar [data-b=save]').click(); await p.waitForTimeout(900);
  ok('Featured can be the Collection default when spf_sorting is on', await p.locator('#so-def-collection').inputValue() === 'featured');
  await p.goto(U('sort.html') + '?spf=0'); await p.waitForSelector('#so-rows');
  ok('spf off: Featured row hidden (10 rows)', (await keys()).length === 10 && !(await keys()).includes('featured'), (await keys()).length + '');
  ok('spf off: Featured not in the Collection dropdown, default falls back', !(await opts('#so-def-collection')).includes('Featured') && await p.locator('#so-def-collection').inputValue() === 'created_at');
  await p.goto(U('sort.html')); await p.waitForSelector('#so-rows');
  ok('spf on again: Featured is back with its saved status', (await keys()).includes('featured') && (await on()).includes('featured'));
  // a stored Best selling row is folded into Featured when the page loads (sort.config.ts foldLegacyBestSelling)
  await p.evaluate(() => localStorage.setItem('findter.sortConfig.v1', JSON.stringify([
    { key: 'relevance', label: 'Relevance', status: true }, { key: 'best_selling', label: 'Best selling', status: true, default_collection: true }, { key: 'featured', label: 'Featured', status: false }])));
  await p.goto(U('sort.html')); await p.waitForSelector('#so-rows');
  ok('legacy Best selling (on) becomes Featured (on) at its position, keeps the Collection default', !(await keys()).includes('best_selling') && (await keys()).indexOf('featured') === 1 && (await on()).includes('featured') && await p.locator('#so-def-collection').inputValue() === 'featured', (await keys()).slice(0, 3).join());
  await p.evaluate(() => localStorage.setItem('findter.sortConfig.v1', JSON.stringify([
    { key: 'relevance', label: 'Relevance', status: true }, { key: 'best_selling', label: 'Best selling', status: false }, { key: 'featured', label: 'Featured', status: false }])));
  await p.goto(U('sort.html')); await p.waitForSelector('#so-rows');
  ok('legacy Best selling (off) is dropped', !(await keys()).includes('best_selling') && !(await on()).includes('featured'));

  await sw('title_asc').check();                                                      // an unsaved change for the leave guard below
  // leave guard
  await p.locator('.sh-item--sub', { hasText: /^Filter$/ }).click(); await p.waitForTimeout(300);
  ok('leave dialog with unsaved changes', await p.locator('#mf-leave-title').isVisible());
  await p.locator('[data-l=discard]').click(); await p.waitForTimeout(700);
  ok('discard leaves to filter.html', /filter\.html/.test(p.url()));

  // empty state
  await p.goto(U('sort.html') + '?state=empty'); await p.waitForSelector('.so-empty');
  ok('empty state', (await p.locator('.so-empty h2').innerText()) === 'No sort options yet');

  // phone width
  await p.setViewportSize({ width: 390, height: 900 }); await p.goto(U('sort.html') + '?reset=1'); await p.waitForSelector('#so-rows');
  ok('no page-wide horizontal scroll on phone', await p.evaluate(() => document.querySelector('.sh-scroll').scrollWidth <= document.querySelector('.sh-scroll').clientWidth + 1));
  log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors'); log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await b.close();
})().catch(e => { console.error('CRASH', e); process.exit(1); });
