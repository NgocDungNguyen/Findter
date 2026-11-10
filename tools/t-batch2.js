// Checks the 10/11/2026 batch 2: Merchandising tab toast fix, Product compare, Product grid Phase 3 (+ storefront), Year Make Model (+ storefront).
// usage: node tools/t-batch2.js [outDir]
const { chromium } = require('playwright'); const path = require('path');
const root = path.resolve(__dirname, '..'); const out = process.argv[2];
const url = f => 'file:///' + path.join(root, f).split(path.sep).join('/');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  let b; try { b = await chromium.launch({ channel: 'msedge' }); } catch (e) { b = await chromium.launch(); }
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('native dialog: ' + d.message()); d.dismiss(); });
  const shot = n => out ? p.screenshot({ path: path.join(out, n + '.png') }) : null;
  const ls = (k, v) => p.evaluate(([k, v]) => v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v), [k, v]);

  // ---- 1. Merchandising: the tabs never say "not part of this copy"
  await p.goto(url('merchandising.html')); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  await p.click('#mc-tab-search'); await p.waitForTimeout(200); await p.click('#mc-tab-collection'); await p.waitForTimeout(200); await p.click('[data-act=add]'); await p.waitForTimeout(200);
  ok(!/not part of this copy/.test(await p.evaluate(() => (document.querySelector('#toast') || {}).textContent || '')), 'Merchandising: tab and Add rule clicks show no "not part of this copy" message');
  await p.goto(url('merchandising.html')); await p.waitForTimeout(200);

  // ---- 4. Product grid Phase 3 -> storefront
  await p.goto(url('settings.html')); await p.click('.pl-setcard[href="design-product-grid.html"]'); await p.waitForTimeout(500);
  for (const k of ['rating_review.enabled', 'quick_add.enabled', 'quick_view.enabled', 'wishlist.enabled']) await p.click(`.pg-switch[data-p="${k}"]`);
  await p.click('[data-col=rating-review-settings] .dz-col__btn'); await p.check('input[name="rating_review.app"][value=yotpo]');
  ok(!(await p.isChecked('input[name="rating_review.app"][value=judgeme]')), 'Grid design: only one review app can be picked');
  ok(/4\.6 \(128\)/.test(await p.textContent('.fdt-product-card__rating')) && await p.isVisible('.fdt-product-card__heart') && await p.isVisible('.fdt-product-card__qv') && await p.isVisible('.fdt-product-card__qa'), 'Grid design: the preview card shows stars, heart, quick view and quick add'); await shot('grid3');
  for (const id of ['quick-add-settings', 'quick-view-settings', 'wishlist-settings']) await p.click('[data-col=' + id + '] .dz-col__btn');
  ok(!/review app saves|small box to choose|so shoppers do not leave|Shoppers save products/.test(await p.textContent('.fdt-product-grid-design')), 'Grid design: the long description lines are gone from the four new panels');
  ok((await p.$$eval('select[data-p="wishlist.position"] option', e => e.map(x => x.textContent))).join() === 'Top left,Top right,Bottom left,Bottom right' && (await p.$$('select[data-p="quick_add.position"], select[data-p="quick_view.position"], select[data-p="rating_review.position"]')).length === 3, 'Grid design: Position (top / bottom, left / right) on each new panel');
  await p.selectOption('select[data-p="wishlist.position"]', 'bottom left'); await p.selectOption('select[data-p="quick_view.position"]', 'top left');
  ok(/bottom:/.test(await p.getAttribute('.fdt-product-card__heart', 'style')) && /left:/.test(await p.getAttribute('.fdt-product-card__heart', 'style')) && /top:/.test(await p.getAttribute('.fdt-product-card__qv', 'style')), 'Grid design: the preview card puts each button in its corner');
  await p.click('button.Polaris-Button--variantPrimary:has-text("Save")'); await p.waitForTimeout(300);
  await ls('findter.feature.compare', '1');
  await p.goto(url('storefront.html')); await p.waitForTimeout(600);
  ok((await p.$$('.sf-card .sfx-rating')).length > 0 && (await p.$$('.sf-card .sfx-heart')).length > 0 && (await p.$$('.sf-card .sfx-qv-btn')).length > 0 && (await p.$$('.sf-card .sfx-qa')).length > 0, 'Storefront: cards show rating, wishlist, quick view and quick add'); await shot('store-cards');
  ok(/bottom:/.test(await p.getAttribute('.sf-card:nth-child(2) .sfx-heart', 'style')) && /top:/.test(await p.getAttribute('.sf-card:nth-child(2) .sfx-qv-btn', 'style')), 'Storefront: the buttons follow the chosen corners');
  await p.hover('.sf-card:nth-child(1)'); await p.click('.sf-card:nth-child(1) [data-qv]'); ok(await p.isVisible('.sfx-qv') && /Hydrating Face Serum/.test(await p.textContent('.sfx-win__box')), 'Storefront: Quick view opens its own window'); await shot('store-quickview');
  await p.click('.sfx-qv [data-add]'); ok(/Added to cart/.test(await p.textContent('.sfx-toast')), 'Storefront: Add to cart in Quick view'); await p.keyboard.press('Escape');
  await p.click('.sf-card:nth-child(2) [data-wish]'); ok(await p.isVisible('.sfx-wl') && /Wishlist/.test(await p.textContent('.sfx-wl .sfx-h')) && (await p.$$('.sfx-wl__row')).length === 1, 'Storefront: the heart opens the Wishlist window with the product'); await shot('store-wishlist');
  await p.keyboard.press('Escape'); await p.hover('.sf-card:nth-child(3)'); await p.click('.sf-card:nth-child(3) [data-qa]'); ok(await p.isVisible('.sfx-co'), 'Storefront: Quick add asks for the options'); await p.click('.sfx-co [data-add]');
  ok(/^2$/.test((await p.textContent('.sf-iconbtn[aria-label^="Cart"] .sfx-count')).trim()), 'Storefront: the cart count follows');

  // ---- 5. Product compare
  await p.goto(url('features.html')); await p.waitForTimeout(300); ok(!(await p.isChecked('.pg-switch[data-feature=compare]')) === false, 'Advanced features: Product compare card (switch state follows storage)');
  await p.evaluate(() => localStorage.setItem('findter.feature.compare', '0')); await p.reload(); await p.click('.pg-switch[data-feature=compare]'); ok((await ls('findter.feature.compare')) === '1', 'Advanced features: the switch turns Product compare on');
  await p.goto(url('storefront.html')); await p.waitForTimeout(500); await p.click('.sfx-cmpbtn');
  ok((await p.$$('.sf-card .sfx-cmpbox')).length > 0, 'Storefront: "Compare with" puts a tick on every card');
  for (let i = 1; i <= 5; i++) await p.check(`.sf-card:nth-child(${i}) [data-cmp]`);
  ok(await p.isDisabled('.sf-card:nth-child(6) [data-cmp]') && /5 of 5/.test(await p.textContent('.sfx-bar')), 'Storefront: at 5 products the other ticks are disabled'); await shot('store-compare-bar');
  await p.click('.sfx-bar [data-go]'); ok((await p.$$('.sfx-cmp__p')).length === 5 && /Lowest price/.test(await p.textContent('.sfx-cmp')), 'Storefront: the comparison window shows 5 products and the lowest price'); await shot('store-compare');
  const rowsAll = (await p.$$('.sfx-cmp__t tbody tr')).length; await p.check('#sfx-diff'); ok((await p.$$('.sfx-cmp__t tbody tr')).length < rowsAll, 'Storefront: "Show differences only" hides equal rows');
  await p.click('.sfx-cmp [data-add]'); ok(/Added to cart/.test(await p.textContent('.sfx-toast')), 'Storefront: Quick add inside the comparison');
  await p.keyboard.press('Escape'); ok(await p.isHidden('.sfx-win'), 'Storefront: Esc closes the comparison');

  // ---- 6. Year Make Model
  await p.goto(url('ymm.html')); await p.waitForTimeout(400); await p.evaluate(() => { ['findter.ymm.history.v1', 'findter.ymm.widget.v1', 'findter.ymm.options.v1'].forEach(k => localStorage.removeItem(k)); }); await p.reload(); await p.waitForTimeout(300);
  await p.click('#ym-tab-widget'); await p.fill('#ym-title', 'Find parts that fit'); await p.fill('#ym-search', 'Go'); await p.check('#ym-remember');
  ok(/Find parts that fit/.test(await p.textContent('#ym-prev')) && /Your vehicles/.test(await p.textContent('#ym-prev')), 'YMM: the preview follows the labels and Remember'); await shot('ymm-widget');
  await p.fill('#ym-reset', ''); await p.click('.so-savebar [data-b=save]'); ok(await p.isVisible('[data-err=w-reset]'), 'YMM: an empty label is an inline error');
  await p.fill('#ym-reset', 'Clear'); await p.click('.so-savebar [data-b=save]'); await p.waitForTimeout(200); ok(!!(await ls('findter.ymm.widget.v1')) && JSON.parse(await ls('findter.ymm.widget.v1')).remember === true, 'YMM: the labels and Remember are saved');
  await p.click('#ym-tab-options'); await p.click('[data-act=import]');
  await p.setInputFiles('#ym-file', { name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from('Brand,Name\nA,B\n') }); await p.waitForTimeout(300);
  ok(/Could not find the Model column|Could not find the Year column|Could not find/.test(await p.textContent('#err-ymfile')), 'YMM import: a file without the right columns is explained');
  await p.setInputFiles('#ym-file', { name: 'ok.csv', mimeType: 'text/csv', buffer: Buffer.from('Year,Make,Model\n2019,Mazda,CX-5\n2020-2022,Kia,Soul\n2021,Kia,Soul\nabc,Audi,A4\n2018,Toyota,Camry\n2015,,X\n') }); await p.waitForTimeout(300);
  ok(/4 ready/.test(await p.textContent('#ym-res .pl-tags')) && /2 with problems/.test(await p.textContent('#ym-res .pl-tags')) && /Row \d+:/.test(await p.textContent('#ym-res')), 'YMM import: counts ready rows, problems with their row numbers'); await shot('ymm-import');
  await p.click('.mf-modal [data-m=ok]'); await p.waitForTimeout(300); ok(/16 options/.test(await p.textContent('#ym-panel')) && /Imported 4 options/.test(await p.evaluate(() => document.querySelector('#toast').textContent)), 'YMM import: the 4 rows are added to the 12 options');
  await p.goto(url('storefront.html')); await p.waitForTimeout(500);
  ok(/Find parts that fit/.test(await p.textContent('.sfx-ymm')) && /Go/.test(await p.textContent('.sfx-ymm')), 'Storefront: the widget uses the admin labels');
  await p.selectOption('#sfx-y', '2019'); await p.selectOption('#sfx-mk', 'Toyota'); await p.selectOption('#sfx-md', 'Camry'); await p.click('[data-ymm-go]'); await p.waitForTimeout(300);
  ok(/Showing parts for 2019 Toyota Camry/.test(await p.textContent('.sfx-ymm')) && /\d+ products/.test(await p.textContent('#sf-count')) && (await p.textContent('#sf-count')) !== '72 products', 'Storefront: Search narrows the products to the vehicle'); await shot('store-ymm');
  ok(/2019 Toyota Camry/.test(await p.textContent('.sfx-ymm__saved')), 'Storefront: Remember shows the vehicle under "Your vehicles"');
  await p.goto(url('ymm.html')); await p.waitForTimeout(300); await p.click('#ym-tab-history'); await p.waitForTimeout(200);
  ok(/Top combinations/.test(await p.textContent('#ym-panel')) && (await p.$$('.pl-top__row')).length === 5, 'YMM history: Top 5 combinations'); await p.click('[data-top="10"]'); ok((await p.$$('.pl-top__row')).length === 10, 'YMM history: Top 10');
  ok(/Camry/.test(await p.textContent('table[aria-label="Search history"]')), 'YMM history: the storefront search is in the log'); await shot('ymm-history');

  // ---- phone
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 });
  for (const f of ['ymm.html', 'storefront.html']) { await m.goto(url(f)); await m.waitForTimeout(500); ok(!(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'phone 390: ' + f + ' no page-level horizontal scroll'); if (out) await m.screenshot({ path: path.join(out, f.replace('.html', '') + '-phone.png') }); }
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
