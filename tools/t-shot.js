const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const [W, H, name] = [+process.argv[2] || 1440, +process.argv[3] || 1500, process.argv[4] || 'desk'];
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: W, height: H } });
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 200)));
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href); await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, 'test', name + '.png') });
  console.log('errors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
