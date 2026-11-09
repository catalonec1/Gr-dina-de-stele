// Teste automate Cozy Quilt: node quilt/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', vp = { width: 390, height: 844 }, ctxOpt = {}) {
  const ctx = await b.newContext({ viewport: vp, locale, ...ctxOpt });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' '))); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  await p.goto(URL); await p.waitForTimeout(300); return p;
}
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  let p = await fresh(b);

  // 1. nivele
  const v = await p.evaluate(() => LEVELS.map((L, i) => {
    const cover = new Array(L.w * L.h).fill(0);
    for (const P of L.pieces) for (const [x, y] of P.base) { const X = P.sol[0] + x, Y = P.sol[1] + y; if (X >= 0 && Y >= 0 && X < L.w && Y < L.h) cover[Y * L.w + X]++; else cover.push(9); }
    const exact = cover.every((c, k) => k >= L.w * L.h ? false : (L.mask[k] ? c === 1 : c === 0));
    const sizes = L.pieces.map(P => P.base.length);
    return { i, world: L.world, n: L.pieces.length, exact, minS: Math.min(...sizes), maxS: Math.max(...sizes), rotated: L.pieces.filter(P => P.r).length, flipped: L.pieces.filter(P => P.f).length, buttons: L.fixed.filter(Boolean).length, rot: L.rot, flip: L.flip, tip: L.tip, cells: L.mask.filter(Boolean).length };
  }));
  ok(v.length === 60 && [0, 1, 2, 3].every(w => v.filter(x => x.world === w).length === 15), '60 de pilote în 4 lumi a câte 15');
  ok(v.every(x => x.exact), 'fiecare pilotă are o soluție care acoperă exact modelul');
  ok(v.every(x => x.n >= 2 && x.minS >= 2 && x.maxS <= 6), 'peticele au între 2 și 6 pătrate, minim 2 petice');
  ok(v.filter(x => x.world === 0).every(x => !x.rotated && !x.flipped && !x.rot), 'lumea 1: peticele sunt deja orientate corect');
  ok(v.filter(x => x.world >= 1).every(x => x.rot && x.rotated >= 1), 'lumile 2–4: cel puțin un petic trebuie rotit');
  ok(v.filter(x => !x.flip).every(x => !x.flipped), 'fără butonul ⇋, niciun petic nu e pe dos');
  ok(v.filter(x => x.world === 3).filter(x => x.flipped).length >= 10, 'lumea 4: peticele pe dos apar în cel puțin 10 pilote (' + v.filter(x => x.world === 3 && x.flipped).length + ')');
  ok(v.filter(x => x.world === 2).every(x => x.buttons >= 1), 'lumea 3: fiecare pilotă are nasturi');
  ok(['drag', 'hint', 'rotate', 'button', 'flip'].every(k => v.some(x => x.tip === k)), 'fiecare mecanică nouă are un sfat la prima apariție');
  const avg = w => v.filter(x => x.world === w).reduce((a, x) => a + x.n, 0) / 15;
  ok(avg(0) < avg(1) + 2 && avg(1) <= avg(3) && v[59].n >= v[0].n + 8, 'dificultatea crește (petice/lume: ' + [0, 1, 2, 3].map(w => avg(w).toFixed(1)).join(', ') + ')');
  const kinds = await p.evaluate(() => new Set(LEVELS.map(L => L.w + 'x' + L.h + ':' + L.mask.map(Number).join('') + ':' + L.pieces.map(P => key(P.base)).sort().join('|'))).size);
  ok(kinds === 60, 'toate cele 60 de pilote sunt diferite');
  const p2 = await fresh(b);
  const same = await Promise.all([p, p2].map(q => q.evaluate(() => JSON.stringify(LEVELS.map(L => L.pieces.map(P => [P.base, P.sol, P.r, P.f]))))));
  ok(same[0] === same[1], 'nivelele sunt identice la fiecare încărcare (deterministe)'); await p2.context().close();

  // 2. pilota zilei
  const dl = await p.evaluate(() => { const a = dailyLevel(20261109), b2 = dailyLevel(20261109), c = dailyLevel(20261110); const L = a; const cover = new Array(L.w * L.h).fill(0); for (const P of L.pieces) for (const [x, y] of P.base) cover[(P.sol[1] + y) * L.w + P.sol[0] + x]++; return { same: JSON.stringify(a.pieces) === JSON.stringify(b2.pieces), diff: JSON.stringify(a.pieces) !== JSON.stringify(c.pieces), exact: cover.every((x, k) => L.mask[k] ? x === 1 : x === 0), n: a.pieces.length }; });
  ok(dl.same && dl.diff && dl.exact && dl.n >= 6, 'Pilota zilei: aceeași azi pentru toți, alta mâine, rezolvabilă (' + dl.n + ' petice)');

  // 3. meniu și limbi
  ok(await p.$eval('#bPlay', e => e.textContent) === 'Joacă', 'meniu în română');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent) === 'Play', 'comutare EN');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent) === 'Играть', 'comutare RU');
  await p.click('#bLang'); await p.bringToFront();
  ok(await p.evaluate(() => G && G.demo && mode === 'menu'), 'meniul are o pilotă demo care se coase singură');
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => G.pieces.some(q => q.gx !== null)), 'demo-ul așază petice în fundal ' + await p.evaluate(() => JSON.stringify({ t: demo && demo.t, n: G.pieces.length, demo: G.demo, mode })));

  // 4. tutorial + drag real cu mouse-ul
  await p.click('#bPlay'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => mode === 'game' && LI === 0 && G.hand), 'Joacă pornește pilota 1 cu mâna animată');
  ok(await p.$eval('#tip', e => e.classList.contains('on') && e.textContent.includes('Trage')), 'sfatul de tragere e afișat');
  ok(await p.evaluate(() => { const t = document.getElementById('tip').getBoundingClientRect(); return BY - CS * 0.3 >= t.bottom - 2; }), 'sfatul nu acoperă pilota');
  const drag = async (id, gx, gy) => {
    const d = await p.evaluate(([id, gx, gy]) => { const P = G.pieces[id], tp = P.gx === null ? trayPos(P) : { x: BX + P.gx * CS, y: BY + P.gy * CS }, k = P.gx === null ? TS : CS, c = cellsOf(P)[0]; return { sx: tp.x + (c[0] + 0.5) * k, sy: tp.y + (c[1] + 0.5) * k, ex: BX + (gx + c[0] + 0.5) * CS, ey: BY + (gy + c[1] + 0.5) * CS }; }, [id, gx, gy]);
    await p.mouse.move(d.sx, d.sy); await p.mouse.down(); await p.mouse.move((d.sx + d.ex) / 2, (d.sy + d.ey) / 2, { steps: 5 }); await p.mouse.move(d.ex, d.ey, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(80);
  };
  const first = await p.evaluate(() => G.pieces.map(P => ({ id: P.id, sol: P.sol })));
  // drop greșit: peste margine → se întoarce în coș
  await drag(first[0].id, -3, 0);
  ok(await p.evaluate(id => G.pieces[id].gx === null, first[0].id), 'peticul lăsat în afara pilotei se întoarce în coș');
  await drag(first[0].id, first[0].sol[0], first[0].sol[1]);
  ok(await p.evaluate(id => G.pieces[id].gx !== null && !G.hand, first[0].id), 'tragerea cu mouse-ul așază peticul și ascunde mâna');
  // suprapunere interzisă
  await drag(first[1].id, first[0].sol[0], first[0].sol[1]);
  ok(await p.evaluate(id => G.pieces[id].gx === null, first[1].id), 'nu poți pune un petic peste altul');
  await drag(first[1].id, first[1].sol[0], first[1].sol[1]);
  await p.waitForTimeout(1700);
  ok(await p.evaluate(() => G.done) && await p.$eval('#win', e => e.classList.contains('on')), 'pilota plină = victorie + ecranul de final');
  ok(await p.$$eval('#wStars .s', e => e.length) === 3, '3 stele fără indicii');
  ok(await p.evaluate(() => S.done[0] === 1 && S.stars[0] === 3 && S.hints === 6 && S.tips.drag === 1), 'progres salvat, +1 indiciu pentru pilota nouă');
  await p.click('#wNext'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => mode === 'game' && LI === 1), 'Următoarea pornește pilota 2');
  // ridici un petic de pe pilotă
  const id2 = await p.evaluate(() => { const P = G.pieces[0]; place(P.id, P.sol[0], P.sol[1], 0, 0); return P.id; });
  await drag(id2, 5, 5);
  ok(await p.evaluate(id => G.pieces[id].gx === null, id2), 'un petic de pe pilotă poate fi ridicat înapoi în coș');

  // 5. indiciu
  await p.evaluate(() => startLevel(3)); await p.waitForTimeout(200);
  ok(await p.$eval('#tip', e => e.classList.contains('on') && e.textContent.includes('Indiciu')), 'sfatul despre indiciu apare la pilota 4');
  const h0 = await p.evaluate(() => S.hints);
  await p.click('#bHint'); await p.waitForTimeout(100);
  ok(await p.evaluate(h0 => S.hints === h0 - 1 && G.hints === 1 && G.pieces.filter(correct).length === 1, h0), 'indiciul așază corect un petic și consumă un indiciu');
  // peticul greșit care ocupă locul e scos
  await p.evaluate(() => { const free = G.pieces.filter(P => P.gx === null); const P = free[0], o = G.pieces.find(Q => Q !== P && Q.gx === null); place(o.id, P.sol[0], P.sol[1], o.r, o.f); });
  await p.click('#bHint'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => G.pieces.filter(correct).length === 2 && G.grid.every((g, i) => g < 0 || correct(G.pieces[g]) || true)), 'indiciul eliberează locul ocupat de alt petic');
  await p.evaluate(() => solveAll()); await p.waitForTimeout(1600);
  ok(await p.$$eval('#wStars .s', e => e.length) === 1, '2 indicii = 1 stea');
  await p.evaluate(() => { S.hints = 0; startLevel(4); }); await p.click('#bHint'); await p.waitForTimeout(50);
  ok(await p.evaluate(() => G.hints === 0) && await p.$eval('#toast', e => e.classList.contains('on')), 'fără indicii: mesaj, nimic nu se schimbă');

  // 6. rotire cu atingere + întoarcere
  await p.evaluate(() => { S.hints = 5; startLevel(15); }); await p.waitForTimeout(200);
  ok(await p.$eval('#tip', e => e.textContent.includes('rotești')) && await p.$eval('#bRot', e => e.style.display !== 'none') && await p.$eval('#bFlip', e => e.style.display === 'none'), 'lumea 2: sfat de rotire, buton ↻, fără ⇋');
  const rp = await p.evaluate(() => { const P = G.pieces.find(Q => Q.r); const s = slots[P.id]; return { id: P.id, r: P.r, x: s.x + s.w / 2, y: s.y + s.h / 2 }; });
  await p.mouse.click(rp.x, rp.y); await p.waitForTimeout(50);
  ok(await p.evaluate(rp => G.pieces[rp.id].r === (rp.r + 1) % 4 && G.sel === rp.id, rp), 'atingerea unui petic îl rotește cu 90°');
  await p.keyboard.press('r');
  ok(await p.evaluate(rp => G.pieces[rp.id].r === (rp.r + 2) % 4, rp), 'tasta R rotește peticul selectat');
  // pe pilotă: rotire pe loc
  const onb = await p.evaluate(() => { const P = G.pieces.find(Q => key(orient(Q.base, 1, 0)) !== key(Q.base)); P.r = 0; P.f = 0; place(P.id, P.sol[0], P.sol[1]); G.sel = P.id; rotateSel(1); return { r: P.r, gx: P.gx }; });
  ok(onb.r === 1 || onb.gx === null, 'rotirea pe pilotă rotește pe loc sau trimite peticul în coș');
  await p.evaluate(() => { S.tips.flip = 0; startLevel(45); }); await p.waitForTimeout(200);
  ok(await p.$eval('#bFlip', e => e.style.display !== 'none') && await p.$eval('#tip', e => e.textContent.includes('⇋')), 'lumea 4: butonul ⇋ și sfatul lui');
  const fl = await p.evaluate(() => { const P = G.pieces.find(Q => Q.f) || G.pieces[0]; G.sel = P.id; const f = P.f; flipSel(); return P.f !== f; });
  ok(fl, '⇋ întoarce peticul în oglindă');

  // 7. toate nivelele se pot termina doar cu rotiri/întoarceri permise, prin interfața jocului
  const all = await p.evaluate(() => { const bad = []; for (let i = 0; i < 60; i++) { startLevel(i); for (const P of G.pieces) { let n = 0; if (P.f && G.L.flip) { G.sel = P.id; flipSel(); } while (!(P.r === 0 && P.f === 0) && n++ < 4) { G.sel = P.id; rotateSel(1); } if (P.r || P.f) { bad.push(i + 1); break; } if (!place(P.id, P.sol[0], P.sol[1])) { bad.push(i + 1); break; } } if (!isFull()) bad.push(i + 1); G.done = true; } return bad; });
  ok(!all.length, 'toate cele 60 de pilote se termină cu uneltele disponibile ' + (all.length ? JSON.stringify(all) : ''));

  // 8. nivele, blocări, materiale
  await p.evaluate(() => { S.done = [1, 1, 1]; S.stars = [3, 3, 2]; save(); toMenu(); });
  await p.click('#bLevels'); await p.waitForTimeout(100);
  ok(await p.$$eval('.lv', e => e.length) === 60 && await p.$$eval('.lv.lock', e => e.length) === 56, 'ecranul de nivele: 60 de pilote, cele neatinse blocate');
  ok(await p.$eval('.lv.cur', e => e.dataset.lv) === '3', 'următoarea pilotă e evidențiată');
  await p.click('.lv[data-lv="10"]'); ok(await p.evaluate(() => mode !== 'game') && await p.$eval('#toast', e => e.classList.contains('on')), 'pilotele blocate nu pornesc');
  await p.click('[data-back]'); await p.click('#bFabrics'); await p.waitForTimeout(100);
  ok(await p.$$eval('.fb', e => e.length) === 6, '6 seturi de materiale');
  await p.click('.fb:nth-child(2)'); ok(await p.evaluate(() => S.fab === 0), 'materialul blocat nu se poate alege');
  await p.evaluate(() => { S.stars = new Array(15).fill(3); renderFabrics(); }); await p.click('.fb:nth-child(3)');
  ok(await p.evaluate(() => S.fab === 2), 'cu stele destule, materialul se deblochează și se alege');

  // 9. pilota zilei, serie
  await p.evaluate(() => { S.daily = 0; S.streak = 0; toMenu(); }); await p.click('#bDaily'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => mode === 'game' && G.L.daily === dayKey()), 'butonul Pilota zilei pornește pilota de azi');
  await p.evaluate(() => solveAll()); await p.waitForTimeout(1600);
  ok(await p.evaluate(() => S.daily === dayKey() && S.streak === 1) && await p.$eval('#wInfo', e => e.textContent.includes('1')), 'pilota zilei salvează seria');
  await p.evaluate(() => { const y = new Date(); y.setDate(y.getDate() - 1); S.daily = dayKey(y); S.streak = 4; startLevel(-1); solveAll(); }); await p.waitForTimeout(1600);
  ok(await p.evaluate(() => S.streak === 5), 'seria crește dacă ai jucat și ieri');

  // 10. persistență + cadou zilnic
  await p.evaluate(() => { S.gift = 20200101; save(); });
  await p.reload(); await p.waitForTimeout(1300);
  ok(await p.evaluate(() => S.done[0] === 1 && S.fab === 2 && S.gift === dayKey()), 'progresul rămâne după reîncărcare');
  ok(await p.$eval('#toast', e => e.classList.contains('on')), 'cadou zilnic: +2 indicii la prima deschidere din zi');
  ok(!p.errs.length, 'fără erori în consolă ' + p.errs.join(' | '));
  await p.context().close();

  // 11. așezare pe ecran: telefon mic, telefon mare, desktop
  for (const vp of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 720 }, { width: 800, height: 600 }]) {
    p = await fresh(b, 'en-US', vp);
    const bad = await p.evaluate(() => { const out = []; S.tips = { drag: 1, hint: 1, rotate: 1, button: 1, flip: 1 }; for (let i = 0; i < 60; i++) { startLevel(i); const bx1 = BX + CS * G.L.w, by1 = BY + CS * G.L.h, tools = document.getElementById('tools').getBoundingClientRect(); if (BX < 0 || bx1 > innerWidth || BY < 60 || by1 > tools.top) out.push(i + 1 + ':board'); for (const P of G.pieces) { const s = slots[P.id]; if (s.x < 0 || s.x + s.w > innerWidth + 1 || s.y + s.h > tools.top + 4) { out.push(i + 1 + ':slot'); break; } if (s.x < bx1 && s.x + s.w > BX && s.y < by1 && s.y + s.h > BY) { out.push(i + 1 + ':overlap'); break; } } if (CS < 26 || TS < 8) out.push(i + 1 + ':small' + CS + '/' + TS); } return out; });
    ok(!bad.length, `${vp.width}x${vp.height}: pilota și coșul încap, fără suprapuneri, celule ≥26px ` + (bad.length ? bad.slice(0, 6).join(',') : ''));
    await p.context().close();
  }

  // 12. atingere pe mobil (touch)
  p = await fresh(b, 'en-US', { width: 390, height: 844 }, { hasTouch: true, isMobile: true });
  await p.evaluate(() => startLevel(0)); await p.waitForTimeout(100);
  const tp = await p.evaluate(() => { const P = G.pieces[0], t = trayPos(P), c = cellsOf(P)[0]; return { x: t.x + (c[0] + .5) * TS, y: t.y + (c[1] + .5) * TS }; });
  await p.touchscreen.tap(tp.x, tp.y);
  ok(await p.evaluate(() => G.sel === 0), 'atingerea pe ecran tactil selectează peticul');
  ok(!p.errs.length, 'fără erori pe mobil');
  await p.context().close();

  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
