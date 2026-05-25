const fs = require('fs');
const lines = fs.readFileSync('apps/web/src/pages/DashboardPage.tsx', 'utf8').split(/\r?\n/);
const start = 15434;
const end = 16735;
const text = lines.slice(start - 1, end).join('\n');
let state = 'code';
let braceDepth = 0;
const stack = [];
let line = start;
let col = 0;
function push(tag) {
  stack.push({ tag, line, col });
}
function pop(tag) {
  const top = stack.pop();
  if (!top || top.tag !== tag) {
    console.log(`mismatch at ${line}:${col} closing ${tag}, top ${top ? top.tag + ' from ' + top.line + ':' + top.col : 'none'}`);
    process.exit(0);
  }
}
for (let i = 0; i < text.length; i++) {
  const c = text[i];
  const n = text[i + 1];
  if (c === '\n') {
    line++;
    col = 0;
    continue;
  }
  col++;
  if (state === 'code') {
    if (c === '{') {
      braceDepth++;
      continue;
    }
    if (c === '}') {
      if (braceDepth > 0) braceDepth--;
      continue;
    }
    if (braceDepth > 0) {
      continue;
    }
    if (c === '<') {
      const close = text.slice(i).match(/^<\/([a-z][a-z0-9-]*)\s*>/i);
      if (close) {
        pop(close[1]);
        i += close[0].length - 1;
        col += close[0].length - 1;
        continue;
      }
      const open = text.slice(i).match(/^<([a-z][a-z0-9-]*)\b[^>]*?(\/?)>/i);
      if (open) {
        const tag = open[1];
        const selfClosing = /\/>$/.test(open[0]) || open[2] === '/';
        if (!selfClosing) push(tag);
        i += open[0].length - 1;
        col += open[0].length - 1;
        continue;
      }
    }
  }
}
console.log('remaining stack tail:', stack.slice(-30));
