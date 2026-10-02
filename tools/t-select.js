const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url'); const fs = require('fs'); const { PNG } = require('pngjs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1500 } });
  await p.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href); await p.waitForTimeout(1200);
  await p.locator('[data-card=guide] .title-collapsible').first().click(); await p.waitForTimeout(900);
  const clip = { x: 345, y: 345, width: 630, height: 220 };
  await p.screenshot({ path: path.join(__dirname, 'test', 'sel-mine.png'), clip });
  const box = await p.locator('.fs-select').first().boundingBox();
  console.log('select box', JSON.stringify(box));
  // change value via the native select and confirm the visible label follows
  await p.selectOption('.fs-select select', { index: 1 });
  console.log('label after change:', await p.locator('.fs-select__value').first().innerText());
  await p.screenshot({ path: path.join(__dirname, 'test', 'sel-mine-changed.png'), clip });
  await b.close();
  const src = PNG.sync.read(fs.readFileSync(path.join(__dirname, 'cap', 'd-01-guide-open.png')));
  const out = new PNG({ width: clip.width, height: clip.height });
  PNG.bitblt(src, out, clip.x - 5, clip.y, clip.width, clip.height, 0, 0); // original content sits 5px left in that capture (scrollbar)
  fs.writeFileSync(path.join(__dirname, 'test', 'sel-orig.png'), PNG.sync.write(out));
})();
