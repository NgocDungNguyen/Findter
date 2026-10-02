const { connect } = require('./lib');
(async () => { const { page } = await connect(); await page.bringToFront(); await page.screenshot({ path: 'now.png' }); process.exit(0); })();
