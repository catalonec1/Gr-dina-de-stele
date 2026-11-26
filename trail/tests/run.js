// Teste automate Nibble Trail: node trail/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', vp = { width: 390, height: 844 }, store) {
  const ctx = await b.newContext({ viewport: vp, locale }); const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  if (store) await ctx.addInitScript(s => localStorage.setItem('nibble-trail-v1', s), JSON.stringify(store));
  await p.goto(URL); await p.waitForTimeout(400); return p;
}
const ev = (p, f, a) => p.evaluate(f, a);
const center = (p, c) => ev(p, c => ({ x: BX + (c % G.L.w + 0.5) * CS, y: BY + (((c / G.L.w) | 0) + 0.5) * CS }), c);
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  // 1. meniu + limbă
  let p = await fresh(b);
  ok(await p.isVisible('#menu') && (await p.textContent('#bPlay')) === 'Joacă', 'meniul principal apare în română (după limba browserului)');
  await p.click('#bLang'); const l2 = await p.textContent('#bPlay');
  await p.click('#bLang'); const l3 = await p.textContent('#bPlay');
  ok([l2, l3].includes('Play') && [l2, l3].includes('Играть'), 'butonul de limbă trece prin EN și RU');
  while ((await p.textContent('#bPlay')) !== 'Joacă') await p.click('#bLang');
  // 2. nivelurile: 60, fiecare cu soluție validă
  const lv = await ev(p, () => {
    const bad = [];
    LEVELS.forEach((L, i) => {
      const s = L.sol, seen = new Set(s);
      if (s.length !== L.n || seen.size !== L.n || s.some(c => L.hole[c])) bad.push(i + ':len');
      for (let k = 1; k < s.length; k++) if (!adj(L, s[k - 1], s[k])) { bad.push(i + ':adj'); break; }
      if (L.end >= 0 && s[s.length - 1] !== L.end) bad.push(i + ':end');
      const ord = s.filter(c => L.bi[c] >= 0).map(c => L.bi[c]); if (ord.some((v, k) => v !== k)) bad.push(i + ':ber');
      if (s[0] !== L.start) bad.push(i + ':start');
    });
    return { n: LEVELS.length, bad, holes: LEVELS.slice(15).some(L => L.hole.some(x => x)), ends: LEVELS.slice(30, 45).every(L => L.end >= 0), ber: LEVELS.slice(45).every(L => L.ber.length >= 3) };
  });
  ok(lv.n === 60 && lv.bad.length === 0, '60 de grădini, fiecare cu un drum-soluție valid ' + lv.bad.join(','));
  ok(lv.holes && lv.ends && lv.ber, 'lumile 2-4 au pietre, cocon la final și fructe numerotate');
  ok(await ev(p, () => LEVELS[59].n > LEVELS[0].n * 3), 'dificultatea crește (grădina 60 mult mai mare decât grădina 1)');
  ok(await ev(p, () => { const a = dailyLevel(20261126), b2 = dailyLevel(20261126), c = dailyLevel(20261127); return a.sol.join() === b2.sol.join() && a.sol.join() !== c.sol.join() && a.sol.length === a.n; }), 'Grădina zilei e deterministă pe zi și diferită de la o zi la alta');
  // 3. tutorial cu acțiuni reale (tragere cu mouse-ul)
  await p.click('#bPlay'); await p.waitForTimeout(300);
  ok(await ev(p, () => LI === 0 && mode === 'game') && await p.isVisible('#tip'), 'Joacă pornește grădina 1 cu tutorial');
  ok(await p.isVisible('#hand'), 'mâna arată spre următoarea frunză');
  const sol = await ev(p, () => G.L.sol.slice());
  const c0 = await center(p, sol[0]); await p.mouse.move(c0.x, c0.y); await p.mouse.down();
  for (let k = 1; k <= 3; k++) { const c = await center(p, sol[k]); await p.mouse.move(c.x, c.y, { steps: 3 }); }
  await p.mouse.up();
  ok(await ev(p, () => G.path.length === 4), 'tragerea reală pe 3 frunze mută omida 3 pași');
  const c1 = await center(p, sol[1]); await p.mouse.click(c1.x, c1.y);
  ok(await ev(p, () => G.path.length === 2 && G.back === 2), 'clic pe corp = întoarcere (pași înapoi numărați)');
  const keys = await ev(p, () => { const s = G.L.sol, w = G.L.w, out = []; for (let k = G.path.length; k < s.length; k++) { const d = s[k] - s[k - 1]; out.push(d === 1 ? 'ArrowRight' : d === -1 ? 'ArrowLeft' : d === w ? 'ArrowDown' : 'ArrowUp'); } return out; });
  for (const k of keys) await p.keyboard.press(k);
  await p.waitForTimeout(1700);
  ok(await ev(p, () => G.done && S.done[0] === 1 && S.stars[0] >= 1), 'grădina 1 terminată cu săgețile → salvată cu stele');
  ok(await p.isVisible('#win') && (await p.textContent('#wTitle')).includes('fluture'), 'ecranul de victorie apare');
  ok(await ev(p, () => S.hints === 6), 'prima terminare dă +1 indiciu');
  await p.click('#wNext'); await p.waitForTimeout(300);
  ok(await ev(p, () => LI === 1 && !G.done), '„Următoarea” deschide grădina 2');
  // 4. reguli
  ok(await ev(p, () => { const L = LEVELS[15]; const st = L.hole.findIndex(x => x); const on = new Uint8Array(L.w * L.h); return !legal(L, on, st, 1, 0); }), 'pe piatră nu se poate merge');
  ok(await ev(p, () => { const L = LEVELS[30]; const on = new Uint8Array(L.w * L.h); return !legal(L, on, L.end, 3, 0) && legal(L, on, L.end, L.n - 1, 0); }), 'coconul se mănâncă doar ultimul');
  ok(await ev(p, () => { const L = LEVELS[45]; const on = new Uint8Array(L.w * L.h); return !legal(L, on, L.ber[1], 3, 0) && legal(L, on, L.ber[0], 3, 0); }), 'fructele se mănâncă în ordine');
  ok(await ev(p, () => { startLevel(20); for (let k = 1; k < 6; k++) move(G.L.sol[k]); const on = G.on; return on[G.path[1]] === 1 && !legal(G.L, on, G.path[1], G.path.length, G.eat); }), 'nu poți trece peste propriul drum');
  ok(await ev(p, () => { startLevel(25); const h0 = S.hints; hint(); return S.hints === h0 - 1 && G.hints === 1 && G.path.length > 1; }), 'indiciul consumă unul și avansează pe drum bun');
  ok(await ev(p, () => { let r = true; for (const i of [40, 55, 59]) { startLevel(i); S.hints = 9; for (let k = 0; k < 4; k++) hint(); r = r && (G.done || !!solve(G.L, G.path, 60000)); } return r; }), 'după indicii, drumul rămâne rezolvabil (grădini grele)');
  ok(await ev(p, () => { S.hints = 0; startLevel(26); hint(); return S.hints === 0 && G.hints === 0; }), 'fără indicii nu se consumă nimic');
  ok(await ev(p, () => starsFor({ n: 20 }, 0, 0) === 3 && starsFor({ n: 20 }, 0, 1) === 2 && starsFor({ n: 20 }, 100, 0) === 1), 'stele: 3 fără greșeli, max 2 cu indiciu, 1 cu multe întoarceri');
  // 5. Grădina zilei: serie
  ok(await ev(p, () => { startLevel(-1); for (const j of G.L.sol.slice(1)) move(j); return G.done && S.daily === dayKey() && S.streak >= 1; }), 'Grădina zilei terminată → serie salvată');
  await p.waitForTimeout(1600);
  // 6. ecrane
  await ev(p, () => { show('menu'); texts(); }); await p.waitForTimeout(200);
  await p.click('#bLevels'); await p.waitForTimeout(200);
  ok((await p.$$('#worlds .lv')).length === 60, 'ecranul Niveluri arată 60 de grădini');
  ok(await ev(p, () => document.querySelectorAll('#worlds .lv.lock').length > 0), 'grădinile neîncepute sunt blocate');
  await p.click('#levels [data-back]'); await p.click('#bSkins'); await p.waitForTimeout(200);
  ok((await p.$$('#skList .sk')).length >= 6, 'ecranul cu omizi are cel puțin 6 modele');
  await p.click('#skins [data-back]'); await p.click('#bSettings'); await p.waitForTimeout(200);
  const m0 = await ev(p, () => S.music); await p.click('#sMusic');
  ok(await ev(p, m0 => S.music !== m0 && JSON.parse(localStorage.getItem('nibble-trail-v1')).music === S.music, m0), 'setarea muzicii se salvează');
  ok(p.errs.length === 0, 'zero erori JS în sesiunea principală ' + p.errs.join(' | '));
  // 7. persistență după reîncărcare
  await p.reload(); await p.waitForTimeout(500);
  ok(await ev(p, () => S.done[0] === 1 && S.lang === 'ro'), 'progresul și limba rămân după reîncărcare');
  await p.context().close();
  // 8. engleză desktop + rusă telefon mic
  p = await fresh(b, 'en-US', { width: 1280, height: 720 });
  ok((await p.textContent('#bPlay')) === 'Play', 'engleză pe desktop');
  await p.click('#bPlay'); await p.waitForTimeout(300);
  ok(await ev(p, () => CS * G.L.w <= innerWidth && BY >= 0 && BY + CS * G.L.h <= innerHeight), 'tabla încape în ecranul desktop');
  ok(p.errs.length === 0, 'zero erori JS (EN desktop)'); await p.context().close();
  p = await fresh(b, 'ru-RU', { width: 360, height: 640 });
  ok((await p.textContent('#bPlay')) === 'Играть', 'rusă pe telefon mic');
  await p.click('#bPlay'); await p.waitForTimeout(300);
  ok(await ev(p, () => { startLevel(59); return BX >= 0 && BX + CS * G.L.w <= innerWidth && CS >= 30; }), 'cea mai mare grădină încape pe 360 px');
  ok(p.errs.length === 0, 'zero erori JS (RU mobil)'); await p.context().close();
  await b.close();
  console.log(fails ? `\n${fails} teste au picat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
