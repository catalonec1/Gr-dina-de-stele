// Teste Lumen Links v2.4 (culorile de iarnă Ninsoare și Turtă dulce, ninsoare pe fundal, Noutăți o dată, migrare): node lumen/tests/v24.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'lumen-links-v1';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errs = [];
  const page = async (locale, save, vp = { width: 390, height: 844 }) => {
    const p = await (await b.newContext({ viewport: vp, locale })).newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    if (save) await p.addInitScript(([k, v]) => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', 1); localStorage.setItem(k, v); } }, [KEY, JSON.stringify(save)]);
    await p.goto(URL); await p.waitForTimeout(300); return p;
  };
  // 1. salvare veche v2.3: 60 de niveluri cu 3 stele = 180 ★, paleta Miez de noapte nu e deținută
  const stars = {}; for (let n = 1; n <= 60; n++) stars[n] = 3;
  const old = { lang: 'ro', sound: false, level: 61, stars, daily: {}, hints: 5, pal: 4, tut: true, rushBest: 9, streak: { n: 2, last: '' }, zen: 3, seen: '2.3', music: false, worldSeen: 2 };
  const p = await page('ro-RO', old);
  ok(await p.evaluate(() => VERSION === '2.4' && PALS.length === 15), 'v2.4: VERSION 2.4 și 15 palete');
  ok(await p.evaluate(() => PALS[13].need === 160 && PALS[13].snow && PALS[14].need === 1600 && PALS[14].snow), 'v2.4: Ninsoare (160 ★) și Turtă dulce (1600 ★) cu ninsoare');
  ok(await p.evaluate(() => S.level === 61 && totalStars() === 180 && S.pal === 4 && S.rushBest === 9 && S.zen === 3 && S.sound === false && S.hints === 5), 'migrare: progresul v2.3 se păstrează');
  await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.getElementById('toast').textContent.includes('Ninsoare') && document.getElementById('toast').textContent.includes('2.4')), 'Noutăți v2.4 apar pentru jucătorul vechi (RO)');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('lumen-links-v1')).seen === '2.4' || S.seen === '2.4'), 'Noutăți: versiunea văzută se salvează');
  ok(!(await p.$eval('#pals button[data-p="13"]', e => e.disabled)), 'Ninsoare deblocată la 180 ★');
  ok(await p.$eval('#pals button[data-p="14"]', e => e.disabled), 'Turtă dulce blocată sub 1600 ★');
  await p.click('#pals button[data-p="13"]');
  ok(await p.evaluate(() => S.pal === 13 && pal().snow), 'Ninsoare se alege');
  ok(await p.evaluate(() => { for (let i = 0; i < 4; i++) drawBg(1000 + i * 700); return true; }), 'desenarea fundalului cu ninsoare fără erori');
  await p.reload(); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => S.pal === 13 && !document.getElementById('toast').textContent.includes('Ninsoare')), 'alegerea se păstrează, Noutăți nu mai apar a doua oară');
  await p.evaluate(() => { for (let n = 1; n <= 540; n++) S.stars[n] = 3; renderMenu(); });
  await p.click('#pals button[data-p="14"]');
  ok(await p.evaluate(() => S.pal === 14 && pal().need === 1600), 'Turtă dulce se alege la 1620 ★');
  // 2. jucător nou: fără Noutăți
  const n = await page('en-US'); await n.waitForTimeout(700);
  ok(await n.evaluate(() => !document.getElementById('toast').textContent.includes('Snowfall')), 'jucător nou: fără mesaj Noutăți');
  // 3. trei limbi
  ok(await n.evaluate(() => ['en', 'ro', 'ru'].every(l => T[l].whatsNew.includes('{v}') && T[l].whatsNew.includes('160') && T[l].whatsNew.includes('1600'))), 'Noutăți în RO/EN/RU');
  const r = await page('ru-RU', Object.assign({}, old, { lang: 'ru' })); await r.waitForTimeout(700);
  ok(await r.evaluate(() => document.getElementById('toast').textContent.includes('Снегопад')), 'Noutăți afișate în RU');
  // 4. ecran mic: culorile încap
  const s = await page('en-US', old, { width: 360, height: 640 });
  ok(await s.evaluate(() => document.querySelector('#pals button:last-child').getBoundingClientRect().bottom <= document.getElementById('menu').scrollHeight), '360x640: rândul de culori se randează');
  ok(errs.length === 0, 'fără erori JS ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
