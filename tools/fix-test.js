const fs = require('fs'); let t = fs.readFileSync('t-master.js', 'utf8');
const a = t.indexOf("    const card = document.querySelector('[data-card=guide]');"); const e = t.indexOf("return 'LEFT='");
t = t.slice(0, a) + "    const left = document.querySelector('#app > .Polaris-Layout:not([hidden]) .Polaris-Layout .Polaris-Layout, #app .Polaris-Layout .Polaris-Layout'); const right = document.querySelector('.Polaris-Layout__Section--oneThird > .Polaris-BlockStack');\n    " + t.slice(e);
t = t.split(".sh-nav a[aria-current=page]').first()").join(".sh-appgroup a[aria-current=page]').first()");
fs.writeFileSync('t-master.js', t);
