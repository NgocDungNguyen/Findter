const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  const r = await page.evaluate(() => [...document.querySelectorAll('nav img')].map(i => { const c = getComputedStyle(i), p = getComputedStyle(i.parentElement); return i.src.slice(-40) + ' filter=' + c.filter + ' bg=' + c.backgroundColor + ' opacity=' + c.opacity + ' mix=' + c.mixBlendMode + ' | parent filter=' + p.filter + ' size=' + i.width + ' pc=' + p.backgroundColor + ' rad=' + c.borderRadius; }));
  console.log(r.join('\n'));
  const mask = await page.evaluate(() => { const a = [...document.querySelectorAll('nav a')].find(a => a.innerText.trim() === 'Findter Filter & Search'); return a.querySelector('img').parentElement.outerHTML.slice(0, 600); });
  console.log(mask);
  process.exit(0);
})();
