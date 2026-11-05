// Teste automate Paper River: node river/tests/run.js  (necesită playwright)
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
// pilot automat: țintește trecerea șirului următor; întoarce distanța atinsă
const AUTOPILOT = (secs) => {
  const dt = 1 / 60; let n = Math.round(secs / dt);
  while (n-- > 0 && G.alive) {
    const row = G.rows.find(r => r.y > G.d - (MAXR + BOAT_R + 2));
    G.keyDir = 0; G.tx = row ? row.gx : G.x; step(dt);
  }
  return { alive: G.alive, d: G.d, lan: G.lan };
};
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  let p = await fresh(b);
  // 1. generator: determinist, cu trecere mereu suficient de largă și accesibilă
  const gen = await p.evaluate(() => {
    const bad = [];
    for (let s = 1; s <= 40; s++) {
      const runA = [], runB = [];
      for (const out of [runA, runB]) { const R = rng(s * 7919); let y = 260, gx = 180;
        for (let k = 0; k < 220; k++) { const row = genRow(R, y, gx, k === 0); out.push(row); gx = row.gx; y += spacingAt(y); } }
      if (JSON.stringify(runA) !== JSON.stringify(runB)) bad.push('det' + s);
      let prev = 180;
      for (const row of runA) {
        const [lo, hi] = bankLimits(row.y, BOAT_R);
        if (row.gx < lo || row.gx > hi) bad.push('bank' + s + '@' + row.y);
        // nicio piedică nu intră în trecere (raza bărcii + marjă)
        for (const o of row.obs) {
          const near = o.log ? Math.max(o.x1 - o.r - row.gx, row.gx - o.x2 - o.r) : Math.abs(o.x - row.gx) - o.r;
          if (near < BOAT_R + 3) { bad.push('gap' + s + '@' + row.y); break; }
        }
        if (Math.abs(row.gx - prev) > shiftAt(row.y) + 20) bad.push('shift' + s + '@' + row.y);
        prev = row.gx;
      }
    }
    return bad;
  });
  ok(gen.length === 0, 'generator: 40 râuri x 220 șiruri deterministe, trecere liberă ' + gen.slice(0, 5).join(','));

  // 2. pilotul automat supraviețuiește 3 minute pe 12 râuri (dovadă că se poate juca la viteză maximă)
  const surv = await p.evaluate(src => { const ap = eval(src); const res = [];
    for (let s = 1; s <= 12; s++) { newRun(s * 104729, false); res.push(ap(180)); } return res; }, AUTOPILOT.toString());
  ok(surv.every(r => r.alive), 'pilot automat: 12 râuri x 180 s fără accident ' + surv.map(r => r.alive ? '' : Math.round(r.d)).join(' '));
  ok(surv.every(r => r.d > 50000 && r.lan > 100), 'distanță > 5000 m și > 100 felinare adunate (min ' + Math.min(...surv.map(r => r.lan)) + ')');

  // 3. meniu RO, limbi, mutare
  ok(await p.evaluate(() => S.lang) === 'ro', 'limba RO detectată din browser');
  ok(await p.$eval('#bPlay', e => e.textContent) === 'Joacă', 'meniu în română');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent) === 'Играть', 'comutare RU');
  await p.click('#bLang'); ok(await p.$eval('#bPlay', e => e.textContent) === 'Play', 'comutare EN');
  await p.click('#bLang');
  const keys = await p.evaluate(() => { const k = Object.keys(T.en); return ['ro', 'ru'].flatMap(l => k.filter(x => !(x in T[l])).map(x => l + ':' + x)); });
  ok(keys.length === 0, 'toate textele traduse RO/RU ' + keys.join(','));

  // 4. partidă reală: Play, tutorial, cârmire cu tastatura și prin tragere
  await p.click('#bPlay');
  ok(await p.evaluate(() => mode === 'play' && G.alive && !G.demo), 'partida pornește');
  ok(await p.$eval('#tut', e => e.classList.contains('on')), 'tutorialul apare la prima partidă');
  const x0 = await p.evaluate(() => G.x);
  await p.keyboard.down('ArrowLeft'); await p.evaluate(() => { for (let i = 0; i < 20; i++) step(1 / 60); }); await p.keyboard.up('ArrowLeft');
  ok(await p.evaluate(x => G.x < x - 20 && G.keyDir === 0, x0), 'săgeata stânga cârmește');
  ok(await p.evaluate(() => S.tut) && !(await p.$eval('#tut', e => e.classList.contains('on'))), 'tutorialul dispare după prima mișcare');
  const x1 = await p.evaluate(() => G.x);
  await p.mouse.move(150, 600); await p.mouse.down(); await p.mouse.move(230, 600, { steps: 5 });
  await p.evaluate(() => { for (let i = 0; i < 30; i++) step(1 / 60); }); await p.mouse.up();
  ok(await p.evaluate(x => G.x > x + 20, x1), 'tragerea cu degetul/mouse-ul cârmește');

  // 5. felinar, lotus (scut), magnet
  const pw = await p.evaluate(() => {
    G.obs = []; G.rows = []; G.items = []; G.genY = G.d + 5000; const l0 = G.lan;
    G.items.push({ x: G.x, y: G.d + 5, kind: 'lan' }, { x: G.x, y: G.d + 30, kind: 'lotus' }, { x: G.x, y: G.d + 60, kind: 'magnet' });
    for (let i = 0; i < 30; i++) step(1 / 60);
    const r = { lan: G.lan - l0, shield: G.shield, magnet: G.magnet > 0 };
    G.obs.push({ x: G.x, y: G.d + 8, r: 15 }); step(1 / 60); step(1 / 60);
    r.saved = G.alive && !G.shield;
    G.inv = 0; G.obs.push({ x: G.x, y: G.d + 8, r: 15 }); step(1 / 60);
    r.dead = !G.alive; return r;
  });
  ok(pw.lan === 1 && pw.shield && pw.magnet, 'felinar +1, lotusul dă scut, steaua dă magnet');
  ok(pw.saved, 'scutul de lotus salvează de o stâncă');
  ok(pw.dead, 'fără scut, stânca oprește barca');
  await p.waitForTimeout(900);
  ok(await p.$eval('#overlay', e => e.classList.contains('on')) && (await p.$eval('#card h3', e => e.textContent)) === 'Barca s-a împotmolit!', 'ecran de final');
  const fin = await p.evaluate(() => ({ coins: S.coins, best: S.best, saved: JSON.parse(localStorage.getItem(KEY)).coins }));
  ok(fin.coins >= 1 && fin.best > 0 && fin.saved === fin.coins, 'felinarele și recordul se salvează');

  // 6. continuare cu felinare (o singură dată)
  await p.evaluate(() => { S.coins = 50; gameOver.call(); });
  await p.evaluate(() => { G.over = false; G.alive = false; gameOver(); });
  ok(await p.$('#bRevive') !== null, 'buton Continuă cu 20 felinare');
  await p.click('#bRevive');
  ok(await p.evaluate(() => G.alive && G.revived && S.coins === 50 - REVIVE && G.inv > 0), 'continuarea scade felinarele și dă invulnerabilitate');
  await p.evaluate(() => { G.inv = 0; G.shield = false; G.obs.push({ x: G.x, y: G.d + 8, r: 15 }); step(1 / 60); });
  await p.waitForTimeout(900);
  ok(await p.$('#bRevive') === null, 'a doua continuare nu mai e oferită');
  await p.click('#bMenu');
  ok(await p.evaluate(() => mode === 'menu') && (await p.$eval('#menuInfo', e => e.textContent)).includes('Record'), 'înapoi în meniu cu recordul afișat');

  // 7. pauză
  await p.click('#bPlay'); await p.click('#bPause');
  const d0 = await p.evaluate(() => { step(1 / 60); return G.d; });
  ok(await p.evaluate(d => G.paused && G.d === d, d0) && (await p.$eval('#card h3', e => e.textContent)) === 'Pauză', 'pauza oprește râul');
  await p.click('#bResume'); ok(await p.evaluate(() => !G.paused), 'reluare după pauză');
  await p.keyboard.press('Escape'); ok(await p.evaluate(() => G.paused), 'Escape pune pauză');
  await p.click('#bQuit'); ok(await p.evaluate(() => mode === 'menu'), 'ieșire în meniu din pauză');

  // 8. magazin de bărci
  await p.evaluate(() => { S.coins = 200; save(); });
  await p.click('#bShop');
  ok(await p.$$eval('.sk', e => e.length) === 6, '6 bărci în magazin');
  await p.click('.sk[data-i="1"] button');
  ok(await p.evaluate(() => S.skin === 1 && S.owned.includes(1) && S.coins === 140), 'cumpărare barcă Lotus (60)');
  ok(await p.$eval('.sk[data-i="3"] button', e => e.disabled), 'barca de 300 e blocată fără felinare');
  await p.click('.sk[data-i="0"] button'); ok(await p.evaluate(() => S.skin === 0), 'alegerea altei bărci deținute');
  await p.click('#bShopBack');

  // 9. râul zilei: același seed pentru toată ziua, record separat
  const dl = await p.evaluate(() => { startRun(true); const a = G.seed; startRun(true); return { same: a === G.seed, daily: G.daily, seed: a === dailySeed(todayStr()) }; });
  ok(dl.same && dl.daily && dl.seed, 'râul zilei are seed fix pe zi');
  await p.evaluate(() => { G.d = 1234; G.alive = false; gameOver(); });
  ok(await p.evaluate(() => S.daily[todayStr()] === 123), 'recordul zilei se salvează');
  await p.click('#bMenu');
  ok((await p.$eval('#bDaily', e => e.textContent)).includes('123'), 'butonul zilei arată recordul');
  ok(p.errs.length === 0, 'fără erori în consolă (mobil) ' + p.errs.join(' | '));

  // 10. bucla reală pe desktop EN + RU, randare fără erori, ciclu zi/noapte
  for (const [loc, word] of [['en-US', 'Play'], ['ru-RU', 'Играть']]) {
    const q = await fresh(b, loc, { width: 1280, height: 720 }, false);
    ok(await q.$eval('#bPlay', e => e.textContent) === word, 'limba ' + loc);
    await q.click('#bPlay'); await q.keyboard.down('KeyD'); await q.waitForTimeout(700); await q.keyboard.up('KeyD');
    ok(await q.evaluate(() => G.d > 50 && G.t > 0.4), 'bucla rulează (' + loc + ')');
    await q.evaluate(() => { G.d = 4500; G.shield = true; G.magnet = 3; }); await q.waitForTimeout(300);
    ok(q.errs.length === 0, 'randare noapte fără erori (' + loc + ') ' + q.errs.join(' | '));
    await q.context().close();
  }
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
