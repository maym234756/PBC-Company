const fs = require('fs');
const s = fs.readFileSync('apps/web/src/pages/DashboardPage.tsx', 'utf8');
let state = 'code';
let quote = '';
const stack = [];
let line = 1;
let col = 0;
const push = (ch) => stack.push({ ch, line, col });
const pop = (ch) => {
  const top = stack.pop();
  if (!top || top.ch !== ch) {
    console.log(`mismatch at ${line}:${col} got ${ch} top ${top ? top.ch : 'none'} from ${top ? top.line + ':' + top.col : 'n/a'}`);
    process.exit(0);
  }
};
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  const n = s[i + 1];
  if (c === '\n') {
    line++;
    col = 0;
    if (state === 'line') {
      state = 'code';
    }
    continue;
  }
  col++;
  if (state === 'code') {
    if (c === '/' && n === '/') {
      state = 'line';
      i++;
      col++;
      continue;
    }
    if (c === '/' && n === '*') {
      state = 'block';
      i++;
      col++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      state = 'str';
      quote = c;
      continue;
    }
    if (c === '(' || c === '{' || c === '[') push(c);
    else if (c === ')') pop('(');
    else if (c === '}') pop('{');
    else if (c === ']') pop('[');
  } else if (state === 'line') {
    continue;
  } else if (state === 'block') {
    if (c === '*' && n === '/') {
      state = 'code';
      i++;
      col++;
    }
  } else if (state === 'str') {
    if (c === '\\') {
      i++;
      col++;
      continue;
    }
    if (c === quote) {
      state = 'code';
    }
  }
}
console.log(`done depth ${stack.length}`);
if (stack.length) {
  console.log(stack.slice(-20));
}
