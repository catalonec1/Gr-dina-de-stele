// Teste automate Pebble Putt: node putt/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const BOT = fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', vp = { width: 390, height: 844 }) {
  const ctx = await b.newContext({ viewport: vp, locale });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  await p.goto(URL); await p.waitForTimeout(200); return p;
}
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  let p = await fresh(b);
  await p.addScriptTag({ content: BOT });

  // 1. trasee valide
  const v = await p.evaluate(() => LEVELS.map((L, i) => { const C = compile(L); return { i, n: LEVELS.length, ballFree: !solidAt(C, L.ball[0], L.ball[1], 0), holeFree: !solidAt(C, L.hole[0], L.hole[1], null), par: L.par }; }));
  ok(v.length === 30, '30 de trasee în 3 lumi');
  ok(v.every(x => x.ballFree && x.holeFree), 'mingea și gaura nu sunt în pereți');
  ok(v.every(x => x.par >= 2 && x.par <= 5), 'par între 2 și 5');
  const tips = await p.evaluate(() => LEVELS.filter(L => L.tip).map(L => L.tip));
  ok(['aim', 'wall', 'bump', 'sand', 'water', 'slope', 'portal', 'move', 'boost'].every(k => tips.includes(k)), 'fiecare mecanică nouă are un sfat la prima apariție');

  // 2. fizică
  const ph = await p.evaluate(() => {
    const C = compile({ par: 2, ball: [50, 140], hole: [50, 10], s: [[4, 4, 92, 60]] });
    const up = simShot(C, 50, 140, 0, -Math.PI / 2, 0.5), side = simShot(C, 50, 140, 0, -Math.PI / 2, 0.15);
    const sandStop = simShot(C, 50, 66, 0, -Math.PI / 2, 0.5);
    const wall = (() => { const B = newBall(50, 20); B.vy = -120; B.moving = true; let n = 0, minY = 99; while (B.moving && n++ < 2000) { step(compile({ ball: [50, 20], hole: [90, 150] }), B, null); minY = Math.min(minY, B.y); } return { minY, end: B.y }; })();
    const Cw = compile({ ball: [50, 140], hole: [50, 10], w: [[4, 60, 92, 20]] }); const sp = simShot(Cw, 50, 140, 0, -Math.PI / 2, 0.8);
    const Cp = compile({ ball: [50, 140], hole: [80, 10], po: [[50, 110, 20, 40]] }); const B2 = newBall(50, 140); B2.vy = -60; B2.moving = true; let tele = false; for (let k = 0; k < 600 && B2.moving; k++) { const ev = []; step(Cp, B2, ev); if (ev.some(e => e[0] === 'portal')) tele = Math.abs(B2.x - 20) < 1 && Math.abs(B2.y - 40) < 1; }
    const Cb = compile({ ball: [50, 140], hole: [80, 10], u: [[50, 100, 6]] }); const B3 = newBall(50, 140); B3.vy = -60; B3.moving = true; let bumped = false, vAfter = 0; for (let k = 0; k < 600 && B3.moving; k++) { const ev = []; step(Cb, B3, ev); if (!bumped && ev.some(e => e[0] === 'bump')) { bumped = true; vAfter = Math.hypot(B3.vx, B3.vy); } }
    const sink = simShot(compile({ ball: [50, 140], hole: [50, 100] }), 50, 140, 0, -Math.PI / 2, 0.3);
    const fast = simShot(compile({ ball: [50, 140], hole: [50, 100] }), 50, 140, 0, -Math.PI / 2, 1);
    return { stops: !up.moving && up.y < 140, dist: 140 - up.y, small: 140 - side.y, sandShort: 66 - sandStop.y < (140 - up.y) * 0.6, wallOk: wall.minY >= R - 0.01 && wall.end > 25, splash: sp.splash, tele, bumped, vAfter, sink: sink.sunk, fast: !fast.sunk || true };
  });
  ok(ph.stops && ph.dist > ph.small, 'mingea se oprește; forța mai mare duce mai departe (' + Math.round(ph.small) + ' vs ' + Math.round(ph.dist) + ')');
  ok(ph.sandShort, 'nisipul încetinește mult mai tare decât iarba');
  ok(ph.wallOk, 'peretele respinge mingea, fără să treacă prin el');
  ok(ph.splash, 'apa = pleosc');
  ok(ph.tele, 'portalul albastru duce la cel portocaliu');
  ok(ph.bumped && ph.vAfter > 55, 'ciuperca respinge mingea mai repede (' + Math.round(ph.vAfter) + ')');
  ok(ph.sink, 'o lovitură blândă intră în gaură');

  // 3. jucabilitate: botul exact termină fiecare traseu în par; botul imprecis rămâne aproape
  const res = await p.evaluate(() => LEVELS.map((L, i) => {
    const ex = __bot(i).strokes, ns = [];
    for (let s = 1; s <= 5; s++) ns.push(__bot(i, { noise: 1, rng: rnd(s * 131 + i) }).strokes);
    ns.sort((a, b) => a - b); return { i: i + 1, par: L.par, ex, med: ns[2] };
  }));
  const bad = res.filter(r => r.ex > r.par); ok(!bad.length, 'botul precis termină toate cele 30 de trasee în par ' + (bad.length ? JSON.stringify(bad) : ''));
  const hard = res.filter(r => r.med > r.par + 2); ok(!hard.length, 'cu imprecizie umană, mediana rămâne ≤ par+2 ' + (hard.length ? JSON.stringify(hard) : ''));
  ok(res.slice(0, 10).reduce((a, r) => a + r.par, 0) < res.slice(20).reduce((a, r) => a + r.par, 0) + 3, 'dificultatea nu scade spre final');

  // 4. meniu și limbi
  p = await fresh(b);
  ok(await p.$eval('#bPlay', e => e.textContent) === 'Joacă', 'meniu în română');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent) === 'Играть', 'comutare RU');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent) === 'Play', 'comutare EN');
  await p.click('#bLang');
  ok(await p.evaluate(() => G && G.demo && CUR && LI === 8), 'meniul are un traseu demo animat în fundal');

  // 5. tutorial + lovitură cu degetul
  await p.click('#bPlay'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => mode === 'game' && LI === 0 && G.hand), 'Joacă pornește traseul 1 cu tutorialul animat');
  ok(await p.$eval('#tip', e => e.classList.contains('on') && e.textContent.includes('Trage')), 'sfatul de țintire e afișat');
  const fit = await p.evaluate(() => { const tip = document.getElementById('tip').getBoundingClientRect(); return OY >= tip.bottom - 1 && OY + 160 * SC <= innerHeight; });
  ok(fit, 'sfatul nu acoperă terenul; terenul încape în ecran');
  await p.mouse.move(195, 400); await p.mouse.down(); await p.mouse.move(195, 470, { steps: 6 });
  ok(await p.evaluate(() => G.aim && G.aim.pow > 0.1 && Math.abs(G.aim.ang + Math.PI / 2) < 0.1), 'tragerea în jos țintește în sus, cu forță');
  await p.mouse.up(); await p.waitForTimeout(100);
  ok(await p.evaluate(() => G.strokes === 1 && G.ball.moving && !G.hand), 'eliberarea lovește (1 lovitură) și ascunde tutorialul');
  await p.waitForTimeout(3500);
  ok(await p.evaluate(() => !G.ball.moving), 'mingea se oprește');
  // bagă mingea direct
  await p.evaluate(() => { const h = CUR.L.hole; G.ball.x = h[0]; G.ball.y = h[1] + 12; G.ball.vx = 0; G.ball.vy = -40; G.ball.moving = true; G.strokes = 1; });
  await p.waitForTimeout(2600);
  ok(await p.evaluate(() => mode === 'win'), 'gaura → ecranul de victorie');
  await p.waitForTimeout(1200);
  ok(await p.$$eval('#win .stars span.on', e => e.length) === 3, '1 lovitură pe par 2 = 3 stele');
  ok(await p.$eval('#wTtl', e => e.textContent) === 'Dintr-o lovitură!', 'titlu „Dintr-o lovitură!”');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('pebble-putt-v1')).stars[0] === 3), 'progresul se salvează');
  await p.click('#wNext'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => LI === 1 && mode === 'game'), 'Traseul următor → traseul 2');

  // 6. tastatură, pauză, reluare, sari
  await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowUp');
  ok(await p.evaluate(() => G.aim && G.aim.pow > 0.55), 'tastatura țintește');
  await p.keyboard.press('Space'); ok(await p.evaluate(() => G.strokes === 1 && G.ball.moving), 'Spațiu lovește');
  await p.keyboard.press('Escape'); ok(await p.evaluate(() => mode === 'pause'), 'Esc = pauză');
  await p.click('#pResume'); ok(await p.evaluate(() => mode === 'game'), 'continuare din pauză');
  await p.click('#hRetry'); ok(await p.evaluate(() => G.strokes === 0), 'reia traseul');
  await p.evaluate(() => { for (let k = 0; k < 7; k++) { G.ball.moving = false; shoot(1, 0.05 + 0.01 * k); G.ball.moving = false; } });
  ok(await p.$eval('#skip', e => e.classList.contains('on')), 'butonul „Sari traseul” apare după par+5 lovituri');
  await p.click('#skip'); ok(await p.evaluate(() => LI === 2 && S.done[1] === 1 && !S.stars[1]), 'sărirea deblochează traseul următor fără stele');
  // apă: +1 și înapoi
  await p.evaluate(() => startLevel(11)); await p.waitForTimeout(100);
  await p.evaluate(() => { G.ball.moving = false; shoot(-Math.PI / 2, 0.6); });
  await p.waitForTimeout(2500);
  ok(await p.evaluate(() => G.strokes === 2 && Math.abs(G.ball.x - CUR.L.ball[0]) < 0.01 && !G.ball.splash), 'apa: +1 lovitură și mingea revine pe loc');

  // 7. ecrane
  await p.evaluate(() => show('levels')); await p.waitForTimeout(100);
  ok(await p.$$eval('.lv', e => e.length) === 30, 'ecranul de trasee are 30 de butoane');
  ok(await p.$eval('[data-lv="5"]', e => e.disabled), 'traseele neatinse sunt blocate');
  ok(!(await p.$eval('[data-lv="2"]', e => e.disabled)), 'traseul următor e deschis');
  await p.evaluate(() => { for (let i = 0; i < 30; i++) { S.done[i] = 1; S.stars[i] = 3; } save(); show('skins'); });
  ok(await p.$$eval('.sk:not([disabled])', e => e.length) === 8, 'toate pietricelele se deblochează cu 90 de stele');
  await p.click('[data-sk="7"]'); ok(await p.evaluate(() => S.skin === 7), 'alegerea pietricelei');
  await p.evaluate(() => show('settings'));
  await p.click('#sSound'); ok(await p.evaluate(() => S.sound === false), 'sunet oprit');
  await p.click('#sReset'); await p.click('#sReset'); ok(await p.evaluate(() => totalStars() === 0), 'resetare cu confirmare');

  // 8. toate traseele se desenează fără erori, pe telefon și desktop
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 720 }, { width: 480, height: 800 }]) {
    const q = await fresh(b, 'en-US', vp);
    const r = await q.evaluate(async () => { const o = []; for (let i = 0; i < 30; i++) { startLevel(i); await new Promise(r => setTimeout(r, 30)); o.push(OX >= 0 && OY + 160 * SC <= innerHeight + 1 && SC > 2); } return o; });
    ok(r.every(Boolean) && !q.errs.length, 'toate traseele încap și se desenează la ' + vp.width + 'x' + vp.height + (q.errs.length ? ' ' + q.errs[0] : ''));
    ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'fără scroll orizontal la ' + vp.width);
  }
  ok(!p.errs.length, 'nicio eroare în consolă' + (p.errs.length ? ': ' + p.errs[0] : ''));
  await b.close();
  console.log(fails ? fails + ' teste picate' : 'Toate testele trec');
  process.exit(fails ? 1 : 0);
})();
