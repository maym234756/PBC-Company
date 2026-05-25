const fs = require('fs');
const ts = require('typescript');
const filePath = 'apps/web/src/pages/DashboardPage.tsx';
const source = fs.readFileSync(filePath, 'utf8');
const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, source);
const stack = [];
function push(kind, pos) { stack.push({ kind, pos }); }
function pop(expectedKind, pos) {
  const top = stack.pop();
  if (!top || top.kind !== expectedKind) {
    const lc = ts.getLineAndCharacterOfPosition(ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), pos);
    const topLc = top ? ts.getLineAndCharacterOfPosition(ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), top.pos) : null;
    console.log('mismatch at', `${lc.line + 1}:${lc.character + 1}`, 'token', ts.SyntaxKind[expectedKind], 'top', top ? `${ts.SyntaxKind[top.kind]} @ ${topLc.line + 1}:${topLc.character + 1}` : 'none');
    process.exit(0);
  }
}
let token = scanner.scan();
while (token !== ts.SyntaxKind.EndOfFileToken) {
  const pos = scanner.getTokenPos();
  if (token === ts.SyntaxKind.OpenBraceToken) push(token, pos);
  else if (token === ts.SyntaxKind.OpenParenToken) push(token, pos);
  else if (token === ts.SyntaxKind.OpenBracketToken) push(token, pos);
  else if (token === ts.SyntaxKind.CloseBraceToken) pop(ts.SyntaxKind.OpenBraceToken, pos);
  else if (token === ts.SyntaxKind.CloseParenToken) pop(ts.SyntaxKind.OpenParenToken, pos);
  else if (token === ts.SyntaxKind.CloseBracketToken) pop(ts.SyntaxKind.OpenBracketToken, pos);
  token = scanner.scan();
}
console.log('remaining', stack.length);
if (stack.length) {
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const item of stack.slice(-10)) {
    const lc = ts.getLineAndCharacterOfPosition(sf, item.pos);
    console.log(ts.SyntaxKind[item.kind], '@', `${lc.line + 1}:${lc.character + 1}`);
  }
}
