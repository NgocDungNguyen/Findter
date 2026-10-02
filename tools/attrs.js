const { connect } = require('./lib');
(async () => {
  const { page, app } = await connect();
  const r = await app.evaluate(() => {
    const pick = e => Object.fromEntries([...e.attributes].map(a => [a.name, a.value.slice(0, 80)]));
    return {
      btn6: pick(document.querySelectorAll('button, a, s-button, s-link, s-select, select, [role=button]')[6]),
      link14: pick(document.querySelectorAll('button, a, s-button, s-link, s-select, select, [role=button]')[14]),
      modal: pick(document.querySelector('s-modal')),
      scrollers: [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 5 && ['auto','scroll'].includes(getComputedStyle(e).overflowY)).map(e => e.tagName + '.' + e.className).slice(0, 5),
      docH: document.documentElement.scrollHeight, winH: innerHeight,
    };
  });
  console.log(JSON.stringify(r, null, 1));
  console.log('iframe box', JSON.stringify(await page.evaluate(() => { const f = document.querySelector('iframe[name=app-iframe]'); const r = f.getBoundingClientRect(); return [r.x, r.y, r.width, r.height, innerWidth, innerHeight]; })));
  process.exit(0);
})();
