// Converts data-errors.tsv into src/data.js (embedded in the Worker bundle).
const fs = require('fs');
const rows = fs.readFileSync(__dirname + '/data-errors.tsv', 'utf8').split('\n').filter(Boolean).map(l => {
  const [code, , title, cause, action] = l.split('\t');
  return { code, title, cause, action };
});
fs.writeFileSync(__dirname + '/src/data.js', 'export const ERRORS = ' + JSON.stringify(rows) + ';\n');
console.log(rows.length + ' errors');
