// Teste Glowcap Grove v1.1 (două lumini de iarnă + mesaj Noutăți): node grove/tests/v11.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ro-RO' })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(URL); await p.waitForTimeout(200);
  ok(await p.evaluate(() => VERSION === '1.1' && SKINS.length === 10 && SKINS[8].need === 170 && SKINS[9].need === 180), 'v1.1: 10 lumini, Brumă (★170) și Lumina stelelor (★180)');
  ok(await p.evaluate(() => SKINS.every(s => ['ro', 'en', 'ru'].every(l => s.name[l])) && ['ro', 'en', 'ru'].every(l => TX[l].news.includes('1.1'))), 'v1.1: nume și Noutăți în RO/EN/RU');
  ok(await p.evaluate(() => SKINS.every(s => s.need <= 180)), 'v1.1: toate luminile se pot debloca (maxim 180 de stele)');
  ok(await p.evaluate(() => document.getElementById('news').textContent.includes('1.1')), 'v1.1: mesajul Noutăți apare în meniu');
  await p.evaluate(() => { S.stars = Array(60).fill(3); S.done = Array.from({ length: 60 }, (_, i) => i); save(); });
  ok(await p.evaluate(() => totalStars() === 180), 'v1.1: 180 de stele simulate');
  await p.evaluate(() => show('skins'));
  await p.waitForTimeout(200);
  const n = await p.evaluate(() => { renderSkins(); return document.querySelectorAll('#skList .sk').length; });
  ok(n === 10, 'v1.1: ecranul Lumini arată 10 lumini (' + n + ')');
  await p.click('#skList .sk[data-sk="9"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => S.skin === 9 && sk().need === 180), 'v1.1: Lumina stelelor se poate folosi');
  ok(errs.length === 0, 'v1.1: fără erori în consolă ' + errs.join('|'));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
