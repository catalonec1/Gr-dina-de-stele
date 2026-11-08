// Teste Paper River v1.2 (barca de Gheață): node river/tests/v12.js
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
  await p.goto(URL); await p.waitForTimeout(150);
  ok(await p.evaluate(() => VERSION === '1.2' && SKINS.length === 9 && SKINS[8].frost && SKINS[8].price === 2000), 'v1.2: barca de Gheață (2000 🏮)');
  ok(await p.evaluate(() => ['en', 'ro', 'ru'].every(l => T[l].skins.length === 9 && T[l].whatsNew.includes('{v}'))), 'v1.2: nume și mesaj Noutăți în RO/EN/RU');
  await p.evaluate(() => { S.coins = 2100; save(); }); await p.click('#bShop');
  await p.click('.sk[data-i="8"] button');
  ok(await p.evaluate(() => S.skin === 8 && S.coins === 100 && S.owned.includes(8)), 'v1.2: cumpărare barca de Gheață');
  await p.click('#bShopBack');
  await p.evaluate(() => startRun(false)); await p.waitForTimeout(700);
  ok(await p.evaluate(() => mode === 'play' && G.alive), 'v1.2: joc pornit cu barca de Gheață (randare animată)');
  ok(errs.length === 0, 'v1.2: fără erori în consolă ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
