// Teste v1.3 (Roi de galaxii, cumpărare x100, 4 trofee noi): node tests/v13.js
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
  ok(await p.evaluate(() => VERSION === '1.3' && STAR_TYPES.length === 10), 'v1.3: versiunea 1.3 cu 10 tipuri de stele');
  ok(await p.evaluate(() => ['ro', 'en', 'ru'].every(k => T[k].stars.length === 10 && ACHIEVEMENTS.every(a => T[k].an[a.id]))), 'v1.3: texte traduse RO/EN/RU');
  ok(await p.evaluate(() => ACHIEVEMENTS.length === 27 && ['type9', 'taps4', 'comets4', 'gold25'].every(id => ACHIEVEMENTS.some(a => a.id === id))), 'v1.3: 27 trofee');
  ok(await p.evaluate(() => STAR_TYPES[9].cost > STAR_TYPES[8].cost * 10 && UPGRADES.filter(u => u.kind === 'type' && u.type === 9).length === 3), 'v1.3: roiul e mai scump și are 3 îmbunătățiri');
  ok(await p.evaluate(() => { tab = 'stars'; renderList(); return document.querySelectorAll('.buy[data-star="9"]').length === 0; }), 'v1.3: roiul ascuns până ai o galaxie');
  await p.evaluate(() => { S.owned[8] = 1; S.light = 2e11; S.buyMode = 1; renderList(); });
  await p.click('.buy[data-star="9"]');
  ok(await p.evaluate(() => S.owned[9] === 1 && !!S.ach.type9), 'v1.3: cumpărare roi + trofeul „Păstorul roiurilor”');
  await p.waitForTimeout(300); // desenarea roiului fără erori
  // cumpărare x100
  await p.evaluate(() => { S.owned[0] = 0; S.light = 1e12; renderList(); });
  ok(await p.evaluate(() => [...document.querySelectorAll('.modes button')].map(b => b.textContent).join(',') === 'x1,x10,x100,Max'), 'v1.3: comutator x1/x10/x100/Max');
  const cost = await p.evaluate(() => starCostN(0, 100));
  await p.evaluate(() => { [...document.querySelectorAll('.modes button')].find(b => b.textContent === 'x100').click(); });
  await p.click('.buy[data-star="0"]');
  ok(await p.evaluate(c => S.owned[0] === 100 && S.light - (1e12 - c) >= 0 && S.light - (1e12 - c) < ratePerSec() * 5 + 1 && S.buyMode === 100, cost), 'v1.3: cumpărare x100 cu cost exact');
  // trofee noi
  await p.evaluate(() => { S.stats.taps = 49999; S.stats.comets = 100; S.stats.gold = 25; checkAchievements(); });
  await p.mouse.click(200, 400); await p.waitForTimeout(100);
  ok(await p.evaluate(() => S.ach.taps4 && S.ach.comets4 && S.ach.gold25), 'v1.3: trofeele „Degetul neobosit”, „Stăpânul cozilor de foc”, „Visteria cerului”');
  ok(await p.evaluate(() => QUEST_POOL.some(q => q.k === 'stars' && q.n === 50)), 'v1.3: misiune nouă „Plantează 50 de stele”');
  // salvare cu x100 se păstrează, migrare v1.2 (9 tipuri)
  await p.evaluate(() => save()); await p.reload(); await p.waitForTimeout(200);
  ok(await p.evaluate(() => S.buyMode === 100 && S.owned[9] === 1), 'v1.3: modul x100 și roiul rămân după reîncărcare');
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ru-RU' });
  const p2 = await ctx2.newPage();
  await p2.addInitScript(() => { if (!sessionStorage.m) { sessionStorage.m = 1;
    localStorage.setItem('gradina-de-stele-v1', JSON.stringify({ light: 10, lifeLight: 10, owned: [1, 0, 0, 0, 0, 0, 0, 0, 2], ups: {}, dust: 0, boostUntil: 0, lang: 'ru', sound: true, last: Date.now(), seen: '1.2', stats: { taps: 5 }, ach: {}, buyMode: 'max' })); } });
  await p2.goto(URL); await p2.waitForTimeout(300);
  ok(await p2.evaluate(() => S.owned.length === 10 && S.owned[8] === 2 && S.owned[9] === 0 && S.buyMode === 'max'), 'v1.3: migrare salvare v1.2');
  await p2.waitForFunction(() => document.getElementById('toast').textContent.includes('1.3'), null, { timeout: 5000 }).catch(() => {});
  ok(await p2.evaluate(() => document.getElementById('toast').textContent.includes('скопление')), 'v1.3: mesaj „Noutăți” RU');
  ok(errs.length === 0, 'v1.3: fără erori în consolă ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
