const { connect } = require('./lib');
(async () => {
  console.log('connecting'); const { b, page, app } = await connect(); console.log('connected', !!app);
  const items = await app.evaluate(() => [...document.querySelectorAll('button, a, s-button, s-link, s-select, select, [role=button]')].map((e, i) => ({ i, tag: e.tagName.toLowerCase(), text: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 50), label: e.getAttribute('aria-label') || e.getAttribute('icon') || '', href: (e.getAttribute('href') || '').slice(0,60), box: (r => [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)])(e.getBoundingClientRect()) })));
  items.forEach(x => console.log(JSON.stringify(x)));
  process.exit(0);
})();
