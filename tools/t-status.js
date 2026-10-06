const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..'); const url = f => pathToFileURL(path.join(root, f)).href;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  // ---- home status card
  await p.goto(url('index.html')); await p.waitForTimeout(500);
  const card = p.locator('[data-card=status]');
  const txt = (await card.innerText()).replace(/\s+/g, ' ');
  console.log('   status card:', txt);
  ok(/Plan\s*Trial/.test(txt), 'Plan row keeps the Trial badge');
  ok(/Expires on\s*Oct 12, 2026/.test(txt) && !/Renew on/.test(txt), 'trial: only "Expires on" is shown');
  ok(/Products indexed\s*1,240\s*\/\s*1,500/.test(txt), 'Products indexed 1,240 / 1,500');
  ok(/App embed\s*Active/.test(txt) && /Search suggestion\s*Active/.test(txt), 'App embed + Search suggestion rows');
  await card.screenshot({ path: 'test/status-1440.png' });
  ok(!/Shown on your storefront/.test(txt), 'helper text removed');
  const rowsY = await p.$$eval('[data-card=status] [data-st]', els => els.map(e => ({ k: e.dataset.st, y: Math.round(e.getBoundingClientRect().y), label: e.querySelector('p').getBoundingClientRect().x, badgeRight: Math.round(e.querySelector('[data-s=s-badge] > div, .st-badge').getBoundingClientRect().right) })));
  console.log('   rows', JSON.stringify(rowsY.map(r => r.k + '@' + r.y + ' right=' + r.badgeRight)));
  ok(new Set(rowsY.map(r => r.badgeRight)).size === 1, 'all values are right-aligned on the same edge');
  await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(300);
  await p.locator('[data-card=status]').scrollIntoViewIfNeeded(); await p.locator('[data-card=status]').screenshot({ path: 'test/status-390.png' });
  ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no horizontal overflow on phone');
  // ---- filter pages
  for (const f of ['filter.html', 'filter-boost.html', 'search.html']) {
    await p.setViewportSize({ width: 1440, height: 900 }); await p.goto(url(f)); await p.waitForTimeout(500);
    const t = (await p.locator('#app').innerText()).replace(/\s+/g, ' ');
    if (f !== 'search.html') {
      ok(/Looking for a custom filter solution\? Request a solution tailored to your needs\. Contact us or Book a call with us\./.test(t), f + ': new banner text');
      ok(!/Got feedback/.test(t), f + ': old feedback banner removed');
      ok(await p.locator('.Polaris-Banner').count() === 1, f + ': exactly one banner');
      const pos = await p.evaluate(() => { const tb = document.querySelector('.fdt-menu-tabs').getBoundingClientRect(), bn = document.querySelector('.Polaris-Banner').getBoundingClientRect(), card = document.querySelector('.Polaris-ShadowBevel').getBoundingClientRect(); return { tabsBottom: tb.bottom, bannerTop: bn.top, cardTop: card.top }; });
      ok(pos.bannerTop >= pos.tabsBottom - 1 && pos.bannerTop < pos.cardTop, f + ': banner is directly under the tabs, above the content');
      const href = await p.locator('.Polaris-Banner a').getAttribute('href'); ok(href === 'https://calendly.com/flintverse-bsscommerce/30min', f + ': Book a call -> ' + href);
      await p.locator('.Polaris-Banner a').evaluate(a => a.addEventListener('click', e => e.preventDefault(), { once: true }));
      await p.click('[data-act=custom-filter-request]'); await p.waitForTimeout(300);
      ok(await p.locator('.chat-panel.open').count() === 1, f + ': Contact us opens the chat');
      const msgs = await p.locator('.chat-panel__body .chat-msg').allInnerTexts();
      ok(msgs[msgs.length - 1] === 'Hi, I want to make a custom filter request', f + ': chat got the message "' + msgs[msgs.length - 1] + '"');
      await p.screenshot({ path: 'test/' + f.replace('.html', '') + '-banner.png' });
    }
    // same box as Search: compare computed geometry/typography
    const sig = await p.evaluate(() => { const b = document.querySelector('.Polaris-Banner'); const c = getComputedStyle(b.firstElementChild), t = getComputedStyle(b.querySelector('p')); const r = b.getBoundingClientRect(); return [c.borderRadius, c.padding, t.fontSize, t.fontWeight, t.color, getComputedStyle(b.querySelector('.Polaris-Box .Polaris-Box')).backgroundColor, Math.round(r.height)].join(' | '); });
    console.log('   ' + f + ' banner signature:', sig);
  }
  console.log('page errors:', errs.length ? errs.join('|') : 'none'); console.log(fails ? fails + ' FAILED' : 'all passed'); await b.close();
})();
