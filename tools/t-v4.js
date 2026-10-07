const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const out = n => path.join(__dirname, 'test', n + '.png');
const log = (...a) => console.log(...a);
const svg = (n, h, c) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${h}" viewBox="0 0 1200 ${h}"><rect width="1200" height="${h}" fill="${c}"/><text x="50%" y="50%" fill="#fff" font-family="Arial" font-size="${h / 4}" text-anchor="middle" dominant-baseline="middle">Banner ${n}</text></svg>`;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1200 } });
  await ctx.route('https://img.test/**', r => { const n = +(r.request().url().match(/b(\d)/) || [])[1] || 1; r.fulfill({ contentType: 'image/svg+xml', body: svg(n, [300, 400, 250][n % 3], ['#d4380d', '#096dd9', '#389e0d', '#722ed1'][(n - 1) % 4]) }); });
  const errs = []; const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 200))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  await p.addInitScript(() => { try { if (localStorage.getItem('findter.promos.v2') === null) localStorage.setItem('findter.promos.v2', '[]'); } catch (e) {} });   // start without the default banners: this test adds its own
  await p.goto(url + '#/master/home'); await p.waitForTimeout(900);
  const visible = () => p.evaluate(() => [...document.querySelectorAll('[data-card]')].filter(c => c.offsetParent !== null).map(c => c.dataset.card.replace(/^promo:.*/, 'PROMO')).join(','));
  const names = side => p.locator(`.hl-list[data-side=${side}] .hl-name`).allInnerTexts();
  const dirtyUI = () => p.evaluate(() => ({ badge: !document.querySelector('.hl-status').hidden, dot: document.querySelector('.mt-tab[data-tab=home]').classList.contains('has-changes'), saveEnabled: !document.querySelector('[data-act=hl-save]').disabled }));
  const addPromo = async (side, name, nums) => {
    await p.locator(`.hl-col--${side} .hl-add`).click(); await p.waitForTimeout(250);
    await p.fill('#pm-name', name);
    for (let i = 0; i < nums.length; i++) { if (i > 0) await p.locator('[data-act=pm-add]').click(); await p.fill(`input[data-f=url][data-i="${i}"]`, `https://img.test/b${nums[i]}.svg`); }
    await p.locator('[data-act=pm-save]').click(); await p.waitForTimeout(350);
  };
  const gotoHome = async () => { await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(500); };
  const gotoEditor = async () => { await p.evaluate(() => { location.hash = '#/master/home'; }); await p.waitForTimeout(500); };

  /* ===== 1. everything is a draft until Save ===== */
  log('1. initial          :', JSON.stringify(await dirtyUI()));
  await addPromo('left', 'Desktop promo', [1, 2, 3]);
  log('   after add       : editor left =', (await names('left')).join(' | '), '|', JSON.stringify(await dirtyUI()));
  log('   modal button    : "Save banner" used; toast =', await p.locator('#toast').innerText());
  await gotoHome(); log('   homepage (before Save)  :', await visible());
  await gotoEditor(); log('   back in editor           :', JSON.stringify(await dirtyUI()), '(draft kept while switching tabs)');
  await p.locator('[data-act=hl-discard]').click(); log('   Discard         : editor left =', (await names('left')).join(' | '), '|', JSON.stringify(await dirtyUI()));
  await addPromo('left', 'Desktop promo', [1, 2, 3]); await addPromo('mobile', 'Phone promo', [4]); await addPromo('right', 'Right promo', [2]);
  await p.locator('[data-act=hl-save]').click(); await p.waitForTimeout(400);
  log('   after Save      :', JSON.stringify(await dirtyUI()));
  await gotoHome(); log('   desktop homepage        :', await visible());
  // edit + delete are drafts too
  await gotoEditor(); await p.locator('.hl-col--left .hl-item[data-id^="promo:"] [data-act=hl-edit]').click(); await p.fill('#pm-name', 'Renamed promo'); await p.locator('[data-act=pm-save]').click(); await p.waitForTimeout(300);
  await gotoHome(); log('2. homepage label before Save :', await p.locator('.pb-viewport').first().getAttribute('aria-label'));
  await gotoEditor(); await p.locator('[data-act=hl-save]').click(); await p.waitForTimeout(300); await gotoHome();
  log('   homepage label after Save  :', await p.locator('.pb-viewport').first().getAttribute('aria-label'));
  await gotoEditor(); await p.locator('.hl-col--right .hl-item[data-id^="promo:"] [data-act=hl-delete]').click(); await p.locator('[data-act=dm-delete]').click(); await p.waitForTimeout(250);
  await gotoHome(); log('   right promo deleted (not saved) -> homepage still has:', await visible());
  await gotoEditor(); await p.locator('[data-act=hl-save]').click(); await p.waitForTimeout(300); await gotoHome(); log('   after Save      :', await visible());

  /* ===== 3. banner arrows + X ===== */
  const multi = p.locator('.pb-card').first();
  log('3. arrows          : multi-banner block has', await multi.locator('.pb-nav').count(), 'arrows,', await multi.locator('.pb-x').count(), 'X');
  await p.evaluate(() => document.querySelector('.sh-scroll').scrollTo(0, 9999)); await p.waitForTimeout(400);
  await p.mouse.move(5, 5);
  const tr = () => multi.locator('.pb-track').evaluate(e => e.style.transform);
  const t0 = await tr(); await multi.locator('.pb-nav--next').click(); await p.waitForTimeout(150); const t1 = await tr(); await multi.locator('.pb-nav--next').click(); await p.waitForTimeout(150); const t2 = await tr(); await multi.locator('.pb-nav--next').click(); await p.waitForTimeout(150); const t3 = await tr(); await multi.locator('.pb-nav--prev').click(); await p.waitForTimeout(150); const t4 = await tr();
  log('   next,next,next,prev:', [t0, t1, t2, t3, t4].join(' -> '));
  await p.screenshot({ path: out('w-01-banner-arrows-desktop') });
  await multi.locator('.pb-x').click(); await p.waitForTimeout(250);
  log('   X closes block  : banner hidden =', await multi.evaluate(e => e.hidden || e.offsetParent === null), '| homepage:', await visible());
  await p.reload(); await p.waitForTimeout(900); log('   after reload    :', await visible());

  /* ===== 4. desktop vs mobile banners are separate ===== */
  await p.setViewportSize({ width: 390, height: 2600 }); await p.waitForTimeout(800);
  log('4. phone homepage  :', await visible());
  const phoneCard = p.locator('.pb-card'); log('   phone banner block: arrows', await phoneCard.locator('.pb-nav').count(), '(single banner => none) | X', await phoneCard.locator('.pb-x').count());
  await p.screenshot({ path: out('w-02-phone-home') });

  /* ===== 5. widths across the whole mobile range, with banners present ===== */
  for (const w of [320, 360, 390, 430, 489, 500, 600, 700, 767]) {
    await p.setViewportSize({ width: w, height: 2600 }); await p.waitForTimeout(550);
    const m = await p.evaluate(() => { const cw = document.querySelector('.sh-scroll').clientWidth; const rows = [...document.querySelectorAll('[data-card]')].filter(c => c.offsetParent !== null).map(c => { const r = c.getBoundingClientRect(); return { left: Math.round(r.left), width: Math.round(r.width), gap: Math.round(cw - r.right) }; }); return { cw, rows }; });
    const u = k => [...new Set(m.rows.map(r => r[k]))];
    log(`5. ${String(w).padStart(3)}px  blocks ${m.rows.length}  lefts ${JSON.stringify(u('left'))} widths ${JSON.stringify(u('width'))} gaps ${JSON.stringify(u('gap'))}  ${u('left').length === 1 && u('width').length === 1 && u('gap').length === 1 ? 'UNIFORM' : 'NOT UNIFORM <<<<'}`);
  }
  await p.setViewportSize({ width: 600, height: 2000 }); await p.waitForTimeout(500); await p.screenshot({ path: out('w-03-w600') });
  await p.setViewportSize({ width: 1440, height: 1200 }); await p.waitForTimeout(500);
  // mobile modal copy
  await gotoEditor(); await p.locator('.hl-col--mobile .hl-add').click(); await p.waitForTimeout(250);
  log('6. mobile modal    :', await p.locator('#pm-target').innerText(), '|', (await p.locator('#pm-target-note').innerText()).trim());
  await p.screenshot({ path: out('w-04-mobile-modal') });
  await p.locator('.pm__x').click();
  await p.locator('.hl-col--left .hl-add').click(); await p.waitForTimeout(250); log('   desktop modal   :', await p.locator('#pm-target').innerText(), '|', (await p.locator('#pm-target-note').innerText()).trim()); await p.locator('.pm__x').click();
  // dirty tab guard: leave a pending change and check beforeunload registers
  log('page errors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
