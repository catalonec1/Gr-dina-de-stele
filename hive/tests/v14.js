// Teste Hive Bloom v1.4 (tema Glob de zăpadă + Noutăți o singură dată + migrare): node hive/tests/v14.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'hive-bloom-v1';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errs = [];
  const page = async (locale, save) => {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale })).newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    // salvarea veche se scrie o singură dată, apoi reîncărcare (un init script s-ar putea re-rula la reload)
    await p.goto(URL);
    if (save) { await p.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(save)]); await p.reload(); } await p.waitForTimeout(1000); return p;
  };
  const toastText = p => p.evaluate(() => document.getElementById('toast').style.opacity === '1' ? document.getElementById('toast').textContent : '');
  // 1. salvare v1.3 cu temele Iarnă și Stele căzătoare
  const old = { lang: 'ro', sound: false, music: true, best: 18400, coins: 2700, owned: [0, 6, 8], skin: 8, daily: { 20261120: 900 }, tut: true, runs: 14, top: 8, seen: '1.3' };
  const p = await page('ro-RO', old);
  ok(await p.evaluate(() => VERSION === '1.4' && SKINS.length === 10 && SKINS[9].globe && SKINS[9].price === 2600), 'v1.4: 10 teme, Glob de zăpadă la 2600 🍯');
  ok(await p.evaluate(() => S.best === 18400 && S.coins === 2700 && S.skin === 8 && S.owned.join() === '0,6,8' && S.runs === 14 && S.sound === false), 'migrare: salvarea v1.3 se păstrează');
  ok((await toastText(p)).includes('Glob de zăpadă'), 'Noutăți v1.4 apar pentru jucătorul vechi');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('hive-bloom-v1')).seen === '1.4'), 'Noutăți: versiunea văzută se salvează');
  await p.reload(); await p.waitForTimeout(1000);
  ok(!(await toastText(p)).includes('Glob'), 'Noutăți nu apar a doua oară');
  await p.click('#bShop'); await p.waitForTimeout(150);
  ok(await p.$$eval('.sk', e => e.length) === 10, 'magazinul arată 10 teme');
  ok(await p.$eval('.sk[data-i="9"] b', e => e.textContent === 'Glob de zăpadă'), 'numele temei în RO');
  await p.click('.sk[data-i="9"] button');
  ok(await p.evaluate(() => S.skin === 9 && S.owned.includes(9) && S.coins === 100), 'cumpărare Glob de zăpadă (2600 🍯)');
  ok(await p.evaluate(() => { startRun(false); for (let i = 0; i < 5; i++) draw(1000 + i * 800); return true; }), 'desenarea temei Glob de zăpadă fără erori');
  await p.reload(); await p.waitForTimeout(400);
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => S.skin === 9 && S.owned.includes(9)), 'tema cumpărată se păstrează după reîncărcare');
  // 2. fără miere suficientă: blocată
  const q = await page('en-US', Object.assign({}, old, { coins: 2599, lang: 'en' }));
  await q.click('#bShop'); await q.waitForTimeout(150);
  ok(await q.$eval('.sk[data-i="9"] button', e => e.disabled), 'tema e blocată sub 2600 🍯');
  ok(await q.$eval('.sk[data-i="9"] b', e => e.textContent === 'Snow globe'), 'numele temei în EN');
  // 3. jucător nou: fără Noutăți
  const n = await page('ru-RU');
  ok(!(await toastText(n)).includes('2600'), 'jucător nou: fără mesaj Noutăți');
  // 4. RU
  const r = await page('ru-RU', Object.assign({}, old, { lang: 'ru' }));
  ok((await toastText(r)).includes('Снежный шар'), 'Noutăți afișate în RU');
  ok(await r.evaluate(() => ['en', 'ro', 'ru'].every(l => T[l].skins.length === SKINS.length && T[l].whatsNew.includes('{v}') && T[l].whatsNew.includes('2600'))), 'texte RO/EN/RU complete');
  ok(errs.length === 0, 'fără erori JS ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
