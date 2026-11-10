// Checks the pages added on 10/11/2026: Merchandising (list + builder), Search redirect, Separated variant products, the two Search suggestion cards, the Settings cards.
// usage: node tools/t-merch.js [outDir]   (screenshots go to outDir when given)
const { chromium } = require('playwright'); const path = require('path');
const root = path.resolve(__dirname, '..'); const HAS_AB = require('fs').existsSync(path.join(root, 'tools', 'build', 'abtest.js')); const out = process.argv[2];
const url = f => 'file:///' + path.join(root, f).split(path.sep).join('/');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  let b; try { b = await chromium.launch({ channel: 'msedge' }); } catch (e) { b = await chromium.launch(); }
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('native dialog: ' + d.message()); d.dismiss(); });
  const shot = n => out ? p.screenshot({ path: path.join(out, n + '.png') }) : null;
  const rows = () => p.$$eval('.sh-appgroup > a.sh-item--sub, .sh-appgroup > .sh-item--more', els => els.filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent.trim()));

  // ---- sidebar
  await p.goto(url('index.html')); await p.evaluate(() => localStorage.clear()); await p.reload();
  ok(JSON.stringify(await rows()) === JSON.stringify(['Filter', 'Search', 'Settings', 'Year Make Model', 'Merchandising', 'Advanced features', 'View more']), 'sidebar: 6 items + View more, Merchandising under Year Make Model');
  await p.evaluate(() => { localStorage.clear(); });

  // ---- Merchandising list
  await p.goto(url('merchandising.html')); await p.waitForTimeout(500); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  ok((await p.$eval('.sh-item--sub[aria-current=page]', e => e.textContent.trim())) === 'Merchandising', 'Merchandising highlighted in the sidebar');
  ok((await p.$$('.pl-row')).length === 3 && (await p.$$eval('.Polaris-Badge', e => e.map(x => x.textContent.trim()))).join() === 'Boost,Hide,Demote,Expired', 'collection tab: 3 rules (Boost, Hide, Demote + Expired)');
  await shot('merch-collection');
  await p.click('#mc-tab-search'); ok((await p.$$('.pl-row')).length === 3 && /Contains: cream, lotion/.test(await p.textContent('#mc-rows')), 'search tab: 3 rules with terms');
  await shot('merch-search');
  // toggle persists
  await p.click('#mc-tab-collection'); await p.click('.pl-row[data-id="2"] .ft-switch-btn'); await p.reload(); await p.waitForTimeout(300);
  ok(!(await p.$eval('.pl-row[data-id="2"] .slider-toggle', e => e.classList.contains('active'))), 'status switch persists after reload');
  // keyboard reorder
  await p.focus('.pl-row[data-id="1"] .pl-handle'); await p.keyboard.press('ArrowDown');
  ok((await p.$$eval('.pl-row', e => e.map(x => x.dataset.id))).join() === '2,1,3', 'arrow keys on the handle reorder rules');
  // delete modal
  await p.click('.pl-row[data-id="3"] [data-act=delete]'); ok(await p.isVisible('.mf-modal'), 'delete opens a modal (no browser dialog)'); await p.click('.mf-modal [data-m=ok]');
  ok((await p.$$('.pl-row')).length === 2, 'rule deleted');
  // builder: validation + save
  await p.click('[data-act=add]'); await p.waitForTimeout(300);
  ok((await p.textContent('#mc-title')) === 'Add rule' && await p.isVisible('.ex-back'), 'builder opens with a back arrow');
  ok(await p.isHidden('.so-savebar'), 'no save bar before any change');
  await p.fill('#mc-name', 'Boost skin care'); ok(await p.isVisible('.so-savebar'), 'save bar appears after a change');
  await p.fill('#mc-name', ''); await p.check('input[name=mc-type][value=demote]', { force: true }); await p.click('.so-savebar [data-b=save]');
  ok(await p.isVisible('[data-err=name]') && (await p.getAttribute('#mc-name', 'aria-invalid')) === 'true', 'save with an empty name: inline error, field marked invalid');
  ok(await p.isVisible('[data-err=products]'), 'save with no product: inline error');
  await shot('merch-builder-errors');
  await p.fill('#mc-name', 'Boost skin care'); await p.check('input[name=mc-apply][value=specific]'); await p.selectOption('#mc-collection', 'Skin care');
  await p.check('input[data-pid="1"]'); await p.check('input[data-pid="2"]');
  ok((await p.textContent('#mc-count')).includes('2 of 6'), 'product count follows the picks');
  await shot('merch-builder');
  await p.click('.so-savebar [data-b=save]'); await p.waitForTimeout(300);
  ok((await p.$$('.pl-row')).length === 3 && /Boost skin care/.test(await p.textContent('#mc-rows')), 'rule saved and listed');
  // builder: attributes + discard
  await p.click('.pl-row:last-child [data-act=edit]'); await p.click('[data-pmode=attributes]'); await p.waitForTimeout(200);
  await shot('merch-attributes');
  await p.click('[data-act=back]'); ok(await p.isVisible('.mf-modal'), 'back arrow with changes asks before discarding'); await p.click('.mf-modal [data-m=ok]');
  ok(await p.isVisible('#mc-rows'), 'discard returns to the list');
  // sidebar guard
  await p.click('[data-act=add]'); await p.fill('#mc-name', 'x'); await p.click('aside#nav .sh-item--sub:has-text("Filter")'); ok(await p.isVisible('#mf-leave-title, .mf-modal__title'), 'leaving with unsaved changes asks first');
  await p.keyboard.press('Escape'); await p.click('.so-savebar [data-b=discard]'); await p.click('.mf-modal [data-m=ok]');

  // ---- Settings page + redirect + variants
  await p.goto(url('settings.html')); await p.waitForTimeout(300);
  ok((await p.$$eval('.pl-setcard .Polaris-Text--headingSm', e => e.map(x => x.textContent.trim()))).join() === ['Metafield', 'Filter design', 'Product grid & card', 'Custom sort', 'Search redirect'].concat(HAS_AB ? ['A/B testing'] : [], ['Separated variant products']).join(), 'Settings page: cards');
  await shot('settings');
  await p.click('.pl-setcard[href="search-redirect.html"]'); await p.waitForTimeout(400); await p.evaluate(() => localStorage.removeItem('findter.searchRedirect.v1')); await p.reload(); await p.waitForTimeout(300);
  ok(/Search redirect/.test(await p.textContent('h1')) && await p.isVisible('.ex-back'), 'Search redirect: title + back arrow');
  ok((await p.$$('.pl-row')).length === 2, 'Search redirect: 2 seeded rules');
  await shot('redirect');
  await p.click('[data-act=add]'); await p.click('.mf-modal [data-m=ok]');
  ok(await p.isVisible('#err-srterms') && await p.isVisible('#err-srurl') && await p.isVisible('.mf-modal'), 'empty redirect: two inline errors, window stays open');
  await p.fill('#sr-terms', 'sale'); await p.fill('#sr-url', 'nope'); await p.click('.mf-modal [data-m=ok]');
  ok(/already redirects/.test(await p.textContent('#err-srterms')) && /https:\/\//.test(await p.textContent('#err-srurl')), 'duplicate term and bad URL are explained');
  await shot('redirect-modal');
  await p.fill('#sr-terms', 'gift, gifts'); await p.fill('#sr-url', '/collections/gifts'); await p.click('.mf-modal [data-m=ok]');
  ok((await p.$$('.pl-row')).length === 3 && /3 rules/.test(await p.textContent('#sr-root')), 'redirect added');
  await p.goto(url('settings.html')); await p.click('.pl-setcard[href="separated-variants.html"]'); await p.waitForTimeout(400); await p.evaluate(() => localStorage.removeItem('findter.separatedVariants.v1')); await p.reload(); await p.waitForTimeout(300);
  ok(await p.isChecked('#sv-switch'), 'Separated variants: switch is on'); await shot('variants');
  await p.click('#sv-input'); ok(await p.isVisible('#sv-list'), 'options list opens'); await shot('variants-open');
  await p.click('[data-opt="Size"]'); await p.keyboard.press('Escape');
  ok(await p.isVisible('.so-savebar') && (await p.$$('.Polaris-Tag')).length === 2, 'picking an option shows a chip and the save bar');
  await p.click('[data-rm="Color"]'); await p.click('[data-rm="Size"]'); await p.click('.so-savebar [data-b=save]');
  ok(await p.isVisible('#err-svopt'), 'no option selected: inline error (no save)');
  await p.click('#sv-input'); await p.click('[data-opt="Material"]'); await p.keyboard.press('Escape'); await p.click('.so-savebar [data-b=save]');
  ok(await p.isHidden('.so-savebar') && JSON.parse(await p.evaluate(() => localStorage.getItem('findter.separatedVariants.v1'))).options.join() === 'Material', 'saved');

  // ---- Search page cards
  await p.goto(url('search.html')); await p.waitForTimeout(500); await p.evaluate(() => { localStorage.removeItem('findter.noResultSuggest.v2'); localStorage.removeItem('findter.zeroCharSuggest.v2'); }); await p.reload(); await p.waitForTimeout(400);
  const titles = await p.$$eval('[data-sg] .Polaris-Text--headingMd', e => e.map(x => x.textContent.trim()));
  ok(titles.join() === 'No results suggestions,Zero character suggestions', 'Search page: two new containers');
  ok((await p.$$eval('[data-sg=nr] .pl-item', e => e.length)) === 3 && (await p.$$eval('[data-sg=zc] .pl-item', e => e.length)) === 8, 'seeded 3/5 and 8/10');
  await p.evaluate(() => document.querySelector('[data-sg=nr]').scrollIntoView()); await shot('search-cards');
  await p.click('#sg-nr'); await p.fill('#sg-nr', 'serum'); ok(await p.isVisible('[data-sg=nr] .Polaris-Listbox'), 'typing lists matching products');
  await p.click('[data-sg=nr] [data-add]'); ok((await p.$$('[data-sg=nr] .pl-item')).length === 4 && await p.isVisible('.csb'), 'adding a product shows the Unsaved changes bar');
  await p.click('.csb [data-csb=save]'); await p.waitForTimeout(300); await p.reload(); await p.waitForTimeout(300);
  ok((await p.$$('[data-sg=nr] .pl-item')).length === 4, 'saved product stays after reload');
  await p.click('#sg-nr'); await p.fill('#sg-nr', ''); await p.click('[data-sg=nr] [data-add]');
  ok(await p.isDisabled('#sg-nr') && /Remove one/.test(await p.textContent('[data-sg=nr]')), 'at 5/5 the field is disabled and says why');

  // ---- phone
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 });
  for (const f of ['merchandising.html', 'search-redirect.html', 'separated-variants.html', 'settings.html']) {
    await m.goto(url(f)); await m.waitForTimeout(400);
    ok(!(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'phone 390: ' + f + ' no page-level horizontal scroll');
    if (out) await m.screenshot({ path: path.join(out, f.replace('.html', '') + '-phone.png') });
  }
  await m.goto(url('merchandising.html')); await m.click('[data-act=add]'); await m.waitForTimeout(300);
  ok(!(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'phone 390: rule page no horizontal scroll'); if (out) await m.screenshot({ path: path.join(out, 'merch-builder-phone.png'), fullPage: true });
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
