// Teste Paper River v1.1 (misiuni zilnice, felinare de aur, 2 bărci noi): node river/tests/v11.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ro-RO' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.addInitScript(() => { window.__noLoop = true; });
  await p.goto(URL); await p.waitForTimeout(150);
  ok(await p.evaluate(() => VERSION >= '1.1' && SKINS.length >= 8 && ['en', 'ro', 'ru'].every(l => T[l].skins.length === SKINS.length)), 'v1.1: 8 bărci traduse');
  ok(await p.evaluate(() => ['en', 'ro', 'ru'].every(l => QUEST_POOL.every(q => T[l].q[q.k]))), 'v1.1: misiuni traduse RO/EN/RU');
  // misiuni deterministe: 3 tipuri diferite, aceleași toată ziua
  ok(await p.evaluate(() => { const a = JSON.stringify(ensureQuests().list.map(q => q.k)); S.quests = null; const b = JSON.stringify(ensureQuests().list.map(q => q.k));
    return a === b && new Set(JSON.parse(a)).size === 3; }), 'v1.1: 3 misiuni diferite, deterministe pe zi');
  // felinarele de aur apar în generator și nu schimbă trecerile
  ok(await p.evaluate(() => { let g = 0; for (let s = 1; s <= 10; s++) { newRun(s * 7919, false); G.genY = 260; while (G.genY < 40000) { const r = genRow(G.R, G.genY, G.gx, false); G.gx = r.gx; G.genY += spacingAt(G.genY); g += r.items.filter(i => i.kind === 'gold').length; } } return g > 20; }), 'v1.1: felinare de aur în râu');
  // tură: felinar de aur + putere + felinar, apoi accident → progres misiuni
  await p.evaluate(() => {
    S.quests = { day: todayStr(), list: [{ k: 'lan', n: 6, r: 15, prog: 0, claimed: false }, { k: 'gold', n: 1, r: 25, prog: 0, claimed: false }, { k: 'power', n: 1, r: 20, prog: 0, claimed: false }] };
    S.coins = 0; startRun(false); G.obs = []; G.rows = []; G.items = []; G.genY = G.d + 5000;
    G.items.push({ x: G.x, y: G.d + 5, kind: 'gold' }, { x: G.x, y: G.d + 40, kind: 'lan' }, { x: G.x, y: G.d + 80, kind: 'lotus' });
    for (let i = 0; i < 60; i++) step(1 / 60);
  });
  ok(await p.evaluate(() => G.lan === 6 && G.shield), 'v1.1: felinarul de aur valorează 5');
  await p.evaluate(() => { G.shield = false; G.obs.push({ x: G.x, y: G.d + 2, r: 15 }); step(1 / 60); });
  await p.waitForTimeout(800);
  ok(await p.evaluate(() => S.quests.list.every(q => q.prog >= q.n) && S.coins === 6), 'v1.1: progresul misiunilor se salvează la final de tură');
  await p.click('#bMenu');
  ok(await p.$eval('#bQuests', e => e.textContent.includes('Misiuni') && e.textContent.includes('3')), 'v1.1: butonul Misiuni arată 3 recompense');
  await p.click('#bQuests');
  ok(await p.$$eval('#card [data-q]', e => e.length) === 3, 'v1.1: lista misiunilor');
  await p.click('#card [data-q="1"]');
  ok(await p.evaluate(() => S.coins === 31 && S.quests.list[1].claimed), 'v1.1: recompensa misiunii (+25)');
  await p.click('#card [data-q="0"]'); await p.click('#card [data-q="2"]');
  ok(await p.evaluate(() => S.coins === 66 && questsReady() === 0), 'v1.1: toate recompensele luate o singură dată');
  await p.click('#bQClose');
  // bărci noi
  await p.evaluate(() => { S.coins = 3000; save(); }); await p.click('#bShop');
  await p.click('.sk[data-i="7"] button');
  ok(await p.evaluate(() => S.skin === 7 && S.coins === 1500), 'v1.1: cumpărare barca Jar (1500)');
  await p.click('.sk[data-i="6"] button');
  ok(await p.evaluate(() => S.skin === 6 && S.coins === 400), 'v1.1: cumpărare barca Cocor (1100)');
  // salvare veche v1.0 → mesaj Noutăți
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const p2 = await ctx2.newPage();
  await p2.addInitScript(() => { if (!sessionStorage.m) { sessionStorage.m = 1;
    localStorage.setItem('paper-river-v1', JSON.stringify({ lang: 'en', sound: true, music: true, best: 50, coins: 10, owned: [0], skin: 0, daily: {}, tut: true, runs: 4 })); } });
  await p2.goto(URL); await p2.waitForTimeout(900);
  ok(await p2.evaluate(() => document.getElementById('toast').textContent.includes('New in v') && S.coins === 10 && S.seen === VERSION), 'v1.1: migrare salvare v1.0 + mesaj Noutăți');
  // randare cu bucla pornită (felinar de aur și barca Jar)
  const ctx3 = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ru-RU' });
  const p3 = await ctx3.newPage(); p3.on('pageerror', e => errs.push(e.message));
  await p3.goto(URL); await p3.evaluate(() => { S.skin = 7; startRun(false); G.items.push({ x: G.x, y: G.d + 150, kind: 'gold' }); });
  await p3.waitForTimeout(600);
  ok(await p3.evaluate(() => mode === 'play'), 'v1.1: randare joc cu obiectele noi');
  ok(errs.length === 0, 'v1.1: fără erori în consolă ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
