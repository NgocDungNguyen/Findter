const fs = require('fs'); const { connect } = require('./lib');
(async () => {
  const { page, app } = await connect();
  await page.bringToFront();
  await page.setViewportSize({ width: 1440, height: 1500 });
  page.context().on('page', p => { console.log('POPUP:', p.url()); setTimeout(() => p.close().catch(() => {}), 1500); });
  await app.evaluate(() => document.querySelector('button')); 
  const t = await app.evaluate(() => document.querySelector('.title-collapsible s-icon').getAttribute('type')); console.log('chevron', t);
if (t === 'chevron-right') { await app.locator('.title-collapsible').first().locator('s-icon').first().click(); await page.waitForTimeout(900); }
  await app.locator('.grid-guide button').nth(1).click(); await page.waitForTimeout(900);
const btn = app.locator('s-button', { hasText: 'Enable search suggestion' });
  console.log('btn box', JSON.stringify(await btn.boundingBox()));
  await btn.click({ timeout: 8000 });
  await page.waitForTimeout(1800);
  console.log('after click pages', page.context().pages().length);
  await page.screenshot({ path: 'cap/m-01-after-enable-click.png' });
  console.log('modal', await app.evaluate(() => { const m = document.querySelector('#modal-select-theme'); return JSON.stringify({ attrs: [...m.attributes].map(a => a.name), rect: m.getBoundingClientRect().toJSON(), shadow: !!m.shadowRoot }); }));
  process.exit(0);
})();
