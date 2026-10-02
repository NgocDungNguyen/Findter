const fs = require('fs'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  await page.bringToFront(); await page.keyboard.press('Escape');
  // restore expanded nav on desktop first (it persisted as collapsed)
  await page.setViewportSize({ width: 390, height: 2600 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'cap/mob-01-full.png' });
  const app = page.frames().find(f => f !== page.mainFrame());
  fs.writeFileSync('cap/mob-app.html', await app.evaluate(() => document.querySelector('#app').outerHTML));
  console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button, [role=button]')].filter(e => e.getBoundingClientRect().width).map(e => (e.getAttribute('aria-label') || e.innerText || '').trim().slice(0, 40) + '@' + Math.round(e.getBoundingClientRect().x) + ',' + Math.round(e.getBoundingClientRect().y)).slice(0, 30))));
  process.exit(0);
})();
