const { connect } = require('./lib');
(async () => {
  const { page, app } = await connect();
  await page.bringToFront();
  for (const w of [1440, 1100, 800, 489]) {
    await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(1800);
    const r = await app.evaluate(() => {
      const out = []; let e = document.querySelector('.ft-welcome');
      const chain = []; let n = e;
      while (n && n !== document.documentElement) { chain.push(n); n = n.parentNode && n.parentNode.host ? n.parentNode.host : n.parentElement; if (chain.length > 12) break; }
      // include shadow-internal wrappers around s-page
      const sp = document.querySelector('s-page');
      const shadowInfo = sp.shadowRoot ? [...sp.shadowRoot.querySelectorAll('*')].map(x => x.tagName.toLowerCase() + '.' + x.className + ' pad=' + getComputedStyle(x).padding + ' max=' + getComputedStyle(x).maxWidth + ' w=' + Math.round(x.getBoundingClientRect().width) + ' disp=' + getComputedStyle(x).display).join('\n   ') : 'noshadow';
      return chain.map(x => x.tagName.toLowerCase() + '.' + (x.className || '') + ' pad=' + getComputedStyle(x).padding + ' mar=' + getComputedStyle(x).margin + ' max=' + getComputedStyle(x).maxWidth + ' w=' + Math.round(x.getBoundingClientRect().width) + ' disp=' + getComputedStyle(x).display).join('\n  ') + '\n SHADOW:\n   ' + shadowInfo + '\n body pad=' + getComputedStyle(document.body).padding + ' mar=' + getComputedStyle(document.body).margin;
    });
    console.log('=== ' + w + '\n  ' + r);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  process.exit(0);
})();
