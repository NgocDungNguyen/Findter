const fs = require('fs'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  await page.bringToFront(); await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(1500);
  const data = await page.evaluate(() => {
    const out = {}; const svgOf = e => { const s = e && e.querySelector('svg'); return s ? s.outerHTML : null; };
    const clean = s => s && s.replace(/ class="[^"]*"/g, '').replace(/ data-[\w-]+="[^"]*"/g, '');
    // nav links
    out.nav = [...document.querySelectorAll('nav a')].map(a => ({ text: a.innerText.trim(), href: a.getAttribute('href'), svg: clean(svgOf(a)), img: (a.querySelector('img') || {}).src || null, cls: a.className.toString().slice(0, 40) }));
    out.buttons = [...document.querySelectorAll('button, [role=button]')].filter(e => e.getBoundingClientRect().width).map(e => ({ label: (e.getAttribute('aria-label') || e.innerText || '').trim().slice(0, 50), svg: clean(svgOf(e)), x: Math.round(e.getBoundingClientRect().x), y: Math.round(e.getBoundingClientRect().y), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }));
    out.logo = (() => { const s = [...document.querySelectorAll('svg')].find(s => { const r = s.getBoundingClientRect(); return r.x < 60 && r.y < 50 && r.width > 15; }); return s ? clean(s.outerHTML) : null; })();
    out.topIcon = (document.querySelector('header img') || {}).src;
    out.imgs = [...document.querySelectorAll('img')].filter(i => i.getBoundingClientRect().width).map(i => ({ src: i.src.slice(0, 160), x: Math.round(i.getBoundingClientRect().x), y: Math.round(i.getBoundingClientRect().y), w: Math.round(i.getBoundingClientRect().width) }));
    out.avatarHtml = (() => { const e = [...document.querySelectorAll('button')].find(b => /brgmnnlukas/.test(b.innerText)); return e ? e.outerHTML.replace(/ class="[^"]*"/g, '').slice(0, 1800) : null; })();
    out.sidekickHtml = (() => { const e = [...document.querySelectorAll('*')].find(b => (b.getAttribute('aria-label') || '') === 'Open Sidekick'); let p = e; for (let i = 0; i < 5 && p; i++) p = p.parentElement; return p ? p.outerHTML.replace(/ class="[^"]*"/g, '').replace(/ style="[^"]*"/g, '').slice(0, 5000) : null; })();
    out.sectionHeaders = [...document.querySelectorAll('nav button')].map(b => ({ text: b.innerText.trim(), svg: clean(svgOf(b)) })).slice(0, 6);
    return out;
  });
  fs.writeFileSync('cap/icons.json', JSON.stringify(data, null, 1));
  console.log('nav', data.nav.length, 'buttons', data.buttons.length, 'imgs', data.imgs.length);
  data.nav.forEach(n => console.log(' nav:', JSON.stringify(n.text), n.svg ? 'svg ' + n.svg.length : '', n.img ? 'img ' + n.img.slice(0, 70) : ''));
  data.buttons.forEach(n => console.log(' btn:', JSON.stringify(n.label), n.svg ? 'svg ' + n.svg.length : '-', n.x + ',' + n.y, n.w + 'x' + n.h));
  data.imgs.forEach(n => console.log(' img:', n.src.slice(0, 100), n.x + ',' + n.y, n.w));
  process.exit(0);
})();
