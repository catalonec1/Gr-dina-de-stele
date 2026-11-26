// Teste Nibble Trail v1.1 (omizi de iarnă Fulg de nea + Ghirlandă, Noutăți, migrare salvare v1.0): node trail/tests/v11.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
// salvare reală de v1.0: 36 de grădini, 108★, omida Mentă nu încă, Noutăți v1.0 văzute
const OLD = { lang: 'ro', done: Array(36).fill(1), stars: Array(36).fill(3), hints: 6, skin: 4, music: 0, sound: 1, vibe: 1, tut: 0, daily: 0, streak: 2, gift: 0, tips: { t3: 1, hint: 1, stone: 1, end: 1, ber: 1 }, seen: '1.0' };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errs = [];
  const page = async (locale, init) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    if (init) { await p.goto('file://' + __filename); await p.evaluate(([k, s]) => localStorage.setItem(k, s), ['nibble-trail-v1', JSON.stringify(init)]); } // salvare veche scrisă înainte de pornirea jocului
    await p.goto(URL); await p.waitForTimeout(400); return p;
  };
  const ev = (p, f, a) => p.evaluate(f, a);
  // 1. date noi
  let p = await page('ro-RO');
  ok(await ev(p, () => VERSION === '1.1' && SKINS.length === 10 && SKINS[8].need === 110 && SKINS[9].need === 170), 'v1.1: 10 omizi, Fulg de nea (110★) și Ghirlandă (170★)');
  ok(await ev(p, () => SKINS.every(s => s.c && s.c2 && s.h && ['ro', 'en', 'ru'].every(l => s.name[l])) && ['ro', 'en', 'ru'].every(l => TX[l].news.includes('1.1'))), 'v1.1: culori, nume și Noutăți în RO/EN/RU');
  ok(await ev(p, () => SKINS.every(s => s.need <= 180)), 'v1.1: toate omizile se pot debloca (maxim 180★)');
  ok(await ev(p, () => document.getElementById('news').textContent.includes('Fulg de nea')), 'instalare nouă: Noutăți apare în meniu');
  await p.context().close();
  // 2. migrare salvare v1.0
  p = await page('ro-RO', OLD);
  ok(await ev(p, () => S.skin === 4 && totalStars() === 108 && S.streak === 2 && S.hints >= 6 && S.music === 0), 'migrare v1.0: omida, stelele, seria și setările rămân');
  ok(await ev(p, () => document.getElementById('news').textContent.includes('1.1')), 'migrare v1.0: Noutăți v1.1 apare');
  await p.click('#bSkins'); await p.waitForTimeout(150);
  ok((await p.$$('#skList .sk')).length === 10, 'ecranul Omizi arată 10 modele');
  await p.click('#skList .sk[data-sk="8"]'); ok(await ev(p, () => S.skin === 4), 'Fulg de nea e blocat la 108★');
  // grădina 37 rezolvată cu soluția generatorului → 111★ și anunț de omidă nouă
  await ev(p, () => { show(null); startLevel(36); for (const j of G.L.sol.slice(1)) move(j); });
  await p.waitForTimeout(1800);
  ok(await ev(p, () => S.done[36] === 1 && totalStars() === 111), 'grădina 37 se termină cu soluția verificată (111★)');
  ok((await p.textContent('#toast')).includes('Fulg de nea'), 'anunț: omidă nouă Fulg de nea');
  await ev(p, () => toMenu()); await p.click('#bSkins'); await p.click('#skList .sk[data-sk="8"]');
  ok(await ev(p, () => S.skin === 8 && sk().need === 110), 'Fulg de nea se poate folosi');
  await p.click('#skList .sk[data-sk="9"]'); ok(await ev(p, () => S.skin === 8), 'Ghirlandă e blocată sub 170★');
  await ev(p, () => { S.stars = Array(60).fill(3); S.done = Array(60).fill(1); renderSkins(); }); await p.click('#skList .sk[data-sk="9"]');
  ok(await ev(p, () => S.skin === 9), 'cu 180★ se alege Ghirlandă');
  await ev(p, () => { startLevel(10); for (const j of G.L.sol.slice(1)) move(j); }); await p.waitForTimeout(1800);
  ok(await ev(p, () => G.done), 'o grădină se termină cu omida Ghirlandă (desenare fără erori)');
  // 3. Noutăți o singură dată
  await ev(p, () => toMenu()); await p.click('#bPlay'); await p.waitForTimeout(200);
  ok(await ev(p, () => S.seen === '1.1'), 'Joacă marchează Noutăți ca văzute');
  await p.reload(); await p.waitForTimeout(400);
  ok(await ev(p, () => document.getElementById('news').textContent === '' && S.skin === 9), 'după reîncărcare Noutăți nu mai apare, omida rămâne');
  await p.context().close();
  // 4. EN / RU
  for (const [loc, word] of [['en-US', 'Snowflake'], ['ru-RU', 'Гирлянда']]) {
    p = await page(loc);
    ok(await ev(p, w => document.getElementById('news').textContent.includes(w), word), 'Noutăți în ' + loc + ': ' + word);
    await p.click('#bSkins'); await p.waitForTimeout(150);
    ok(await p.$eval('#skList .sk[data-sk="9"] b', e => e.textContent.length > 3), 'numele omizii noi în ' + loc);
    await p.context().close();
  }
  ok(errs.length === 0, 'fără erori JS ' + errs.join(' | '));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
