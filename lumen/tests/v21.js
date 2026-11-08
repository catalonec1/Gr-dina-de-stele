// Teste Lumen Links v2.1 (culorile Chiciură): node lumen/tests/v21.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ro-RO' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(URL); await p.waitForTimeout(200);
  ok(await p.evaluate(() => VERSION === '2.1' && PALS.length === 9 && PALS[8].need === 700), 'v2.1: paleta Chiciură la 700 ★');
  ok(await p.evaluate(() => ['en', 'ro', 'ru'].every(l => T[l].whatsNew.includes('700'))), 'v2.1: mesaj Noutăți RO/EN/RU');
  ok(await p.$eval('#pals button[data-p="8"]', e => e.disabled), 'v2.1: blocată fără stele');
  await p.evaluate(() => { for (let n = 1; n <= 240; n++) S.stars[n] = 3; renderMenu(); });
  await p.click('#pals button[data-p="8"]');
  ok(await p.evaluate(() => S.pal === 8 && pal().need === 700), 'v2.1: paleta Chiciură se poate alege la 720 ★');
  await p.reload(); await p.waitForTimeout(200);
  ok(await p.evaluate(() => S.pal === 8 && S.seen === VERSION), 'v2.1: alegerea se păstrează');
  ok(errs.length === 0, 'v2.1: fără erori în consolă ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
