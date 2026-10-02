const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  const r = await page.evaluate(() => {
    const out = {};
    const find = t => { let f; const walk = root => root.querySelectorAll('*').forEach(e => { if (!f && e.tagName.toLowerCase().includes('icon') && e.getAttribute('type') === t && e.shadowRoot) f = e; if (e.shadowRoot) walk(e.shadowRoot); }); walk(document); return f; };
    for (const t of ['home', 'search', 'chevron-right', 'discount']) {
      const el = find(t); if (!el) continue; const sr = el.shadowRoot; const svg = sr.querySelector('svg');
      const cs = getComputedStyle(svg), p = svg.querySelector('path'), pcs = getComputedStyle(p);
      out[t] = { svgAttrs: [...svg.attributes].map(a => a.name + '=' + a.value.slice(0, 30)).join(' '), pAttrs: [...p.attributes].map(a => a.name + '=' + a.value.slice(0, 20)).join(' '), svgFill: cs.fill, svgStroke: cs.stroke, svgSW: cs.strokeWidth, pFill: pcs.fill, pStroke: pcs.stroke, pSW: pcs.strokeWidth, pLinecap: pcs.strokeLinecap, pLinejoin: pcs.strokeLinejoin, size: cs.width + 'x' + cs.height, color: cs.color, style: [...sr.querySelectorAll('style')].map(s => s.textContent.slice(0, 300)).join(' | ') };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  process.exit(0);
})();
