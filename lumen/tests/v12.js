// Teste Lumen Links v1.2 (mod Zen, palete Jar și Ocean, mesaj Noutăți): node lumen/tests/v12.js
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
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ro-RO' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(URL); await p.waitForTimeout(200);
  ok(await p.evaluate(() => VERSION === '1.2' && ['en', 'ro', 'ru'].every(l => ['zen', 'zenT', 'zenS', 'zenHint', 'whatsNew'].every(k => T[l][k]))), 'v1.2: texte noi EN/RO/RU');
  ok(await p.evaluate(() => document.getElementById('toast').style.opacity !== '1'), 'v1.2: jucător nou fără mesaj Noutăți');
  ok((await p.$eval('#bZen', e => e.textContent)).includes('Mod Zen'), 'v1.2: buton Mod Zen în meniu');
  await p.click('#bZen');
  ok(await p.evaluate(() => G.mode === 'zen' && G.k === 0 && G.lv.W === 5), 'v1.2: Zen pornește cu puzzle 5x5');
  ok((await p.$eval('#hTitle', e => e.textContent)).includes('Zen'), 'v1.2: HUD Zen');
  await p.evaluate(() => { S.hints = 0; S.zen = 4; });
  await solveByClicks(p);
  ok(await p.evaluate(() => G.k === 1 && S.zen === 5 && S.hints === 1), 'v1.2: rezolvare Zen (+1 indiciu la 5)');
  await p.waitForTimeout(900);
  ok(await p.evaluate(() => G.mode === 'zen' && !G.done && !isSolved(G.lv) && !document.getElementById('overlay').classList.contains('on')), 'v1.2: următorul puzzle Zen vine singur');
  await p.evaluate(() => { G.k = 12; nextZen(); });
  ok(await p.evaluate(() => G.lv.W === 7), 'v1.2: Zen crește la 7x7');
  ok(await p.evaluate(() => { let bad = 0; for (let k = 0; k < 30; k++) { const s = zenSize(k), lv = genLevel(999 + k * 104729, s, s); if (isSolved(lv)) bad++; lv.tiles.forEach((tl, i) => tl.rot = (tl.rot + minTurns(tl, lv.sol[i])) & 3); if (!isSolved(lv)) bad++; } return bad === 0; }), 'v1.2: 30 puzzle-uri Zen rezolvabile');
  await p.click('#bRestart');
  ok(await p.evaluate(() => G.mode === 'zen' && G.k === 0), 'v1.2: restart Zen');
  await p.click('#bBack');
  ok((await p.$eval('#bZen', e => e.textContent)).includes('5'), 'v1.2: meniul arată totalul Zen');
  // palete noi
  ok(await p.evaluate(() => PALS.length === 8 && PALS[6].need === 400 && PALS[7].need === 550), 'v1.2: palete Jar (400 ★) și Ocean (550 ★)');
  await p.evaluate(() => { for (let n = 1; n <= 190; n++) S.stars[n] = 3; renderMenu(); });
  await p.click('#pals button[data-p="7"]');
  ok(await p.evaluate(() => S.pal === 7), 'v1.2: paleta Ocean se poate alege');
  // reîncărcare: Zen păstrat
  await p.reload(); await p.waitForTimeout(200);
  ok(await p.evaluate(() => S.zen === 5 && S.pal === 7 && S.seen === '1.2'), 'v1.2: salvare păstrată');
  // salvare v1.1 → mesaj Noutăți EN
  const ctx2 = await b.newContext({ viewport: { width: 360, height: 640 }, locale: 'en-US' });
  const p2 = await ctx2.newPage();
  await p2.addInitScript(() => { if (!sessionStorage.m) { sessionStorage.m = 1;
    localStorage.setItem('lumen-links-v1', JSON.stringify({ lang: 'en', sound: true, level: 7, stars: { 1: 3 }, daily: {}, hints: 2, pal: 0, tut: true, rushBest: 4, streak: { n: 1, last: '' } })); } });
  await p2.goto(URL); await p2.waitForTimeout(900);
  ok(await p2.evaluate(() => document.getElementById('toast').textContent.includes('Zen mode') && S.level === 7 && S.rushBest === 4 && S.zen === 0), 'v1.2: migrare v1.1 + mesaj Noutăți');
  ok(await p2.evaluate(() => { const r = document.getElementById('bSound').getBoundingClientRect(); return r.bottom <= innerHeight; }), 'v1.2: meniul încape pe ecran 360x640');
  ok(errs.length === 0, 'v1.2: fără erori JS ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
