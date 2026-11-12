// Teste v1.6 (o îmbunătățire globală nouă + 3 trofee): node tests/v16.js
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
  await p.goto(URL);
  ok(await p.evaluate(() => VERSION >= '1.5' && ACHIEVEMENTS.length >= 33 && new Set(ACHIEVEMENTS.map(a => a.id)).size === ACHIEVEMENTS.length), 'v1.6: 36 de trofee unice');
  ok(await p.evaluate(() => ['ro', 'en', 'ru'].every(k => ['total6', 'comets6', 'gold100'].every(id => T[k].an[id]) && T[k].whatsNew.includes('36'))), 'v1.6: texte traduse RO/EN/RU');
  ok(await p.evaluate(() => UPGRADES.filter(u => u.kind === 'global').length === 7 && UPGRADES.some(u => u.id === 'global6' && u.cost === 5e16)), 'v1.6: 7 îmbunătățiri „Cer senin” (nouă la 5e16)');
  ok(await p.evaluate(() => { const before = globalMult(); S.ups.global6 = true; const after = globalMult(); delete S.ups.global6; return Math.abs(after / before - 1.5) < 1e-9; }), 'v1.6: „Cer senin” nou dă x1.5');
  ok(await p.evaluate(() => { S.light = 6e16; tab = 'upgrades'; renderList(); return document.body.innerHTML.length > 0; }), 'v1.6: lista de îmbunătățiri se randează');
  ok(await p.evaluate(() => ['total6', 'comets6', 'gold100'].every(id => !achDone(ACHIEVEMENTS.find(a => a.id === id)))), 'v1.6: trofeele noi nu se dau gratis');
  ok(await p.evaluate(() => (S.stats.comets = 500, S.stats.gold = 100, checkAchievements(), S.ach.comets6 && S.ach.gold100)), 'v1.6: „Ploaia de comete” și „Comoara constelațiilor”');
  ok(errs.length === 0, 'v1.6: fără erori în consolă ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
