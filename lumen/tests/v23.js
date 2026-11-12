// Teste Lumen Links v2.3 (culorile Smarald și Miez de noapte): node lumen/tests/v22.js
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
  ok(await p.evaluate(() => VERSION >= '2.2' && PALS.length >= 11 && PALS[9].need === 850 && PALS[10].need === 1000), 'v2.3: paletele Ametist (850 ★) și Răsărit (1000 ★)');
    ok(await p.evaluate(() => ['en', 'ro', 'ru'].every(l => T[l].whatsNew.includes('1200') && T[l].whatsNew.includes('1400'))), 'v2.3: mesaj Noutăți RO/EN/RU');
  ok(await p.$eval('#pals button[data-p="12"]', e => e.disabled), 'v2.3: blocată fără stele');
  await p.evaluate(() => { for (let n = 1; n <= 480; n++) S.stars[n] = 3; renderMenu(); });
  await p.click('#pals button[data-p="12"]');
  ok(await p.evaluate(() => S.pal === 12 && pal().need === 1400), 'v2.3: paleta Miez de noapte se poate alege la 1440 ★');
  await p.reload(); await p.waitForTimeout(200);
  ok(await p.evaluate(() => S.pal === 12 && S.seen === VERSION), 'v2.3: alegerea se păstrează');
  ok(errs.length === 0, 'v2.3: fără erori în consolă ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
