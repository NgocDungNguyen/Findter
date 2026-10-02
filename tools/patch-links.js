const fs = require('fs');
let b = fs.readFileSync('build.js', 'utf8');
b = b.replace(':where([data-s]) a{color:inherit}', ':where([data-s]) a{color:inherit;text-decoration:none}');
b = b.replace('[data-s=s-link]:hover{text-decoration:underline}', '[data-s=s-link]:hover a,[data-s=s-link]:hover button{text-decoration:underline}');
b = b.replace('.fs-select__ic{width:16px;height:16px;', '.fs-select__ic{width:20px;height:20px;margin-right:-2px;');
fs.writeFileSync('build.js', b);
console.log(b.includes('text-decoration:none}'), b.includes('s-link]:hover a'), b.includes('margin-right:-2px'));
