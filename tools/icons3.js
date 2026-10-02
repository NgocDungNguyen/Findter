const fs = require('fs'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  await page.bringToFront(); await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(1200);
  const map = {};
  const harvest = async () => {
    const r = await page.evaluate(() => { const o = {}; const walk = root => root.querySelectorAll('*').forEach(e => { if (e.tagName.toLowerCase().includes('icon') && e.shadowRoot) { const s = e.shadowRoot.querySelector('svg'); const t = e.getAttribute('type') || e.getAttribute('source'); if (s && t && !o[t]) o[t] = s.outerHTML.replace(/ class="[^"]*"/g, ''); } if (e.shadowRoot) walk(e.shadowRoot); }); walk(document); return o; });
    Object.assign(map, r);
  };
  await harvest();
  const tryOpen = async (fn) => { try { await fn(); await page.waitForTimeout(900); await harvest(); } catch (e) { console.log('skip', e.message.split('\n')[0]); } await page.keyboard.press('Escape'); await page.waitForTimeout(500); };
  await tryOpen(() => page.locator('button[aria-label="More actions"]').first().click({ timeout: 4000 }));
  await tryOpen(() => page.getByRole('button', { name: /My Store Admin/i }).click({ timeout: 4000 }));
  await tryOpen(() => page.getByRole('button', { name: /Alerts Feed/i }).click({ timeout: 4000 }));
  await tryOpen(() => page.getByRole('button', { name: /Add files and more/i }).click({ timeout: 4000 }));
  await tryOpen(() => page.getByText('Ctrl K').first().click({ timeout: 4000 }));
  fs.writeFileSync('cap/iconmap.json', JSON.stringify(map));
  console.log(Object.keys(map).length, Object.keys(map).join(', '));
  process.exit(0);
})();
