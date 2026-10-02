const fs = require('fs'); const { connect } = require('./lib');
(async () => {
  const { page, app } = await connect();
  await page.bringToFront(); await page.setViewportSize({ width: 1440, height: 1500 });
  await page.waitForTimeout(2000);
  const out = await app.evaluate(() => {
    const res = []; 
    const sheets = [...document.styleSheets];
    for (const s of sheets) {
      let txt = '', ok = true;
      try { txt = [...s.cssRules].map(r => r.cssText).join('\n'); } catch (e) { ok = false; }
      res.push({ href: s.href, owner: s.ownerNode && s.ownerNode.tagName, ok, len: txt.length, txt });
    }
    (document.adoptedStyleSheets || []).forEach(s => res.push({ href: 'adopted', ok: true, len: [...s.cssRules].map(r => r.cssText).join('').length, txt: [...s.cssRules].map(r => r.cssText).join('\n') }));
    return res;
  });
  out.forEach((s, i) => { console.log(i, s.href, s.owner, s.ok, s.len); fs.writeFileSync(`cap/css-${i}.css`, s.txt); });
  process.exit(0);
})();
