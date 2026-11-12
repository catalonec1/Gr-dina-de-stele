// Teste Paper River v1.4 (barca Lună + misiunea 4 felinare de aur): node river/tests/v14.js
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
  ok(await p.evaluate(() => VERSION === '1.4' && SKINS.length === 11 && SKINS[10].moon && SKINS[10].price === 3300), 'v1.4: barca Lună (3300 🏮)');
  ok(await p.evaluate(() => ['en', 'ro', 'ru'].every(l => T[l].skins.length === SKINS.length && T[l].whatsNew.includes('{v}'))), 'v1.4: nume și mesaj Noutăți în RO/EN/RU');
  await p.evaluate(() => { S.coins = 3400; save(); }); await p.click('#bShop');
  await p.click('.sk[data-i="10"] button');
  ok(await p.evaluate(() => S.skin === 10 && S.coins === 100 && S.owned.includes(10)), 'v1.4: cumpărare barca Lună');
  await p.click('#bShopBack');
  await p.evaluate(() => startRun(false)); await p.waitForTimeout(700);
  ok(await p.evaluate(() => mode === 'play' && G.alive), 'v1.4: joc pornit cu barca Lună (randare animată)');
  ok(await p.evaluate(() => QUEST_POOL.length === 11 && QUEST_POOL.some(q => q.k === 'gold' && q.n === 4)), 'v1.4: misiunea 4 felinare de aur');
  ok(await p.evaluate(() => { S.quests = null; const l = ensureQuests().list; return l.length === 3 && new Set(l.map(q => q.k)).size === 3; }), 'v1.4: tot 3 misiuni pe zi, de tipuri diferite');
  ok(errs.length === 0, 'v1.4: fără erori în consolă ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
