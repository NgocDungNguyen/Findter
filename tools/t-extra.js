// Walks through Search > Translations, Search > Synonyms Search and Filter set > Translate and prints what it finds. Run: node t-extra.js [shotDir]
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'); const U = f => pathToFileURL(path.join(root, f)).href;
const shots = process.argv[2];
let fails = 0; const ok = (name, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (f, w = 1440) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 1000 } }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(f + ' PAGEERR ' + e.message.slice(0, 200)));
    await p.goto(U(f)); return p;
  };
  const shot = (p, n) => shots && p.screenshot({ path: path.join(shots, n + '.png'), fullPage: true });
  const guide = (p, text, href) => p.locator('a.fdt-header__link', { hasText: text }).evaluate((a, h) => a.getAttribute('href') === h && a.target === '_blank' && getComputedStyle(a).textDecorationLine === 'underline' && getComputedStyle(a).color === 'rgb(0, 91, 211)', href);
  const G = 'https://flintverse.gitbook.io/docs/findter-custom-filter-search/user-guide/advanced-features/';

  // tabs on the two captured Search pages
  for (const f of ['search.html', 'search-boost.html']) {
    const p = await open(f);
    ok(f + ' has 4 tabs', (await p.locator('.Polaris-Tabs__Tab').allInnerTexts()).join('|') === 'Search settings|Search booster|Translations|Synonyms Search', (await p.locator('.Polaris-Tabs__Tab').allInnerTexts()).join('|'));
    ok(f + ' keeps its active tab', await p.locator('.Polaris-Tabs__Tab--active').count() === 1);
    if (f === 'search.html') { await p.locator('#locales').click(); await p.waitForURL(/search-translation/); ok('tab click opens Translations', true); }
  }

  // Translations
  let p = await open('search-translation.html');
  ok('Translations: title Search + guide link', await p.locator('h1').innerText() === 'Search' && await guide(p, 'Multi-language search guidelines here', G + 'auto-translate'));
  ok('Translations: active tab', await p.locator('.Polaris-Tabs__Tab--active').innerText() === 'Translations');
  ok('Translations: 2 saved tags, Save disabled', await p.locator('.ex-tag').count() === 2 && await p.locator('[data-act=save]').isDisabled());
  await p.locator('#ex-loc-input').click(); ok('Translations: list opens', await p.locator('#ex-loc-pop').isVisible());
  await shot(p, 'translation-open');
  await p.locator('.mf-opt', { hasText: 'Spanish' }).click(); ok('Translations: add Spanish -> 3 tags, Save enabled', await p.locator('.ex-tag').count() === 3 && await p.locator('[data-act=save]').isEnabled());
  await p.locator('h1').click(); ok('Translations: list closes on outside click', !(await p.locator('#ex-loc-pop').isVisible()));
  await p.locator('[data-rm="fr"]').click(); ok('Translations: remove French', await p.locator('.ex-tag').count() === 2);
  await p.locator('[data-act=save]').click(); await p.waitForTimeout(700);
  ok('Translations: saved toast', (await p.locator('#toast').innerText()).includes('Languages updated'));
  await shot(p, 'translation');

  // Synonyms
  p = await open('search-synonym.html');
  ok('Synonyms: title, sub text, guide link', await p.locator('h1').innerText() === 'Search' && (await p.locator('.fdt-header__description').count()) === 1 && (await p.locator('.fdt-header__description').innerText()).endsWith('similar words. Synonyms search guidelines here') && await guide(p, 'Synonyms search guidelines here', G + 'synonym-search'));
  ok('Synonyms: 3 rows', await p.locator('.ex-table tbody tr').count() === 3);
  await p.locator('.ex-info').hover(); await shot(p, 'synonym');
  await p.locator('tr[data-id="3"] [data-act=toggle]').click(); ok('Synonyms: toggle toast', (await p.locator('#toast').innerText()).includes('Change status success'));
  await p.locator('[data-act=add]').first().click(); await p.locator('[data-m=ok]').click();
  ok('Synonyms: validation', (await p.locator('#ex-s-name-err').innerText()) === 'This field is required' && (await p.locator('#ex-s-terms-err').innerText()) !== '');
  await p.fill('#ex-s-name', 'sofa'); await p.fill('#ex-s-terms', 'couch, settee'); await p.keyboard.press('Enter'); await shot(p, 'synonym-modal');
  await p.locator('[data-m=ok]').click(); ok('Synonyms: add row', await p.locator('.ex-table tbody tr').count() === 4 && await p.locator('tr', { hasText: 'sofa' }).locator('.ex-tag--static').count() === 2);
  await p.locator('tr', { hasText: 'sofa' }).locator('[data-act=delete]').click(); await p.locator('[data-m=ok]').click(); ok('Synonyms: delete row', await p.locator('.ex-table tbody tr').count() === 3);

  // Filter set translate
  p = await open('filter-translate.html');
  ok('Translate: title + 2 sub lines', await p.locator('h1').innerText() === 'Translate Default filter set');
  const lines = await p.locator('.fdt-header__description').allInnerTexts();
  ok('Translate: sub text with the guide link on the same line', lines.length === 1 && lines[0] === "Add translated labels for this filter set's options, values, and groups. Multi-language filter value guidelines here" && await guide(p, 'Multi-language filter value guidelines here', G + 'auto-translate'), lines.join(' / '));
  await shot(p, 'filter-translate');
  await p.locator('input[data-k="o1:v:In Stock"]').fill('En stock'); ok('Translate: save bar shows', await p.locator('.so-savebar').evaluate(e => !e.hidden));
  await p.selectOption('#ex-lang', 'de'); ok('Translate: discard modal on language switch', await p.locator('.mf-modal').count() === 1);
  await p.locator('[data-m=cancel]').click();
  await p.locator('.so-sbtn--save').click(); ok('Translate: saved', (await p.locator('#toast').innerText()).includes('Save successfully') && await p.locator('.so-savebar').evaluate(e => e.hidden));
  ok('Translate: every option starts open', await p.locator('.ex-collapse:visible').count() === 4); await p.locator('[data-o=o2]').click(); ok('Translate: collapse Price', !(await p.locator('#ex-o-o2').isVisible()));
  await p.locator('a.ex-back').click(); await p.waitForURL(/filter-set.html/); ok('Translate: back to filter-set.html', true);
  ok('Filter set: 4 options, Translations button', (await p.locator('.ex-fo tbody tr').count()) === 4 && await p.locator('a.ex-btn', { hasText: 'Translations' }).getAttribute('href') === 'filter-translate.html');

  // phone width
  for (const f of ['search-translation.html', 'search-synonym.html', 'filter-translate.html']) {
    const m = await open(f, 390); ok(f + ' phone: no horizontal page scroll', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot(m, f.replace('.html', '-390'));
  }
  console.log(errs.length ? errs.join('\n') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'all passed');
  await b.close();
})();
