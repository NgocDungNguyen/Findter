const fs = require('fs');
for (const f of ['build/master-block.js', 'build/app.js']) {
  let s = fs.readFileSync(f, 'utf8');
  const from = "let sec = p.classList.contains('Polaris-Layout__Section') && p.parentElement === leftHost ? p : null;";
  const to = "let sec = p && p.classList.contains('Polaris-Layout__Section') && p.parentElement === leftHost ? p : null;";
  if (!s.includes(from)) { console.log('anchor missing in', f); continue; }
  fs.writeFileSync(f, s.split(from).join(to)); console.log('fixed', f);
}
