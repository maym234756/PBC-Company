const fs = require('fs');
const path = 'apps/web/src/pages/DashboardPage.tsx';
let text = fs.readFileSync(path, 'utf8');
const startMarker = '      {activeTab === "general" ? (\r\n';
const start = text.indexOf(startMarker);
if (start === -1) throw new Error('sales tab start not found');
const endMarker = '      )}\r\n    </div>\r\n  );\r\n';
const end = text.indexOf(endMarker, start);
if (end === -1) throw new Error('sales tab end not found');
const block = text.slice(start + 1, end + 1); // drop leading '{', keep rest through final '}'
const constBlock = '  const salesDealTabContent = ' + block.trimStart() + '\r\n';
text = text.slice(0, start) + '      {salesDealTabContent}\r\n' + text.slice(end);
const returnMarker = '\r\n  return (\r\n';
const returnIndex = text.indexOf(returnMarker);
if (returnIndex === -1) throw new Error('return marker not found');
text = text.slice(0, returnIndex) + '\r\n' + constBlock + text.slice(returnIndex);
fs.writeFileSync(path, text, 'utf8');
console.log('extracted sales tab content');
