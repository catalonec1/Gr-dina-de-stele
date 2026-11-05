// Teste automate: node tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', init) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  if (init) await p.addInitScript(init);
  await p.goto(URL); return p;
}
(async () => {
  const b = await chromium.launch();
  let p = await fresh(b);
  ok(await p.evaluate(() => S.lang) === 'ro', 'limba implicită RO');
  for (let i = 0; i < 20; i++) await p.mouse.click(200, 300);
  ok(await p.evaluate(() => S.light) >= 20, 'atingerile adaugă lumină');
  ok(await p.evaluate(() => S.daily.quests.find(q => q.k === 'taps')?.prog ?? 20) >= 20, 'misiunea de atingeri avansează');
  await p.click('.row:nth-child(2) .buy');
  ok(await p.evaluate(() => S.owned[0]) === 1, 'cumpărare stea');
  const l0 = await p.evaluate(() => S.light); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => S.light) > l0, 'producție pasivă');
  await p.evaluate(() => { S.light = 0; renderList(); renderHud(); });
  ok(await p.$eval('.row:nth-child(2) .buy', e => e.disabled), 'buton dezactivat fără lumină');
  await p.evaluate(() => { S.light = 1e5; renderList(); });
  for (let i = 0; i < 9; i++) await p.click('.row:nth-child(2) .buy');
  ok(await p.evaluate(() => S.owned[0] === 10 && typeMult(0) === 2), 'constelație la 10 stele');
  await p.click('#tabs button[data-tab=upgrades]'); await p.click('.row:nth-child(1) .buy');
  ok(await p.evaluate(() => Object.keys(S.ups).length) === 1, 'îmbunătățire');
  await p.click('#tabs button[data-tab=stars]');
  const r0 = await p.evaluate(() => ratePerSec()); await p.click('.row:nth-child(1) .buy');
  ok(Math.abs(await p.evaluate(() => ratePerSec()) - 2 * r0) < 1e-9, 'bonus x2');
  // cometă
  await p.evaluate(() => { comet = null; nextComet = 0; });
  await p.waitForTimeout(100);
  const c = await p.evaluate(() => { comet.vx = 0; comet.vy = 0; comet.x = 200; comet.y = 250; return S.light; });
  await p.mouse.click(200, 250);
  ok(await p.evaluate(() => comet === null) && await p.evaluate(() => S.light) > c, 'cometa se prinde și dă lumină');
  // cadou zilnic
  await p.click('#tabs button[data-tab=daily]');
  const g0 = await p.evaluate(() => S.light); await p.click('.row:nth-child(1) .buy');
  ok(await p.evaluate(() => S.daily.streak === 1 && !giftAvailable()) && await p.evaluate(() => S.light) > g0, 'cadou zilnic, serie 1');
  ok(await p.$eval('.row:nth-child(1) .buy', e => e.disabled), 'cadoul nu se ia de două ori');
  // serie continuă dacă ieri a luat cadoul
  await p.evaluate(() => { S.daily.day = 'x'; S.daily.lastGift = yesterdayKey(); S.daily.streak = 3; ensureDaily(); });
  ok(await p.evaluate(() => giftAvailable() && nextStreak() === 4), 'seria continuă a doua zi');
  await p.evaluate(() => { S.daily.day = 'x'; S.daily.lastGift = '2000-01-01'; ensureDaily(); });
  ok(await p.evaluate(() => nextStreak() === 1), 'seria se resetează după o zi ratată');
  // misiune
  await p.evaluate(() => { const q = S.daily.quests[0]; q.prog = q.n; tab = 'daily'; renderList(); });
  const q0 = await p.evaluate(() => S.light); await p.click('.row:nth-child(3) .buy');
  ok(await p.evaluate(() => S.daily.quests[0].claimed) && await p.evaluate(() => S.light) > q0, 'misiune revendicată');
  ok(await p.evaluate(() => new Set(S.daily.quests.map(q => q.k)).size === 3), '3 misiuni diferite');
  // renaștere
  await p.evaluate(() => { S.lifeLight = 4e6; tab = 'rebirth'; renderList(); });
  await p.click('.row .buy');
  ok(await p.evaluate(() => S.dust === 2 && S.owned[0] === 0 && S.daily && S.daily.streak >= 1), 'renaștere păstrează praf și seria');
  // limbi
  for (const lg of ['en', 'ru', 'ro']) { await p.click('#lang'); ok(await p.evaluate(() => S.lang) === lg, 'comutare limbă -> ' + lg); }
  ok(await p.evaluate(() => ['ro','en','ru'].every(k => Object.keys(T.ro).every(x => x in T[k]))), 'toate cheile traduse RO/EN/RU');
  ok(await p.evaluate(() => fmt(1234) === '1.23K' && fmt(1e6) === '1M'), 'formatare numere');
  await p.setViewportSize({ width: 1280, height: 800 });
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'fără scroll orizontal');
  ok(p.errs.length === 0, 'fără erori în consolă ' + p.errs.join('|'));
  // v1.1: stele noi, cumpărare x10 / Max, cometă de aur, trofee, statistici, tastatură
  p = await fresh(b);
  ok(await p.evaluate(() => STAR_TYPES.length >= 8 && ['ro','en','ru'].every(k => T[k].stars.length === STAR_TYPES.length)), 'v1.1: 8 tipuri de stele traduse');
  ok(await p.evaluate(() => ['ro','en','ru'].every(k => ACHIEVEMENTS.every(a => T[k].an[a.id] && T[k].ad[a.k]))), 'v1.1: trofee traduse în toate limbile');
  await p.evaluate(() => { S.light = 1e4; S.buyMode = 10; renderList(); });
  const cost10 = await p.evaluate(() => starCostN(0, 10));
  await p.click('.row:nth-child(2) .buy');
  ok(await p.evaluate(c => S.owned[0] === 10 && Math.abs(S.light - (1e4 - c)) < 1, cost10), 'v1.1: cumpărare x10 (cost exact)');
  ok(await p.evaluate(() => !!S.ach.constel1 && achCount() >= 1), 'v1.1: trofeu la prima constelație');
  await p.evaluate(() => { S.light = 5000; S.buyMode = 'max'; renderList(); });
  const nMax = await p.evaluate(() => buyCount(0));
  await p.click('.row:nth-child(2) .buy');
  ok(await p.evaluate(n => S.owned[0] === 10 + n && S.light >= 0 && S.light < starCost(0), nMax), 'v1.1: cumpărare Max');
  ok(await p.evaluate(() => document.querySelectorAll('.modes button').length === 3), 'v1.1: comutator x1/x10/Max');
  const rA = await p.evaluate(() => { S.ach = {}; return ratePerSec(); });
  const rB = await p.evaluate(() => { S.ach = { taps1: true, comets1: true }; return ratePerSec(); });
  ok(Math.abs(rB / rA - 1.04) < 1e-9, 'v1.1: fiecare trofeu +2% lumină');
  await p.evaluate(() => { comet = null; nextComet = 0; });
  await p.waitForTimeout(100);
  const gc = await p.evaluate(() => { comet.gold = true; comet.vx = 0; comet.vy = 0; comet.x = 200; comet.y = 250; return { l: S.light, v: rewardBase() * 450 }; });
  await p.mouse.click(200, 250);
  ok(await p.evaluate(gc => S.stats.gold === 1 && S.light - gc.l >= gc.v * 0.99 && !!S.ach.gold1, gc), 'v1.1: cometa de aur dă x5 și trofeu');
  const k0 = await p.evaluate(() => S.stats.taps); await p.keyboard.press('Space');
  ok(await p.evaluate(k => S.stats.taps === k + 1, k0), 'v1.1: Space strânge lumină pe desktop');
  await p.evaluate(() => { tab = 'trophies'; renderList(); });
  ok(await p.evaluate(() => document.querySelectorAll('#list .row.ach').length === ACHIEVEMENTS.length && !!document.querySelector('.stats')), 'v1.1: tab trofee cu statistici');
  await p.evaluate(() => { S.lifeLight = 1e6; tab = 'rebirth'; renderList(); });
  await p.click('.row .buy');
  ok(await p.evaluate(() => S.stats.rebirths === 1 && !!S.ach.rebirths1 && !!S.ach.gold1 && S.buyMode === 'max'), 'v1.1: trofeele și statisticile rămân după renaștere');
  ok(await p.evaluate(() => fmt(1e21) === '1Sx' && fmt(1e33) === '1Dc'), 'v1.1: sufixe pentru numere mari');
  ok(await p.evaluate(() => !T.ru.q.comets.includes('{n} кометы')), 'v1.1: RU fără acord greșit la comete');
  ok(p.errs.length === 0, 'v1.1: fără erori în consolă ' + p.errs.join('|'));
  // salvare din v1.0 (6 tipuri, fără statistici) se migrează
  p = await fresh(b, 'ro-RO', () => { if (!sessionStorage.y) { sessionStorage.y = 1;
    localStorage.setItem('gradina-de-stele-v1', JSON.stringify({ light: 50, lifeLight: 5e5, owned: [3, 0, 0, 0, 0, 0], ups: {}, dust: 1, boostUntil: 0, lang: 'ro', sound: true, last: Date.now() })); } });
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => S.owned.length === STAR_TYPES.length && S.stats.total >= 5e5 && S.seen === VERSION && !!S.ach.total2 === false && !!S.ach.total1), 'v1.1: migrare salvare v1.0');
  await p.waitForFunction(() => document.getElementById('toast').textContent.includes(VERSION), null, { timeout: 5000 }).catch(() => {});
  ok(await p.evaluate(() => document.getElementById('toast').textContent.includes(VERSION)), 'v1.1: mesaj „Noutăți” pentru jucătorii vechi');
  // reclamă în curs: sunetul jucătorului nu se salvează ca oprit
  p = await fresh(b);
  await p.evaluate(() => { Ads.useSdk({ environment: 'local', game: { loadingStop(){}, gameplayStart(){}, gameplayStop(){} },
    ad: { requestAd(type, cb) { cb.adStarted(); window.__fin = cb.adFinished; } } }); });
  await p.click('.row:nth-child(1) .buy');
  ok(await p.evaluate(() => { save(); return JSON.parse(localStorage.getItem(SAVE_KEY)).sound === true && Ads.muted; }), 'v1.1: în timpul reclamei sunetul e oprit fără să strice setarea');
  await p.evaluate(() => __fin());
  ok(await p.evaluate(() => !Ads.muted && S.boostUntil > Date.now()), 'v1.1: după reclamă sunetul revine');
  // limbă după locale + offline
  p = await fresh(b, 'ru-RU'); ok(await p.evaluate(() => S.lang) === 'ru', 'limba implicită RU');
  p = await fresh(b, 'de-DE'); ok(await p.evaluate(() => S.lang) === 'en', 'limba implicită EN pentru alte țări');
  p = await fresh(b, 'ro-RO', () => { if (!sessionStorage.x) { sessionStorage.x = 1;
    localStorage.setItem('gradina-de-stele-v1', JSON.stringify({ light: 0, lifeLight: 0, owned: [0, 10, 0, 0, 0, 0], ups: {}, dust: 0, boostUntil: 0, lang: 'ro', sound: true, last: Date.now() - 3600e3 })); } });
  await p.waitForTimeout(300);
  ok(Math.abs(await p.evaluate(() => S.light) - 36000) < 300, 'câștig offline (1h, 50%)');
  // fără localStorage
  p = await fresh(b, 'ro-RO', () => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await p.mouse.click(200, 300);
  ok(p.errs.length === 0 && await p.evaluate(() => S.light) > 0, 'merge fără localStorage');
  // SDK reclame simulat: recompensă doar după reclamă, eroare fără recompensă
  p = await fresh(b, 'ro-RO');
  await p.evaluate(() => { window.__mode = 'ok'; window.__calls = [];
    Ads.useSdk({ environment: 'local', game: { loadingStop(){}, gameplayStart(){ __calls.push('start'); }, gameplayStop(){ __calls.push('stop'); } },
      ad: { requestAd(type, cb) { __calls.push(type); cb.adStarted(); setTimeout(() => __mode === 'ok' ? cb.adFinished() : cb.adError('x'), 50); } } }); });
  ok(await p.evaluate(() => Ads.enabled), 'SDK detectat');
  await p.click('.row:nth-child(1) .buy'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => S.boostUntil > Date.now() && __calls.includes('rewarded') && __calls.includes('stop')), 'reclamă recompensată dă bonusul');
  await p.evaluate(() => { S.boostUntil = 0; __mode = 'fail'; renderList(); });
  await p.click('.row:nth-child(1) .buy'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => S.boostUntil === 0 && S.sound === true && !Ads.busy), 'fără reclamă: fără bonus, sunet revenit');
  ok(await p.evaluate(() => !Ads.onCrazyGames()), 'pe alte site-uri SDK-ul nu se încarcă');
  // Poki simulat
  p = await fresh(b, 'ro-RO');
  await p.evaluate(() => { window.__c = [];
    Ads.usePoki({ gameLoadingFinished(){ __c.push('loaded'); }, gameplayStart(){ __c.push('start'); }, gameplayStop(){ __c.push('stop'); },
      rewardedBreak(o){ o.onStart(); return new Promise(r => setTimeout(() => r(true), 30)); }, commercialBreak(cb){ cb(); return Promise.resolve(); } }); });
  await p.click('.row:nth-child(1) .buy'); await p.waitForTimeout(120);
  ok(await p.evaluate(() => S.boostUntil > Date.now() && __c.includes('loaded') && __c.includes('stop')), 'Poki: reclamă recompensată dă bonusul');
  // GameDistribution simulat
  p = await fresh(b, 'ro-RO');
  await p.evaluate(() => { window.GD_GAME_ID = 'test';
    window.loadScript = () => { window.gdsdk = { showAd(t) { GD_OPTIONS.onEvent({ name: 'SDK_GAME_PAUSE' });
      if (t === 'rewarded') GD_OPTIONS.onEvent({ name: 'SDK_REWARDED_WATCH_COMPLETE' }); return Promise.resolve(); } }; return Promise.resolve(); };
    Ads.useGD(); });
  await p.waitForFunction(() => Ads.enabled);
  await p.click('.row:nth-child(1) .buy'); await p.waitForTimeout(120);
  ok(await p.evaluate(() => S.boostUntil > Date.now() && !Ads.busy), 'GameDistribution: reclamă recompensată dă bonusul');
  // muzică: se încarcă prin HTTP și se poate opri
  const http = require('http'), fsx = require('fs');
  const root = path.resolve(__dirname, '..');
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    fsx.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200); r.end(d); } }); }).listen(0);
  const port = srv.address().port;
  const ctxm = await b.newContext({ viewport: { width: 390, height: 844 } }); const pm = await ctxm.newPage(); const em = [];
  pm.on('pageerror', e => em.push(e.message));
  await pm.goto(`http://127.0.0.1:${port}/`); await pm.mouse.click(200, 300);
  await pm.waitForFunction(() => Music.src !== null, null, { timeout: 8000 }).catch(() => {});
  ok(await pm.evaluate(() => Music.src !== null && Music.buffer.duration > 40), 'muzica pornește după prima atingere și se buclează');
  await pm.click('#music');
  ok(await pm.evaluate(() => Music.src === null && S.music === false), 'butonul de muzică oprește muzica');
  ok(em.length === 0, 'fără erori cu muzica ' + em.join('|'));
  srv.close();
  // build-urile pe platformă: se încarcă fără erori, PWA are service worker
  require('child_process').execFileSync('node', [path.join(root, 'tools/build.js')], { stdio: 'ignore' });
  const srv2 = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
    fsx.readFile(path.join(root, 'dist', u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, u.endsWith('.js') ? { 'Content-Type': 'text/javascript' } : {}); r.end(d); } }); }).listen(0);
  const p2 = srv2.address().port;
  for (const plat of ['web', 'itch', 'crazygames', 'poki', 'gamedistribution']) {
    const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const pg = await c2.newPage(); const er = [];
    pg.on('pageerror', e => er.push(e.message));
    await pg.goto(`http://localhost:${p2}/${plat}/`); await pg.mouse.click(200, 300); await pg.waitForTimeout(300);
    if (plat !== 'web' && plat !== 'itch') ok(await pg.evaluate(() => S.lang) === 'en', `build ${plat}: limba implicită engleza`);
    ok(er.length === 0 && await pg.evaluate(p => PLATFORM === (p === 'web' || p === 'itch' ? 'web' : p) && S.light > 0, plat), `build ${plat}: pornește corect`);
    if (plat === 'web') {
      await pg.waitForFunction(() => navigator.serviceWorker.getRegistration().then(r => !!r), null, { timeout: 8000 }).catch(() => {});
      ok(await pg.evaluate(() => navigator.serviceWorker.getRegistration().then(r => !!r)), 'PWA: service worker înregistrat');
      const man = await pg.evaluate(() => fetch('manifest.webmanifest').then(r => r.json()));
      ok(man.icons.length >= 2 && man.display === 'standalone', 'PWA: manifest valid');
    }
    await c2.close();
  }
  srv2.close();
  // Regresii găsite prin teste de mutație (skill rea-ci-tests-audit): fiecare verificare de mai jos
  // pică dacă formula sau validarea respectivă se schimbă, ceea ce suita veche nu observa.
  p = await fresh(b, 'ro-RO', () => { if (!sessionStorage.z) { sessionStorage.z = 1;
    localStorage.setItem('gradina-de-stele-v1', JSON.stringify({ light: 0, lifeLight: 0, owned: [0, 10, 0, 0, 0, 0], ups: {}, dust: 0, boostUntil: 0, lang: 'xx', buyMode: 'abc', sound: true, last: Date.now() - 24 * 3600e3 })); } });
  await p.waitForTimeout(300);
  ok(Math.abs(await p.evaluate(() => S.light) - 288000) < 3000, 'mutație: câștigul offline e plafonat la 8h');
  ok(await p.evaluate(() => S.lang === 'en' && S.buyMode === 1), 'mutație: salvare cu limbă / mod de cumpărare invalid se corectează');
  ok(await p.evaluate(() => { S.last = 0; save(); return JSON.parse(localStorage.getItem(SAVE_KEY)).last > Date.now() - 5000; }), 'mutație: save() actualizează ora ultimei sesiuni');
  ok(await p.evaluate(() => { S.owned[0] = 1; return starCost(0) === Math.ceil(STAR_TYPES[0].cost * 1.15); }), 'mutație: costul stelei crește cu 15%, rotunjit în sus');
  ok(await p.evaluate(() => { S.ach = {}; S.ups = {}; S.boostUntil = 0; S.dust = 0; const r0 = ratePerSec(); S.dust = 5; return Math.abs(ratePerSec() / r0 - 1.5) < 1e-9; }), 'mutație: fiecare praf de stele +10%');
  ok(await p.evaluate(() => { S.dust = 0; const r0 = ratePerSec(); S.ups = { global0: true }; return Math.abs(ratePerSec() / r0 - 1.5) < 1e-9; }), 'mutație: îmbunătățirea globală x1.5');
  ok(await p.evaluate(() => { S.ups = { tap2: true }; S.boostUntil = 0; return Math.abs(tapValue() - (2 + ratePerSec() * 0.05)) < 1e-9; }), 'mutație: atingerea adaugă 5% din producție');
  ok(p.errs.length === 0, 'mutație: fără erori în consolă ' + p.errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
