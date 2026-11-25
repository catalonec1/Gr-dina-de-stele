const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 405, height: 720 } }); const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(300);
  const lv = process.argv[2].split(',').map(Number); const out = process.argv[3] || '/tmp/claude-0/peek';
  require('fs').mkdirSync(out, { recursive: true });
  for (const i of lv) { await p.evaluate(i => { S.tips = { aim: 1, wall: 1, bump: 1, sand: 1, water: 1, slope: 1, portal: 1, move: 1, boost: 1 }; S.done[0] = 1; startLevel(i - 1); }, i); await p.waitForTimeout(500); await p.screenshot({ path: out + '/l' + i + '.png' }); }
  await b.close();
})();
