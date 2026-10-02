const fs = require('fs'); const { connect } = require('./lib');
const W = +process.argv[2] || 1440, H = +process.argv[3] || 1500, P = process.argv[4] || 'e';
(async () => {
  const { page, app } = await connect();
  await page.bringToFront(); await page.setViewportSize({ width: W, height: H });
  page.context().on('page', async p => { console.log('POPUP opened:', p.url()); setTimeout(() => p.close().catch(() => {}), 1500); });
  await page.waitForTimeout(1500);
  const snap = async n => { await page.waitForTimeout(800); await page.screenshot({ path: `cap/${P}-${n}.png` }); fs.writeFileSync(`cap/${P}-${n}.html`, await app.evaluate(() => document.querySelector('#app').outerHTML + document.querySelector('#PolarisPortalsContainer')?.outerHTML)); console.log('snap', n); };
  const step = async (n, fn) => { try { await fn(); await snap(n); } catch (e) { console.log('FAIL', n, e.message.split('\n')[0]); } };
  // make sure the date picker is closed
  await app.locator('button', { hasText: 'Cancel' }).click({ timeout: 3000 }).catch(() => {});
  await step('01-base', async () => {});
  await step('02-datepicker-custom', async () => { await app.locator('button', { hasText: 'Last 30 days' }).click(); await app.getByText('Custom', { exact: true }).click(); });
  await step('03-datepicker-last7', async () => app.getByText('Last 7 days', { exact: true }).click());
  await app.locator('button', { hasText: 'Cancel' }).click().catch(() => {});
  await page.waitForTimeout(500);
  console.log('chart btn', await app.evaluate(() => { const b=[...document.querySelectorAll('button[aria-describedby]')].pop(); return b.outerHTML.slice(0,300) + ' | parent:' + b.parentElement.outerHTML.slice(0,120); }));
  await step('05-tooltip-conversion', async () => app.locator('h3', { hasText: 'Conversion rate' }).hover());
  await step('06-click-enable-searchsuggest', async () => { await app.locator('.title-collapsible').first().locator('s-icon').first().click(); await page.waitForTimeout(700); await app.locator('s-button', { hasText: 'Enable search suggestion' }).click(); });
  const modalState = await app.evaluate(() => { const m = document.querySelector('#modal-select-theme'); return m ? { open: m.hasAttribute('open'), keys: Object.keys(m).slice(0, 5), vis: getComputedStyle(m).display } : null; });
  console.log('modal', JSON.stringify(modalState));
  process.exit(0);
})();
