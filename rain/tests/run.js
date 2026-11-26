// Teste automate Rain Garden: node rain/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', vp = { width: 390, height: 844 }, store) {
  const ctx = await b.newContext({ viewport: vp, locale }); const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  if (store) await ctx.addInitScript(s => localStorage.setItem('rain-garden-v1', s), JSON.stringify(store));
  await p.goto(URL); await p.waitForTimeout(400); return p;
}
const ev = (p, f, a) => p.evaluate(f, a);
const center = (p, c) => ev(p, c => ({ x: BX + (c % G.L.w + 0.5) * CS, y: BY + (((c / G.L.w) | 0) + 0.5) * CS }), c);
// nivel făcut de mână: rânduri de caractere. S/s izvor albastru/auriu, F/f floare albastră/aurie, - | L T + canale, # bolovan
const MK = `(rows, rot) => {
  const h = rows.length, w = rows[0].length, N = w * h, kind = new Uint8Array(N), sol = new Uint8Array(N), col = new Int8Array(N).fill(-1);
  const M = { '-': 10, '|': 5, 'L': 3, 'T': 14, '+': 15, 'J': 9, '7': 12, 'r': 6, 'U': 11 };
  rows.join('').split('').forEach((c, i) => { if (c === 'S' || c === 's') { kind[i] = SPR; col[i] = c === 's' ? 1 : 0; } else if (c === 'F' || c === 'f') { kind[i] = FLW; col[i] = c === 'f' ? 1 : 0; } else if (M[c]) { kind[i] = CH; sol[i] = M[c]; } else if (c === '#') kind[i] = ROCK; });
  const L = prep({ w, h, kind, sol, col }); return { L, r: Int8Array.from(rot || new Array(N).fill(0)) };
}`;
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  // 1. meniu + limbă
  let p = await fresh(b);
  ok(await p.isVisible('#menu') && (await p.textContent('#bPlay')) === 'Joacă', 'meniul principal apare în română (după limba browserului)');
  ok(await ev(p, () => VERSION === '1.0' && document.title === 'Rain Garden'), 'VERSION 1.0 și titlul Rain Garden');
  await p.click('#bLang'); const l2 = await p.textContent('#bPlay');
  await p.click('#bLang'); const l3 = await p.textContent('#bPlay');
  ok([l2, l3].includes('Play') && [l2, l3].includes('Играть'), 'butonul de limbă trece prin EN și RU');
  ok(await ev(p, () => { const keys = o => Object.keys(o).sort().join(); return keys(TX.ro) === keys(TX.en) && keys(TX.en) === keys(TX.ru) && ['ro', 'en', 'ru'].every(l => TX[l].w.length === 4 && TX[l].steps.length === 3 && Object.keys(TX[l].tips).length === 4) && SPECIES.every(s => s.name.ro && s.name.en && s.name.ru); }), 'toate textele există în RO, EN și RU');
  while ((await p.textContent('#bPlay')) !== 'Joacă') await p.click('#bLang');
  // 2. nivelurile: 60, fiecare rezolvat de soluția generatorului, amestecat la început
  const lv = await ev(p, () => {
    const bad = [];
    LEVELS.forEach((L, i) => {
      const N = L.w * L.h;
      if (!flow(L, new Int8Array(N)).ok) bad.push(i + ':sol');
      if (flow(L, L.rot0).ok) bad.push(i + ':solvedAtStart');
      if (L.par !== L.chans.reduce((a, c) => a + (L.fix[c] ? 0 : need(L.sol[c], L.rot0[c])), 0) || L.par < 1) bad.push(i + ':par');
      if (L.chans.some(c => L.fix[c] && L.rot0[c])) bad.push(i + ':fixRot');
      if (L.flowers.length < 1 || L.springs.length < 1) bad.push(i + ':empty');
      // fiecare floare primește apă numai prin copacul soluției (nu lângă izvor)
      if (L.flowers.some(f => [0, 1, 2, 3].some(d => L.kind[nbr(L, f, d)] === SPR && nbr(L, f, d) >= 0))) bad.push(i + ':nearSpring');
    });
    return { n: LEVELS.length, bad };
  });
  ok(lv.n === 60 && lv.bad.length === 0, '60 de grădini: soluția generatorului udă toate florile, starea inițială nu e rezolvată ' + lv.bad.join(','));
  ok(await ev(p, () => LEVELS.slice(0, 15).every(L => L.springs.length === 1 && !L.kind.includes(ROCK) && !L.kind.includes(POND))), 'lumea 1: un singur izvor, fără obstacole');
  ok(await ev(p, () => LEVELS.slice(15, 30).every(L => L.kind.includes(ROCK))), 'lumea 2 (Trepte de mușchi) are bolovani');
  ok(await ev(p, () => LEVELS.slice(30, 45).every(L => L.kind.includes(POND) && L.fix.reduce((a, b) => a + b, 0) >= 2)), 'lumea 3 (Poduri peste iaz) are iazuri și pietre fixe');
  ok(await ev(p, () => LEVELS.slice(45).every(L => L.two && L.springs.length === 2 && L.flowers.filter(f => L.col[f] === 0).length >= 2 && L.flowers.filter(f => L.col[f] === 1).length >= 2)), 'lumea 4 (Ploaie de toamnă): două izvoare, flori din ambele culori');
  ok(await ev(p, () => LEVELS[59].w * LEVELS[59].h > LEVELS[0].w * LEVELS[0].h * 5 && LEVELS[59].flowers.length > LEVELS[0].flowers.length), 'dificultatea crește (grădina 60 mult mai mare decât grădina 1)');
  ok(await ev(p, () => { const a = dailyLevel(20261126), b2 = dailyLevel(20261126), c = dailyLevel(20261127); return a.sol.join() === b2.sol.join() && a.rot0.join() === b2.rot0.join() && a.sol.join() !== c.sol.join() && flow(a, new Int8Array(a.w * a.h)).ok; }), 'Grădina zilei e deterministă pe zi, diferită de la o zi la alta și rezolvabilă');
  ok(await ev(p, () => { let r = true; for (let d = 20260101; d < 20260131; d++) { const L = dailyLevel(d); r = r && flow(L, new Int8Array(L.w * L.h)).ok && !flow(L, L.rot0).ok; } return r; }), '30 de Grădini ale zilei consecutive sunt toate rezolvabile');
  // 3. curgerea apei (niveluri făcute de mână)
  ok(await ev(p, mk => { const { L, r } = eval(mk)(['S-F']); return flow(L, r).ok && flow(L, r).wet[1] === 1; }, MK), 'apa curge din izvor prin canal drept până la floare');
  ok(await ev(p, mk => { const { L, r } = eval(mk)(['S-F'], [0, 1, 0]); const f = flow(L, r); return !f.ok && !f.wet[1] && !f.wet[2]; }, MK), 'canalul rotit 90° oprește apa');
  ok(await ev(p, mk => { const { L, r } = eval(mk)(['S7.', '.|.', '.F.']); const a = flow(L, r).ok; r[1] = 1; return a && !flow(L, r).ok; }, MK), 'cotul și canalul vertical duc apa în jos; cotul rotit nu');
  ok(await ev(p, mk => { const { L, r } = eval(mk)(['S-F--F']); const f = flow(L, r); return f.wet[3] === 0 && f.good === 1 && !f.ok; }, MK), 'floarea nu dă apa mai departe');
  ok(await ev(p, mk => { const { L, r } = eval(mk)(['.S.', 'rU7', 'F.F']); return flow(L, r).ok; }, MK), 'ramificația T udă două flori');
  ok(await ev(p, mk => { const { L, r } = eval(mk)(['S-s']); const f = flow(L, r); return f.wet[0] === 1 && f.wet[2] === 2 && f.wet[1] === 3 && f.mixed === 1; }, MK), 'izvorul nu primește apă; apele care se întâlnesc se amestecă');
  ok(await ev(p, mk => { const { L, r } = eval(mk)(['S-f']); const f = flow(L, r); return f.wet[2] === 1 && f.good === 0 && !f.ok; }, MK), 'floarea aurie nu e mulțumită de apă albastră');
  ok(await ev(p, mk => { const { L, r } = eval(mk)(['S-F-s']); const f = flow(L, r); return f.wet[2] === 3 && f.mixed === 1 && !f.ok; }, MK), 'regula amestecului: floarea udată din ambele izvoare = noroi, nivel nerezolvat');
  ok(await ev(p, mk => { const { L, r } = eval(mk)(['S-F', '...', 's-f']); return flow(L, r).ok; }, MK), 'două izvoare separate, fiecare floare cu apa ei = rezolvat');
  ok(await ev(p, () => { const L = LEVELS[50], r = new Int8Array(L.w * L.h); const f = flow(L, r); return f.mixed === 0 && L.flowers.every(x => f.wet[x] === 1 << L.col[x]); }), 'în lumea 4 soluția nu amestecă apele');
  // 4. tutorial + atingeri reale care rezolvă grădina 1
  await p.click('#bPlay'); await p.waitForTimeout(300);
  ok(await ev(p, () => LI === 0 && mode === 'game') && await p.isVisible('#tip'), 'Joacă pornește grădina 1 cu tutorial');
  ok(await p.isVisible('#hand'), 'mâna arată spre piatra de rotit');
  const todo = await ev(p, () => G.L.chans.filter(i => !G.L.fix[i]).map(i => [i, need(G.L.sol[i], G.rot[i])]).filter(x => x[1] > 0));
  const c0 = await center(p, todo[0][0]); await p.mouse.click(c0.x, c0.y);
  ok(await ev(p, i => G.taps === 1 && G.step === 1 && G.at[i] > 0, todo[0][0]), 'o atingere reală rotește piatra și avansează tutorialul');
  todo[0][1]--;
  for (const [i, n] of todo) { const c = await center(p, i); for (let k = 0; k < n; k++) await p.mouse.click(c.x, c.y); }
  await p.waitForTimeout(2600);
  ok(await ev(p, () => G.done && S.done[0] === 1 && S.stars[0] === 3 && G.taps === G.L.par), 'grădina 1 rezolvată cu atingeri reale, 3 stele, rotiri = ideal');
  ok(await ev(p, () => G.L.flowers.every(f => G.bt[f] > 0)), 'florile udate au înflorit (animație pornită)');
  ok(await p.isVisible('#win') && (await p.textContent('#wTitle')).includes('înflorit'), 'ecranul de victorie apare');
  ok(await ev(p, () => S.hints === 6 && JSON.parse(localStorage.getItem('rain-garden-v1')).stars[0] === 3), 'prima terminare dă +1 indiciu și se salvează');
  await p.click('#wNext'); await p.waitForTimeout(300);
  ok(await ev(p, () => LI === 1 && !G.done), '„Următoarea” deschide grădina 2');
  // 5. tastatură, anulare, pietre fixe, indicii
  const kb = await ev(p, () => { const i = G.L.chans.find(c => !G.L.fix[c]); return { i, r: G.rot[i], x: i % G.L.w, y: (i / G.L.w) | 0 }; });
  await p.keyboard.press('ArrowRight'); await ev(p, () => { G.cur = 0; });
  for (let k = 0; k < kb.x; k++) await p.keyboard.press('ArrowRight');
  for (let k = 0; k < kb.y; k++) await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Space');
  ok(await ev(p, k => G.cur === k.i && G.rot[k.i] === ((k.r + 1) & 3) && G.taps === 1, kb), 'săgețile mută cursorul, Space rotește piatra');
  await p.keyboard.press('z');
  ok(await ev(p, k => G.rot[k.i] === k.r && G.taps === 1 && !G.hist.length, kb), 'Z anulează rotirea (rotirile numărate rămân)');
  await p.keyboard.press('r');
  ok(await ev(p, () => G.taps === 0 && G.rot.join() === G.L.rot0.join()), 'R reîncepe grădina');
  ok(await ev(p, () => { startLevel(31); const i = G.L.chans.find(c => G.L.fix[c]), r0 = G.rot[i]; tap(i); return G.rot[i] === r0 && G.taps === 0; }), 'piatra fixă nu se rotește și nu consumă rotiri');
  ok(await ev(p, () => { startLevel(25); const h0 = S.hints, w0 = wrongTiles().length; hint(); return S.hints === h0 - 1 && G.hints === 1 && wrongTiles().length === w0 - 1 && G.taps === 0; }), 'indiciul consumă unul și pune o piatră la loc');
  ok(await ev(p, () => { let r = true; for (const i of [44, 52, 59]) { startLevel(i); S.hints = 99; for (let k = 0; k < 80 && !G.done; k++) hint(); r = r && G.done && G.fl.ok; } S.hints = 6; return r; }), 'indiciile repetate rezolvă grădinile grele (pietre fixe, două ape)');
  ok(await ev(p, () => { S.hints = 0; startLevel(26); hint(); return S.hints === 0 && G.hints === 0; }), 'fără indicii nu se consumă nimic');
  ok(await ev(p, () => starsFor(10, 10, 0) === 3 && starsFor(10, 12, 0) === 3 && starsFor(10, 20, 0) === 2 && starsFor(10, 40, 0) === 1 && starsFor(10, 10, 1) === 2), 'stele după rotiri: 3 aproape de ideal, max 2 cu indiciu, 1 cu multe rotiri');
  ok(await ev(p, () => { startLevel(47); const f = G.L.flowers[0]; let lost = false; for (const i of G.L.chans) G.rot[i] = 0; update(true); const a = G.bt[f] > 0; const c = G.L.chans.find(i => !G.L.fix[i] && period(G.L.sol[i]) > 1 && G.L.dist[i] > 0); G.rot[c] = 1; update(true); lost = G.L.flowers.some(x => G.bt[x] < 0); return a && lost; }), 'floarea se închide la loc când pierde apa');
  // 6. Grădina zilei: serie
  ok(await ev(p, () => { startLevel(-1); for (const i of G.L.chans) G.rot[i] = 0; update(); return G.done && S.daily === dayKey() && S.streak >= 1; }), 'Grădina zilei terminată → serie salvată');
  await p.waitForTimeout(3500);
  ok(await p.isVisible('#win') && (await p.textContent('#wTitle')).includes('Serie'), 'ecranul de victorie al Grădinii zilei arată seria');
  // 7. ecrane
  await ev(p, () => { mode = 'menu'; show('menu'); texts(); }); await p.waitForTimeout(200);
  ok((await p.textContent('#bDaily')).includes('✓'), 'butonul Grădina zilei arată bifa după terminare');
  await p.click('#bLevels'); await p.waitForTimeout(200);
  ok((await p.$$('#worlds .lv')).length === 60, 'ecranul Grădini arată 60 de niveluri');
  ok(await ev(p, () => document.querySelectorAll('#worlds .lv.lock').length > 0), 'grădinile neîncepute sunt blocate');
  await p.click('#levels [data-back]'); await p.click('#bFlowers'); await p.waitForTimeout(200);
  ok((await p.$$('#flList .sk')).length === 8 && (await p.$$('#flList .sk.lock')).length === 7, 'ecranul Flori: 8 specii, doar prima deblocată la început');
  await ev(p, () => { S.stars = Array(20).fill(3); }); await p.click('#flowers [data-back]'); await p.click('#bFlowers'); await p.waitForTimeout(100);
  await p.click('#flList .sk[data-fl="2"]');
  ok(await ev(p, () => S.flower === 2 && JSON.parse(localStorage.getItem('rain-garden-v1')).flower === 2), 'floare deblocată cu stele și plantată (salvată)');
  await p.click('#flowers [data-back]'); await p.click('#bSettings'); await p.waitForTimeout(200);
  const m0 = await ev(p, () => S.rain); await p.click('#sRain');
  ok(await ev(p, m0 => S.rain !== m0 && JSON.parse(localStorage.getItem('rain-garden-v1')).rain === S.rain, m0), 'setarea sunetului de ploaie se salvează');
  ok(p.errs.length === 0, 'zero erori JS în sesiunea principală ' + p.errs.join(' | '));
  // 8. persistență după reîncărcare
  await p.reload(); await p.waitForTimeout(500);
  ok(await ev(p, () => S.done[0] === 1 && S.lang === 'ro' && S.flower === 2 && S.streak >= 1), 'progresul, floarea, seria și limba rămân după reîncărcare');
  await p.context().close();
  // 9. engleză desktop + rusă telefon mic
  p = await fresh(b, 'en-US', { width: 1280, height: 720 });
  ok((await p.textContent('#bPlay')) === 'Play', 'engleză pe desktop');
  await p.click('#bPlay'); await p.waitForTimeout(300);
  ok(await ev(p, () => { startLevel(59); return CS * G.L.w <= innerWidth && BY >= 60 && BY + CS * G.L.h <= innerHeight - 70 && CS >= 50; }), 'tabla mare încape în ecranul desktop');
  ok(p.errs.length === 0, 'zero erori JS (EN desktop)'); await p.context().close();
  p = await fresh(b, 'ru-RU', { width: 360, height: 640 });
  ok((await p.textContent('#bPlay')) === 'Играть', 'rusă pe telefon mic');
  await p.click('#bPlay'); await p.waitForTimeout(300);
  ok(await ev(p, () => { startLevel(59); return BX >= 0 && BX + CS * G.L.w <= innerWidth && BY + CS * G.L.h <= innerHeight - 80 && CS >= 40; }), 'cea mai mare grădină încape pe 360 px (piese ≥ 40 px)');
  const t = await ev(p, () => G.L.chans.find(i => !G.L.fix[i])); const ct = await center(p, t);
  await p.mouse.click(ct.x, ct.y);
  ok(await ev(p, () => G.taps === 1), 'atingerea funcționează pe telefon');
  ok(p.errs.length === 0, 'zero erori JS (RU mobil)'); await p.context().close();
  await b.close();
  console.log(fails ? `\n${fails} teste au picat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
