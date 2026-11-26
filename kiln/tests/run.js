// Teste automate Clay & Kiln: node kiln/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SK = 'clay-and-kiln-v1';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', vp = { width: 405, height: 720 }, store) {
  const ctx = await b.newContext({ viewport: vp, locale }); const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  if (store) await ctx.addInitScript(([k, s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, s); sessionStorage.setItem('seeded', 1); } }, [SK, JSON.stringify(store)]);
  await p.goto(URL); await p.waitForTimeout(300); return p;
}
const ev = (p, f, a) => p.evaluate(f, a);
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  // 1. meniu + limbi
  let p = await fresh(b);
  ok(await p.isVisible('#menu') && (await p.textContent('#bPlay')) === 'Joacă', 'meniul principal apare în română (după limba browserului)');
  ok(await ev(p, () => VERSION === '1.0' && document.getElementById('ver').textContent === 'v1.0'), 'VERSION = 1.0 afișat în meniu');
  ok(!(await p.isVisible('#bNew')), 'fără salvare nu apare „Joc nou”');
  await p.click('#bLang'); ok((await p.textContent('#bPlay')) === 'Play', 'butonul de limbă trece în engleză');
  await p.click('#bLang'); ok((await p.textContent('#bPlay')) === 'Играть' && (await p.textContent('.sub')).includes('гончарная'), 'apoi în rusă');
  await p.click('#bLang');
  ok(await ev(p, () => { const ks = Object.keys(TX.en); return LANGS.every(l => Object.keys(TX[l]).length === ks.length && ks.every(k => typeof TX[l][k] === typeof TX.en[k] && (!Array.isArray(TX.en[k]) || TX[l][k].length === TX.en[k].length))); }), 'i18n: RO/EN/RU au aceleași chei și liste complete');
  // 2. tutorial cu acțiuni reale
  await p.click('#bPlay'); await p.waitForTimeout(250);
  ok(await p.isVisible('#tip') && (await p.textContent('#tip')).includes('1/3'), 'tutorial pas 1 apare la start');
  ok(await p.isVisible('#hand'), 'mâna arată spre roată');
  const wb = await ev(p, () => { const w = wheelBox(); return { x: w.x, y: w.y - w.r * .3 }; });
  for (let i = 0; i < 10; i++) await p.mouse.click(wb.x, wb.y);
  ok(await ev(p, () => S.clicks === 10 && S.coins >= 10 && S.pots[0] === 10), '10 atingeri reale pe roată dau 10 monede și 10 străchini');
  await p.waitForTimeout(250);
  ok((await p.textContent('#tip')).includes('2/3'), 'pasul 2: angajează un ucenic');
  for (let i = 0; i < 3; i++) await p.mouse.click(wb.x, wb.y);
  await p.click('[data-g="0"]');
  ok(await ev(p, () => S.own[0] === 1 && S.coins < 2), 'ucenicul costă 12 și se cumpără cu clic pe listă');
  ok(await ev(p, () => S.step === 2 && S.fireT >= 0), 'pasul 3: cuptorul e încins');
  await p.waitForTimeout(300);
  const kb = await ev(p, () => { const K = kilnBox(); S.fireT = GLOW_P / 2 - 0.03; return { x: K.x, y: K.y - K.r * .6 }; });
  await p.mouse.click(kb.x, kb.y);
  ok(await ev(p, () => S.step === 3 && S.fires === 1 && S.perfect === 1 && S.boostM === 3 && S.boostT > 25), 'clic real pe cuptor la vârf → ardere perfectă ×3, tutorial terminat');
  ok(!(await p.isVisible('#tip')) && !(await p.isVisible('#hand')), 'tutorialul dispare');
  // 3. economie
  const e1 = await ev(p, () => { S.coins = 0; S.boostT = 0; S.own = [10, 0, 0, 0, 0, 0, 0, 0]; S.ups = [0, 0, 0, 0, 0, 0, 0, 0]; S.ach = [...Array(16).keys()]; S.seals = 0; S.cms = [null, null, null]; S.cmNext = [99, 99, 99]; const a = S.coins; for (let i = 0; i < 300; i++) tick(1 / 30); return { got: S.coins - a, rate: prod() }; });
  ok(Math.abs(e1.got - 10 * 0.25 * 1.32 * 10) < 0.01 && Math.abs(e1.rate - 3.3) < 1e-9, 'producție corectă: 10 ucenici × 0.25 × 1.32 (trofee) în 10 s');
  ok(await ev(p, () => Math.abs(costOf(0, 1) / costOf(0, 0) - 1.15) < 1e-12 && Math.abs(costN(0, 0, 10) - [...Array(10)].reduce((a, _, i) => a + costOf(0, i), 0)) < 1e-6), 'costul crește ×1.15; ×10 = suma costurilor');
  ok(await ev(p, () => { const m = maxBuy(0, 5, 1000); return costN(0, 5, m) <= 1000 && costN(0, 5, m + 1) > 1000; }), '„Max” cumpără exact cât îți permiți');
  await p.click('#buyMode [data-n="10"]');
  await ev(p, () => { S.coins = 1e6; S.own[0] = 3; });
  await p.click('[data-g="0"]'); ok(await ev(p, () => S.own[0] === 13), 'cumpărare ×10 cu clic real');
  await p.click('#buyMode [data-n="1"]');
  ok(await ev(p, () => { S.coins = 0; return !buyGen(1, 1) && S.own[1] === 0; }), 'nu cumperi fără monede');
  ok(await ev(p, () => { S.own[0] = 9; S.ups[0] = 0; return !upReady(0); }) && await ev(p, () => { S.own[0] = 10; S.coins = 1e5; const r0 = genMult(0); buyUp(0); return !upReady(0) && S.ups[0] === 1 && genMult(0) === r0 * 2; }), 'îmbunătățirea apare la 10 bucăți și dublează producția');
  ok(await ev(p, () => { S.coins = 200; const c0 = clickPower(), p0 = potsPerTap(); buyClick(); return S.clickUps === 1 && clickPower() > c0 && potsPerTap() === p0 + 1; }), 'lut mai fin: atingerea dă mai multe monede și vase');
  // 4. cuptorul
  ok(await ev(p, () => { const r = []; for (const t of [0.02, 0.5, 0.8]) { S.fireT = t; r.push(fireKiln()); } return r.join() === '0,1,2' && S.boostM === 3; }), 'arderea: devreme ×1.5, la jumătate ×2, la vârf ×3');
  ok(await ev(p, () => { S.boostT = 0; const a = prod(); S.boostT = 10; S.boostM = 2; const r = prod(); S.boostT = 0; return Math.abs(r / a - 2) < 1e-9; }), 'bonusul de ardere înmulțește producția');
  ok(await ev(p, () => { S.fireT = 0; for (let i = 0; i < 30 * (FIRE_WIN + 1); i++) tick(1 / 30); return S.fireT === -1 && S.fireIn > 0; }), 'cuptorul se răcește dacă nu-l atingi la timp');
  // 5. comenzi
  ok(await ev(p, () => { S.cms = [null, null, null]; S.cmNext = [0.5, 3, 6]; for (let i = 0; i < 30 * 7; i++) tick(1 / 30); return S.cms.filter(Boolean).length === 3 && S.cms.every(c => c.need >= 8 && c.rew > 0 && c.left > 0); }), '3 comenzi vizibile după tutorial');
  ok(await ev(p, () => { const sd = S.seed; newCm(0); const a = JSON.stringify(S.cms[0]); S.seed = sd; newCm(0); return a === JSON.stringify(S.cms[0]); }), 'comenzile sunt deterministe (RNG cu sămânță)');
  await p.click('#tabs [data-tab="cm"]'); await p.waitForTimeout(250);
  ok((await p.$$('#list .cm[data-ci]')).length === 3, 'fila Comenzi arată 3 comenzi');
  const ct = await ev(p, () => { const c = S.cms[1]; c.t = 2; c.got = 0; c.need = 3; c.left = 100; renderList(); return c.rew; });
  await p.click('#shapes [data-s="2"]'); ok(await ev(p, () => S.shape === 2), 'butonul de formă alege „oală” pe roată');
  ok(await ev(p, () => document.querySelector('[data-dl="1"]').disabled), '„Livrează” e blocat până e gata comanda');
  const wb2 = await ev(p, () => { const w = wheelBox(); return { x: w.x, y: w.y - w.r * .3 }; });
  for (let i = 0; i < 2; i++) await p.mouse.click(wb2.x, wb2.y);
  ok(await ev(p, () => S.cms[1].done && S.cms[1].got === 3), 'vasele modelate se numără la comandă (2 atingeri × 2 vase)');
  await p.waitForTimeout(300);
  const c0 = await ev(p, () => S.coins); await p.click('[data-dl="1"]');
  ok(await ev(p, ([c, r]) => S.coins - c >= r - 1e-6 && S.coins - c < r + 50 && S.cmDone === 1 && S.cms[1] === null && S.ach.includes(12), [c0, ct]), 'livrarea cu clic real dă răsplata și trofeul „Prima comandă”');
  ok(await ev(p, () => { S.cms[0].left = 0.01; S.cms[0].done = false; tick(1 / 30); return S.cms[0] === null && S.cmNext[0] > 7; }), 'comanda expirată dispare și vine alta mai târziu');
  // 6. UI file
  await p.click('#tabs [data-tab="up"]'); ok(await p.isVisible('#list .it, #list .note'), 'fila Unelte');
  await p.click('#tabs [data-tab="ach"]'); ok((await p.$$('.ach div')).length === 16, 'fila Trofee are 16 trofee');
  await p.click('#tabs [data-tab="ws"]'); ok(await ev(p, () => { S.run = 0; refreshList(); return document.getElementById('bWs').disabled; }), 'atelierul nou e blocat sub 1 M');
  // 7. prestigiu
  await ev(p, () => { S.run = 4.1e6; S.life = 5e6; S.coins = 4e6; S.own = [50, 20, 5, 1, 0, 0, 0, 0]; refreshList(); });
  await p.waitForTimeout(250);
  ok(!(await ev(p, () => document.getElementById('bWs').disabled)) && (await p.textContent('#bWs')).includes('+2'), 'la 4.1 M monede atelierul nou dă 2 sigilii');
  await p.click('#bWs'); await p.click('#cfYes');
  ok(await ev(p, () => S.seals === 2 && S.shops === 1 && S.coins === 0 && S.own.every(n => n === 0) && S.life >= 5e6 && S.ach.includes(14) && S.cmDone === 1), 'atelierul nou resetează, păstrează sigiliile, totalul și trofeele');
  ok(await ev(p, () => { S.own[0] = 1; S.ach = []; S.boostT = 0; return Math.abs(prod() - 0.25 * 1.1) < 1e-9; }), 'sigiliile dau +5% fiecare');
  ok(await ev(p, () => { S.ach = []; S.clicks = 1000; checkAch(); return S.ach.includes(8); }), 'trofeu 1000 atingeri');
  // 8. salvare + offline
  await ev(p, () => { S.coins = 123; save(); });
  const st = await ev(p, k => JSON.parse(localStorage.getItem(k)), SK);
  ok(st.coins === 123 && st.seals === 2 && st.v === '1.0', 'progresul se salvează');
  const off = Object.assign({}, st, { last: Date.now() - 3600 * 1000, own: [10, 0, 0, 0, 0, 0, 0, 0], ups: [0, 0, 0, 0, 0, 0, 0, 0], coins: 0, ach: [], seals: 0, boostT: 0, lang: 'en' });
  const p2 = await fresh(b, 'en-US', undefined, off);
  ok(await p2.isVisible('#away'), 'la revenire după o oră apare „Welcome back”');
  const lv = await ev(p2, () => S.coins);
  ok(Math.abs(lv - 0.25 * 10 * 3600 * 0.5) < 50, 'producție offline 50% (' + Math.round(lv) + ')');
  await p2.click('#awayOk'); ok((await p2.textContent('#bPlay')) === 'Continue' && await p2.isVisible('#bNew'), 'cu salvare: Continue + New game');
  await p2.click('#bPlay'); ok(await ev(p2, () => started && cur === null), 'Continue intră în joc');
  ok(!(await p2.isVisible('#tip')), 'tutorialul terminat nu mai apare');
  const p3 = await fresh(b, 'en-US', undefined, Object.assign({}, off, { last: Date.now() - 3 * 24 * 3600 * 1000 }));
  ok(await ev(p3, () => Math.abs(S.coins - 0.25 * 10 * 8 * 3600 * 0.5) < 50), 'offline limitat la 8 ore');
  // 9. setări persistente (glisoare reale)
  await p2.click('#bSet'); await p2.waitForTimeout(450);
  for (const id of ['#sMusic', '#sSfx']) { const bx = await p2.locator(id).boundingBox(); await p2.mouse.click(bx.x + 1, bx.y + bx.height / 2); }
  await p2.click('#sTut');
  const s2 = await ev(p2, k => JSON.parse(localStorage.getItem(k)), SK);
  ok(s2.music < 0.05 && s2.sfx < 0.05 && s2.tut === 0, 'volumul muzicii/sunetelor și tutorialul se salvează');
  await p2.click('#sLang'); ok(await ev(p2, () => S.lang === 'ru' && document.querySelector('#tabs [data-tab="cm"]').textContent.includes('Заказы')), 'limba din setări schimbă și filele');
  await p2.click('#sLang'); await p2.click('#sLang');
  await p2.click('#sClose'); await p2.keyboard.press('Escape'); ok(await p2.isVisible('#menu'), 'Esc duce la meniu');
  await p2.click('#bPlay');
  const k0 = await ev(p2, () => S.clicks); await p2.keyboard.press('Space'); await p2.keyboard.press('Space');
  ok(await ev(p2, c => S.clicks === c + 2, k0), 'Space învârte roata');
  await ev(p2, () => { S.coins = 100; }); await p2.keyboard.press('1'); ok(await ev(p2, () => S.own[0] === 11), 'tasta 1 angajează un ucenic');
  await p2.keyboard.press('s'); ok(await ev(p2, () => S.shape === 3), 'tasta S schimbă forma');
  // 10. joc nou cu confirmare
  await p2.keyboard.press('Escape'); await p2.click('#bNew'); await p2.click('#cfYes');
  ok(await ev(p2, () => S.life === 0 && S.own[0] === 0 && started && S.step === 0 && S.lang === 'en'), 'Joc nou cu confirmare pornește de la zero');
  // 11. desktop + mobil
  const pd = await fresh(b, 'ru-RU', { width: 1280, height: 720 });
  await pd.click('#bPlay'); const lay = await ev(pd, () => ({ wide, side: document.getElementById('side').getBoundingClientRect().left, cw: cv.width / DPR, tab: document.querySelector('#tabs [data-tab="gen"]').textContent }));
  ok(lay.wide && lay.side === 880 && lay.cw === 880 && lay.tab.includes('Цех'), 'desktop (RU): panoul în dreapta, atelierul în stânga');
  const lm = await ev(p2, () => ({ wide, top: document.getElementById('side').getBoundingClientRect().top, h: innerHeight, sw: document.documentElement.scrollWidth }));
  ok(!lm.wide && lm.top === Math.round(lm.h * 0.5) && lm.sw <= 405, 'mobil: atelierul sus, panoul jos, fără scroll orizontal');
  ok(await ev(pd, () => fmt(1234) === '1.23 K' && fmt(2.5e9) === '2.50 B' && fmt(7.5) === '7.5' && fmt(1e40) === '1.00e40'), 'formatare numere mari');
  // simulare lungă: o oră de joc cumpărând automat
  const sim = await ev(pd, () => { S.tut = 0; for (let s = 0; s < 3600; s++) { for (let k = 0; k < 30; k++) tick(1 / 30); for (let g = 7; g >= 0; g--) if (S.coins >= costOf(g, S.own[g])) buyGen(g, 1); for (let g = 0; g < 8; g++) if (upReady(g) && S.coins >= upCost(g)) buyUp(g); for (let i = 0; i < 3; i++) if (S.cms[i] && S.cms[i].done) deliver(i); if (S.fireT >= 0) { S.fireT = 0.8; fireKiln(); } if (s % 2) tapWheel(10, 10); } return { life: S.life, own: S.own.slice(), prod: prod(), cm: S.cmDone }; });
  ok(sim.life > 1e6 && sim.own[3] > 0 && isFinite(sim.prod) && sim.cm > 0, 'o oră simulată: progres sănătos (' + Math.round(sim.life) + ' monede, ' + sim.own.join('/') + ', comenzi ' + sim.cm + ')');
  for (const q of [p, p2, p3, pd]) ok(!q.errs.length, 'fără erori JS ' + q.errs.join(' | '));
  await b.close();
  console.log(n + ' verificări; ' + (fails ? fails + ' FAIL' : 'TOATE TESTELE AU TRECUT')); process.exit(fails ? 1 : 0);
})();
