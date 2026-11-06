// Teste automate Lumen Links: node lumen/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', vp = { width: 390, height: 844 }, init) {
  const ctx = await b.newContext({ viewport: vp, locale });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  if (init) await p.addInitScript(init);
  await p.goto(URL); await p.waitForTimeout(200); return p;
}
// rezolvă nivelul curent prin clicuri reale pe canvas, folosind soluția cunoscută
async function solveByClicks(p) {
  const clicks = await p.evaluate(() => {
    const r = document.getElementById('board').getBoundingClientRect(), out = [];
    const need = solveTurns(G.lv);
    G.lv.tiles.forEach((tl, i) => { const k = need[i];
      const x = r.left + geo.ox + (i % G.lv.W + 0.5) * geo.s, y = r.top + geo.oy + (((i / G.lv.W) | 0) + 0.5) * geo.s;
      for (let j = 0; j < k; j++) out.push([x, y]); });
    return out;
  });
  for (const [x, y] of clicks) await p.mouse.click(x, y);
  return clicks.length;
}
(async () => {
  const b = await chromium.launch();
  // 1. generator: determinist, rezolvabil, fără nivel deja rezolvat, pentru multe niveluri
  let p = await fresh(b);
  const gen = await p.evaluate(() => {
    let bad = [];
    for (let n = 1; n <= 150; n++) {
      const s = sizeFor(n), a = genLevel(levelSeed(n), s, s), c = genLevel(levelSeed(n), s, s);
      if (JSON.stringify(a.tiles) !== JSON.stringify(c.tiles)) bad.push('det' + n);
      if (isSolved(a)) bad.push('pre' + n);
      if (a.par < 1) bad.push('par' + n);
      const solved = { ...a, tiles: a.tiles.map((tl, i) => ({ base: tl.base, rot: tl.rot + minTurns(tl, a.sol[i]) })) };
      if (!isSolved(solved)) bad.push('unsolv' + n);
      // soluția e arbore de acoperire: muchii = N-1
      const e = a.sol.reduce((x, m) => x + [1, 2, 4, 8].filter(b => m & b).length, 0) / 2;
      if (e !== s * s - 1) bad.push('tree' + n);
    }
    const d = genLevel(dailySeed('2026-11-05'), 7, 7);
    return { bad, daily: d.W === 7 && !isSolved(d) };
  });
  ok(gen.bad.length === 0, 'generator: 150 niveluri deterministe, rezolvabile, nerezolvate la start ' + gen.bad.slice(0, 5).join(','));
  ok(gen.daily, 'puzzle-ul zilei 7x7 valid');
  ok(await p.evaluate(() => S.lang) === 'ro', 'limba RO din browser');
  ok(await p.$eval('#bPlay', e => e.textContent) === 'Joacă', 'meniu în română');

  // 2. joc real: clic pe Play, rotire, undo, rezolvare prin clicuri
  await p.click('#bPlay');
  ok(await p.evaluate(() => G && G.n === 1 && G.lv.W === 3), 'nivelul 1 pornește (3x3)');
  const r0 = await p.evaluate(() => { const r = document.getElementById('board').getBoundingClientRect(); return [r.left + geo.ox + geo.s / 2, r.top + geo.oy + geo.s / 2, G.lv.tiles[0].rot]; });
  await p.mouse.click(r0[0], r0[1]);
  ok(await p.evaluate(r => G.lv.tiles[0].rot === ((r + 1) & 3) && G.moves === 1, r0[2]), 'atingerea rotește piesa');
  await p.click('#bUndo');
  ok(await p.evaluate(r => G.lv.tiles[0].rot === r && G.hist.length === 0, r0[2]), 'undo revine');
  await p.click('#bRestart');
  const n = await solveByClicks(p);
  await p.waitForTimeout(900);
  ok(await p.evaluate(() => G.done) && await p.isVisible('#oNext'), `nivelul 1 rezolvat în ${n} mutări, apare ecranul de victorie`);
  ok(await p.evaluate(() => S.stars[1] === 3 && S.level === 2 && S.hints === 4), '3 stele la mutări = țintă, nivel 2 deblocat, +1 indiciu');
  await p.click('#oNext');
  ok(await p.evaluate(() => G.n === 2 && !G.done), 'butonul Nivelul următor');

  // 3. indicii
  const h = await p.evaluate(() => { const before = G.lv.tiles.filter((tl, i) => cur(tl) === G.lv.sol[i]).length; hint(); return [before, G.lv.tiles.filter((tl, i) => cur(tl) === G.lv.sol[i]).length, S.hints]; });
  ok(h[1] === h[0] + 1 && h[2] === 3, 'indiciul aliniază o piesă și consumă un indiciu');
  await p.evaluate(() => { S.hints = 0; hint(); });
  ok(await p.evaluate(() => document.getElementById('toast').textContent.length > 5), 'fără indicii: mesaj (pe web, fără reclame)');

  // 4. salvare după reîncărcare
  await p.reload(); await p.waitForTimeout(200);
  ok(await p.evaluate(() => S.level === 2 && S.stars[1] === 3), 'progresul se păstrează după reîncărcare');
  ok((await p.$eval('#bPlay', e => e.textContent)).includes('2'), 'butonul Continuă arată nivelul 2');

  // 5. ecranul de niveluri
  await p.click('#bLevels');
  ok(await p.$$eval('#lvGrid button:not([disabled])', a => a.length) === 2, 'niveluri: 2 deblocate');
  await p.click('#lvGrid button[data-n="1"]');
  ok(await p.evaluate(() => G.n === 1), 'alegerea unui nivel din listă');
  await p.click('#bBack');

  // 6. puzzle-ul zilei
  await p.click('#bDaily');
  ok(await p.evaluate(() => G.mode === 'daily' && G.lv.W === 7), 'puzzle-ul zilei pornește');
  await solveByClicks(p); await p.waitForTimeout(900);
  ok(await p.evaluate(() => G.done && S.daily[today()] === 1), 'puzzle-ul zilei rezolvat și salvat');
  await p.click('#oMenu');
  ok((await p.$eval('#bDaily', e => e.textContent)).includes('✓'), 'meniul arată bifa pentru puzzle-ul zilei');

  // 7. limbi și palete
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent).then(x => x.startsWith('Продолжить')), 'comutare RU');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent).then(x => x.startsWith('Continue')), 'comutare EN');
  ok(await p.$$eval('#pals button:not([disabled])', a => a.length) === 1, 'paletele blocate până la stele');
  await p.evaluate(() => { for (let i = 1; i <= 30; i++) S.stars[i] = 3; renderMenu(); });
  await p.click('#pals button[data-p="1"]');
  ok(await p.evaluate(() => S.pal === 1), 'paletă nouă deblocată și aleasă');
  ok(p.errs.length === 0, 'fără erori JS: ' + p.errs.join(' | '));
  await p.screenshot({ path: path.join(__dirname, '..', 'launch', 'shot-menu-en.png') }).catch(() => {});
  await p.context().close();

  // 8. engleză implicit, desktop, nivel mare
  p = await fresh(b, 'en-US', { width: 1280, height: 720 });
  ok(await p.evaluate(() => S.lang) === 'en', 'limba EN implicit');
  await p.evaluate(() => startLevel(60));
  ok(await p.evaluate(() => G.lv.W === 7 && geo.s > 30), 'nivelul 60 e 7x7 și încape pe ecran');
  await solveByClicks(p); await p.waitForTimeout(900);
  ok(await p.evaluate(() => G.done), 'nivel 7x7 rezolvat prin clicuri');
  ok(p.errs.length === 0, 'desktop fără erori');
  await p.context().close();

  // 9. stele: mai multe mutări → mai puține stele
  p = await fresh(b, 'en-US');
  ok(await p.evaluate(() => starsFor(10, 10) === 3 && starsFor(17, 10) === 2 && starsFor(40, 10) === 1), 'calcul stele');
  await p.context().close();

  // 10. build CrazyGames: fără SDK în test (blocat), jocul trebuie să pornească oricum în engleză
  p = await fresh(b, 'ro-RO', undefined, () => { window.GAME_PLATFORM = 'crazygames'; });
  await p.click('#bPlay');
  ok(await p.evaluate(() => S.lang === 'en' && G && G.n === 1), 'platformă crazygames: pornește în engleză chiar fără SDK');
  await p.context().close();

  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
