const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  await page.bringToFront();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'cap/mob-02-viewport.png' });
  await page.getByRole('button', { name: 'Menu' }).click({ timeout: 5000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'cap/mob-03-menu.png' });
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  await page.locator('button[aria-label="More actions"]').first().click({ timeout: 5000 }).catch(e => console.log('dots fail'));
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'cap/mob-04-dots.png' });
  await page.keyboard.press('Escape');
  process.exit(0);
})();
