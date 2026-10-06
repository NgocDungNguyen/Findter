const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'); const url = f => pathToFileURL(path.join(root, f)).href;
const REPLY = "We'd love to hear it! Please describe your idea as specifically as you can, feel free to include sample text, sample images, or reference links, and we'll get back to you shortly.";
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  for (const [f, word] of [['filter.html', 'filter'], ['filter-boost.html', 'filter'], ['search.html', 'search']]) {
    await p.goto(url(f)); await p.waitForTimeout(400);
    ok(await p.locator('.chat-panel.open').count() === 0, f + ': chat is closed before the click');
    await p.locator('.Polaris-Banner button', { hasText: 'Contact us' }).click(); await p.waitForTimeout(250);
    let msgs = await p.locator('.chat-panel__body .chat-msg').allInnerTexts();
    ok(await p.locator('.chat-panel.open').count() === 1 && msgs[msgs.length - 1] === `Hi, I want to make a custom ${word} request`, f + ': sends "' + msgs[msgs.length - 1] + '"');
    await p.waitForTimeout(1000);
    msgs = await p.locator('.chat-panel__body .chat-msg').allInnerTexts();
    ok(msgs.length === 3 && msgs[2] === REPLY, f + ': auto reply arrives after the message');
    const align = await p.$$eval('.chat-panel__body .chat-msg', els => els.slice(-2).map(e => getComputedStyle(e).marginLeft));
    ok(align[0] !== align[1], f + ': message (right) and reply (left) sit on different sides');
    const href = await p.locator('.Polaris-Banner a').getAttribute('href'); ok(href === 'https://calendly.com/flintverse-bsscommerce/30min' || /calendly\.com\/flintverse-bsscommerce\/30min/.test(href), f + ': Book a call -> ' + href);
    ok(await p.locator('.Polaris-Banner a').getAttribute('target') === '_blank', f + ': Book a call opens in a new tab');
    if (f === 'filter.html') await p.screenshot({ path: 'test/chat-filter.png' });
  }
  console.log('page errors:', errs.length ? errs.join('|') : 'none'); console.log(fails ? fails + ' FAILED' : 'all passed'); await b.close();
})();
