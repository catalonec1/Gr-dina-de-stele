// Teste v1.2 (Galaxie spirală, ploaie de meteori, trofee și misiune noi): node tests/v12.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ro-RO' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(URL);
  ok(await p.evaluate(() => parseFloat(VERSION) >= 1.2 && STAR_TYPES.length >= 9), 'v1.2: versiunea 1.2 cu 9 tipuri de stele');
  ok(await p.evaluate(() => ['ro', 'en', 'ru'].every(k => T[k].stars.length === STAR_TYPES.length && T[k].shower && T[k].showerStart && T[k].q.gold)), 'v1.2: texte noi traduse RO/EN/RU');
  ok(await p.evaluate(() => ['ro', 'en', 'ru'].every(k => ACHIEVEMENTS.every(a => T[k].an[a.id] && T[k].ad[a.k]))) && await p.evaluate(() => ACHIEVEMENTS.length >= 23), 'v1.2: 23 trofee traduse');
  ok(await p.evaluate(() => UPGRADES.filter(u => u.kind === 'type' && u.type === 8).length === 3), 'v1.2: galaxia are 3 îmbunătățiri proprii');
  ok(await p.evaluate(() => STAR_TYPES[8].cost > STAR_TYPES[7].cost && STAR_TYPES[8].rate / STAR_TYPES[8].cost < STAR_TYPES[0].rate / STAR_TYPES[0].cost * 10), 'v1.2: galaxia e mai scumpă decât quasarul');
  // deblocare și cumpărare
  ok(await p.evaluate(() => { tab = 'stars'; renderList(); return document.querySelectorAll('.buy[data-star="8"]').length === 0; }), 'v1.2: galaxia ascunsă până ai un quasar');
  await p.evaluate(() => { S.owned[7] = 1; S.light = 2e10; renderList(); });
  await p.click('.buy[data-star="8"]');
  ok(await p.evaluate(() => S.owned[8] === 1 && !!S.ach.type8), 'v1.2: cumpărare galaxie + trofeul „Grădinarul galaxiilor”');
  await p.waitForTimeout(200);
  // ploaie de meteori
  await p.evaluate(() => { comet = null; shower.next = 0; });
  await p.waitForTimeout(150);
  ok(await p.evaluate(() => inShower() && shower.next > performance.now() + 500000), 'v1.2: ploaia de meteori pornește și se reprogramează');
  ok(await p.evaluate(() => document.getElementById('boost').textContent.includes(T.ro.shower) || (renderHud(), document.getElementById('boost').textContent.includes(T.ro.shower))), 'v1.2: HUD arată ploaia de meteori');
  ok(await p.evaluate(() => document.getElementById('toast').textContent.includes(T.ro.shower)), 'v1.2: mesaj la începutul ploii');
  ok(await p.evaluate(() => cometGap(performance.now()) === SHOWER_GAP && cometGap(performance.now() + SHOWER_LEN + 1) >= 40000), 'v1.2: comete dese doar în timpul ploii');
  ok(await p.evaluate(() => { let g = 0; for (let i = 0; i < 2000; i++) { spawnComet(); if (comet.gold) g++; } comet = null; return g > 380 && g < 640; }), 'v1.2: șansă de aur ~25% în ploaie');
  // cometa de aur avansează misiunea „gold” și trofeul gold5
  await p.evaluate(() => { S.daily.quests[0] = { k: 'gold', n: 1, prog: 0, claimed: false }; S.stats.gold = 4; spawnComet(); comet.gold = true; comet.vx = 0; comet.vy = 0; comet.x = 200; comet.y = 260; });
  await p.mouse.click(200, 260);
  ok(await p.evaluate(() => S.daily.quests[0].prog === 1 && S.stats.gold === 5 && !!S.ach.gold5), 'v1.2: misiunea „cometă de aur” și trofeul „Comoara cerului”');
  ok(await p.evaluate(() => QUEST_POOL.some(q => q.k === 'gold')), 'v1.2: misiune nouă în rotație');
  // după ploaie revine ritmul normal
  await p.evaluate(() => { shower.until = 0; renderHud(); });
  ok(await p.evaluate(() => !inShower() && !document.getElementById('boost').textContent.includes(T.ro.shower)), 'v1.2: ploaia se termină');
  // migrare salvare v1.1 (8 tipuri)
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const p2 = await ctx2.newPage();
  await p2.addInitScript(() => { if (!sessionStorage.m) { sessionStorage.m = 1;
    localStorage.setItem('gradina-de-stele-v1', JSON.stringify({ light: 10, lifeLight: 10, owned: [1, 0, 0, 0, 0, 0, 0, 0], ups: {}, dust: 0, boostUntil: 0, lang: 'en', sound: true, last: Date.now(), seen: '1.1', stats: { taps: 5 }, ach: {} })); } });
  await p2.goto(URL); await p2.waitForTimeout(300);
  ok(await p2.evaluate(() => S.owned.length === STAR_TYPES.length && S.owned[8] === 0 && S.stats.taps === 5), 'v1.2: migrare salvare v1.1');
  await p2.waitForFunction(() => document.getElementById('toast').textContent.includes(VERSION), null, { timeout: 5000 }).catch(() => {});
  ok(await p2.evaluate(() => document.getElementById('toast').textContent.includes(VERSION)), 'v1.2: mesaj „Noutăți” EN');
  await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(100);
  ok(errs.length === 0, 'v1.2: fără erori în consolă ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
