// Teste automate Otter Glide: node glide/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', vp = { width: 390, height: 844 }, opt = {}) {
  const ctx = await b.newContext({ viewport: vp, locale, ...opt }); const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  await p.goto(URL); await p.waitForTimeout(300); return p;
}
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  let p = await fresh(b);
  // 1. nivele
  const v = await p.evaluate(() => LEVELS.map((L, i) => { const s = solve(L); const P = params(L.world, i % 15); return { w: L.world, par: L.par, s: s && s.length, fish: L.fish.length, snow: L.cell.filter(c => c === 2).length, crack: L.cracks.length, min: P.min, max: P.max, sol: L.sol }; }));
  ok(v.length === 60 && [0, 1, 2, 3].every(w => v.filter(x => x.w === w).length === 15), '60 de iazuri în 4 lumi a câte 15');
  ok(v.every(x => x.s === x.par), 'fiecare iaz are soluție, iar „ideal” = soluția cea mai scurtă (BFS)');
  ok(v.every(x => x.par >= x.min - 1 && x.par <= x.max), 'dificultatea fiecărui iaz e în intervalul lumii');
  ok(v.filter(x => x.w === 0).every(x => !x.fish && !x.snow && !x.crack), 'lumea 1: doar pietre și vizuină');
  ok(v.filter(x => x.w >= 1).every(x => x.fish >= 1), 'lumile 2–4 au pești');
  ok(v.filter(x => x.w >= 2).every(x => x.snow >= 2) && v.filter(x => x.w === 3).every(x => x.crack >= 2), 'nămeți în lumile 3–4, gheață crăpată în lumea 4');
  const avg = w => v.filter(x => x.w === w).reduce((a, x) => a + x.par, 0) / 15;
  ok(avg(0) < avg(1) && avg(1) < avg(3), 'dificultatea crește (ideal mediu: ' + [0, 1, 2, 3].map(w => avg(w).toFixed(1)).join(', ') + ')');
  ok(await p.evaluate(() => new Set(LEVELS.map(L => L.cell.join('') + L.start + ':' + L.goal + ':' + L.fish)).size) === 60, 'toate iazurile sunt diferite');
  const p2 = await fresh(b); const same = await Promise.all([p, p2].map(q => q.evaluate(() => JSON.stringify(LEVELS.map(L => [L.cell, L.start, L.goal, L.fish])))));
  ok(same[0] === same[1], 'iazurile sunt identice la fiecare încărcare'); await p2.context().close();
  // 2. regulile alunecării
  const rules = await p.evaluate(() => {
    const L = mkLevel(5, 1, [0, 0, 2, 0, 1], 0, 3, []); const a = slide(L, { p: 0, f: 0, b: 0 }, 1);
    const L2 = mkLevel(5, 1, [0, 3, 0, 0, 0], 0, -1, []); const b1 = slide(L2, { p: 0, f: 0, b: 0 }, 1), b2 = slide(L2, { p: 4, f: 0, b: b1.b }, 3);
    const L3 = mkLevel(5, 1, [0, 0, 0, 0, 0], 0, 2, [4]); const c1 = slide(L3, { p: 0, f: 0, b: 0 }, 1), c2 = slide(L3, { p: 4, f: c1.f, b: 0 }, 3);
    return { snow: a.p === 2, blocked: slide(L, { p: 0, f: 0, b: 0 }, 3) === null, crack: b1.p === 4 && b1.b === 1 && b2.fall, fish: c1.p === 4 && c1.f === 1 && !c1.win && c2.win && c2.p === 2 };
  });
  ok(rules.snow && rules.blocked, 'nămetele oprește vidra; spre margine nu e mutare');
  ok(rules.crack, 'gheața crăpată se sparge după trecere și nu mai poți trece');
  ok(rules.fish, 'vizuina e închisă până prinzi toți peștii, apoi te prinde din alunecare');
  // 3. meniu, limbi, demo
  ok(await p.$eval('#bPlay', e => e.textContent) === 'Joacă', 'meniu în română');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent) === 'Play', 'comutare EN');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent) === 'Играть', 'comutare RU');
  await p.click('#bLang');
  await p.waitForTimeout(1800); ok(await p.evaluate(() => mode === 'menu' && G.demo && G.moves > 0), 'meniul are un iaz demo care se joacă singur');
  // 4. joc cu tastatura
  await p.click('#bPlay'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => mode === 'game' && LI === 0 && !G.demo) && await p.$eval('#tip', e => e.classList.contains('on')), 'Joacă pornește iazul 1 cu sfatul de început');
  const keys = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
  const sol0 = v[0].sol; for (const d of sol0) { await p.keyboard.press(keys[d]); await p.waitForTimeout(700); }
  await p.waitForTimeout(900);
  ok(await p.evaluate(() => G.done) && await p.$eval('#win', e => e.classList.contains('on')), 'săgețile mută vidra; vizuina = victorie');
  ok(await p.$$eval('#wStars .s', e => e.length) === 3, '3 stele la mutări = ideal');
  ok(await p.evaluate(() => S.done[0] === 1 && S.stars[0] === 3 && S.hints === 6 && S.tips.swipe === 1), 'progres salvat, +1 indiciu');
  await p.click('#wNext'); await p.waitForTimeout(200); ok(await p.evaluate(() => mode === 'game' && LI === 1), 'Următorul pornește iazul 2');
  // 5. undo, restart, indiciu, stele
  await p.evaluate(() => { FAST = true; startLevel(20); });
  const m1 = await p.evaluate(() => { const st = G.st; doMove(G.L.sol[0]); const moved = G.st.p !== st.p; undo(); return moved && G.st.p === st.p && G.moves === 0; });
  ok(m1, '↶ anulează ultima mutare');
  ok(await p.evaluate(() => { doMove(G.L.sol[0]); restart(); return G.moves === 0 && G.st.p === G.L.start; }), '↺ reîncepe iazul');
  const h = await p.evaluate(() => { const h0 = S.hints; hint(); return { used: S.hints === h0 - 1, dir: G.hintDir === G.L.sol[0] }; });
  ok(h.used && h.dir, 'indiciul arată prima mutare a soluției optime');
  await p.evaluate(() => { for (const d of solve(G.L, G.st)) doMove(d); }); await p.waitForTimeout(200);
  ok(await p.$$eval('#wStars .s', e => e.length) === 2, 'cu indiciu: maxim 2 stele');
  ok(await p.evaluate(() => starsFor({ par: 5 }, 5, 0) === 3 && starsFor({ par: 5 }, 8, 0) === 2 && starsFor({ par: 5 }, 9, 0) === 1), 'stele: ideal=3, +3=2, altfel 1');
  await p.evaluate(() => { S.hints = 0; startLevel(4); hint(); });
  ok(await p.evaluate(() => G.hintDir === -1) && await p.$eval('#toast', e => e.classList.contains('on')), 'fără indicii: mesaj');
  // 6. apă: mutarea spre gheață spartă e refuzată
  const fall = await p.evaluate(() => { for (let i = 45; i < 60; i++) { startLevel(i); const L = G.L; for (const s0 of [G.st]) { for (let d = 0; d < 4; d++) { const r = slide(L, s0, d); if (!r || r.fall) continue; for (let e = 0; e < 4; e++) { const r2 = slide(L, r, e); if (r2 && r2.fall) { doMove(d); const p0 = G.st.p, m = G.moves; doMove(e); return G.st.p === p0 && G.moves === m; } } } } } return 'none'; });
  ok(fall === true || fall === 'none', 'nu poți aluneca în apă (mutarea e refuzată) ' + fall);
  // 7. toate iazurile se termină prin interfață
  const all = await p.evaluate(() => { const bad = []; for (let i = 0; i < 60; i++) { startLevel(i); for (const d of G.L.sol) doMove(d); if (!G.done) bad.push(i + 1); } return bad; });
  ok(!all.length, 'toate cele 60 de iazuri se termină cu soluția lor ' + all.join(','));
  // 8. nivele + fulare
  await p.evaluate(() => { S.done = [1, 1, 1]; S.stars = [3, 3, 2]; S.tips = { swipe: 1, hint: 1 }; save(); toMenu(); });
  await p.click('#bLevels'); ok(await p.$$eval('.lv', e => e.length) === 60 && await p.$$eval('.lv.lock', e => e.length) === 56, 'ecranul de nivele: 60, cele neatinse blocate');
  await p.click('.lv[data-lv="10"]'); ok(await p.evaluate(() => mode !== 'game'), 'iazurile blocate nu pornesc');
  await p.click('.lv[data-lv="3"]'); ok(await p.evaluate(() => mode === 'game' && LI === 3), 'următorul iaz pornește din listă');
  await p.evaluate(() => toMenu()); await p.click('#bSkins');
  ok(await p.$$eval('.sk', e => e.length) === 6, '6 fulare');
  await p.click('.sk:nth-child(2)'); ok(await p.evaluate(() => S.skin === 0), 'fularul blocat nu se poate alege');
  await p.evaluate(() => { S.stars = new Array(15).fill(3); renderSkins(); }); await p.click('.sk:nth-child(3)');
  ok(await p.evaluate(() => S.skin === 2), 'cu stele destule, fularul se alege');
  // 9. iazul zilei
  const dl = await p.evaluate(() => { const a = dailyLevel(20261112), c = dailyLevel(20261113); return { same: JSON.stringify(a.cell) === JSON.stringify(dailyLevel(20261112).cell), diff: JSON.stringify(a.cell) + a.start !== JSON.stringify(c.cell) + c.start, ok: solve(a).length === a.par, par: a.par }; });
  ok(dl.same && dl.diff && dl.ok && dl.par >= 6, 'Iazul zilei: același azi, altul mâine, rezolvabil (ideal ' + dl.par + ')');
  await p.evaluate(() => { S.daily = 0; S.streak = 0; toMenu(); }); await p.click('#bDaily');
  await p.evaluate(() => { for (const d of G.L.sol) doMove(d); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => S.daily === dayKey() && S.streak === 1), 'iazul zilei salvează seria');
  // 10. persistență + cadou
  await p.evaluate(() => { S.gift = 20200101; save(); }); await p.reload(); await p.waitForTimeout(1000);
  ok(await p.evaluate(() => S.skin === 2 && S.gift === dayKey()) && await p.$eval('#toast', e => e.classList.contains('on')), 'progresul rămâne; cadou zilnic +2 indicii');
  ok(!p.errs.length, 'fără erori în consolă ' + p.errs.join(' | ')); await p.context().close();
  // 11. așezare pe ecran
  for (const vp of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 720 }, { width: 800, height: 600 }]) {
    p = await fresh(b, 'en-US', vp);
    const bad = await p.evaluate(() => { const o = []; for (let i = 0; i < 60; i++) { startLevel(i); const t = document.getElementById('tools').getBoundingClientRect(), hb = document.getElementById('hud').querySelector('.mid').getBoundingClientRect(); if (BX < 0 || BX + CS * G.L.w > innerWidth || BY < hb.bottom - 4 || BY + CS * G.L.h > t.top + 4 || CS < 30) o.push(i + 1 + ':' + CS); } return o; });
    ok(!bad.length, `${vp.width}x${vp.height}: iazul încape între bare, celule ≥30px ` + bad.slice(0, 5).join(','));
    await p.context().close();
  }
  // 12. glisare pe ecran tactil
  p = await fresh(b, 'en-US', { width: 390, height: 844 }, { hasTouch: true, isMobile: true });
  await p.evaluate(() => { FAST = true; startLevel(0); });
  const sw = await p.evaluate(() => { const d = G.L.sol[0], x = BX + (G.st.p % G.L.w + .5) * CS, y = BY + (((G.st.p / G.L.w) | 0) + .5) * CS; return { d, x, y }; });
  const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][sw.d];
  await p.mouse.move(sw.x, sw.y); await p.mouse.down(); await p.mouse.move(sw.x + dx * 80, sw.y + dy * 80, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(100);
  ok(await p.evaluate(() => G.moves === 1), 'glisarea mută vidra');
  ok(!p.errs.length, 'fără erori pe mobil'); await p.context().close();
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
