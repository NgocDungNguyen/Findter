const { chromium } = require('playwright');
exports.connect = async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  const page = b.contexts()[0].pages()[0];
  let app;
  for (let i = 0; i < 30 && !app; i++) { app = page.frames().find(f => f.name() === 'app-iframe' || f !== page.mainFrame()); if (!app) await page.waitForTimeout(500); }
  return { b, page, app };
};
