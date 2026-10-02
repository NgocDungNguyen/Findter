const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
  await p.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href + '#/master/home'); await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(__dirname, 'test', 'v-hometab.png') }); await b.close(); })();
