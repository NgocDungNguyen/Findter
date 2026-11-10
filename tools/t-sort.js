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
  ok('13 options in the unlock order, Rating and Review after Sale, no Best selling', (await keys()).join() === 'relevance,created_at,title_asc,title_desc,price_low_high,price_high_low,available_count,created_at_asc,sale_asc,sale_desc,rating_desc,review_desc,featured', (await keys()).join());
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
  ok('spf off: Featured row hidden (12 rows)', (await keys()).length === 12 && !(await keys()).includes('featured'), (await keys()).length + '');
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

  // ---- Phase 2: Rating / Review (one review app) and metafield sorts
  await p.goto(U('sort.html') + '?reset=1'); await p.waitForSelector('#so-rows');
  const rw = k => p.locator(`.table-row[data-key="${k}"]`);
  ok('Rating + Review default OFF with the Phase 1 type texts', !(await on()).includes('rating_desc') && (await rw('rating_desc').locator('.so-t').innerText()) === 'Product rating high to low' && (await rw('review_desc').locator('.so-t').innerText()) === 'Review amount high to low');
  ok('info icon with the tooltip text next to Rating and Review', await rw('rating_desc').locator('.sort-label-info').getAttribute('data-tip') === 'Set up Judge.me or Yotpo before turning on this sort option.' && await rw('review_desc').locator('.sort-label-info').count() === 1);
  await sw('rating_desc').click(); await p.waitForTimeout(150);
  ok('first ON opens the app window, the option stays OFF until Save', await p.locator('.mf-modal__title').innerText() === 'Edit Sort by Rating' && !(await sw('rating_desc').isChecked()));
  ok('app window: two apps, none picked', await p.locator('.so-app__in').count() === 2 && await p.locator('.so-app__in:checked').count() === 0 && (await p.locator('.so-apps__h').innerText()) === 'Choose integrated app' && /Only one app can be active at a time/.test(await p.locator('.mf-modal__body').innerText()));
  await p.locator('[data-m=ok]').click(); await p.waitForTimeout(100);
  ok('Save without an app shows the error and keeps the window', await p.locator('#so-app-error').isVisible() && await p.locator('.mf-modal').count() === 1);
  await p.locator('.so-app', { hasText: 'Judge.me' }).click(); await p.waitForTimeout(100);
  ok('picking an app clears the error', !(await p.locator('#so-app-error').isVisible()) && await p.locator('.so-app__in:checked').getAttribute('value') === 'judgeme');
  await p.locator('.so-app', { hasText: 'Yotpo' }).click();
  ok('only one app at a time', await p.locator('.so-app__in:checked').count() === 1 && await p.locator('.so-app__in:checked').getAttribute('value') === 'yotpo');
  await p.locator('[data-m=ok]').click(); await p.waitForTimeout(150);
  ok('Save turns Rating ON and shows the save bar', await sw('rating_desc').isChecked() && await barShown());
  await sw('review_desc').check(); await p.waitForTimeout(100);
  ok('Review ON needs no window: the app is shared', await sw('review_desc').isChecked() && await p.locator('.mf-modal').count() === 0);
  await rw('review_desc').locator('[data-act=edit]').click(); await p.waitForTimeout(100);
  ok('Review edit window has Yotpo picked (shared)', await p.locator('.so-app__in:checked').getAttribute('value') === 'yotpo');
  await p.locator('.so-app', { hasText: 'Judge.me' }).click(); await p.locator('[data-m=ok]').click(); await p.waitForTimeout(100);
  await rw('rating_desc').locator('[data-act=edit]').click(); await p.waitForTimeout(100);
  ok('changing the app on Review changes it on Rating too', await p.locator('.so-app__in:checked').getAttribute('value') === 'judgeme');
  await p.locator('[data-m=cancel]').click();
  ok('Default dropdowns list Rating and Review when ON', (await opts('#so-def-collection')).includes('Rating') && (await opts('#so-def-search')).includes('Review'));
  await p.locator('[data-b=save]').click(); await p.waitForTimeout(900);
  ok('sync banner after saving a new app (yellow)', await p.locator('.mf-banner--warn').isVisible() && /Judge\.me ratings and review counts/.test(await p.locator('.mf-banner--warn').innerText()));
  ok('only one banner', await p.locator('.mf-banner').count() === 1); const warnH = await p.locator('.mf-banner--warn').evaluate(e => e.getBoundingClientRect().height);
  await p.waitForTimeout(6300);
  ok('banner turns green when the data is collected, with the same height as the yellow one', await p.locator('.mf-banner--done').isVisible() && Math.abs(await p.locator('.mf-banner--done').evaluate(e => e.getBoundingClientRect().height) - warnH) < 1.5, warnH + ' vs ' + await p.locator('.mf-banner--done').evaluate(e => e.getBoundingClientRect().height));
  await p.locator('[data-act=banner-done]').click(); ok('green banner can be dismissed for good', await p.locator('.mf-banner').count() === 0);
  await p.reload(); await p.waitForSelector('#so-rows');
  ok('app + status persisted', (await on()).includes('rating_desc') && (await on()).includes('review_desc'));
  await rw('rating_desc').locator('[data-act=edit]').click(); await p.waitForTimeout(100);
  ok('persisted app is Judge.me', await p.locator('.so-app__in:checked').getAttribute('value') === 'judgeme'); await p.locator('[data-m=cancel]').click();
  await p.locator('[data-act=add-mf]').click(); await p.waitForTimeout(150);
  ok('Add metafield sort lists only the saved number metafields, with their type', await p.locator('.mf-modal__title').innerText() === 'Add metafield sort' && (await opts('#so-mf-pick')).join('|') === 'height (Decimal)|Popularity score (Integer)|Shelf life (months) (Integer)|Net weight (g) (Decimal)|Customer rating (Rating)', (await opts('#so-mf-pick')).join('|'));
  ok('both directions ticked with default labels', await p.locator('#so-mf-label-asc').inputValue() === 'height low to high' && await p.locator('#so-mf-label-desc').inputValue() === 'height high to low');
  await p.locator('input[data-dir=asc]').uncheck();
  ok('unticked direction disables its label', await p.locator('#so-mf-label-asc').isDisabled());
  await p.locator('#so-mf-label-desc').fill('Tallest first'); await p.locator('[data-m=ok]').click(); await p.waitForTimeout(150);
  const mfKey = 'metafield_number_decimal_custom_height_desc';
  ok('one new row at the end, OFF, with its Type text and a delete button', (await keys()).slice(-1)[0] === mfKey && !(await sw(mfKey).isChecked()) && await rw(mfKey).locator('.so-t').innerText() === 'Metafield custom.height, high to low' && await rw(mfKey).locator('[data-act=delete]').count() === 1);
  ok('built-in rows have no delete button', await rw('title_asc').locator('[data-act=delete]').count() === 0);
  await sw(mfKey).check(); await p.locator('[data-b=save]').click(); await p.waitForTimeout(900);
  await p.reload(); await p.waitForSelector('#so-rows');
  ok('metafield sort persisted ON with its label', (await on()).includes(mfKey) && (await rw(mfKey).locator('.so-sort-label').innerText()).trim() === 'Tallest first');
  await rw(mfKey).locator('[data-act=edit]').click(); await p.waitForTimeout(100);
  ok('edit window names the metafield and its type', /custom\.height/.test(await p.locator('.mf-modal__body').innerText()) && /Decimal/.test(await p.locator('.mf-modal__body').innerText()) && await p.locator('.so-app__in').count() === 0); await p.locator('[data-m=cancel]').click();
  await p.locator('[data-act=add-mf]').click(); await p.waitForTimeout(150);
  ok('the taken direction is greyed, the other still offered', await p.locator('input[data-dir=desc]').isDisabled() && !(await p.locator('input[data-dir=asc]').isDisabled())); await p.locator('[data-m=cancel]').click();
  await rw(mfKey).locator('[data-act=delete]').click(); await p.waitForTimeout(100);
  ok('delete asks first', await p.locator('.mf-modal__title').innerText() === 'Delete this sort option?'); await p.locator('[data-m=ok]').click(); await p.waitForTimeout(100);
  ok('row removed after delete', !(await keys()).includes(mfKey));
  await p.locator('[data-b=discard]').click(); await p.locator('[data-m=ok]').click(); await p.waitForTimeout(100);
  // a metafield with no more saved selection hides its sort row; adding the metafield back restores it
  await p.evaluate(() => localStorage.setItem('findter.metafields.v1', JSON.stringify([{ id: 'snowboard', applies: ['search'] }])));
  await p.reload(); await p.waitForSelector('#so-rows');
  ok('row of a metafield that is no longer saved is hidden (data kept)', !(await keys()).includes(mfKey));
  await p.evaluate(() => localStorage.setItem('findter.metafields.v1', JSON.stringify([{ id: 'snowboard', applies: ['search'] }, { id: 'height', applies: ['filter'] }])));
  await p.reload(); await p.waitForSelector('#so-rows');
  ok('adding the metafield back restores the row', (await keys()).includes(mfKey) && (await on()).includes(mfKey));
  await p.evaluate(() => localStorage.setItem('findter.metafields.v1', JSON.stringify([{ id: 'snowboard', applies: ['search'] }])));
  await p.reload(); await p.waitForSelector('#so-rows');
  await p.locator('[data-act=add-mf]').click(); await p.waitForTimeout(150);
  ok('no number metafield saved: the window says so and links to the Metafield page', /no number metafield saved/i.test(await p.locator('.mf-modal__body').innerText()) && await p.locator('.mf-modal__body a[href="metafield.html"]').count() === 1 && await p.locator('[data-m=ok]').isDisabled());
  await p.locator('[data-m=cancel]').click();
  await p.evaluate(() => localStorage.removeItem('findter.metafields.v1'));

  // ---- Delete that would leave a page with no valid option: the reason is inside the window, Delete is off, no toast
  await p.goto(U('sort.html') + '?reset=1'); await p.waitForSelector('#so-rows');
  await p.locator('[data-act=add-mf]').click(); await p.waitForSelector('.mf-modal'); await p.locator('#so-mf-pick').selectOption('popularity'); await p.locator('[data-m=ok]').click();
  const popDesc = 'metafield_number_integer_custom_popularity_desc';
  await sw(popDesc).check(); for (const k of ['created_at', 'price_low_high', 'price_high_low']) await sw(k).uncheck();
  await rw(popDesc).locator('[data-act=delete]').click(); await p.waitForSelector('.mf-modal');
  ok('blocked Delete: red reason in the window, Delete disabled, no toast', /Keep at least one sort option other than Relevance/.test(await p.locator('#so-del-error').innerText()) && await p.locator('[data-m=ok]').isDisabled() && !/Keep at least one/.test(await p.locator('#toast').innerText()));
  await p.locator('[data-m=cancel]').click();
  ok('blocked Delete keeps the row', (await keys()).includes(popDesc));

  // ---- the sample storefront follows the Sort page: its dropdown, order and labels, and every product has the values to sort by
  await p.goto(U('sort.html') + '?reset=1'); await p.waitForSelector('#so-rows');
  await p.goto(U('storefront.html')); await p.waitForSelector('.sf-card');
  ok('storefront without a saved Sort page keeps its plain dropdown', (await opts('#sf-sort')).join('|') === 'Featured|Price, low to high|Price, high to low');
  await p.goto(U('sort.html')); await p.waitForSelector('#so-rows');
  await sw('rating_desc').click(); await p.waitForSelector('.mf-modal'); await p.locator('.so-app', { hasText: 'Judge.me' }).click(); await p.locator('[data-m=ok]').click();
  await sw('review_desc').check();
  for (const [id, key] of [['popularity', 'metafield_number_integer_custom_popularity_desc'], ['net_weight', 'metafield_number_decimal_custom_net_weight_asc']]) {
    await p.locator('[data-act=add-mf]').click(); await p.waitForSelector('.mf-modal'); await p.locator('#so-mf-pick').selectOption(id); await p.locator('[data-m=ok]').click(); await sw(key).check();
  }
  await p.locator('[data-b=save]').click(); await p.waitForTimeout(900);
  await p.goto(U('storefront.html')); await p.waitForSelector('.sf-card');
  const sfOpts = await opts('#sf-sort');
  ok('storefront dropdown = the options turned on, admin labels and order', sfOpts.join('|') === "What's new?|Price low to high|Price high to low|Rating|Review|Popularity score high to low|Net weight (g) low to high", sfOpts.join('|'));
  ok('collection page: no Relevance, default = What\'s new?', !sfOpts.includes('Relevance') && await p.locator('#sf-sort').inputValue() === 'created_at');
  const loadAll = async () => { for (let i = 0; i < 12 && await p.locator('.sf-card').count() < 72; i++) { await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(250); } };
  const notes = async re => (await p.$$eval('.sf-card__sortval', e => e.map(x => x.textContent))).map(t => parseFloat((t.match(re) || [])[1]));
  const sortedOk = (a, dir) => a.length === 72 && a.every(Number.isFinite) && a.every((v, i) => i === 0 || (dir > 0 ? a[i - 1] <= v : a[i - 1] >= v));
  await p.locator('#sf-sort').selectOption({ label: 'Rating' }); await loadAll();
  ok('Rating: all 72 products have a rating, high to low', sortedOk(await notes(/★ ([\d.]+)/), -1));
  await p.locator('#sf-sort').selectOption({ label: 'Review' }); await loadAll();
  ok('Review: all 72 products have a review count, high to low', sortedOk(await notes(/· (\d+) reviews/), -1));
  await p.locator('#sf-sort').selectOption({ label: 'Popularity score high to low' }); await loadAll();
  ok('Integer metafield (Popularity score): all products have it, high to low', sortedOk(await notes(/score: (\d+)/), -1));
  await p.locator('#sf-sort').selectOption({ label: 'Net weight (g) low to high' }); await loadAll();
  ok('Decimal metafield (Net weight): all products have it, low to high', sortedOk(await notes(/weight: ([\d.]+) g/), 1));
  await p.locator('#sf-sort').selectOption({ label: 'Price low to high' }); await loadAll();
  ok('Price low to high', sortedOk((await p.$$eval('.sf-card__price', e => e.map(x => parseFloat(x.textContent.replace('$', ''))))), 1));
  await p.goto(U('storefront-search.html') + '?q=cream'); await p.waitForSelector('.sf-card');
  ok('search page: no Featured, default = Relevance when it is on', !(await opts('#sf-sort')).includes('Featured'));
  await p.evaluate(() => localStorage.setItem('findter.metafields.v1', JSON.stringify([{ id: 'snowboard', applies: ['search'] }])));
  await p.goto(U('storefront.html')); await p.waitForSelector('.sf-card');
  ok('metafield no longer saved: its sort options leave the storefront dropdown', !(await opts('#sf-sort')).some(o => /Popularity|Net weight/.test(o)), (await opts('#sf-sort')).join('|'));
  await p.evaluate(() => { localStorage.removeItem('findter.metafields.v1'); localStorage.removeItem('findter.sortConfig.v1'); localStorage.removeItem('findter.sortSync.v1'); });

  // empty state
  await p.goto(U('sort.html') + '?state=empty'); await p.waitForSelector('.so-empty');
  ok('empty state', (await p.locator('.so-empty h2').innerText()) === 'No sort options yet');

  // phone width
  await p.setViewportSize({ width: 390, height: 900 }); await p.goto(U('sort.html') + '?reset=1'); await p.waitForSelector('#so-rows');
  ok('no page-wide horizontal scroll on phone', await p.evaluate(() => document.querySelector('.sh-scroll').scrollWidth <= document.querySelector('.sh-scroll').clientWidth + 1));
  log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors'); log(fails ? fails + ' FAILED' : 'ALL PASSED');
  await b.close();
})().catch(e => { console.error('CRASH', e); process.exit(1); });
