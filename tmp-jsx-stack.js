const fs = require('fs');
const lines = fs.readFileSync('apps/web/src/pages/DashboardPage.tsx', 'utf8').split(/\r?\n/);
const start = 15434;
const end = 16735;
const text = lines.slice(start - 1, end).join('\n');
const stack = [];
let line = start;
for (const rawLine of text.split(/\r?\n/)) {
  let i = 0;
  while (i < rawLine.length) {
    const open = rawLine.slice(i).match(/^<([a-z][a-z0-9-]*)\b[^>]*?(\/?)>/i);
    const close = rawLine.slice(i).match(/^<\/([a-z][a-z0-9-]*)\s*>/i);
    if (open) {
      const tag = open[1];
      const selfClosing = /\/$/.test(open[0]) || open[2] === '/';
      if (!selfClosing) stack.push({ tag, line });
      i += open[0].length;
      continue;
    }
    if (close) {
      const tag = close[1];
      const top = stack.pop();
      if (!top || top.tag !== tag) {
        console.log(`mismatch at ${line}: closing ${tag}, top ${top ? top.tag + ' from ' + top.line : 'none'}`);
        process.exit(0);
      }
      i += close[0].length;
      continue;
    }
    i++;
  }
  line++;
}
console.log('open stack tail:', stack.slice(-20));
