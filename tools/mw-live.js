// Measures every card on the LIVE Findter home screen (your Edge session) at phone widths
const { connect } = require('./lib');
(async () => {
  const { page, app } = await connect();
  await page.bringToFront();
  for (const w of [360, 390, 430]) {
    await page.setViewportSize({ width: w, height: 1200 }); await page.waitForTimeout(2200);
    const r = await app.evaluate(() => {
      const iw = document.documentElement.clientWidth;
      const cards = [...document.querySelectorAll('.Polaris-Layout > .Polaris-Layout__Section > .Polaris-ShadowBevel')].map(c => { const b = c.getBoundingClientRect(); const h = c.querySelector('h2,h3'); return `${(h ? h.textContent.trim() : '?').slice(0, 22).padEnd(22)} left=${Math.round(b.left)} width=${Math.round(b.width)} rightGap=${Math.round(iw - b.right)}`; });
      const wel = document.querySelector('.ft-welcome').getBoundingClientRect();
      return `iframe content width=${iw}\n  welcome  left=${Math.round(wel.left)} width=${Math.round(wel.width)}\n  ` + cards.join('\n  ');
    });
    console.log(`== viewport ${w}px\n  ${r}`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  process.exit(0);
})();
