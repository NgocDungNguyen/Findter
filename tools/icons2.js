const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  const r = await page.evaluate(() => {
    const a = [...document.querySelectorAll('nav a')].find(a => a.innerText.trim() === 'Home');
    const ic = a.querySelector('[class*=Icon], span, i') ;
    const bg = [...a.querySelectorAll('*')].map(e => { const c = getComputedStyle(e); return e.tagName + '.' + e.className.toString().slice(0, 30) + ' | mask=' + (c.maskImage || c.webkitMaskImage || '').slice(0, 100) + ' | bgimg=' + c.backgroundImage.slice(0, 80) + ' | before=' + getComputedStyle(e, '::before').content; });
    return { html: a.outerHTML.slice(0, 1500), bg };
  });
  console.log(r.html); console.log(r.bg.join('\n'));
  process.exit(0);
})();
