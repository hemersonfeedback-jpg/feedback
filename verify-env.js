const fs = require('fs');
const path = require('path');
const files = ['server.js','verify-cloudinary.js','scripts/check_services.js'];
const vars = new Set();
for (const file of files) {
  const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const re = /process\.env\.([A-Z0-9_]+)/g;
  let m;
  while ((m = re.exec(text))) vars.add(m[1]);
}
const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const envVars = new Set(env.split(/\r?\n/).map(l => l.split('=')[0].trim()).filter(Boolean));
console.log('used vars:');
console.log([...vars].sort().join('\n'));
console.log('---');
console.log('env vars:');
console.log([...envVars].sort().join('\n'));
console.log('---');
console.log('missing in .env:');
console.log([...vars].filter(v => !envVars.has(v)).sort().join('\n') || '(none)');
console.log('extra in .env:');
console.log([...envVars].filter(v => !vars.has(v)).sort().join('\n') || '(none)');
