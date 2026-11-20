// Teste automate Cocoon Garden: node cocoon/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', vp = { width: 390, height: 844 }, store) {
  const ctx = await b.newContext({ viewport: vp, locale }); const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  if (store) await ctx.addInitScript(s => localStorage.setItem('cocoon-garden-v1', s), JSON.stringify(store));
  await p.goto(URL); await p.waitForTimeout(300); return p;
}
const ev = (p, f, a) => p.evaluate(f, a);
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  // 1. meniu + limbă
  let p = await fresh(b);
  ok(await p.isVisible('#menu') && (await p.textContent('#bPlay')) === 'Joacă', 'meniul principal apare în română (după limba browserului)');
  ok(!(await p.isVisible('#bNew')), 'fără salvare nu apare „Joc nou”');
  await p.click('#bLang'); ok((await p.textContent('#bPlay')) === 'Play', 'butonul de limbă trece în engleză');
  await p.click('#bLang'); ok((await p.textContent('#bPlay')) === 'Играть', 'apoi în rusă');
  await p.click('#bLang');
  // 2. tutorial cu acțiuni reale
  await p.click('#bPlay'); await p.waitForTimeout(250);
  ok(await p.isVisible('#tip') && (await p.textContent('#tip')).includes('1/3'), 'tutorial pas 1 apare la start');
  ok(await p.isVisible('#hand'), 'mâna arată spre stejar');
  const tb = await ev(p, () => { const t = treeBox(); return { x: t.x, y: t.y - t.r * 0.25 }; });
  for (let i = 0; i < 10; i++) await p.mouse.click(tb.x, tb.y);
  ok(await ev(p, () => S.clicks === 10 && S.leaves >= 10), '10 atingeri reale pe stejar dau 10 frunze');
  await p.waitForTimeout(250);
  ok((await p.textContent('#tip')).includes('2/3'), 'pasul 2: cumpără o omidă');
  for (let i = 0; i < 6; i++) await p.mouse.click(tb.x, tb.y);
  await p.click('[data-g="0"]');
  ok(await ev(p, () => S.own[0] === 1 && S.leaves < 2), 'omida costă 15 și se cumpără cu clic pe listă');
  ok(await ev(p, () => S.step === 2 && !!fly), 'pasul 3: apare un fluture auriu');
  await p.waitForTimeout(300);
  const fp = await ev(p, () => flyPos());
  await p.mouse.click(fp.x, fp.y);
  ok(await ev(p, () => S.step === 3 && S.flies === 1 && !fly), 'prins fluturele cu clic real → tutorial terminat');
  ok(!(await p.isVisible('#tip')) && !(await p.isVisible('#hand')), 'tutorialul dispare');
  // 3. economie
  const e1 = await ev(p, () => { S.leaves = 0; S.rushT = 0; S.time = 0; S.own = [10, 0, 0, 0, 0, 0, 0, 0]; S.ups = [0, 0, 0, 0, 0, 0, 0, 0]; S.ach = [...Array(16).keys()]; S.dust = 0; const a = S.leaves; for (let i = 0; i < 300; i++) tick(1 / 30); return { got: S.leaves - a, rate: prod() }; });
  ok(Math.abs(e1.got - 10 * 0.2 * 2 * 1.32 * 10) < 0.5 && e1.rate > 0, 'producție corectă: 10 omizi primăvara (×2) în 10 s');
  ok(await ev(p, () => { S.time = SEASON_LEN; return season() === 1 && genMult(0) === 1 && genMult(3) === 2; }), 'anotimpurile se schimbă și dublează alte creaturi');
  ok(await ev(p, () => Math.abs(costN(0, 0, 10) - [...Array(10)].reduce((a, _, i) => a + costOf(0, i), 0)) < 1e-6), 'costul ×10 = suma costurilor crescătoare (×1.15)');
  ok(await ev(p, () => { const m = maxBuy(0, 5, 1000); return costN(0, 5, m) <= 1000 && costN(0, 5, m + 1) > 1000; }), '„Max” cumpără exact cât îți permiți');
  ok(await ev(p, () => { S.leaves = 1e6; S.own[0] = 3; const n = S.own[0]; buyN = 10; buyGen(0, 10); return S.own[0] === n + 10; }), 'cumpărare ×10');
  ok(await ev(p, () => { S.leaves = 0; return !buyGen(1, 1) && S.own[1] === 0; }), 'nu cumperi fără frunze');
  ok(await ev(p, () => { S.own[0] = 9; S.ups[0] = 0; return !upReady(0); }) && await ev(p, () => { S.own[0] = 10; S.leaves = 1e5; const r0 = genMult(0); buyUp(0); return upReady(0) === false && S.ups[0] === 1 && genMult(0) === r0 * 2; }), 'îmbunătățirea apare la 10 creaturi și dublează producția');
  ok(await ev(p, () => { S.leaves = 200; const c0 = clickPower(); buyClick(); return S.clickUps === 1 && clickPower() > c0; }), 'crengi mai grele cresc puterea atingerii');
  ok(await ev(p, () => { S.rushT = 0; const a = prod(); S.rushT = 30; const r = prod(); S.rushT = 0; return Math.abs(r / a - 7) < 1e-9; }), 'ploaia de polen = ×7');
  // 4. UI listă și file
  await p.click('#tabs [data-tab="up"]'); ok(await p.isVisible('#list .it, #list .note'), 'fila Îmbunătățiri');
  await p.click('#tabs [data-tab="ach"]'); ok((await p.$$('.ach div')).length === 16, 'fila Trofee are 16 trofee');
  await p.click('#tabs [data-tab="mig"]'); ok(await ev(p, () => document.getElementById('bMig').disabled), 'migrația e blocată sub 1 M');
  // 5. migrație
  await ev(p, () => { S.run = 4.1e6; S.life = 5e6; S.leaves = 4e6; S.own = [50, 20, 5, 1, 0, 0, 0, 0]; refreshList(); });
  await p.waitForTimeout(250);
  ok(!(await ev(p, () => document.getElementById('bMig').disabled)) && (await p.textContent('#bMig')).includes('+2'), 'la 4.1 M frunze migrația dă 2 🌟');
  await p.click('#bMig'); await p.click('#cfYes');
  ok(await ev(p, () => S.dust === 2 && S.migs === 1 && S.leaves === 0 && S.own.every(n => n === 0) && S.life >= 5e6 && S.ach.includes(13)), 'migrația resetează grădina, păstrează praful, totalul și trofeele');
  ok(await ev(p, () => { S.own[0] = 1; S.time = 0; S.ach = []; return Math.abs(prod() - 0.2 * 2 * 1.1) < 1e-9; }), 'praful dă +5% fiecare');
  // 6. trofee
  ok(await ev(p, () => { S.ach = []; S.clicks = 1000; checkAch(); return S.ach.includes(10); }), 'trofeu 1000 atingeri');
  // 7. salvare + offline
  await ev(p, () => { S.leaves = 123; save(); });
  const st = await ev(p, () => JSON.parse(localStorage.getItem('cocoon-garden-v1')));
  ok(st.leaves === 123 && st.dust === 2, 'progresul se salvează');
  const off = Object.assign({}, st, { last: Date.now() - 3600 * 1000, own: [10, 0, 0, 0, 0, 0, 0, 0], ups: [0, 0, 0, 0, 0, 0, 0, 0], leaves: 0, ach: [], dust: 0, time: 0, rushT: 0 });
  const p2 = await fresh(b, 'en-US', undefined, off);
  ok(await p2.isVisible('#away'), 'la revenire după o oră apare „Bine ai revenit”');
  const lv = await ev(p2, () => S.leaves);
  ok(lv > 0.2 * 10 * 3600 * 0.5 * 0.9 && lv < 0.2 * 10 * 2 * 3600 * 0.5 * 1.1, 'producție offline 50% (' + Math.round(lv) + ')');
  await p2.click('#awayOk'); ok((await p2.textContent('#bPlay')) === await ev(p2, () => T('cont')) && await p2.isVisible('#bNew'), 'cu salvare: Continue + New game');
  await p2.click('#bPlay'); ok(await ev(p2, () => started && cur === null), 'Continue intră în joc');
  ok(!(await p2.isVisible('#tip')), 'tutorialul terminat nu mai apare');
  const off2 = Object.assign({}, off, { last: Date.now() - 3 * 24 * 3600 * 1000 });
  const p3 = await fresh(b, 'en-US', undefined, off2);
  ok(await ev(p3, () => S.leaves <= 0.2 * 10 * 2 * 8 * 3600 * 0.5 + 1), 'offline limitat la 8 ore');
  // 8. setări persistente
  await p2.click('#bSet'); await p2.click('#sMusic'); await p2.click('#sSound'); await p2.click('#sTut');
  const s2 = await ev(p2, () => JSON.parse(localStorage.getItem('cocoon-garden-v1')));
  ok(s2.music === 0 && s2.sound === 0 && s2.tut === 0, 'setările muzică/sunet/tutorial se salvează');
  await p2.click('#sClose'); await p2.keyboard.press('Escape'); ok(await p2.isVisible('#menu'), 'Esc duce la meniu');
  await p2.click('#bPlay');
  const c0 = await ev(p2, () => S.clicks); await p2.keyboard.press('Space'); await p2.keyboard.press('Space');
  ok(await ev(p2, c => S.clicks === c + 2, c0), 'Space scutură stejarul');
  await ev(p2, () => { S.leaves = 100; }); await p2.keyboard.press('1'); ok(await ev(p2, () => S.own[0] === 11), 'tasta 1 cumpără omidă');
  // 9. joc nou cu confirmare
  await p2.keyboard.press('Escape'); await p2.click('#bNew'); await p2.click('#cfYes');
  ok(await ev(p2, () => S.life === 0 && S.own[0] === 0 && started && S.step === 0), 'Joc nou cu confirmare pornește de la zero');
  // 10. desktop + mobil, fără erori
  const pd = await fresh(b, 'en-US', { width: 1280, height: 720 });
  await pd.click('#bPlay'); const lay = await ev(pd, () => ({ wide, side: document.getElementById('side').getBoundingClientRect().left, cw: cv.width / DPR }));
  ok(lay.wide && lay.side === 880 && lay.cw === 880, 'desktop: panoul în dreapta, grădina în stânga');
  const lm = await ev(p2, () => ({ wide, top: document.getElementById('side').getBoundingClientRect().top, h: innerHeight }));
  ok(!lm.wide && lm.top === Math.round(lm.h * 0.5), 'mobil: grădina sus, panoul jos');
  ok(await ev(pd, () => fmt(1234) === '1.23 K' && fmt(2.5e9) === '2.50 B' && fmt(7.5) === '7.5'), 'formatare numere');
  // simulare lungă: o oră de joc cumpărând automat
  const sim = await ev(pd, () => { for (let s = 0; s < 3600; s++) { for (let k = 0; k < 30; k++) tick(1 / 30); for (let g = 7; g >= 0; g--) if (S.leaves >= costOf(g, S.own[g])) buyGen(g, 1); for (let g = 0; g < 8; g++) if (upReady(g) && S.leaves >= upCost(g)) buyUp(g); if (S.clicks < 1e9) tapTree(10, 10); } return { life: S.life, own: S.own.slice(), prod: prod() }; });
  ok(sim.life > 1e6 && sim.own[3] > 0 && isFinite(sim.prod), 'o oră simulată: progres sănătos (' + Math.round(sim.life) + ' frunze, ' + sim.own.join('/') + ')');
  for (const q of [p, p2, p3, pd]) ok(!q.errs.length, 'fără erori JS ' + q.errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' FAIL' : 'TOATE TESTELE AU TRECUT'); process.exit(fails ? 1 : 0);
})();
