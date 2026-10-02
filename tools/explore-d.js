const fs = require('fs'); const { connect } = require('./lib');
const W = +process.argv[2] || 1440, H = +process.argv[3] || 1500, P = process.argv[4] || 'd';
(async () => {
  const { page, app } = await connect();
  await page.setViewportSize({ width: W, height: H });
  await page.waitForTimeout(2500);
  const snap = async n => { await page.waitForTimeout(700); await page.screenshot({ path: `cap/${P}-${n}.png` }); fs.writeFileSync(`cap/${P}-${n}.html`, await app.evaluate(() => document.querySelector('#app').outerHTML)); console.log('snap', n); };
  const step = async (n, fn) => { try { await fn(); await snap(n); } catch (e) { console.log('FAIL', n, e.message.split('\n')[0]); } };
  const btn = i => app.locator('button, a, s-button, s-link, s-select, select, [role=button]').nth(i);
  await snap('00-initial');
  // 1. onboarding guide chevron (click the title row, avoiding the X)
  await step('01-guide-open', async () => app.locator('.title-collapsible').first().locator('s-icon[type=chevron-right]').click());
  // 2. inner step collapsibles: toggle each, then restore
  await step('02-inner-collapsed-1', async () => app.locator('.grid-guide button').nth(0).click());
  await step('03-inner-collapsed-2', async () => app.locator('.grid-guide button').nth(1).click());
  await step('04-inner-collapsed-3', async () => app.locator('.grid-guide button').nth(2).click());
  await step('05-inner-collapsed-4', async () => app.locator('.grid-guide button').nth(3).click());
  for (let i = 0; i < 4; i++) await app.locator('.grid-guide button').nth(i).click();
  await page.waitForTimeout(800);
  // 3. theme select options (read only)
  const opts = await app.evaluate(() => [...document.querySelectorAll('s-select')].map(s => [...s.querySelectorAll('s-option')].map(o => o.textContent.trim() + ' | ' + o.value)));
  console.log('select options', JSON.stringify(opts));
  await step('06-select-open', async () => app.locator('s-select').first().click());
  await page.keyboard.press('Escape');
  // 4. hover primary buttons inside guide
  await step('07-hover-gotofilter', async () => app.locator('button', { hasText: 'Go to filter' }).hover());
  await step('08-hover-searchsettings', async () => app.locator('button', { hasText: 'Search settings page' }).hover());
  await step('09-hover-enable-searchsuggest', async () => app.locator('s-button', { hasText: 'Enable search suggestion' }).hover());
  // 5. collapse guide again
  await step('10-guide-closed-again', async () => app.locator('.title-collapsible').first().locator('s-icon').first().click());
  // 6. carousel
  await step('11-carousel-prev', async () => app.locator('button[aria-label="Previous app"]').click());
  await step('12-carousel-next', async () => app.locator('button[aria-label="Next app"]').click());
  await step('13-carousel-next2', async () => app.locator('button[aria-label="Next app"]').click());
  await step('14-hover-viewapp', async () => app.locator('button:has-text("View app")').filter({ visible: true }).first().hover());
  // 7. date picker + chart toggle
  await step('15-datepicker', async () => app.locator('button', { hasText: 'Last 30 days' }).click());
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await step('16-chart-btn-hover', async () => app.locator('.date-picker-activator').locator('xpath=ancestor::div[contains(@class,"Polaris-Box")][1]/following-sibling::div//button').hover());
  await step('17-tooltip-total-sessions', async () => app.locator('h3', { hasText: 'Total sessions' }).hover());
  await step('18-hover-livechat', async () => app.locator('button', { hasText: 'Live chat' }).hover());
  await step('19-hover-bookcall', async () => app.locator('button', { hasText: 'Book a call' }).hover());
  await step('20-hover-manualsync', async () => app.locator('button', { hasText: 'Manual sync' }).hover());
  process.exit(0);
})();
