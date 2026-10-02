// How are s-switch / s-checkbox / s-number-field / s-image drawn? (read-only inspection of the live DOM)
const { chromium } = require('playwright');
const BASE = 'https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf';
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0]; await page.bringToFront(); await page.setViewportSize({ width: 1440, height: 1500 });
  const appFrame = () => page.frames().find(f => f !== page.mainFrame());
  const probe = (tags) => appFrame().evaluate((tags) => {
    const out = [];
    for (const tag of tags) {
      const els = [...document.querySelectorAll(tag)]; if (!els.length) { out.push(`## ${tag}: none`); continue; }
      const seen = new Set();
      els.slice(0, 6).forEach(el => {
        const key = tag + '|' + ['checked', 'disabled', 'value'].map(a => el.getAttribute(a)).join('|'); if (seen.has(key)) return; seen.add(key);
        const attrs = [...el.attributes].map(a => `${a.name}=${a.value.slice(0, 30)}`).join(' ');
        const sr = el.shadowRoot; const parts = [];
        if (sr) sr.querySelectorAll('*').forEach(p => { const c = getComputedStyle(p), r = p.getBoundingClientRect(); if (['STYLE', 'SLOT'].includes(p.tagName)) return; parts.push(`   <${p.tagName.toLowerCase()}${p.className ? '.' + p.className : ''}> ${Math.round(r.width)}x${Math.round(r.height)} bg=${c.backgroundColor} border=${c.borderTopWidth} ${c.borderTopColor} rad=${c.borderTopLeftRadius} color=${c.color} disp=${c.display} pos=${c.position}${p.tagName === 'INPUT' ? ' [type=' + p.type + ' checked=' + p.checked + ']' : ''}`); });
        out.push(`## ${tag} (${attrs}) host ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}\n${parts.slice(0, 14).join('\n')}`);
      });
    }
    return out.join('\n');
  }, tags);
  for (const [path, tags] of [['/ymm', ['s-switch', 's-image', 's-section', 's-grid']], ['/features', ['s-switch']], ['/design', ['s-checkbox', 's-switch', 's-grid-item']], ['/design/product-grid', ['s-switch', 's-number-field']]]) {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000);
    console.log(`\n=========== ${path}\n` + await probe(tags));
  }
  await page.goto(BASE + '?country=VN', { waitUntil: 'domcontentloaded' });
  process.exit(0);
})();
