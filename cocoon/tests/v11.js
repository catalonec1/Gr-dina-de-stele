// Teste Cocoon Garden v1.1 (4 trofee noi, Noutăți o singură dată, migrare salvare v1.0): node cocoon/tests/v11.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
// salvare reală de v1.0 (fără câmpul „seen”), jucător avansat care îndeplinește deja 2 trofee noi
const OLD = { lang: 'ro', leaves: 5e7, run: 9e7, life: 3e9, own: [100, 80, 60, 40, 20, 10, 5, 1], ups: [4, 4, 3, 3, 2, 1, 1, 0], clickUps: 4, clicks: 2500, flies: 57, dust: 12, migs: 5, ach: [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14], time: 300, rushT: 0, music: 0, sound: 1, fx: 1, tut: 1, step: 3, last: Date.now(), started: 1 };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errs = [];
  const page = async (locale, init) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    if (init) { await p.goto('file://' + __filename); await p.evaluate(([k, s]) => localStorage.setItem(k, s), ['cocoon-garden-v1', JSON.stringify(init)]); } // salvare veche scrisă înainte de pornirea jocului
    await p.goto(URL); await p.waitForTimeout(400); return p;
  };
  const ev = (p, f, a) => p.evaluate(f, a);
  // 1. date noi
  let p = await page('ro-RO');
  ok(await ev(p, () => VERSION === '1.1' && ACHS.length === 20 && ACH_E.length === 20), 'v1.1: 20 de trofee, fiecare cu emoji');
  ok(await ev(p, () => ['ro', 'en', 'ru'].every(l => TX[l].achs.length === 20 && TX[l].achs.every(Boolean) && TX[l].news.includes('1.1'))), 'v1.1: nume trofee și Noutăți în RO/EN/RU');
  ok(await ev(p, () => document.getElementById('news').textContent.includes('trofee')), 'instalare nouă: Noutăți apare în meniu');
  // condițiile trofeelor noi
  ok(await ev(p, () => { S.ach = []; S.flies = 49; checkAch(); const a = S.ach.includes(16); S.flies = 50; checkAch(); return !a && S.ach.includes(16); }), 'trofeul 50 de fluturi');
  ok(await ev(p, () => { S.migs = 5; checkAch(); return S.ach.includes(17); }), 'trofeul 5 migrații');
  ok(await ev(p, () => { S.ups = [5, 5, 5, 5, 5, 5, 5, 4]; checkAch(); const a = S.ach.includes(18); S.ups[7] = 5; checkAch(); return !a && S.ach.includes(18); }), 'trofeul toate îmbunătățirile (abia la ultima)');
  ok(await ev(p, () => { S.life = 9.9e14; checkAch(); const a = S.ach.includes(19); S.life = 1e15; checkAch(); return !a && S.ach.includes(19); }), 'trofeul un cvadrilion');
  ok(await ev(p, () => { S.ach = [...Array(20).keys()]; S.dust = 0; S.rushT = 0; S.own = [1, 0, 0, 0, 0, 0, 0, 0]; S.ups = [0, 0, 0, 0, 0, 0, 0, 0]; S.time = SEASON_LEN; return Math.abs(globalMult() - 1.4) < 1e-9; }), 'cele 20 de trofee dau +40% producție');
  await p.context().close();
  // 2. migrare salvare v1.0
  p = await page('ro-RO', OLD);
  ok(await ev(p, () => S.own[7] === 1 && S.dust === 12 && S.migs === 5 && S.leaves >= 5e7 && S.music === 0 && S.started === 1), 'migrare v1.0: creaturi, praf, frunze și setări rămân');
  ok(await ev(p, () => S.ach.includes(16) && S.ach.includes(17) && !S.ach.includes(18) && !S.ach.includes(19) && S.ach.length === 15), 'migrare v1.0: trofeele noi deja meritate (50 fluturi, 5 migrații) se acordă');
  ok(await ev(p, () => document.getElementById('news').textContent.includes('1.1') && document.getElementById('bPlay').textContent === 'Continuă'), 'migrare v1.0: meniul arată Continuă și Noutăți');
  await p.click('#bPlay'); await p.waitForTimeout(200);
  ok(await ev(p, () => S.seen === '1.1'), 'Continuă marchează Noutăți ca văzute');
  await p.click('#tabs [data-tab="ach"]'); await p.waitForTimeout(100);
  ok((await p.$$('.ach div')).length === 20 && (await p.$$('.ach div.got')).length === 15, 'fila Trofee: 20 de trofee, 15 obținute');
  // migrația (prestigiu) păstrează „seen”
  await ev(p, () => { S.run = 4e6; migrate(); });
  ok(await ev(p, () => S.seen === '1.1' && S.migs === 6 && S.ach.includes(17)), 'migrația păstrează Noutăți văzute și trofeele');
  await ev(p, () => { save(); }); await p.reload(); await p.waitForTimeout(400);
  ok(await ev(p, () => document.getElementById('news').textContent === '' && S.migs === 6), 'după reîncărcare Noutăți nu mai apare');
  await p.context().close();
  // 3. EN / RU
  for (const [loc, word] of [['en-US', 'trophies'], ['ru-RU', 'трофея']]) {
    p = await page(loc);
    ok(await ev(p, w => document.getElementById('news').textContent.includes(w), word), 'Noutăți în ' + loc);
    await p.context().close();
  }
  ok(errs.length === 0, 'fără erori JS ' + errs.join(' | '));
  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
