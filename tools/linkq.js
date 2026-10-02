const { connect } = require('./lib');
(async () => {
  const { page, app } = await connect();
  await page.bringToFront(); await page.setViewportSize({ width: 1440, height: 1500 });
  await page.mouse.move(2, 700);
  const r = await app.evaluate(() => [...document.querySelectorAll('s-link')].map(h => {
    const inner = h.shadowRoot && h.shadowRoot.querySelector('a, button');
    const cs = inner ? getComputedStyle(inner) : null; const light = getComputedStyle(h);
    return (h.textContent.trim().slice(0, 24) + ' | tone=' + h.getAttribute('tone') + ' | inner=' + (inner ? inner.tagName : '-') + ' deco=' + (cs && cs.textDecorationLine) + ' color=' + (cs && cs.color) + ' weight=' + (cs && cs.fontWeight) + ' | host deco=' + light.textDecorationLine + ' | parent deco=' + getComputedStyle(h.parentElement).textDecorationLine);
  }).join('\n'));
  console.log(r);
  process.exit(0);
})();
