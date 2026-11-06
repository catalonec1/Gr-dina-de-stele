// Teste Lumen Links v1.1 (contra cronometru, serie zilnică, paleta Aurora): node lumen/tests/v11.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function solveByClicks(p) {
  const clicks = await p.evaluate(() => {
    const r = document.getElementById('board').getBoundingClientRect(), out = [];
    G.lv.tiles.forEach((tl, i) => { const k = minTurns(tl, G.lv.sol[i]);
      const x = r.left + geo.ox + (i % G.lv.W + 0.5) * geo.s, y = r.top + geo.oy + (((i / G.lv.W) | 0) + 0.5) * geo.s;
      for (let j = 0; j < k; j++) out.push([x, y]); });
    return out;
  });
  for (const [x, y] of clicks) await p.mouse.click(x, y);
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ro-RO' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(URL); await p.waitForTimeout(200);
  ok(await p.evaluate(() => ['en', 'ro', 'ru'].every(l => ['rush', 'rushT', 'time', 'rushEnd', 'rushScore', 'rushBest', 'newBest', 'streak'].every(k => T[l][k]))), 'v1.1: texte noi în EN/RO/RU');
  ok((await p.$eval('#bRush', e => e.textContent)).includes('Contra cronometru'), 'v1.1: buton „Contra cronometru” în meniu');
  // contra cronometru: pornește, rezolvarea dă +10 s și puzzle nou fără ecran de victorie
  await p.click('#bRush');
  ok(await p.evaluate(() => G.mode === 'rush' && G.k === 0 && G.lv.W === 4 && rushLeft() >= 119), 'v1.1: cronometru 120 s, puzzle 4x4');
  const end0 = await p.evaluate(() => G.end);
  await solveByClicks(p); await p.waitForTimeout(100);
  ok(await p.evaluate(e0 => G.k === 1 && !G.done && Math.abs(G.end - e0 - 10000) < 1 && !document.getElementById('overlay').classList.contains('on'), end0), 'v1.1: rezolvare → +10 s, puzzle nou imediat');
  ok(await p.evaluate(() => !isSolved(G.lv) && G.moves === 0), 'v1.1: puzzle-ul următor e nerezolvat');
  await p.evaluate(() => { G.k = 3; nextRush(); });
  ok(await p.evaluate(() => G.lv.W === 5), 'v1.1: de la al 4-lea puzzle devine 5x5');
  ok((await p.$eval('#hMoves', e => e.textContent)).startsWith('Timp'), 'v1.1: HUD arată timpul rămas');
  // timpul expiră
  await p.evaluate(() => { G.end = performance.now() - 1; });
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => G.over && G.done && S.rushBest === 3 && document.getElementById('overlay').classList.contains('on')), 'v1.1: final cu scor și record salvat');
  ok(await p.isVisible('#oAgain'), 'v1.1: buton „Încă o dată”');
  await p.click('#oAgain');
  ok(await p.evaluate(() => G.mode === 'rush' && G.k === 0 && !G.over), 'v1.1: rundă nouă');
  await p.evaluate(() => { G.end = performance.now() - 1; }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => S.rushBest === 3), 'v1.1: un scor mai mic nu strică recordul');
  await p.click('#oMenu');
  ok((await p.$eval('#bRush', e => e.textContent)).includes('3'), 'v1.1: meniul arată recordul');
  // seria zilnică
  await p.evaluate(() => { S.streak = { n: 4, last: yesterday() }; renderMenu(); });
  ok((await p.$eval('#bDaily', e => e.textContent)).includes('🔥4'), 'v1.1: seria apare în meniu');
  await p.click('#bDaily'); await solveByClicks(p); await p.waitForTimeout(900);
  ok(await p.evaluate(() => S.streak.n === 5 && S.streak.last === today()), 'v1.1: seria crește după puzzle-ul zilei');
  ok((await p.$eval('#card', e => e.textContent)).includes('Serie: 5'), 'v1.1: ecranul de victorie arată seria');
  await p.click('#oMenu');
  await p.evaluate(() => { delete S.daily[today()]; S.streak = { n: 9, last: '2000-01-01' }; startDaily(); });
  await solveByClicks(p); await p.waitForTimeout(900);
  ok(await p.evaluate(() => S.streak.n === 1), 'v1.1: seria se resetează după o zi ratată');
  await p.click('#oMenu');
  // salvarea se păstrează
  await p.reload(); await p.waitForTimeout(200);
  ok(await p.evaluate(() => S.rushBest === 3 && S.streak.n === 1), 'v1.1: record și serie păstrate după reîncărcare');
  // paleta Aurora
  ok(await p.evaluate(() => PALS.length >= 6 && PALS[5].need === 300), 'v1.1: a 6-a paletă (Aurora) la 300 ★');
  await p.evaluate(() => { for (let i = 1; i <= 100; i++) S.stars[i] = 3; renderMenu(); });
  await p.click('#pals button[data-p="5"]');
  ok(await p.evaluate(() => S.pal === 5), 'v1.1: Aurora se poate alege');
  // salvare veche fără câmpurile noi
  const p2 = await (await b.newContext({ locale: 'en-US' })).newPage();
  await p2.addInitScript(() => { if (!sessionStorage.m) { sessionStorage.m = 1; localStorage.setItem('lumen-links-v1', JSON.stringify({ lang: 'en', sound: true, level: 5, stars: { 1: 3 }, daily: {}, hints: 2, pal: 0, tut: true })); } });
  await p2.goto(URL); await p2.waitForTimeout(200);
  ok(await p2.evaluate(() => S.level === 5 && S.rushBest === 0 && S.streak.n === 0) && (await p2.$eval('#bRush', e => e.textContent)).includes('Time rush'), 'v1.1: salvare v1.0 compatibilă');
  await p.screenshot({ path: path.join(__dirname, '..', 'launch', 'menu-v11-ro.png') }).catch(() => {});
  ok(await p.evaluate(() => document.getElementById('bRush').getBoundingClientRect().bottom < innerHeight), 'v1.1: meniul încape pe telefon');
  ok(errs.length === 0, 'v1.1: fără erori JS ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
