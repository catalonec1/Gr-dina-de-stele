// Teste v1.4 (3 trofee noi de iarnă): node tests/v14.js
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
  ok(await p.evaluate(() => VERSION >= '1.4' && ACHIEVEMENTS.length >= 30 && new Set(ACHIEVEMENTS.map(a => a.id)).size === ACHIEVEMENTS.length), 'v1.4: 30 de trofee unice');
  ok(await p.evaluate(() => ['ro', 'en', 'ru'].every(k => ['constel50', 'rebirths25', 'streak30'].every(id => T[k].an[id]) && T[k].whatsNew.includes('{v}'))), 'v1.4: texte traduse RO/EN/RU');
  ok(await p.evaluate(() => !S.ach.rebirths25 && (S.stats.rebirths = 25, checkAchievements(), S.ach.rebirths25 === true)), 'v1.4: trofeul „Fenixul stelar” la 25 de renașteri');
  ok(await p.evaluate(() => ['constel50', 'streak30'].every(id => !achDone(ACHIEVEMENTS.find(a => a.id === id)))), 'v1.4: trofeele noi nu se dau gratis');
  ok(await p.evaluate(() => { tab = 'trophies'; renderList(); return document.querySelectorAll('#list .row.ach').length === ACHIEVEMENTS.length; }), 'v1.4: tabul Trofee arată toate trofeele');
  ok(errs.length === 0, 'v1.4: fără erori în consolă ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
