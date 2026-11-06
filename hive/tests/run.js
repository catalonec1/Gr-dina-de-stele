// Teste automate Hive Bloom: node hive/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', vp = { width: 390, height: 844 }, noLoop = true) {
  const ctx = await b.newContext({ viewport: vp, locale });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  if (noLoop) await p.addInitScript(() => { window.__noLoop = true; });
  await p.goto(URL); await p.waitForTimeout(150); return p;
}
// jucător automat lacom: alege celula cu cel mai bun rezultat imediat + vecini potriviți
const BOT = (maxMoves) => {
  let n = 0;
  while (G.alive && n++ < maxMoves) {
    let best = -1, bv = -1e9;
    for (let k = 0; k < NCELL; k++) {
      if (G.cells[k]) continue;
      const c = G.cells.slice(); c[k] = G.cur; const r = resolve(c, k);
      let v = r.score * 3 + emptyCount(c) * 40;
      if (c[k]) for (const j of NB[k]) if (c[j] === c[k]) v += 25;
      v -= NB[k].filter(j => c[j] && c[j] !== c[k]).length * 4;
      if (v > bv) { bv = v; best = k; }
    }
    // dacă piesa următoare se potrivește mai bine, schimbă
    place(best);
  }
  return { alive: G.alive, moves: G.moves, score: G.score, top: G.top };
};
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  let p = await fresh(b);

  // 1. grila și logica de unire
  const g = await p.evaluate(() => ({ n: NCELL, nb: NB.map(x => x.length), center: NB[IDX.get('0,0')].length }));
  ok(g.n === 37 && g.center === 6 && Math.min(...g.nb) === 3, 'fagure de 37 celule, vecini corecți');
  const m = await p.evaluate(() => {
    const c0 = new Array(NCELL).fill(0), a = IDX.get('0,0'), b1 = IDX.get('1,0'), b2 = IDX.get('-1,0');
    // doi de nivel 1 + al treilea → nivel 2
    let c = c0.slice(); c[b1] = 1; c[b2] = 1; c[a] = 1; const r1 = resolve(c, a);
    const one = c[a] === 2 && !c[b1] && !c[b2] && r1.chain === 1;
    // lanț: 1+1+1 → 2, care se unește cu doi de 2 → 3
    c = c0.slice(); c[b1] = 1; c[b2] = 1; c[IDX.get('0,1')] = 2; c[IDX.get('0,-1')] = 2; c[a] = 1; const r2 = resolve(c, a);
    const chain = c[a] === 3 && r2.chain === 2 && emptyCount(c) === NCELL - 1;
    // doar doi nu se unesc
    c = c0.slice(); c[b1] = 1; c[a] = 1; const r3 = resolve(c, a);
    // floarea de aur: trei de 9 eliberează și vecinii
    c = c0.slice(); c[b1] = 9; c[b2] = 9; c[IDX.get('0,1')] = 4; c[a] = 9; const r4 = resolve(c, a);
    return { one, chain, none: r3.chain === 0 && c0.length === 37, bloom: r4.bloom && emptyCount(c) === NCELL && r4.score > 5000 };
  });
  ok(m.one, '3 piese egale se unesc în nivelul următor');
  ok(m.chain, 'unire în lanț (x2) cu scor');
  ok(m.none, '2 piese nu se unesc');
  ok(m.bloom, 'trei stele 🌟 = floare de aur, curăță vecinii, +5000');
  const rk = await p.evaluate(() => { const c = new Array(NCELL).fill(0), a = IDX.get('0,0'); c[IDX.get('1,0')] = 1; c[IDX.get('-1,0')] = 1; c[IDX.get('2,0')] = ROCK; c[IDX.get('0,1')] = ROCK; c[a] = 1; const r = resolve(c, a);
    const c2 = new Array(NCELL).fill(0); c2[a] = ROCK; c2[IDX.get('1,0')] = ROCK; c2[IDX.get('2,0')] = ROCK; const r2 = resolve(c2, a);
    return r.rocks === 2 && !c[IDX.get('2,0')] && r2.chain === 0 && c2[a] === ROCK; });
  ok(rk, 'unirea sparge pietrele vecine; pietrele nu se unesc între ele');
  ok(await p.evaluate(() => rockEvery(10) === 0 && rockEvery(30) > rockEvery(400) && rockEvery(5000) >= 4), 'pietrele apar după mutarea 25, tot mai des');

  // 2. determinism: același seed → aceleași piese
  const det = await p.evaluate(() => { const seq = s => { newRun(s, false); const R = G.R, a = [G.cells.join(''), G.cur, G.next]; for (let i = 0; i < 50; i++) a.push(genPiece(R, 5)); return a.join(','); }; return seq(99) === seq(99) && seq(99) !== seq(100); });
  ok(det, 'generator de piese determinist pe seed');

  // 3. jucabilitate: botul lacom joacă 12 partide; jocul e câștigabil pe termen lung
  const bot = await p.evaluate(src => { const f = eval(src); const res = []; for (let s = 1; s <= 12; s++) { newRun(s * 7919, false); G.demo = false; res.push(f(300)); } return res; }, BOT.toString());
  const avgMoves = bot.reduce((a, r) => a + r.moves, 0) / bot.length, maxTop = Math.max(...bot.map(r => r.top));
  ok(avgMoves > 120, 'botul face în medie > 120 mutări (' + Math.round(avgMoves) + ')');
  ok(maxTop >= 6, 'se ajunge la nivelul 🍯 6+ (max ' + maxTop + ')');
  ok(bot.every(r => r.moves > 20), 'nicio partidă nu se termină absurd de repede (min ' + Math.min(...bot.map(r => r.moves)) + ')');
  await p.evaluate(() => { S.coins = 0; S.best = 0; S.top = 0; S.tut = false; save(); });
  await p.reload(); await p.waitForTimeout(150);

  // 4. meniu RO, limbi
  ok(await p.evaluate(() => S.lang) === 'ro', 'limba RO detectată din browser');
  ok(await p.$eval('#bPlay', e => e.textContent) === 'Joacă', 'meniu în română');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent) === 'Играть', 'comutare RU');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent) === 'Play', 'comutare EN');
  await p.click('#bLang');
  const keys = await p.evaluate(() => { const k = Object.keys(T.en); return ['ro', 'ru'].flatMap(l => k.filter(x => !(x in T[l])).map(x => l + ':' + x)); });
  ok(keys.length === 0, 'toate textele traduse RO/RU ' + keys.join(','));

  // 5. partidă reală: Play, tutorial, plasare cu atingere pe canvas
  await p.click('#bPlay');
  ok(await p.evaluate(() => mode === 'play' && G.alive && !G.demo), 'partida pornește');
  ok(await p.$eval('#tut', e => e.classList.contains('on')), 'tutorialul apare la prima partidă');
  const tap = await p.evaluate(() => { const k = G.cells.findIndex(v => !v); const [x, y] = cellXY(k); return { k, x, y, cur: G.cur }; });
  await p.mouse.click(tap.x, tap.y);
  ok(await p.evaluate(t => G.cells[t.k] > 0 && G.moves === 1, tap), 'atingerea pune piesa în celula corectă');
  ok(!(await p.$eval('#tut', e => e.classList.contains('on'))), 'tutorialul dispare după prima mutare');
  const occ = await p.evaluate(() => { const k = G.cells.findIndex(v => v); const [x, y] = cellXY(k); return { x, y }; });
  await p.mouse.click(occ.x, occ.y);
  ok(await p.evaluate(() => G.moves === 1), 'celula ocupată nu acceptă piesă');
  // tastatură
  const kb = await p.evaluate(() => { G.cells.fill(0); G.cursor = IDX.get('0,0'); return G.cursor; });
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter');
  ok(await p.evaluate(() => G.cells[IDX.get('1,0')] > 0 && G.moves === 2), 'săgeți + Enter pun piesa');
  // schimbare piesă
  const sw = await p.evaluate(() => { G.cur = 1; G.next = 3; return 0; });
  await p.click('#bSwap');
  ok(await p.evaluate(() => G.cur === 3 && G.next === 1), 'butonul Schimbă inversează piesele');
  // unire reală în joc, cu miere
  const mg = await p.evaluate(() => { G.cells.fill(0); const c0 = S.coins; G.cells[IDX.get('1,0')] = 2; G.cells[IDX.get('-1,0')] = 2; G.cur = 2; place(IDX.get('0,0')); return { lv: G.cells[IDX.get('0,0')], honey: S.coins - c0, score: G.score }; });
  ok(mg.lv === 3 && mg.honey === 2 && mg.score >= 60, 'unire în partidă: nivel 3, +2 miere, scor');
  // ciocan
  await p.evaluate(() => { S.coins = 20; });
  await p.click('#bHammer'); ok(await p.evaluate(() => G.hammer), 'ciocanul se activează');
  const hm = await p.evaluate(() => { const k = IDX.get('0,0'); place(k); return { empty: !G.cells[k], coins: S.coins, off: !G.hammer }; });
  ok(hm.empty && hm.coins === 5 && hm.off, 'ciocanul scoate piesa și costă 15 miere');
  await p.click('#bHammer'); ok(await p.evaluate(() => !G.hammer), 'fără miere ciocanul nu pornește');

  // 6. final de joc, recorduri, continuare o singură dată
  await p.evaluate(() => { S.coins = 60; G.cells = G.cells.map((_, i) => 1 + (i % 4 === 0 ? 4 : i % 3)); G.cells[0] = 0; G.cur = 8; place(0); });
  await p.waitForTimeout(900);
  ok(await p.$eval('#overlay', e => e.classList.contains('on')) && (await p.$eval('#card h3', e => e.textContent)) === 'Stupul s-a umplut!', 'ecran de final când stupul e plin');
  const fin = await p.evaluate(() => ({ best: S.best, saved: JSON.parse(localStorage.getItem(KEY)).best, sc: G.score }));
  ok(fin.best === fin.sc && fin.best > 0 && fin.saved === fin.best, 'recordul se salvează');
  ok(await p.$('#bRevive') !== null, 'buton „Fă loc” pentru 25 miere');
  await p.click('#bRevive');
  ok(await p.evaluate(() => G.alive && G.revived && S.coins === 35 && emptyCount(G.cells) === 7), 'continuarea eliberează 7 celule și costă 25');
  await p.evaluate(() => { G.cells = G.cells.map((_, i) => 1 + (i % 4 === 0 ? 4 : i % 3)); G.cells[0] = 0; G.cur = 8; place(0); });
  await p.waitForTimeout(900);
  ok(await p.$('#bRevive') === null, 'a doua continuare nu mai e oferită');
  await p.click('#bMenu');
  ok(await p.evaluate(() => mode === 'menu') && (await p.$eval('#menuInfo', e => e.textContent)).includes('Record'), 'înapoi în meniu cu recordul afișat');

  // 7. pauză
  await p.click('#bPlay'); await p.click('#bPause');
  ok(await p.evaluate(() => G.paused && !place(G.cells.findIndex(v => !v))) && (await p.$eval('#card h3', e => e.textContent)) === 'Pauză', 'pauza blochează mutările');
  await p.click('#bResume'); ok(await p.evaluate(() => !G.paused), 'reluare după pauză');
  await p.keyboard.press('Escape'); ok(await p.evaluate(() => G.paused), 'Escape pune pauză');
  await p.click('#bQuit'); ok(await p.evaluate(() => mode === 'menu'), 'ieșire în meniu din pauză');

  // 8. magazin de teme
  await p.evaluate(() => { S.coins = 300; save(); });
  await p.click('#bShop');
  ok(await p.$$eval('.sk', e => e.length) === 6, '6 teme în magazin');
  await p.click('.sk[data-i="1"] button');
  ok(await p.evaluate(() => S.skin === 1 && S.owned.includes(1) && S.coins === 220), 'cumpărare temă Levănțică (80)');
  ok(await p.$eval('.sk[data-i="3"] button', e => e.disabled), 'tema de 400 e blocată fără miere');
  await p.click('.sk[data-i="0"] button'); ok(await p.evaluate(() => S.skin === 0), 'alegerea altei teme deținute');
  await p.click('#bShopBack');

  // 9. stupul zilei: același seed pentru toată ziua, record separat
  const dl = await p.evaluate(() => { startRun(true); const a = G.seed, c = G.cells.join(''); startRun(true); return { same: a === G.seed && c === G.cells.join(''), daily: G.daily, seed: a === dailySeed(todayStr()) }; });
  ok(dl.same && dl.daily && dl.seed, 'stupul zilei are seed fix pe zi');
  await p.evaluate(() => { G.score = 777; G.alive = false; gameOver(); });
  ok(await p.evaluate(() => S.daily[todayStr()] === 777), 'recordul zilei se salvează');
  await p.click('#bMenu');
  ok((await p.$eval('#bDaily', e => e.textContent)).includes('777'), 'butonul zilei arată recordul');
  ok(p.errs.length === 0, 'fără erori în consolă (mobil) ' + p.errs.join(' | '));

  // 10. bucla reală pe desktop EN + RU, randare și animații fără erori
  for (const [loc, word] of [['en-US', 'Play'], ['ru-RU', 'Играть']]) {
    const q = await fresh(b, loc, { width: 1280, height: 720 }, false);
    ok(await q.$eval('#bPlay', e => e.textContent) === word, 'limba ' + loc);
    await q.click('#bPlay');
    const c = await q.evaluate(() => { G.cells.fill(0); G.cells[IDX.get('1,0')] = 1; G.cells[IDX.get('-1,0')] = 1; G.cur = 1; const [x, y] = cellXY(IDX.get('0,0')); return { x, y }; });
    await q.mouse.move(c.x, c.y); await q.waitForTimeout(100);
    ok(await q.evaluate(() => preview(G.hover).length === 3), 'hover arată unirea care urmează (' + loc + ')');
    await q.mouse.click(c.x, c.y); await q.waitForTimeout(500);
    ok(await q.evaluate(() => G.cells[IDX.get('0,0')] === 2 && G.anim.length === 0 && G.t > 0.3), 'animația de unire se termină (' + loc + ')');
    await q.evaluate(() => { S.skin = 5; G.cells = G.cells.map((_, i) => i % 3 ? 1 + (i % 9) : 0); }); await q.waitForTimeout(300);
    ok(q.errs.length === 0, 'randare temă Auroră fără erori (' + loc + ') ' + q.errs.join(' | '));
    await q.context().close();
  }
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
