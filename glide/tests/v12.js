// Teste Otter Glide v1.2 (fulare Acadea + Mentă înghețată, Noutăți, migrare salvare v1.1): node glide/tests/v12.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
// salvare reală de v1.1: 39 de iazuri, 117★, fularul Ie nu încă, Noutăți v1.1 văzute
const OLD = { lang: 'ro', done: Array(39).fill(1), stars: Array(39).fill(3), best: [], hints: 3, skin: 5, sound: 0, vibe: 1, daily: 0, streak: 4, gift: 0, tips: { swipe: 1, hint: 1, fish: 1, snow: 1, crack: 1 }, seen: '1.1' };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errs = [];
  const page = async (locale, init) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    if (init) { await p.goto('file://' + __filename); await p.evaluate(([k, s]) => localStorage.setItem(k, s), ['otter-glide-v1', JSON.stringify(init)]); }
    await p.goto(URL); await p.waitForTimeout(400); return p;
  };
  const ev = (p, f, a) => p.evaluate(f, a);
  let p = await page('ro-RO');
  ok(await ev(p, () => VERSION === '1.2' && SKINS.length === 10 && SKINS[8].need === 120 && SKINS[9].need === 170), 'v1.2: 10 fulare, Acadea (120★) și Mentă înghețată (170★)');
  ok(await ev(p, () => SKINS.every(s => s.need <= 180 && ['ro', 'en', 'ru'].every(l => s.name[l])) && ['ro', 'en', 'ru'].every(l => TX[l].news.includes('1.2'))), 'v1.2: nume și Noutăți în RO/EN/RU, toate se pot debloca');
  ok(await ev(p, () => document.getElementById('news').textContent.includes('Acadea')), 'instalare nouă: Noutăți apare în meniu');
  await p.context().close();
  // migrare v1.1
  p = await page('ro-RO', OLD);
  ok(await ev(p, () => S.skin === 5 && totalStars() === 117 && S.streak === 4 && S.sound === 0), 'migrare v1.1: fularul, stelele, seria și setările rămân');
  ok(await ev(p, () => document.getElementById('news').textContent.includes('1.2')), 'migrare v1.1: Noutăți v1.2 apare');
  await p.click('#bSkins'); await p.waitForTimeout(150);
  ok(await p.$$eval('.sk', e => e.length) === 10, 'ecranul Fulare arată 10 fulare');
  await p.click('.sk[data-sk="8"]'); ok(await ev(p, () => S.skin === 5), 'Acadea e blocată la 117★');
  // iazul 40 rezolvat cu soluția verificată → 120★
  await ev(p, () => { show(null); FAST = true; startLevel(39); G.L.sol.forEach(d => doMove(d)); FAST = false; });
  await p.waitForTimeout(1500);
  ok(await ev(p, () => S.done[39] === 1 && totalStars() >= 119), 'iazul 40 se termină cu soluția verificată (' + await ev(p, () => totalStars()) + '★)');
  await ev(p, () => { S.stars[39] = 3; toMenu(); }); await p.click('#bSkins'); await p.click('.sk[data-sk="8"]');
  ok(await ev(p, () => S.skin === 8), 'cu 120★ se alege Acadea');
  await p.click('.sk[data-sk="9"]'); ok(await ev(p, () => S.skin === 8), 'Mentă înghețată e blocată sub 170★');
  await ev(p, () => { S.stars = Array(60).fill(3); S.done = Array(60).fill(1); renderSkins(); }); await p.click('.sk[data-sk="9"]');
  ok(await ev(p, () => S.skin === 9), 'cu 180★ se alege Mentă înghețată');
  await ev(p, () => toMenu()); await p.click('#bPlay'); await p.waitForTimeout(300);
  ok(await ev(p, () => S.seen === '1.2' && mode === 'game'), 'Joacă marchează Noutăți ca văzute; jocul desenează vidra cu fularul nou');
  await p.reload(); await p.waitForTimeout(400);
  ok(await ev(p, () => document.getElementById('news').textContent === '' && S.skin === 9), 'după reîncărcare Noutăți nu mai apare, fularul rămâne');
  await p.context().close();
  for (const [loc, word] of [['en-US', 'Candy Cane'], ['ru-RU', 'Леденец']]) {
    p = await page(loc);
    ok(await ev(p, w => document.getElementById('news').textContent.includes(w), word), 'Noutăți în ' + loc + ': ' + word);
    await p.context().close();
  }
  ok(errs.length === 0, 'fără erori JS ' + errs.join(' | '));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
