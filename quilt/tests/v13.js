// Teste Cozy Quilt v1.3 (materiale de sărbători Crăciun + Turtă dulce, Noutăți, migrare salvare): node quilt/tests/v13.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
// salvare reală de v1.2 (material Ger, 20 de pilote, Noutăți v1.2 deja văzute)
const OLD = { done: Array(20).fill(1), stars: Array(20).fill(3), best: [], fab: 9, lang: 'ro', snd: 1, mus: 0, vib: 1, tips: { drag: 1, hint: 1, rotate: 1 }, hints: 4, daily: 0, streak: 3, gift: 0, seen: '1.2' };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errs = [];
  const page = async (locale, init) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale });
    if (init) await ctx.addInitScript(s => { if (!sessionStorage.getItem('x')) { localStorage.setItem('cozyquilt1', s); sessionStorage.setItem('x', 1); } }, JSON.stringify(init));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto(URL); await p.waitForTimeout(400); return p;
  };
  // 1. date noi
  let p = await page('ro-RO');
  ok(await p.evaluate(() => VERSION === '1.3' && FABRICS.length === 12 && FABRICS[10].need === 100 && FABRICS[11].need === 140), 'v1.3: 12 materiale, Crăciun (100★) și Turtă dulce (140★)');
  ok(await p.evaluate(() => FABRICS.every(f => ['ro', 'en', 'ru'].every(l => f.name[l]) && f.c.length === 12) && ['ro', 'en', 'ru'].every(l => TX[l].news.includes('1.3'))), 'v1.3: nume, 12 culori și Noutăți în RO/EN/RU');
  ok(await p.evaluate(() => FABRICS.every(f => f.need <= 180) && new Set(FABRICS.map(f => f.id)).size === FABRICS.length), 'v1.3: toate materialele se pot debloca, id-uri unice');
  ok(await p.evaluate(() => document.getElementById('news').textContent.includes('Crăciun')), 'v1.3: instalare nouă — Noutăți apare în meniu (RO)');
  await p.context().close();
  // 2. migrare salvare v1.2
  p = await page('ro-RO', OLD);
  ok(await p.evaluate(() => S.fab === 9 && totalStars() === 60 && S.streak === 3 && S.hints >= 4 && S.mus === 0), 'migrare v1.2: materialul Ger, 60★, seria, indiciile și setările rămân');
  ok(await p.evaluate(() => document.getElementById('news').textContent.includes('1.3')), 'migrare v1.2: Noutăți v1.3 apare');
  await p.click('#bFabrics'); await p.waitForTimeout(150);
  ok(await p.$$eval('.fb', e => e.length) === 12, 'ecranul Materiale arată 12 seturi');
  await p.click('.fb:nth-child(11)'); ok(await p.evaluate(() => S.fab === 9), 'Crăciun e blocat sub 100★');
  await p.evaluate(() => { S.stars = Array(34).fill(3); renderFabrics(); }); await p.click('.fb:nth-child(11)');
  ok(await p.evaluate(() => S.fab === 10), 'cu 102★ se alege Crăciun');
  await p.click('.fb:nth-child(12)'); ok(await p.evaluate(() => S.fab === 10), 'Turtă dulce e blocată sub 140★');
  await p.evaluate(() => { S.stars = Array(47).fill(3); renderFabrics(); }); await p.click('.fb:nth-child(12)');
  ok(await p.evaluate(() => S.fab === 11), 'cu 141★ se alege Turtă dulce');
  // joc cu materialul nou: se poate termina
  await p.evaluate(() => { toMenu(); startLevel(5); solveAll(); }); await p.waitForTimeout(1700);
  ok(await p.evaluate(() => S.done[5] === 1 && document.getElementById('win').classList.contains('on')), 'o pilotă se termină cu materialul Turtă dulce');
  // 3. Noutăți o singură dată
  await p.evaluate(() => toMenu()); await p.click('#bPlay'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => S.seen === '1.3'), 'Joacă marchează Noutăți ca văzute');
  await p.reload(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('news').textContent === '' && S.fab === 11), 'după reîncărcare Noutăți nu mai apare, materialul rămâne');
  await p.context().close();
  // 4. EN / RU
  for (const [loc, word] of [['en-US', 'Gingerbread'], ['ru-RU', 'Рождество']]) {
    p = await page(loc);
    ok(await p.evaluate(w => document.getElementById('news').textContent.includes(w), word), 'Noutăți în ' + loc + ': ' + word);
    await p.click('#bFabrics'); await p.waitForTimeout(150);
    ok(await p.$eval('.fb:nth-child(12) b', e => e.textContent.length > 3), 'numele materialului nou în ' + loc);
    await p.context().close();
  }
  ok(errs.length === 0, 'fără erori JS ' + errs.join(' | '));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
