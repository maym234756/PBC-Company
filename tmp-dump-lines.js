const fs = require('fs');
const path = 'apps/web/src/pages/DashboardPage.tsx';
const start = Number(process.argv[2]);
const end = Number(process.argv[3]);
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
for (let i = start; i <= end; i++) {
  console.log(`${i}: ${lines[i - 1] ?? ''}`);
}
