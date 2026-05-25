const fs = require('fs');
const path = 'apps/web/src/pages/DashboardPage.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
const start = 3049;
const end = 3407;
lines.splice(start - 1, end - start + 1);
fs.writeFileSync(path, lines.join('\r\n'), 'utf8');
console.log('deleted stray sales tab block');
