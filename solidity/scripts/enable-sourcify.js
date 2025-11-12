const fs = require('fs');
const path = 'hardhat.config.cjs';
let s = fs.readFileSync(path, 'utf8');

// add sourcify block at top-level if missing
if (!/sourcify:\s*\{[^}]*\}/m.test(s)) {
  s = s.replace(
    /module\.exports\s*=\s*\{/,
    'module.exports = {\n  sourcify: { enabled: true },'
  );
}

fs.writeFileSync(path, s);
console.log('sourcify enabled');
