// Teste Pebble Putt v1.3 (pietricelele de iarnă Bulgăre și Țurțure + Noutăți o singură dată + migrare): node putt/tests/v13.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'pebble-putt-v1';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errs = [];
  const page = async (locale, save) => {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale })).newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    if (save) await p.addInitScript(([k, v]) => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', 1); localStorage.setItem(k, v); } }, [KEY, JSON.stringify(save)]);
    await p.goto(URL); await p.waitForTimeout(1300); return p;
  };
  const toast = p => p.evaluate(() => document.getElementById('toast').textContent);
  // 1. salvare v1.2: 10 trasee cu 3 stele = 30 ★, pietricica Mentă
  const old = { lang: 'ro', sound: false, music: true, vibe: true, guide: false, stars: Array(10).fill(3), best: Array(10).fill(2), done: Array(10).fill(1), skin: 2, tips: { aim: 1 }, last: 9, seen: '1.2' };
  const p = await page('ro-RO', old);
  ok(await p.evaluate(() => VERSION === '1.3' && SKINS.length === 14), 'v1.3: VERSION 1.3 și 14 pietricele');
  ok(await p.evaluate(() => SKINS[12].need === 25 && SKINS[12].flake && SKINS[13].need === 60 && SKINS[13].flake), 'Bulgăre (25★) și Țurțure (60★) cu urmă de fulgi');
  ok(await p.evaluate(() => S.skin === 2 && S.done.filter(Boolean).length === 10 && S.stars.reduce((a, c) => a + c, 0) === 30 && S.guide === false && S.last === 9), 'migrare: salvarea v1.2 se păstrează');
  ok((await toast(p)).includes('Bulgăre'), 'Noutăți v1.3 apar pentru jucătorul vechi');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('pebble-putt-v1')).seen === '1.3'), 'Noutăți: versiunea văzută se salvează');
  await p.evaluate(() => show('skins')); await p.waitForTimeout(150);
  ok(!(await p.$eval('[data-sk="12"]', e => e.disabled)), 'Bulgăre deblocat la 30★');
  ok(await p.$eval('[data-sk="13"]', e => e.disabled), 'Țurțure blocat sub 60★');
  await p.click('[data-sk="12"]');
  ok(await p.evaluate(() => S.skin === 12), 'Bulgăre se alege');
  ok(await p.evaluate(() => { startLevel(3); for (let i = 0; i < 24; i++) G.trail.push([40 + i * 3, 80 + i * 2]); for (let i = 0; i < 4; i++) render(0.016); return true; }), 'desenarea urmei cu fulgi fără erori');
  await p.reload(); await p.waitForTimeout(1300);
  ok(await p.evaluate(() => S.skin === 12) && !(await toast(p)).includes('Bulgăre'), 'alegerea se păstrează, Noutăți nu apar a doua oară');
  await p.evaluate(() => { for (let i = 0; i < 20; i++) { S.done[i] = 1; S.stars[i] = 3; } save(); show('skins'); });
  await p.click('[data-sk="13"]');
  ok(await p.evaluate(() => S.skin === 13), 'Țurțure se alege la 60★');
  // 2. jucător nou
  const n = await page('en-US');
  ok(!(await n.evaluate(() => document.getElementById('toast').classList.contains('on'))), 'jucător nou: fără mesaj Noutăți');
  await n.evaluate(() => show('skins')); await n.waitForTimeout(100);
  ok(await n.$eval('[data-sk="12"]', e => e.disabled), 'jucător nou: Bulgăre blocat la 0★');
  // 3. limbi
  const r = await page('ru-RU', Object.assign({}, old, { lang: 'ru' }));
  ok((await toast(r)).includes('Снежок'), 'Noutăți afișate în RU');
  ok(await r.evaluate(() => ['en', 'ro', 'ru'].every(l => T[l].skinNames.length === SKINS.length && T[l].whatsNew.includes('1.3'))), 'nume și Noutăți în RO/EN/RU');
  const e = await page('en-US', Object.assign({}, old, { lang: 'en' }));
  ok((await toast(e)).includes('Snowball'), 'Noutăți afișate în EN');
  ok(errs.length === 0, 'fără erori JS ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
