const { connect } = require('./lib');
(async () => {
  const { page, app } = await connect();
  console.log('main', await Promise.race([page.evaluate(() => 1+1), new Promise(r => setTimeout(() => r('TIMEOUT'), 8000))]));
  console.log('app', await Promise.race([app.evaluate(() => typeof window.__obs + ' ' + document.readyState), new Promise(r => setTimeout(() => r('TIMEOUT'), 8000))]));
  process.exit(0);
})();
