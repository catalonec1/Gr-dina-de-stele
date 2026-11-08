const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.addScriptTag({ content: fs.readFileSync(path.resolve(__dirname, '..', 'tests', 'bot.js'), 'utf8') });
  const r = await p.evaluate(() => LEVELS.map((L, i) => { const ex = __bot(i).strokes; const ns = []; for (let s = 1; s <= 6; s++) { const rng = rnd(s * 131 + i); ns.push(__bot(i, { noise: 1, rng }).strokes); } return (i + 1) + ' par ' + L.par + ' exact ' + ex + ' noisy ' + ns.join(','); }));
  console.log(r.join('\n')); await b.close();
})();
