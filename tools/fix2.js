const fs = require('fs'); let c = fs.readFileSync('build/master.css', 'utf8');
const swap = (a, b) => { if (!c.includes(a)) throw new Error('missing ' + a); c = c.split(a).join(b); };
swap('height:26px;padding:0 11px;', 'height:26px;padding:0 8px;');
swap('@media (max-width:620px){.hl-grid{grid-template-columns:1fr}', '@media (max-width:620px){.hl-grid{grid-template-columns:minmax(0,1fr)}');
fs.writeFileSync('build/master.css', c); console.log('ok');
