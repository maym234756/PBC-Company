const fs = require('fs');
const ts = require('typescript');
const end = Number(process.argv[2] || 16592);
const lines = fs.readFileSync('apps/web/src/pages/DashboardPage.tsx', 'utf8').split(/\r?\n/);
const start = 15434;
const sourceText = lines.slice(start - 1, end).join('\n');
const sourceFile = ts.createSourceFile('prefix.tsx', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diagnostic = sourceFile.parseDiagnostics[0];
if (!diagnostic) {
  console.log('ok');
  process.exit(0);
}
const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
const position = diagnostic.start ?? 0;
const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(position);
const lineText = sourceText.split(/\r?\n/)[lineAndCharacter.line] ?? '';
console.log(`${lineAndCharacter.line + 1}:${lineAndCharacter.character + 1} ${message}`);
console.log(lineText);
process.exit(1);
