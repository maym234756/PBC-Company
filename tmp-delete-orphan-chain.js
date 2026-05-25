const fs = require('fs');
const path = 'apps/web/src/pages/DashboardPage.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
const start = 3048;
const end = 15786;
lines.splice(start - 1, end - start + 1);
fs.writeFileSync(path, lines.join('\r\n'), 'utf8');
console.log('deleted orphan sales tab chain');
