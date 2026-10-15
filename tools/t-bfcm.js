// BFCM homepage promotion: final images load, desktop + phone, and an older saved promotion moves to the final desktop image.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const home = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h, name] of [[1440, 1000, 'desktop'], [390, 900, 'phone']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(e.message));
    await p.goto(home); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2500);
    const img = await p.$eval('[data-card=promotion] .pr-img', i => ({ src: i.currentSrc || i.src, w: i.naturalWidth, h: i.naturalHeight, box: i.getBoundingClientRect().width })).catch(() => null);
    ok(!!img && img.w > 0, name + ': banner image loaded ' + (img ? img.w + 'x' + img.h + ' shown ' + Math.round(img.box) + 'px' : 'none'));
    ok(!!img && (name === 'desktop' ? /BFCM_Discount_2534x640/.test(img.src) : /BFCM_Promotion_Banner_Homepage_Mobile\.png\?v=1791883640/.test(img.src)), name + ': ' + (img && img.src.split('/').pop()));
    await p.locator('[data-card=promotion]').scrollIntoViewIfNeeded(); await p.locator('[data-card=promotion]').screenshot({ path: path.join(__dirname, 'test', 'bfcm-' + name + '.png') });
    await p.close();
  }
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto(home); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('findter.promotions.v1', JSON.stringify([{ sku: 'promo-bfcm', name: 'BFCM', deadline: '2026-12-03T23:59', enabled: true, desktop: 'https://cdn.shopify.com/s/files/1/0765/0302/3847/files/BFCM_Promotion_Banner_Homepage_Desktop.png?v=1791883623', mobile: 'https://cdn.shopify.com/s/files/1/0765/0302/3847/files/BFCM_Promotion_Banner_Homepage_Mobile.png?v=1791883640', types: ['Trial', 'Free', 'Development store'], code: 'BFCM2025', link: '/pricing' }])); });
  await p.reload(); await p.waitForTimeout(800);
  ok(/BFCM_Discount_2534x640/.test(await p.$eval('[data-card=promotion] .pr-img', i => i.src)), 'older saved promotion now shows the final desktop image');
  console.log('page errors:', errs.length ? errs.join(' | ') : 'none'); console.log(fails ? fails + ' FAILED' : 'all passed'); await b.close();
})();
