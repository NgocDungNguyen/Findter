// Promotion shortcuts (/filter, /search, /pricing...) open in the same tab, and "Code: … copied successfully" shows near the header of the landing page
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'), url = pathToFileURL(path.join(root, 'index.html')).href;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const svg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#ffd9c2"/></svg>`;
const promo = o => ({ sku: 'p-' + o.n, name: 'P ' + o.n, deadline: '2030-01-01T00:00', enabled: true, desktop: 'https://img.test/d.svg', mobile: 'https://img.test/m.svg', types: ['Subscription', 'Development store', 'Trial', 'Paid before', 'Service', 'Free'], action: 'link', link: '', code: '', ...o });
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('https://img.test/**', r => r.fulfill({ contentType: 'image/svg+xml', body: svg(1266, 320) }));
  await ctx.route('**/BFCM_Promotion*', r => r.fulfill({ contentType: 'image/svg+xml', body: svg(1266, 320) }));
  await ctx.addInitScript(() => { window.__copies = []; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copies.push(t); } } }); });
  const p = await ctx.newPage(); let popups = 0; ctx.on('page', () => { popups++; }); p.on('pageerror', e => errs.push(e.message));
  const seed = async list => { await p.goto(url); await p.evaluate(l => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('findter.promotions.v1', JSON.stringify(l)); }, list); await p.goto(url + '#/'); await p.waitForTimeout(500); await p.reload(); await p.waitForTimeout(500); };
  const pill = () => p.locator('.cn-pill.is-on');
  const pillText = async () => (await pill().count()) ? (await pill().innerText()) : null;
  const file = () => decodeURIComponent(p.url()).split('#')[0].split('/').pop();

  // 1. banner link + code -> same tab, notice on the landing page, near the header
  await seed([promo({ n: 1, action: 'link', link: '/filter', code: 'SAVE10' })]);
  await p.click('.pr-slide .pr-hit'); await p.waitForURL(/filter\.html/); await p.waitForTimeout(400);
  ok(file() === 'filter.html' && popups === 0, 'banner with /filter opens filter.html in the same tab (no new tab)');
  ok((await pillText()) === 'Code: SAVE10 copied successfully', 'landing page shows "Code: SAVE10 copied successfully": ' + (await pillText()));
  const bx = await pill().boundingBox(); ok(bx && bx.y >= 54 && bx.y < 90, 'notice sits right under the header (y=' + (bx && bx.y) + ')');
  ok((await p.evaluate(() => window.__copies)).length === 0, 'copy happened on the source page (new page has its own clipboard stub)');
  await p.screenshot({ path: 'test/promo-nav-filter.png' });
  await p.reload(); await p.waitForTimeout(400); ok(!(await pillText()), 'notice does not come back on reload');

  // 2. link only -> navigates, no notice
  await seed([promo({ n: 2, action: 'link', link: '/search' })]);
  await p.click('.pr-slide .pr-hit'); await p.waitForURL(/search\.html/); await p.waitForTimeout(400);
  ok(file() === 'search.html' && !(await pillText()) && popups === 0, 'link only (/search): same tab, no code, no notice');

  // 3. code + link -> "Copy and apply" copies, then same tab with notice
  await seed([promo({ n: 3, action: 'code', link: '/pricing', code: 'BFCM2025' })]);
  ok((await p.locator('.pr-foot button').innerText()).trim() === 'Copy and apply', 'button reads "Copy and apply"');
  await p.click('.pr-foot button'); await p.waitForURL(/pricing\.html/); await p.waitForTimeout(600);
  ok(file() === 'pricing.html' && popups === 0, '/pricing opens pricing.html in the same tab');
  ok((await pillText()) === 'Code: BFCM2025 copied successfully', 'pricing page shows the notice: ' + (await pillText()));
  await p.screenshot({ path: 'test/promo-nav-pricing.png' });

  // 4. code only -> "Copy code", copies, notice on the same page, no navigation
  await seed([promo({ n: 4, action: 'code', code: 'ONLY1' })]);
  ok((await p.locator('.pr-foot button').innerText()).trim() === 'Copy code', 'button reads "Copy code"');
  await p.click('.pr-foot button'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__copies)).join() === 'ONLY1' && file().startsWith('index.html') && popups === 0, 'copies, stays on the page ' + JSON.stringify([await p.evaluate(() => window.__copies), file(), popups]));
  ok((await pillText()) === 'Code: ONLY1 copied successfully', 'notice shown on this page: ' + (await pillText()));
  await p.screenshot({ path: 'test/promo-nav-copyonly.png' });

  // 5. external link + code -> new tab (that site is not ours), notice here
  await seed([promo({ n: 5, action: 'link', link: 'https://example.com/x', code: 'EXT5' })]);
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.click('.pr-slide .pr-hit')]); await p.waitForTimeout(300); await pop.close();
  ok(file().startsWith('index.html') && (await pillText()) === 'Code: EXT5 copied successfully', 'https link opens a new tab; notice shown on the source page ' + file() + ' ' + (await pillText()));

  // 6. unknown shortcut -> nothing opens; validation message in the form
  await seed([promo({ n: 6, action: 'link', link: '/nope', code: 'X6' })]);
  const n0 = popups; await p.click('.pr-slide .pr-hit'); await p.waitForTimeout(300);
  ok(file().startsWith('index.html') && popups === n0, 'unknown shortcut: stays here, no new tab ' + JSON.stringify([file(), popups, n0]));
  await p.goto(url + '#/master/promotion/new'); await p.waitForTimeout(400);
  await p.check('input[name=pr-action][value=link]'); await p.fill('#pr-link', '/nope'); await p.focus('#pr-sku'); await p.waitForTimeout(200);
  const err = await p.locator('[data-field=link] .prm-err').innerText(); ok(/shortcut/.test(err) && /\/pricing/.test(err), 'form rejects unknown shortcut: ' + err);
  await p.fill('#pr-link', '/pricing'); await p.focus('#pr-sku'); await p.waitForTimeout(200);
  ok(!(await p.locator('[data-field=link] .prm-err').innerText()), '/pricing is accepted');
  await p.screenshot({ path: 'test/promo-nav-form.png' });

  // 6b. the Pricing page is part of this copy: our own left menu, no staging-app / admin links
  await p.goto(url.replace('index.html', 'pricing.html')); await p.waitForTimeout(600);
  const nav = await p.evaluate(() => ({ foreign: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /admin.shopify|myshopify|snf-staging|linh-test/.test(h)), active: [...document.querySelectorAll('aside#nav [aria-current=page]')].map(e => e.textContent.trim()).filter(Boolean), subs: [...document.querySelectorAll('aside#nav .sh-item--sub')].map(e => e.textContent.trim()).join('|'), more: document.querySelector('.sh-item--more').textContent.trim(), hasPlan: document.body.innerText.includes('Current plan') }));
  ok(!nav.foreign.length && nav.active.includes('Pricing') && nav.more === 'View less' && nav.hasPlan, 'pricing.html: our own menu with Pricing active, content present, no admin links ' + JSON.stringify(nav.active) + ' ' + nav.subs);
  await p.click('aside#nav .sh-item--sub[href="filter.html"]'); await p.waitForURL(/filter.html/); ok(file() === 'filter.html', 'menu items on the Pricing page go to our pages (Filter)');
  await p.goto(url); await p.waitForTimeout(400); await p.click('aside#nav .sh-item--more'); await p.click('aside#nav .sh-item--sub[href="pricing.html"]'); await p.waitForURL(/pricing.html/); ok(file() === 'pricing.html', 'Pricing in the menu opens pricing.html');

  // 7. phone width
  await p.setViewportSize({ width: 390, height: 800 });
  await seed([promo({ n: 7, action: 'link', link: '/design', code: 'M7' })]);
  await p.click('.pr-slide .pr-hit'); await p.waitForURL(/design\.html/); await p.waitForTimeout(400);
  const mb = await pill().boundingBox(); ok((await pillText()) === 'Code: M7 copied successfully' && mb.x >= 0 && mb.x + mb.width <= 390, 'phone: notice fits the screen');
  await p.screenshot({ path: 'test/promo-nav-phone.png' });

  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
