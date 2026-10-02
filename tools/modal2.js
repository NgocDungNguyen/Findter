const fs = require('fs'); const { connect } = require('./lib');
(async () => {
  const { page, app } = await connect();
  console.log('tabs', page.context().pages().length);
  await page.bringToFront();
  const r = await app.evaluate(async () => { const m = document.querySelector('#modal-select-theme'); const fns = ['showOverlay', 'show', 'showModal'].filter(f => typeof m[f] === 'function'); if (fns[0]) await m[fns[0]](); return fns; });
  console.log('fns', r);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'cap/m-02-modal.png' });
  fs.writeFileSync('cap/m-02-modal-shadow.html', await app.evaluate(() => { const m = document.querySelector('#modal-select-theme'); return m.shadowRoot ? m.shadowRoot.innerHTML : 'none'; }));
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  process.exit(0);
})();
