const fs = require('fs');
const lines = fs.readFileSync('apps/web/src/pages/DashboardPage.tsx', 'utf8').split(/\r?\n/);
const start = 15434;
const end = 16735;
const text = lines.slice(start - 1, end).join('\n');
let state = 'code';
let quote = '';
const stack = [];
let line = start;
let col = 0;
function push(ch) {
  stack.push({ ch, line, col });
}
function pop(ch) {
  const top = stack.pop();
  if (!top || top.ch !== ch) {
    console.log(`mismatch at ${line}:${col} got ${ch}, top ${top ? top.ch + ' from ' + top.line + ':' + top.col : 'none'}`);
    process.exit(0);
  }
}
for (let i = 0; i < text.length; i++) {
  const c = text[i];
  const n = text[i + 1];
  if (c === '\n') {
    line++;
    col = 0;
    if (state === 'line') state = 'code';
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
console.log('remaining tail:', stack.slice(-20));
