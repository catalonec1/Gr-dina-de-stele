// Teste Lumen Links v2.0 (lumi, piese blocate și gemene, muzică, aspect nou): node lumen/tests/v20.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const center = (p, i) => p.evaluate(i => { const r = document.getElementById('board').getBoundingClientRect(); return [r.left + geo.ox + (i % G.lv.W + 0.5) * geo.s, r.top + geo.oy + (((i / G.lv.W) | 0) + 0.5) * geo.s]; }, i);
async function solveByClicks(p) {
  const need = await p.evaluate(() => solveTurns(G.lv));
  for (let i = 0; i < need.length; i++) for (let k = 0; k < need[i]; k++) { const [x, y] = await center(p, i); await p.mouse.click(x, y); }
}
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(URL); await p.waitForTimeout(300);
  ok(await p.evaluate(() => VERSION >= '2.0' && ['en', 'ro', 'ru'].every(l => ['worlds', 'w0', 'w1', 'w2', 'w3', 'w4', 'wIntro', 'mLock', 'mTwin', 'mBoth', 'mBig', 'music', 'tapHere'].every(k => T[l][k]))), 'v2.0: texte noi EN/RO/RU');
  // generator cu mecanici: 200 de niveluri deterministe, rezolvabile prin atingeri reale (gemenii împreună)
  const gen = await p.evaluate(() => { const bad = [];
    for (let n = 1; n <= 200; n++) { const s = sizeFor(n), m = mechFor(n), a = genLevel(levelSeed(n), s, s, m), c = genLevel(levelSeed(n), s, s, m);
      if (JSON.stringify(a.tiles) !== JSON.stringify(c.tiles)) bad.push('det' + n);
      if (isSolved(a)) bad.push('pre' + n);
      if (a.par < 1) bad.push('par' + n);
      const lk = a.tiles.filter(t => t.locked).length, tw = a.tiles.filter(t => t.twin !== undefined).length;
      const w = worldOf(n); if ((w === 1 || w >= 3) && lk === 0) bad.push('lock' + n); if (w >= 2 && tw < 2) bad.push('twin' + n); if (w === 0 && (lk || tw)) bad.push('w0' + n);
      a.tiles.forEach(t => { if (t.locked && cur(t) !== a.sol[a.tiles.indexOf(t)]) bad.push('lockrot' + n); });
      const need = solveTurns(a); need.forEach((k, i) => { const tl = a.tiles[i]; for (let j = 0; j < k; j++) { tl.rot = (tl.rot + 1) & 3; if (tl.twin !== undefined) { const o = a.tiles[tl.twin]; o.rot = (o.rot + 1) & 3; } } });
      if (!isSolved(a)) bad.push('unsolv' + n); }
    return bad; });
  ok(gen.length === 0, 'v2.0: 200 de niveluri cu piese blocate/gemene, rezolvabile ' + gen.slice(0, 6).join(','));
  ok(await p.evaluate(() => [1, 20, 21, 40, 41, 61, 81, 150].map(worldOf).join() === '0,0,1,1,2,3,4,4'), 'v2.0: 20 de niveluri pe lume, lumea 5 continuă');
  // meniu: logo, muzică
  ok(await p.isVisible('#logo') && await p.isVisible('#bMusic'), 'v2.0: logo și buton muzică');
  await p.click('#bMusic'); ok(await p.evaluate(() => S.music === false), 'v2.0: muzica se oprește');
  await p.click('#bMusic'); ok(await p.evaluate(() => S.music === true), 'v2.0: muzica pornește');
  // nivelul 1: indicator tutorial, banner lume
  await p.click('#bPlay');
  ok(await p.evaluate(() => document.getElementById('banner').textContent.includes('Lantern Woods')), 'v2.0: banner „Lumea 1” la primul nivel');
  // piese blocate (lumea 2)
  await p.evaluate(() => { S.level = 21; startLevel(21); }); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.getElementById('banner').textContent.includes('Crystal Caves') && S.worldSeen === 1), 'v2.0: banner lumea 2 + piese blocate explicate');
  const li = await p.evaluate(() => G.lv.tiles.findIndex(t => t.locked));
  const r0 = await p.evaluate(i => [G.lv.tiles[i].rot, G.moves], li);
  let [x, y] = await center(p, li); await p.mouse.click(x, y);
  ok(await p.evaluate(([i, r, m]) => G.lv.tiles[i].rot === r && G.moves === m, [li, ...r0]), 'v2.0: piesa blocată nu se rotește și nu consumă mutări');
  // gemeni (lumea 3)
  await p.evaluate(() => { S.level = 45; startLevel(45); }); await p.waitForTimeout(100);
  const tw = await p.evaluate(() => { const i = G.lv.tiles.findIndex(t => t.twin !== undefined); return [i, G.lv.tiles[i].twin, G.lv.tiles[i].rot, G.lv.tiles[G.lv.tiles[i].twin].rot]; });
  [x, y] = await center(p, tw[0]); await p.mouse.click(x, y);
  ok(await p.evaluate(([i, j, ri, rj]) => G.lv.tiles[i].rot === ((ri + 1) & 3) && G.lv.tiles[j].rot === ((rj + 1) & 3) && G.moves === 1, tw), 'v2.0: gemenii se rotesc împreună (o mutare)');
  await p.click('#bUndo');
  ok(await p.evaluate(([i, j, ri, rj]) => G.lv.tiles[i].rot === ri && G.lv.tiles[j].rot === rj, tw), 'v2.0: undo întoarce ambii gemeni');
  const h = await p.evaluate(() => { const before = solveTurns(G.lv).filter(k => k > 0).length; S.hints = 5; hint(); return [before, solveTurns(G.lv).filter(k => k > 0).length, S.hints]; });
  ok(h[1] === h[0] - 1 && h[2] === 4, 'v2.0: indiciul rezolvă o piesă (sau o pereche de gemeni)');
  await solveByClicks(p); await p.waitForTimeout(1000);
  ok(await p.evaluate(() => G.done && S.stars[45] >= 1 && S.level === 46) && await p.isVisible('#oNext'), 'v2.0: nivel cu gemeni rezolvat prin atingeri reale');
  ok(await p.evaluate(() => document.querySelectorAll('.stars span.pop').length >= 1), 'v2.0: stele animate pe ecranul de victorie');
  await p.click('#oMenu');
  // ecranul de niveluri pe lumi
  await p.click('#bLevels');
  ok(await p.$$eval('#lvGrid h4', a => a.length) === 3 && (await p.$eval('#lvGrid h4', e => e.textContent)).includes('Lantern Woods'), 'v2.0: niveluri grupate pe lumi');
  ok(await p.$$eval('#lvGrid button.cur', a => a.length === 1), 'v2.0: nivelul curent evidențiat');
  await p.click('#lvGrid button[data-n="1"]');
  // daily are piese blocate, rămâne rezolvabil
  await p.click('#bBack'); await p.click('#bDaily');
  ok(await p.evaluate(() => G.lv.tiles.some(t => t.locked)), 'v2.0: puzzle-ul zilei are piese blocate');
  await solveByClicks(p); await p.waitForTimeout(1000);
  ok(await p.evaluate(() => G.done), 'v2.0: puzzle-ul zilei rezolvat');
  await p.click('#oMenu');
  // fundal animat desenat (pixeli ne-negri) și fără erori
  ok(await p.evaluate(() => { const c = document.getElementById('bg'), d = c.getContext('2d').getImageData(c.width / 2, c.height / 2, 1, 1).data; return c.width > 0 && d[0] + d[1] + d[2] > 0; }), 'v2.0: fundal animat');
  ok(errs.length === 0, 'v2.0: fără erori JS ' + errs.join('|'));
  // telefon mic: meniul încape
  const p2 = await (await b.newContext({ viewport: { width: 360, height: 640 }, locale: 'ro-RO' })).newPage();
  await p2.goto(URL); await p2.waitForTimeout(300);
  ok(await p2.evaluate(() => { const r = document.getElementById('bMusic').getBoundingClientRect(); return r.bottom <= innerHeight; }), 'v2.0: meniul încape pe 360x640');
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
