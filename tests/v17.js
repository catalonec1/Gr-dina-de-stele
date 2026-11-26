// Teste v1.7 („Cer senin” nr. 8 + 3 trofee de iarnă, Noutăți o singură dată, migrare v1.6): node tests/v17.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'gradina-de-stele-v1';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errs = [];
  const page = async (locale, save) => {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale })).newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    // salvarea veche se scrie o singură dată dintr-o pagină separată (același origin file://), înainte de joc;
    // un init script s-ar re-rula la reload, iar jocul salvează la pagehide, deci nu scriem din pagina jocului
    if (save) { const h = await p.context().newPage(); await h.goto('file://' + path.resolve(__dirname, '..', 'package.json')); await h.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(save)]); await h.close(); }
    await p.goto(URL); await p.waitForTimeout(300); return p;
  };
  const toastAfterNews = async p => { await p.waitForTimeout(3300); return p.evaluate(() => document.getElementById('toast').textContent); };
  // salvare v1.6 tipică (fără câmpurile noi)
  const old = { light: 1234, lifeLight: 5e6, owned: [12, 5, 1, 0, 0, 0, 0, 0, 0, 0], ups: { tap0: true, global0: true }, dust: 3, boostUntil: 0, lang: 'ro', sound: false, music: true,
    last: Date.now(), daily: { day: '2026-11-25', streak: 4 }, stats: { taps: 900, comets: 12, gold: 1, rebirths: 2, total: 5e6, time: 3600 }, ach: { taps1: true, comets1: true, gold1: true }, buyMode: 10, seen: '1.6' };
  const p = await page('ro-RO', old);
  ok(await p.evaluate(() => VERSION === '1.7' && ACHIEVEMENTS.length === 39 && new Set(ACHIEVEMENTS.map(a => a.id)).size === 39), 'v1.7: 39 de trofee unice');
  ok(await p.evaluate(() => UPGRADES.filter(u => u.kind === 'global').length === 8 && UPGRADES.some(u => u.id === 'global7' && u.cost === 5e18)), 'v1.7: al 8-lea „Cer senin” la 5e18');
  ok(await p.evaluate(() => { const a = globalMult(); S.ups.global7 = true; const c = globalMult(); delete S.ups.global7; return Math.abs(c / a - 1.5) < 1e-9; }), 'v1.7: „Cer senin” nou dă x1.5');
  ok(await p.evaluate(() => S.owned[0] === 12 && S.dust === 3 && S.ups.global0 && S.stats.taps === 900 && S.ach.gold1 && S.buyMode === 10 && S.sound === false && S.owned.length === STAR_TYPES.length), 'migrare: salvarea v1.6 se păstrează');
  ok((await toastAfterNews(p)).includes('39'), 'Noutăți v1.7 apar pentru jucătorul vechi');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('gradina-de-stele-v1')).seen === '1.7'), 'Noutăți: versiunea văzută se salvează');
  await p.reload(); await p.waitForTimeout(300);
  ok(!(await toastAfterNews(p)).includes('39'), 'Noutăți nu apar a doua oară');
  ok(await p.evaluate(() => ['total7', 'comets7', 'taps5'].every(id => !achDone(ACHIEVEMENTS.find(a => a.id === id)))), 'trofeele noi nu se dau gratis');
  ok(await p.evaluate(() => (S.stats.comets = 1000, S.stats.taps = 100000, S.stats.total = 1e19, checkAchievements(), S.ach.comets7 && S.ach.taps5 && S.ach.total7)), 'trofeele de iarnă se câștigă la prag');
  ok(await p.evaluate(() => { S.light = 6e18; tab = 'upgrades'; renderList(); tab = 'trophies'; renderList(); return document.body.textContent.includes('Viscolul de comete'); }), 'listele de îmbunătățiri și trofee se randează (RO)');
  ok(await p.evaluate(() => ['ro', 'en', 'ru'].every(k => ['total7', 'comets7', 'taps5'].every(id => T[k].an[id]) && T[k].whatsNew.includes('39') && T[k].whatsNew.includes('{v}'))), 'texte RO/EN/RU complete');
  const r = await page('ru-RU', Object.assign({}, old, { lang: 'ru' }));
  ok((await toastAfterNews(r)).includes('39 трофеев'), 'Noutăți afișate în RU');
  const n = await page('en-US');
  ok(!(await toastAfterNews(n)).includes('39'), 'jucător nou: fără mesaj Noutăți');
  ok(errs.length === 0, 'fără erori JS ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} TESTE PICATE` : '\nTOATE TESTELE AU TRECUT');
  process.exit(fails ? 1 : 0);
})();
