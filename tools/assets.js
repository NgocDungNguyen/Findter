const fs = require('fs'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  await page.bringToFront(); await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(1200);
  const a = await page.evaluate(() => {
    const sk = [...document.querySelectorAll('svg')].find(s => s.querySelector('#IdleClipPath1, [id^=IdleClipPath]'));
    const hdrImg = [...document.querySelectorAll('img')].filter(i => i.getBoundingClientRect().width).map(i => i.src);
    const svgTop = [...document.querySelectorAll('svg')].filter(s => { const r = s.getBoundingClientRect(); return r.y < 50 && r.x > 200 && r.x < 300; }).map(s => s.outerHTML.slice(0, 400));
    const bell = [...document.querySelectorAll('button')].find(b => /Alerts Feed/.test(b.getAttribute('aria-label') || '')).querySelector('svg').outerHTML;
    const ph = [...document.querySelectorAll('[class*=Sidekick] input, input[name=sidekickMessage]')][0];
    return { sk: sk ? sk.outerHTML.replace(/\s*xmlns="[^"]*"/g, '') : null, hdrImg, svgTop, bell, skBox: sk ? JSON.stringify(sk.getBoundingClientRect()) : null };
  });
  const frameImgs = await page.frames().find(f => f !== page.mainFrame()).evaluate(() => 0);
  fs.writeFileSync('cap/assets.json', JSON.stringify(a));
  console.log(a.sk ? a.sk.length : 'no sk', a.hdrImg, a.svgTop.length, a.skBox);
  process.exit(0);
})();
