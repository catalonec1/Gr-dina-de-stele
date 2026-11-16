// Teste automate Glowcap Grove: node grove/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', vp = { width: 390, height: 844 }) {
  const ctx = await b.newContext({ viewport: vp, locale }); const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  await p.goto(URL); await p.waitForTimeout(300); return p;
}
// rezolvă o poiană prin atingeri (rotește fiecare rădăcină până la soluție)
const SOLVE = () => { const L = G.L; for (let i = 0; i < L.w * L.h; i++) { let k = 0; while (!L.hole[i] && G.m[i] !== L.sol[i] && k++ < 4 && !G.done) turn(i); } };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  let p = await fresh(b);
  // 1. nivele
  const v = await p.evaluate(() => LEVELS.map(L => { const free = L.w * L.h - L.hole.reduce((a, x) => a + x, 0); let edges = 0, bad = 0; for (let i = 0; i < L.w * L.h; i++) { if (L.hole[i]) { if (L.sol[i]) bad++; continue; } edges += deg(L.sol[i]); } const a0 = analyze(L, L.sol), a1 = analyze(L, L.start); let par = 0; for (let i = 0; i < L.w * L.h; i++) if (!L.hole[i]) par += tapsTo(L.start[i], L.sol[i]); return { w: L.world, n: free, tree: edges / 2 === free - L.src.length, bad, solWin: a0.win, startWin: a1.win, par: L.par, parOk: par === L.par, mush: L.mush.length, src: L.src.length, holes: L.w * L.h - free, wrap: L.wrap, two: new Set(L.mush.map(i => L.col[i])).size }; }));
  ok(v.length === 60 && [0, 1, 2, 3].every(w => v.filter(x => x.w === w).length === 15), '60 de poieni în 4 lumi a câte 15');
  ok(v.every(x => x.solWin && !x.startWin), 'fiecare poiană are soluție și nu începe rezolvată');
  ok(v.every(x => x.tree && !x.bad), 'soluția e o rețea fără bucle care acoperă toate celulele (pietrele fără rădăcini)');
  ok(v.every(x => x.parOk && x.par >= x.n * 0.6), '„ideal” = numărul minim de rotiri până la soluție');
  ok(v.every(x => x.mush >= 3), 'fiecare poiană are cel puțin 3 ciuperci');
  ok(v.filter(x => x.w === 0).every(x => !x.holes && x.src === 1 && !x.wrap), 'lumea 1: fără pietre, un ciot');
  ok(v.filter(x => x.w === 1).every(x => x.holes >= 3 && x.src === 1), 'lumea 2: pietre cu mușchi');
  ok(v.filter(x => x.w === 2).every(x => x.src === 2 && x.two === 2), 'lumea 3: două cioturi, ciuperci în două culori');
  ok(v.filter(x => x.w === 3).every(x => x.wrap && x.src === 1), 'lumea 4: tuneluri (marginile se leagă)');
  const avg = w => v.filter(x => x.w === w).reduce((a, x) => a + x.par, 0) / 15;
  ok(avg(0) < avg(1) && avg(0) < avg(2) && avg(0) < avg(3), 'dificultatea crește (ideal mediu: ' + [0, 1, 2, 3].map(w => avg(w).toFixed(1)).join(', ') + ')');
  ok(await p.evaluate(() => new Set(LEVELS.map(L => Array.from(L.start).join(',') + L.w)).size) === 60, 'toate poienile sunt diferite');
  const p2 = await fresh(b); const same = await Promise.all([p, p2].map(q => q.evaluate(() => JSON.stringify(LEVELS.map(L => [Array.from(L.start), Array.from(L.sol), L.src])))));
  ok(same[0] === same[1], 'poienile sunt identice la fiecare încărcare'); await p2.context().close();
  // 2. regulile
  const rules = await p.evaluate(() => {
    const r = rot(0b0011) === 0b0110 && rot(0b1001) === 0b0011 && tapsTo(0b0101, 0b0101) === 0 && tapsTo(0b1010, 0b0101) === 1 && tapsTo(15, 15) === 0;
    const L = { w: 3, h: 1, wrap: false, hole: new Uint8Array(3), src: [1], col: new Int8Array(3), mush: [0, 2] };
    const okL = analyze(L, [2, 10, 8]), open = analyze(L, [2, 10, 4]), edge = analyze(L, [10, 10, 8]);
    const Lw = { w: 3, h: 1, wrap: true, hole: new Uint8Array(3), src: [0], col: new Int8Array(3), mush: [1] };
    const wr = analyze(Lw, [8, 2, 10]);   // 0 iese spre stânga și intră prin dreapta în 2, apoi 2 → 1
    const L2 = { w: 4, h: 1, wrap: false, hole: new Uint8Array(4), src: [0, 3], col: new Int8Array([0, 0, 1, 1]), mush: [1, 2] };
    const two = analyze(L2, [2, 8, 2, 8]), mixed = analyze(L2, [2, 10, 10, 8]);
    const Lh = { w: 3, h: 1, wrap: false, hole: new Uint8Array([0, 0, 1]), src: [0], col: new Int8Array(3), mush: [1] };
    const hole = analyze(Lh, [2, 10, 0]);
    return { r, ok: okL.win && okL.lit === 2, open: !open.win && open.open === 2, edge: !edge.win && edge.open >= 1, wrap: wr.win, two: two.win && two.lit === 2, mixed: !mixed.win && mixed.mixed, hole: !hole.win && hole.open === 1 };
  });
  ok(rules.r, 'rotirea în sensul acelor și numărul minim de rotiri (linia dreaptă are 2 poziții, crucea 1)');
  ok(rules.ok && rules.open && rules.edge, 'câștigi doar fără capete libere (nici spre margine)');
  ok(rules.hole, 'nicio rădăcină nu intră într-o piatră');
  ok(rules.wrap, 'în tuneluri marginea stângă se leagă de cea dreaptă');
  ok(rules.two && rules.mixed, 'două rețele: fiecare ciupercă la ciotul culorii ei; rețelele unite = greșit');
  // 3. meniu, limbi, demo
  ok(await p.$eval('#bPlay', e => e.textContent) === 'Joacă', 'meniu în română');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent) === 'Play', 'comutare EN');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent) === 'Играть', 'comutare RU');
  await p.click('#bLang');
  await p.waitForTimeout(1800); ok(await p.evaluate(() => mode === 'menu' && G.demo && G.moves > 0), 'meniul are o poiană demo care se rezolvă singură');
  // 4. joc prin atingeri pe ecran
  await p.click('#bPlay'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => mode === 'game' && LI === 0 && !G.demo) && await p.$eval('#tip', e => e.classList.contains('on')), 'Joacă pornește poiana 1 cu sfatul de început');
  const taps = await p.evaluate(() => { const L = G.L, out = []; for (let i = 0; i < L.w * L.h; i++) { const t = tapsTo(G.m[i], L.sol[i]); for (let k = 0; k < t; k++) out.push([BX + (i % L.w + .5) * CS, BY + (((i / L.w) | 0) + .5) * CS]); } return out; });
  for (const [x, y] of taps) { await p.mouse.click(x, y); await p.waitForTimeout(30); }
  await p.waitForTimeout(1400);
  ok(await p.evaluate(() => G.done) && await p.$eval('#win', e => e.classList.contains('on')), 'atingerile rotesc rădăcinile; toate ciupercile aprinse = victorie');
  ok(await p.$$eval('#wStars .s', e => e.length) === 3, '3 stele la rotiri = ideal');
  ok(await p.evaluate(() => S.done[0] === 1 && S.stars[0] === 3 && S.hints === 6 && S.tips.tap === 1), 'progres salvat, +1 indiciu');
  await p.click('#wNext'); await p.waitForTimeout(200); ok(await p.evaluate(() => mode === 'game' && LI === 1), 'Următoarea pornește poiana 2');
  // 5. tastatură
  const kb = await p.evaluate(() => { startLevel(2); return { cur: G.cur, w: G.L.w, m: G.m[G.L.src[0]] }; });
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('Space');
  ok(await p.evaluate(k => { const L = G.L, x = (k.cur % L.w + 1) % L.w, i = ((k.cur / L.w) | 0) * L.w + x; return G.cur === i && G.moves === 1 && G.kb; }, kb), 'săgețile mută cursorul, Space rotește');
  await p.keyboard.press('z'); ok(await p.evaluate(() => G.moves === 0 && G.hist.length === 0), 'Z anulează');
  // 6. undo, restart, indiciu, stele
  await p.evaluate(() => { FAST = true; startLevel(20); });
  ok(await p.evaluate(() => { const i = G.L.src[0], m0 = G.m[i]; turn(i); turn(i); undo(); const a = G.m[i] === rot(m0) && G.moves === 1; undo(); return a && G.m[i] === m0 && G.moves === 0; }), '↶ anulează rotirile una câte una');
  ok(await p.evaluate(() => { turn(G.L.src[0]); restart(); return G.moves === 0 && Array.from(G.m).join() === Array.from(G.L.start).join(); }), '↺ reîncepe poiana');
  const h = await p.evaluate(() => { const h0 = S.hints; hint(); const i = G.pin.indexOf(1); const m = G.m[i]; turn(i); return { used: S.hints === h0 - 1, right: i >= 0 && G.m[i] === G.L.sol[i], pinned: G.m[i] === m }; });
  ok(h.used && h.right, 'indiciul pune o rădăcină la locul ei');
  ok(h.pinned, 'rădăcina fixată de indiciu nu se mai rotește');
  await p.evaluate(SOLVE); await p.waitForTimeout(100);
  ok(await p.$$eval('#wStars .s', e => e.length) <= 2 && await p.evaluate(() => G.done), 'cu indiciu: maxim 2 stele');
  ok(await p.evaluate(() => starsFor({ par: 20 }, 20, 0) === 3 && starsFor({ par: 20 }, 26, 0) === 2 && starsFor({ par: 20 }, 27, 0) === 1 && starsFor({ par: 20 }, 10, 1) === 2), 'stele: ideal=3, +30% (min 3)=2, altfel 1');
  await p.evaluate(() => { S.hints = 0; startLevel(4); hint(); });
  ok(await p.evaluate(() => G.pin.indexOf(1) === -1) && await p.$eval('#toast', e => e.classList.contains('on')), 'fără indicii: mesaj');
  // 7. toate poienile se termină prin rotiri
  const all = await p.evaluate(s => { const bad = []; for (let i = 0; i < 60; i++) { startLevel(i); eval('(' + s + ')')(); if (!G.done || G.moves !== G.L.par) bad.push(i + 1); } return bad; }, SOLVE.toString());
  ok(!all.length, 'toate cele 60 de poieni se termină exact în „ideal” rotiri ' + all.join(','));
  const daily = await p.evaluate(s => { startLevel(-1); const a = G.L.daily === dayKey() && !G.an.win; eval('(' + s + ')')(); return a && G.done; }, SOLVE.toString());
  ok(daily, 'Poiana zilei se generează și se poate termina');
  await p.waitForTimeout(100);
  ok(await p.evaluate(() => S.daily === dayKey() && S.streak === 1), 'Poiana zilei pornește seria 🔥');
  // 8. nivele + lumini
  await p.evaluate(() => { S.done = [1, 1, 1]; S.stars = [3, 3, 2]; S.tips = { tap: 1, hint: 1 }; save(); toMenu(); });
  await p.click('#bLevels'); ok(await p.$$eval('.lv', e => e.length) === 60 && await p.$$eval('.lv.lock', e => e.length) === 56, 'ecranul de nivele: 60, cele neatinse blocate');
  await p.click('.lv[data-lv="10"]'); ok(await p.evaluate(() => mode !== 'game'), 'poienile blocate nu pornesc');
  await p.click('.lv[data-lv="3"]'); ok(await p.evaluate(() => mode === 'game' && LI === 3), 'următoarea poiană pornește din listă');
  await p.evaluate(() => toMenu()); await p.click('#bSkins');
  ok(await p.$$eval('.sk', e => e.length) === 8, '8 lumini');
  await p.click('.sk:nth-child(2)'); ok(await p.evaluate(() => S.skin === 0), 'lumina blocată nu se poate alege');
  await p.evaluate(() => { S.stars = new Array(15).fill(3); renderSkins(); }); await p.click('.sk:nth-child(3)');
  ok(await p.evaluate(() => S.skin === 2), 'lumina deblocată se alege');
  // 9. persistență + setări
  await p.reload(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => S.skin === 2 && S.done[0] === 1), 'progresul rămâne după reîncărcare');
  await p.click('#bSettings'); await p.click('#sSound'); ok(await p.evaluate(() => S.sound === 0), 'sunetul se oprește din setări');
  await p.click('#sReset'); await p.click('#sReset'); ok(await p.evaluate(() => !S.done.length && S.skin === 0), 'ștergerea progresului cere două apăsări');
  // 10. desktop + fără erori
  const d = await fresh(b, 'en-US', { width: 1280, height: 720 });
  await d.evaluate(() => startLevel(59)); await d.waitForTimeout(300);
  ok(await d.evaluate(() => BX > 0 && BY >= 60 && BY + CS * G.L.h < innerHeight - 70 && CS >= 50), 'desktop: tabla încape între bara de sus și unelte');
  ok(await p.evaluate(() => { startLevel(59); return BX >= 5 && BX + CS * G.L.w <= innerWidth - 5 && BY + CS * G.L.h < innerHeight - 70; }), 'mobil: cea mai mare poiană încape pe ecran');
  ok(!p.errs.length && !d.errs.length, 'nicio eroare în consolă ' + p.errs.concat(d.errs).join(' | '));
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
