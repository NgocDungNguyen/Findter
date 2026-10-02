const fs = require('fs'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = b.contexts()[0];
  ctx.pages().slice(1).forEach(p => p.close().catch(() => {}));
  const page = ctx.pages()[0];
  await page.bringToFront(); await page.setViewportSize({ width: 1440, height: 900 });
  const snap = async n => { await page.waitForTimeout(900); await page.screenshot({ path: `cap/s-${n}.png` }); console.log('snap', n); };
  const step = async (n, fn) => { try { await fn(); await snap(n); } catch (e) { console.log('FAIL', n, e.message.split('\n')[0]); } };
  const esc = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(400); };
  await step('01-base', async () => {});
  // list the shell's buttons/regions
  console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button, [role=button], [role=menuitem], input')].filter(e => e.getBoundingClientRect().width).map(e => (e.getAttribute('aria-label') || e.innerText || e.placeholder || e.tagName).trim().slice(0, 40) + '@' + Math.round(e.getBoundingClientRect().x) + ',' + Math.round(e.getBoundingClientRect().y)).slice(0, 40))));
  await step('02-menu-dots', async () => page.getByRole('button', { name: /more|actions|\.\.\./i }).last().click({ timeout: 5000 }));
  await esc();
  await step('03-search', async () => page.getByText('Ctrl K').first().click({ timeout: 5000 }));
  await esc();
  await step('04-account', async () => page.getByText('brgmnnlukas').last().click({ timeout: 5000 }));
  await esc();
  await step('05-bell', async () => page.getByRole('button', { name: /notification/i }).first().click({ timeout: 5000 }));
  await esc();
  await step('06-hover-nav', async () => page.getByText('Orders', { exact: true }).first().hover());
  await step('07-hover-sub', async () => page.getByText('Search', { exact: true }).nth(1).hover());
  await step('08-hover-saleschan', async () => page.getByText('Sales channels').first().hover());
  await step('09-collapse', async () => page.locator('button').nth(0).click({ timeout: 3000 }));
  process.exit(0);
})();
