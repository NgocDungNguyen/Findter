// usage: node t-measure.js <route> <file.html> <width>   -> prints rects of key elements, live vs local
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const [route, file, w] = process.argv.slice(2); const W = +w;
const SEL = ['.display-features-grid', '.display-features-grid > div', '.display-features-card-inner', '.display-features-card-preview', '.display-features-card-content', '.display-features-card-content h3', '.Polaris-Layout__Section', '.fdt-header', '.fdt-header__title'];
const measure = (sels) => sels.map(s => { const e = document.querySelector(s); if (!e) return s + ' -'; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return `${s.padEnd(46)} x${r.x.toFixed(0)} w${r.width.toFixed(0)} h${r.height.toFixed(0)} pad ${c.paddingTop}/${c.paddingRight}/${c.paddingBottom}/${c.paddingLeft}`; });
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222'); const pg = b.contexts()[0].pages()[0];
  await pg.setViewportSize({ width: W, height: 1500 });
  await pg.goto('https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf' + route, { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(9500);
  const app = pg.frames().find(f => f !== pg.mainFrame());
  console.log('LIVE\n' + (await app.evaluate(measure, SEL)).join('\n'));
  const l = await chromium.launch(); const p = await l.newPage({ viewport: { width: W, height: 1500 } });
  await p.goto(pathToFileURL(path.resolve(__dirname, '..', file)).href); await p.waitForTimeout(1500);
  console.log('LOCAL\n' + (await p.evaluate(measure, SEL)).join('\n')); await l.close(); process.exit(0);
})();
