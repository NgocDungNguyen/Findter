const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url'); const fs = require('fs'); const { PNG } = require('pngjs');
const root = path.resolve(__dirname, '..');
// [page file, live capture key]
const pages = [['filter', 'filter'], ['search', 'search'], ['metafield', 'metafield'], ['filter-boost', 'filter-booster'], ['search-boost', 'search-booster'], ['ymm', 'ymm'], ['features', 'features'], ['design', 'design'], ['design-product-grid', 'design-tab2']];
const diff = (a, b) => { const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b)); const W = Math.min(A.width, B.width), H = Math.min(A.height, B.height); let n = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * A.width + x) * 4, j = (y * B.width + x) * 4; if (Math.abs(A.data[i] - B.data[j]) + Math.abs(A.data[i + 1] - B.data[j + 1]) + Math.abs(A.data[i + 2] - B.data[j + 2]) > 60) n++; } return (100 * n / (W * H)).toFixed(2) + '%'; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [file, key] of pages) for (const w of [1440, 390]) {
    const live = path.join(__dirname, 'cap/pages', `${key}-${w}.png`); if (!fs.existsSync(live)) continue;
    const h = PNG.sync.read(fs.readFileSync(live)).height;
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(`${file}@${w} PAGEERR ${e.message.slice(0, 160)}`)); p.on('console', m => m.type() === 'error' && !/ERR_|404|Failed to load/.test(m.text()) && errs.push(`${file}@${w} ${m.text().slice(0, 160)}`));
    await p.goto(pathToFileURL(path.join(root, file + '.html')).href); await p.waitForTimeout(2500);
    const out = path.join(__dirname, 'test', `pg-${file}-${w}.png`); await p.screenshot({ path: out });
    console.log(`${file.padEnd(20)} ${String(w).padStart(4)}px  differs from the live app by ${diff(out, live)}`);
    await p.close();
  }
  console.log('page errors:', errs.length ? '\n' + errs.join('\n') : 'none');
  await b.close();
})();
