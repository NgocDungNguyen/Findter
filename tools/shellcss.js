const fs = require('fs'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  await page.bringToFront(); await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(1500);
  const rows = await page.evaluate(() => {
    const out = [];
    const pick = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return { t: e.tagName.toLowerCase(), cls: (e.className && e.className.baseVal === undefined ? e.className : '').toString().slice(0, 50), txt: (e.childElementCount === 0 ? e.textContent.trim().slice(0, 28) : ''), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), col: c.color, bg: c.backgroundColor, fs: c.fontSize, fw: c.fontWeight, lh: c.lineHeight, pad: c.padding, rad: c.borderRadius, ff: c.fontFamily.slice(0, 24), sh: c.boxShadow !== 'none' ? c.boxShadow.slice(0, 60) : '', br: c.borderTopWidth !== '0px' ? c.border : '' }; };
    // sidebar + topbar + frame: elements in the left 220px or top 58px, interesting ones only
    const all = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && ((r.x < 225 && r.right <= 230) || (r.y < 58 && r.x >= 220)) && !e.closest('svg') && e.tagName !== 'path'; });
    all.forEach(e => out.push(pick(e)));
    out.unshift({ body: getComputedStyle(document.body).backgroundColor, bodyFont: getComputedStyle(document.body).fontFamily });
    return out;
  });
  fs.writeFileSync('cap/shell-styles.json', JSON.stringify(rows, null, 0));
  console.log(rows.length);
  rows.slice(0, 5).forEach(r => console.log(JSON.stringify(r)));
  process.exit(0);
})();
