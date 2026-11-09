// Teste Paper River v1.3 (barca Lebădă + misiuni grele): node river/tests/v13.js
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
  ok(await p.evaluate(() => VERSION === '1.3' && SKINS.length === 10 && SKINS[9].swan && SKINS[9].price === 2600), 'v1.3: barca Lebădă (2600 🏮)');
  ok(await p.evaluate(() => ['en', 'ro', 'ru'].every(l => T[l].skins.length === SKINS.length && T[l].whatsNew.includes('{v}'))), 'v1.3: nume și mesaj Noutăți în RO/EN/RU');
  await p.evaluate(() => { S.coins = 2700; save(); }); await p.click('#bShop');
  await p.click('.sk[data-i="9"] button');
  ok(await p.evaluate(() => S.skin === 9 && S.coins === 100 && S.owned.includes(9)), 'v1.3: cumpărare barca Lebădă');
  await p.click('#bShopBack');
  await p.evaluate(() => startRun(false)); await p.waitForTimeout(700);
  ok(await p.evaluate(() => mode === 'play' && G.alive), 'v1.3: joc pornit cu barca Lebădă (randare animată)');
  ok(await p.evaluate(() => QUEST_POOL.length === 10 && QUEST_POOL.some(q => q.k === 'dist' && q.n === 2000) && ['en','ro','ru'].every(l => T[l].whatsNew.includes('3'))), 'v1.3: 3 misiuni zilnice grele noi');
  ok(await p.evaluate(() => { S.quests = null; const l = ensureQuests().list; return l.length === 3 && new Set(l.map(q => q.k)).size === 3; }), 'v1.3: tot 3 misiuni pe zi, de tipuri diferite');
  ok(errs.length === 0, 'v1.3: fără erori în consolă ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
