// Restores the live Findter home screen to its default UI state after exploration
const { connect } = require('./lib');
(async () => {
  const { page, app } = await connect();
  await page.bringToFront(); await page.setViewportSize({ width: 1440, height: 1500 }); await page.waitForTimeout(1200);
  const guideOpen = () => app.evaluate(() => document.querySelector('#Onboarding\\ guide').getAttribute('aria-hidden') === 'false');
  if (!(await guideOpen())) { await app.locator('.title-collapsible').first().locator('s-icon').first().click(); await page.waitForTimeout(900); }
  for (let i = 0; i < 4; i++) {
    const collapsed = await app.evaluate(i => document.querySelectorAll('.bss-setup-guide .Polaris-Collapsible')[i].getAttribute('aria-hidden') === 'true', i);
    if (collapsed) { await app.locator(".grid-guide button").nth(i).click(); await page.waitForTimeout(700); }
  }
  console.log('steps expanded:', await app.evaluate(() => [...document.querySelectorAll('.bss-setup-guide .Polaris-Collapsible')].map(c => c.getAttribute('aria-hidden')).join(',')));
  await app.locator('.title-collapsible').first().locator('s-icon').first().click(); await page.waitForTimeout(900);
  console.log('guide open now?', await guideOpen());
  process.exit(0);
})();
