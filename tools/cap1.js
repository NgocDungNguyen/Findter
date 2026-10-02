const fs = require('fs'); const { connect } = require('./lib');
(async () => {
  const { b, page, app } = await connect();
  console.log('frames', page.frames().map(f => f.url().slice(0,60)));
  const html = await app.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync('cap/app.html', html);
  const shell = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync('cap/shell.html', shell);
  console.log('app html', html.length, 'shell html', shell.length);
  console.log(await app.evaluate(() => [document.documentElement.scrollHeight, innerWidth, getComputedStyle(document.body).fontFamily, getComputedStyle(document.body).backgroundColor]));
  await b.close();
})();
