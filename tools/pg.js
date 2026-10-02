const { connect } = require('./lib');
(async () => {
  const { page, app } = await connect();
  await page.bringToFront();
  for (const w of [1440, 1100, 800, 600, 489, 390]) {
    await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(1800);
    const r = await app.evaluate(() => {
      const p = document.querySelector('s-page'), s = p.firstElementChild;
      const g = e => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return `pad ${c.padding} | mar ${c.margin} | max ${c.maxWidth} | w ${Math.round(r.width)} x ${Math.round(r.x)}`; };
      const lay = document.querySelector('.Polaris-Layout');
      const card = document.querySelector('.Polaris-ShadowBevel');
      return `page: ${g(p)} || stack: ${g(s)} gap ${getComputedStyle(s).gap} || layout: ${g(lay)} || card: ${g(card)} rad ${getComputedStyle(card).borderRadius} || title ${getComputedStyle(document.querySelector('.ft-welcome__title')).fontSize} | iw ${innerWidth}`;
    });
    console.log(w, r);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  process.exit(0);
})();
