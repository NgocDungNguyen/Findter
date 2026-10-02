const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  const iframes = await page.evaluate(() => [...document.querySelectorAll('iframe')].map(f => ({ name: f.name, src: f.src.slice(0,200), id: f.id, w: f.offsetWidth, h: f.offsetHeight })));
  console.log('iframes:', JSON.stringify(iframes, null, 1));
  console.log('viewport:', await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]));
  for (const f of page.frames()) {
    try { const t = await f.evaluate(() => document.body.innerText.slice(0, 300)); console.log('FRAME', f.url().slice(0,80), '=>', JSON.stringify(t)); }
    catch (e) { console.log('FRAME err', e.message.slice(0,100)); }
  }
  const cdp = await b.contexts()[0].newCDPSession(page);
  const { targetInfos } = await cdp.send('Target.getTargets');
  targetInfos.forEach(t => console.log('TARGET', t.type, t.url.slice(0,120)));
  await b.close();
})();
