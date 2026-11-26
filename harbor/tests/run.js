// Teste automate Lantern Harbor: node harbor/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SK = 'lantern-harbor-v1';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', vp = { width: 390, height: 844 }, store) {
  const ctx = await b.newContext({ viewport: vp, locale }); const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  await p.goto(URL); if (store) { await p.evaluate(([k, s]) => localStorage.setItem(k, s), [SK, JSON.stringify(store)]); await p.reload(); }
  await p.waitForTimeout(300); return p;
}
const ev = (p, f, a) => p.evaluate(f, a);
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  // 1. meniu + limbă
  let p = await fresh(b);
  ok(await ev(p, () => VERSION === '1.0' && document.title === 'Lantern Harbor'), 'VERSION = 1.0 și titlul paginii');
  ok(await p.isVisible('#menu') && (await p.textContent('#bPlay')) === 'Joacă', 'meniul principal apare în română (după limba browserului)');
  ok(!(await p.isVisible('#bNew')), 'fără salvare nu apare „Joc nou”');
  await p.click('#bLang'); ok((await p.textContent('#bPlay')) === 'Play' && (await p.textContent('.sub')).includes('lighthouse'), 'butonul de limbă trece în engleză');
  await p.click('#bLang'); ok((await p.textContent('#bPlay')) === 'Играть' && (await p.textContent('.sub')).includes('маяк'), 'apoi în rusă');
  await p.click('#bLang'); ok((await p.textContent('#bPlay')) === 'Joacă', 'și înapoi în română');
  ok(await ev(p, () => { const ks = Object.keys(TX.en); return ['ro', 'ru'].every(l => Object.keys(TX[l]).length === ks.length && ks.every(k => typeof TX[l][k] === typeof TX.en[k] && (!Array.isArray(TX.en[k]) || TX[l][k].length === TX.en[k].length))) && TX.en.gens.length === 8 && TX.en.achs.length === 16; }), 'i18n: RO/EN/RU au toate textele (8 ajutoare, 16 trofee)');
  // 2. tutorial cu acțiuni reale
  await p.click('#bPlay'); await p.waitForTimeout(250);
  ok(await p.isVisible('#tip') && (await p.textContent('#tip')).includes('1/3'), 'tutorial pas 1 apare la start');
  ok(await p.isVisible('#hand'), 'mâna arată spre far');
  const lb = await ev(p, () => { const L = houseBox(); return { x: L.x, y: L.top + (L.bot - L.top) * 0.4 }; });
  for (let i = 0; i < 10; i++) await p.mouse.click(lb.x, lb.y);
  ok(await ev(p, () => S.taps === 10 && S.glow >= 10), '10 atingeri reale pe far dau 10 lumini');
  await p.mouse.click(5, 300); ok(await ev(p, () => S.taps === 10), 'atingerea în afara farului nu contează');
  await p.waitForTimeout(250);
  ok((await p.textContent('#tip')).includes('2/3'), 'pasul 2: angajează un lampagiu');
  for (let i = 0; i < 6; i++) await p.mouse.click(lb.x, lb.y);
  await p.click('[data-g="0"]');
  ok(await ev(p, () => S.own[0] === 1 && S.glow < 2), 'lampagiul costă 15 și se cumpără cu clic pe listă');
  ok(await ev(p, () => S.step === 2 && !!ship), 'pasul 3: apare corabia aurie');
  await p.waitForTimeout(300);
  const sp = await ev(p, () => { const q = shipPos(); return { x: q.x, y: q.y - 16 * sc() }; });
  await p.mouse.click(sp.x, sp.y);
  ok(await ev(p, () => S.step === 3 && S.ships === 1 && !ship), 'prinsă corabia cu clic real → tutorial terminat');
  ok(!(await p.isVisible('#tip')) && !(await p.isVisible('#hand')), 'tutorialul dispare');
  // 3. economie
  const e1 = await ev(p, () => { S.glow = 0; S.festT = 0; S.time = 0; S.own = [10, 0, 0, 0, 0, 0, 0, 0]; S.ups = [0, 0, 0, 0, 0, 0, 0, 0]; S.ach = [...Array(16).keys()]; S.pearls = 0; const a = S.glow; for (let i = 0; i < 300; i++) step(1 / 30); return { got: S.glow - a, rate: prod() }; });
  ok(Math.abs(e1.got - 10 * 0.2 * 1.32 * 10) < 0.05 && e1.rate > 0, 'producție corectă: 10 lampagii în 10 s, cu +32% din trofee (' + e1.got.toFixed(2) + ')');
  ok(await ev(p, () => { S.time = 0; const a = phase() === 0 && genMult(2) === 2 && genMult(6) === 2 && genMult(0) === 1; S.time = PHASE_LEN; const b2 = phase() === 1 && genMult(0) === 2 && genMult(3) === 2 && genMult(2) === 1; S.time = PHASE_LEN * 4; return a && b2 && phase() === 0; }), 'ciclul flux/ceață/stele/briză dublează alte ajutoare și se repetă');
  ok(await ev(p, () => GENS.every((g, i) => i === 0 || (g.base > GENS[i - 1].base && g.rate > GENS[i - 1].rate)) && [0, 1, 2, 3].every(ph => GENS.filter(g => g.p === ph).length === 2)), '8 ajutoare din ce în ce mai scumpe, câte 2 pe fiecare fază');
  ok(await ev(p, () => Math.abs(costOf(0, 1) / costOf(0, 0) - 1.15) < 1e-12 && Math.abs(costN(0, 0, 10) - [...Array(10)].reduce((a, _, i) => a + costOf(0, i), 0)) < 1e-6), 'cost ×1.15 pe bucată; ×10 = suma costurilor');
  ok(await ev(p, () => { const m = maxBuy(0, 5, 1000); return costN(0, 5, m) <= 1000 && costN(0, 5, m + 1) > 1000; }), '„Max” cumpără exact cât îți permiți');
  ok(await ev(p, () => { S.glow = 1e6; S.own[0] = 3; buyGen(0, 10); return S.own[0] === 13; }), 'cumpărare ×10');
  ok(await ev(p, () => { S.glow = 0; return !buyGen(1, 1) && S.own[1] === 0; }), 'nu cumperi fără lumină');
  ok(await ev(p, () => { S.own[0] = 9; S.ups[0] = 0; return !upReady(0); }) && await ev(p, () => { S.own[0] = 10; S.glow = 1e5; const r0 = genMult(0); buyUp(0); return upReady(0) === false && S.ups[0] === 1 && genMult(0) === r0 * 2 && UP_AT.join() === '10,25,50,100,150'; }), 'îmbunătățirea apare la 10 bucăți și dublează producția');
  ok(await ev(p, () => { S.glow = 200; S.lens = 0; const c0 = clickPower(); buyLens(); return S.lens === 1 && clickPower() > c0 * 1.9; }), 'lentila mai mare dublează atingerea');
  ok(await ev(p, () => { S.festT = 0; const a = prod(); S.festT = 30; const r = prod(); S.festT = 0; return Math.abs(r / a - 7) < 1e-9; }), 'festivalul felinarelor = ×7');
  ok(await ev(p, () => { S.seed = 42; const r1 = [rnd(), rnd(), rnd()]; S.seed = 42; const r2 = [rnd(), rnd(), rnd()]; return r1.join() === r2.join() && r1.every(x => x >= 0 && x < 1); }), 'RNG determinist (același seed → aceleași corăbii)');
  ok(await ev(p, () => { S.seed = 5; ship = null; shipNext = 1; let t = 0; while (!ship && t < 100) { step(1 / 30); t += 1 / 30; } const ok1 = !!ship && t > 0.9 && t < 1.1; for (let i = 0; i < 13 * 30; i++) step(1 / 30); return ok1 && !ship && shipNext >= 37 && shipNext <= 110; }), 'corabia aurie apare la timp, pleacă după 12 s, următoarea la 50–110 s');
  ok(await ev(p, () => { let fest = 0, gift = 0; for (let i = 0; i < 40; i++) { S.festT = 0; spawnShip(); const g0 = S.glow; catchShip(); if (S.festT > 0) fest++; else if (S.glow > g0) gift++; } S.festT = 0; return fest > 5 && gift > 5 && fest + gift === 40; }), 'corabia dă fie festival, fie un cadou de lumină');
  // 4. UI listă și file
  await p.click('#tabs [data-tab="up"]'); ok(await p.isVisible('#list .it, #list .note'), 'fila Îmbunătățiri');
  await p.click('#tabs [data-tab="ach"]'); ok((await p.$$('.ach div')).length === 16, 'fila Trofee are 16 trofee');
  await p.click('#tabs [data-tab="pre"]'); ok(await ev(p, () => { S.run = 5e5; refreshList(); return document.getElementById('bPre').disabled; }), 'portul nou e blocat sub 1 M');
  // 5. port nou (prestigiu)
  await ev(p, () => { S.run = 4.1e6; S.life = 5e6; S.glow = 4e6; S.own = [50, 20, 5, 1, 0, 0, 0, 0]; refreshList(); });
  await p.waitForTimeout(250);
  ok(!(await ev(p, () => document.getElementById('bPre').disabled)) && (await p.textContent('#bPre')).includes('+2'), 'la 4.1 M lumină portul nou dă 2 🦪');
  await p.click('#bPre'); await p.click('#cfYes');
  ok(await ev(p, () => S.pearls === 2 && S.voyages === 1 && S.glow === 0 && S.own.every(n => n === 0) && S.ups.every(n => n === 0) && S.life >= 5e6 && S.ach.includes(13)), 'portul nou resetează, păstrează perlele, totalul și trofeele');
  ok(await ev(p, () => { S.own[0] = 1; S.time = PHASE_LEN; S.ach = []; return Math.abs(prod() - 0.2 * 2 * 1.1) < 1e-9 && pearlsFor(9e6) === 3; }), 'perlele dau +5% fiecare; perle = √(lumină/1 M)');
  // 6. trofee
  ok(await ev(p, () => { S.ach = []; S.taps = 1000; checkAch(); return S.ach.includes(10) && ACHS.length === 16; }), 'trofeu 1000 atingeri');
  // 7. salvare + offline
  await ev(p, () => { S.glow = 123; save(); });
  const st = await ev(p, k => JSON.parse(localStorage.getItem(k)), SK);
  ok(st.glow === 123 && st.pearls === 2 && st.v === '1.0', 'progresul se salvează în localStorage');
  const off = Object.assign({}, st, { last: Date.now() - 3600 * 1000, own: [10, 0, 0, 0, 0, 0, 0, 0], ups: [0, 0, 0, 0, 0, 0, 0, 0], glow: 0, ach: [], pearls: 0, time: 0, festT: 0, lang: 'en' });
  const p2 = await fresh(b, 'en-US', undefined, off);
  ok(await p2.isVisible('#away') && (await p2.textContent('#awayInfo')).includes('1h'), 'la revenire după o oră apare „Welcome back”');
  const lv = await ev(p2, () => S.glow);
  ok(Math.abs(lv - 0.2 * 10 * 3600 * 0.5) < 40, 'producție offline 50% (' + Math.round(lv) + ')');
  await p2.click('#awayOk'); ok((await p2.textContent('#bPlay')) === 'Continue' && await p2.isVisible('#bNew'), 'cu salvare: Continue + New game');
  await p2.click('#bPlay'); ok(await ev(p2, () => started && cur === null), 'Continue intră în joc');
  ok(!(await p2.isVisible('#tip')), 'tutorialul terminat nu mai apare');
  const p3 = await fresh(b, 'ru-RU', undefined, Object.assign({}, off, { last: Date.now() - 3 * 24 * 3600 * 1000, lang: null }));
  const g3 = await ev(p3, () => S.glow + ' ' + S.lang + ' ' + cur); ok(await ev(p3, () => Math.abs(S.glow - 0.2 * 10 * 8 * 3600 * 0.5) < 80), 'offline limitat la 8 ore ' + g3);
  ok((await p3.textContent('#awayOk')) === 'Чудесно' && (await p3.textContent('#bPlay')) === 'Продолжить', 'limba rusă aleasă după browser');
  // 8. setări persistente (glisoare reale)
  await p2.click('#bSet'); await p2.waitForTimeout(500); ok(await p2.isVisible('#settings') && (await p2.textContent('#ver')).includes('1.0'), 'setările se deschid și arată versiunea');
  const mb = await p2.locator('#sMusic').boundingBox(); await p2.mouse.click(mb.x + 1, mb.y + mb.height / 2);
  const sb = await p2.locator('#sSound').boundingBox(); await p2.mouse.click(sb.x + sb.width - 1, sb.y + sb.height / 2);
  await p2.click('#sTut'); await p2.click('#sFx');
  const s2 = await ev(p2, k => JSON.parse(localStorage.getItem(k)), SK);
  ok(s2.music === 0 && s2.sound === 100 && s2.tut === 0 && s2.fx === 0 && (await p2.textContent('#vMusic')) === '0', 'volumul muzicii/sunetelor, tutorial și efecte se salvează');
  await p2.click('#sLang'); ok((await p2.textContent('[data-t="settings"]')) === 'Настройки', 'limba se schimbă din setări');
  await p2.click('#sLang'); await p2.click('#sLang'); ok((await p2.textContent('[data-t="settings"]')) === 'Settings', 'RO → EN din setări');
  await p2.click('#sClose'); await p2.keyboard.press('Escape'); ok(await p2.isVisible('#menu'), 'Esc duce la meniu');
  await p2.click('#bPlay');
  const c0 = await ev(p2, () => S.taps); await p2.keyboard.press('Space'); await p2.keyboard.press('Space');
  ok(await ev(p2, c => S.taps === c + 2, c0), 'Space atinge farul');
  await ev(p2, () => { S.glow = 100; }); await p2.keyboard.press('1'); ok(await ev(p2, () => S.own[0] === 11), 'tasta 1 angajează un lampagiu');
  await ev(p2, () => spawnShip()); await p2.keyboard.press('g'); ok(await ev(p2, () => !ship && S.ships >= 1), 'tasta G prinde corabia');
  // reîncărcare: totul revine
  const before = await ev(p2, () => { save(); return { own: S.own.join(), music: S.music }; });
  await p2.reload(); await p2.waitForTimeout(300);
  ok(await ev(p2, x => S.own.join() === x.own && S.music === x.music && S.lang === 'en', before), 'după reîncărcare salvarea se încarcă (ajutoare, volum, limbă)');
  // 9. joc nou cu confirmare
  await p2.click('#bNew'); await p2.click('#cfYes');
  ok(await ev(p2, () => S.life === 0 && S.own[0] === 0 && started && S.step === 0 && S.music === 0), 'Joc nou cu confirmare pornește de la zero, păstrează volumul');
  // 10. desktop + mobil, fără erori
  const pd = await fresh(b, 'en-US', { width: 1280, height: 720 });
  await pd.click('#bPlay'); const lay = await ev(pd, () => ({ wide, side: document.getElementById('side').getBoundingClientRect().left, cw: cv.width / DPR }));
  ok(lay.wide && lay.side === 880 && lay.cw === 880, 'desktop: panoul în dreapta, portul în stânga');
  const lbd = await ev(pd, () => { const L = houseBox(); return { x: L.x, y: L.top + (L.bot - L.top) * 0.4 }; });
  await pd.mouse.click(lbd.x, lbd.y); ok(await ev(pd, () => S.taps === 1), 'desktop: clic real pe far');
  const pm = await fresh(b, 'en-US', { width: 405, height: 720 });
  await pm.click('#bPlay');
  const lm = await ev(pm, () => ({ wide, top: document.getElementById('side').getBoundingClientRect().top, h: innerHeight, sw: document.documentElement.scrollWidth }));
  ok(!lm.wide && lm.top === Math.round(lm.h * 0.5) && lm.sw <= 405, 'mobil 405×720: portul sus, panoul jos, fără scroll orizontal');
  ok(await ev(pd, () => fmt(1234) === '1.23 K' && fmt(2.5e9) === '2.50 B' && fmt(7.5) === '7.5' && fmt(3.2e15) === '3.20 Qa' && fmt(1e40).includes('e40')), 'formatare numere mari');
  // simulare lungă: o oră de joc cumpărând automat
  const sim = await ev(pd, () => { for (let s = 0; s < 3600; s++) { for (let k = 0; k < 30; k++) step(1 / 30); if (ship) catchShip(); for (let g = 7; g >= 0; g--) if (S.glow >= costOf(g, S.own[g])) buyGen(g, 1); for (let g = 0; g < 8; g++) if (upReady(g) && S.glow >= upCost(g)) buyUp(g); if (S.lens < 8 && S.glow >= LENS_COST[S.lens]) buyLens(); tapHouse(10, 10); } return { life: S.life, own: S.own.slice(), prod: prod(), ach: S.ach.length }; });
  ok(sim.life > 1e6 && sim.own[3] > 0 && isFinite(sim.prod) && sim.ach >= 8, 'o oră simulată: progres sănătos (' + Math.round(sim.life) + ' lumină, ' + sim.own.join('/') + ', ' + sim.ach + ' trofee)');
  await pd.waitForTimeout(400);
  for (const q of [p, p2, p3, pd, pm]) ok(!q.errs.length, 'fără erori JS ' + q.errs.join(' | '));
  await b.close();
  console.log(n + ' verificări · ' + (fails ? fails + ' FAIL' : 'TOATE TESTELE AU TRECUT')); process.exit(fails ? 1 : 0);
})();
