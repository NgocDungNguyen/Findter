// Opens a visible Chromium with a persistent profile + CDP port so the user can log in
// and other scripts (or Playwright MCP) can attach to the same session.
const { chromium } = require('playwright');
const path = require('path');

const URL = process.argv[2] || 'https://admin.shopify.com/store/brgmnnlukas/apps/findter-snf?appLoadId=09678a2d-2330-47cd-9036-832d0cfc41f0';

(async () => {
  const context = await chromium.launchPersistentContext(path.join(__dirname, 'profile-edge'), {
    channel: 'msedge',
    headless: false,
    viewport: null,
    args: ['--remote-debugging-port=9222', '--start-maximized'],
  });
  const page = context.pages()[0] || (await context.newPage());
  await page.goto(URL);
  console.log('Browser open. CDP on http://localhost:9222');
  context.on('close', () => process.exit(0));
  setInterval(() => {}, 1 << 30);
})();
