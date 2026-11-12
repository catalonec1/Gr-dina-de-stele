// Teste v1.5 (2 îmbunătățiri globale + 3 trofee): node tests/v15.js
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
  ok(await p.evaluate(() => VERSION >= '1.5' && ACHIEVEMENTS.length >= 33 && new Set(ACHIEVEMENTS.map(a => a.id)).size === ACHIEVEMENTS.length), 'v1.5: 33 de trofee unice');
  ok(await p.evaluate(() => ['ro', 'en', 'ru'].every(k => ['total5', 'comets5', 'gold50'].every(id => T[k].an[id]))), 'v1.5: texte traduse RO/EN/RU');
  ok(await p.evaluate(() => UPGRADES.filter(u => u.kind === 'global').length >= 6 && UPGRADES.some(u => u.id === 'global5' && u.cost === 5e14)), 'v1.5: 6 îmbunătățiri „Cer senin” (noi la 5e12 și 5e14)');
  ok(await p.evaluate(() => { const before = globalMult(); S.ups.global4 = true; const after = globalMult(); delete S.ups.global4; return Math.abs(after / before - 1.5) < 1e-9; }), 'v1.5: „Cer senin” nou dă x1.5');
  ok(await p.evaluate(() => { S.light = 6e12; tab = 'upgrades'; renderList(); return document.body.innerHTML.length > 0; }), 'v1.5: lista de îmbunătățiri se randează');
  ok(await p.evaluate(() => ['total5', 'comets5', 'gold50'].every(id => !achDone(ACHIEVEMENTS.find(a => a.id === id)))), 'v1.5: trofeele noi nu se dau gratis');
  ok(await p.evaluate(() => (S.stats.comets = 250, S.stats.gold = 50, checkAchievements(), S.ach.comets5 && S.ach.gold50)), 'v1.5: „Furtuna de comete” și „Tezaurul galaxiei”');
  ok(errs.length === 0, 'v1.5: fără erori în consolă ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
