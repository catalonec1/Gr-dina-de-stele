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
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
