const { connect } = require('./lib');
(async () => {
  const { page, app } = await connect();
  await page.bringToFront(); await page.setViewportSize({ width: 1440, height: 1500 });
  const r = await app.evaluate(() => {
    const host = document.querySelector('s-select'); const sr = host.shadowRoot;
    const pick = (e) => { const c = getComputedStyle(e), b = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}.${e.className} ${Math.round(b.width)}x${Math.round(b.height)} disp=${c.display} pos=${c.position} pad=${c.padding} border=${c.borderTopWidth} ${c.borderTopStyle} ${c.borderTopColor} rad=${c.borderTopLeftRadius} bg=${c.backgroundColor} color=${c.color} font=${c.fontSize}/${c.fontWeight}/${c.lineHeight} appearance=${c.appearance} margin=${c.margin} minh=${c.minHeight} boxshadow=${c.boxShadow} width=${c.width}`; };
    const out = [pick(host)];
    sr.querySelectorAll('*').forEach(e => out.push('  ' + pick(e)));
    out.push('SVG: ' + [...sr.querySelectorAll('svg')].map(s => s.outerHTML.slice(0, 200)).join(' || '));
    out.push('PARENT: ' + pick(host.parentElement));
    return out.join('\n');
  });
  console.log(r);
  process.exit(0);
})();
