// Teste Glowcap Grove v1.2 (decorul Poiana înzăpezită + Noutăți o singură dată + migrare): node grove/tests/v12.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'glowcap-grove-v1';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errs = [];
  const page = async (locale, save) => {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale })).newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    if (save) await p.addInitScript(([k, v]) => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', 1); localStorage.setItem(k, v); } }, [KEY, JSON.stringify(save)]);
    await p.goto(URL); await p.waitForTimeout(250); return p;
  };
  // 1. salvare veche v1.1 (fără câmpul scene), 20 de poieni cu 3 stele = 60 ★
  const old = { lang: 'ro', done: Array(20).fill(1), stars: Array(20).fill(3), best: Array(20).fill(9), hints: 7, skin: 8, sound: 1, vibe: 0, daily: 20261120, streak: 4, gift: 20261120, tips: { tap: 1, hint: 1, stone: 1 }, seen: '1.1' };
  const p = await page('ro-RO', old);
  ok(await p.evaluate(() => VERSION === '1.2'), 'v1.2: VERSION = 1.2');
  ok(await p.evaluate(() => totalStars() === 60 && S.hints >= 7 && S.skin === 8 && S.streak === 4 && S.vibe === 0 && S.done.length === 20), 'migrare: progresul v1.1 (stele, indicii, lumină, serie, setări) se păstrează');
  ok(await p.evaluate(() => S.scene === 0 && !snowy()), 'migrare: decorul implicit rămâne Pădure');
  ok(await p.evaluate(() => document.getElementById('news').textContent.includes('1.2') && document.getElementById('news').textContent.includes('înzăpezită')), 'Noutăți v1.2 apar în meniu pentru jucătorul vechi');
  await p.click('#bPlay'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('glowcap-grove-v1')).seen === '1.2'), 'Noutăți: versiunea văzută se salvează');
  await p.reload(); await p.waitForTimeout(250);
  ok(await p.evaluate(() => document.getElementById('news').textContent === ''), 'Noutăți apar o singură dată (nu și după reîncărcare)');
  // 2. decorul nou în Setări
  await p.evaluate(() => { toMenu(); show('settings'); texts(); });
  ok(await p.evaluate(() => document.getElementById('sScene').textContent.includes('Pădure')), 'Setări: rândul Decor arată „Pădure”');
  await p.click('#sScene');
  ok(await p.evaluate(() => S.scene === 1 && snowy() && document.getElementById('sScene').textContent.includes('înzăpezită')), 'Setări: Poiana înzăpezită se alege la ★ 60');
  ok(await p.evaluate(() => { startLevel(16); for (let i = 0; i < 5; i++) draw(1000 + i * 400); return mode === 'game'; }), 'desenarea Poienii înzăpezite (cu pietre) fără erori');
  await p.reload(); await p.waitForTimeout(250);
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => S.scene === 1 && snowy()), 'alegerea decorului se păstrează după reîncărcare');
  // 3. jucător nou: decorul e blocat până la ★ 30, apoi toast la deblocare
  const n = await page('en-US');
  await n.evaluate(() => { show('settings'); texts(); });
  ok(await n.evaluate(() => document.getElementById('sScene').textContent.includes('🔒') && document.getElementById('sScene').textContent.includes('30')), 'jucător nou: decorul arată lacăt ★ 30');
  await n.click('#sScene');
  ok(await n.evaluate(() => S.scene === 0 && !snowy()), 'jucător nou: decorul blocat nu se poate alege');
  ok(await n.evaluate(() => { S.scene = 1; return !snowy(); }), 'decorul nu se activează fără stele nici dacă e forțat în salvare');
  await n.evaluate(() => { S.scene = 0; for (let i = 0; i < 9; i++) { S.done[i] = 1; S.stars[i] = 3; } FAST = true; startLevel(9); G.moves = 0; G.m.set(G.L.sol); G.an = analyze(G.L, G.m); win(); });
  await n.waitForTimeout(1100);
  ok(await n.evaluate(() => totalStars() >= 30 && document.getElementById('toast').textContent.includes('Snowy Glade')), 'toast „New scenery unlocked” când treci de ★ 30');
  // 4. trei limbi
  ok(await n.evaluate(() => ['ro', 'en', 'ru'].every(l => TX[l].news.includes('1.2') && TX[l].scene && TX[l].scenes.length === 2 && TX[l].sceneNew)), 'texte noi în RO/EN/RU');
  for (const [loc, word] of [['ru-RU', 'Декор'], ['en-US', 'Scenery'], ['ro-RO', 'Decor']]) {
    const q = await page(loc); await q.evaluate(() => { show('settings'); texts(); });
    ok(await q.evaluate(w => document.querySelector('#settings').textContent.includes(w), word), 'Setări în ' + loc + ': „' + word + '”');
  }
  ok(errs.length === 0, 'fără erori JS ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
