// Every "Contact us" / "Let us know" link: opens the chat, sends the request, then the auto reply arrives
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'); const url = f => pathToFileURL(path.join(root, f)).href;
const SURE = 'Sure! Please describe your idea and include any examples, images, or reference links.';
const MF = "Sure! How many more metafields would you like to add? We'll review your request and get back to you shortly.";
const CASES = [
  ['filter.html', '[data-chat=filter]', 'Hi, I want to make a custom filter request', SURE],
  ['filter-boost.html', '[data-chat=filter]', 'Hi, I want to make a custom filter request', SURE],
  ['search.html', '[data-chat=search]', 'Hi, I want to make a custom search request', SURE],
  ['search-boost.html', '[data-chat=search]', 'Hi, I want to make a custom search request', SURE],
  ['metafield.html', '[data-chat=metafield]', 'Hi, I would like to have additional metafields', MF],
  ['features.html', '[data-chat=feature]', 'Hi, I want to make a feature request', SURE],
  ['design.html', '[data-chat=design]', 'Hi, I want to make a custom design request', SURE],
  ['design-product-grid.html', '[data-chat=design]', 'Hi, I want to make a custom design request', SURE],
];
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  for (const [f, sel, msg, reply] of CASES) {
    await p.goto(url(f)); await p.waitForTimeout(400);
    ok(await p.locator('.chat-panel.open').count() === 0, f + ': chat closed before the click');
    await p.locator(sel).first().scrollIntoViewIfNeeded(); await p.locator(sel).first().click(); await p.waitForTimeout(250);
    let msgs = await p.locator('.chat-panel__body .chat-msg').allInnerTexts();
    ok(await p.locator('.chat-panel.open').count() === 1 && msgs[msgs.length - 1] === msg, f + ': sends "' + msgs[msgs.length - 1] + '"');
    ok(p.url().endsWith(f), f + ': stays on the page');
    await p.waitForTimeout(1000);
    msgs = await p.locator('.chat-panel__body .chat-msg').allInnerTexts();
    ok(msgs.length === 3 && msgs[2] === reply, f + ': auto reply = "' + (msgs[2] || '').slice(0, 40) + '…"');
  }
  // design pages: the old feedback banner is gone, the new one reads "Looking for a custom design?" and sits under the tabs
  for (const f of ['design.html', 'design-product-grid.html']) {
    await p.goto(url(f)); await p.waitForTimeout(400);
    const txt = (await p.locator('#app').innerText()).replace(/\s+/g, ' ');
    ok(!/Got feedback/.test(txt) && !/Let us know/.test(txt), f + ': old feedback banner removed');
    ok(txt.includes('Looking for a custom design? Request a solution tailored to your needs. Contact us or Book a call with us.'), f + ': new banner text');
    ok(await p.locator('.Polaris-Banner').count() === 1, f + ': exactly one banner');
    const pos = await p.evaluate(() => { const bn = document.querySelector('.Polaris-Banner').getBoundingClientRect(), tabs = document.querySelector('.fdt-menu-tabs').getBoundingClientRect(), first = document.querySelector('.Polaris-ShadowBevel').getBoundingClientRect(); return bn.top >= tabs.bottom - 1 && bn.bottom <= first.top + 1; });
    ok(pos, f + ': banner sits directly under the tabs, above the content');
    await p.screenshot({ path: 'test/' + f.replace('.html', '') + '-banner.png' });
  }
  // Book a call: new tab, plain link (Filter + Search banners, design pages)
  for (const f of ['filter.html', 'filter-boost.html', 'search.html', 'search-boost.html', 'design.html', 'design-product-grid.html']) {
    await p.goto(url(f)); await p.waitForTimeout(300);
    const a = p.locator('a[href*=calendly]').first();
    ok((await a.getAttribute('href')) === 'https://calendly.com/flintverse-bsscommerce/30min' && (await a.getAttribute('target')) === '_blank', f + ': Book a call -> new tab, plain calendly link');
  }
  console.log('page errors:', errs.length ? errs.join('|') : 'none'); console.log(fails ? fails + ' FAILED' : 'all passed'); await b.close();
})();
