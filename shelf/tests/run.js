// Teste automate Spice Shelf: node shelf/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SK = 'spice-shelf-v1';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function fresh(b, locale = 'ro-RO', vp = { width: 390, height: 844 }, store) {
  const ctx = await b.newContext({ viewport: vp, locale }); const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  if (store) await ctx.addInitScript(([k, s]) => localStorage.setItem(k, s), [SK, JSON.stringify(store)]);
  await p.goto(URL); await p.waitForTimeout(400); return p;
}
const ev = (p, f, a) => p.evaluate(f, a);
const tap = async (p, i) => { const c = await ev(p, i => shelfCenter(i), i); await p.mouse.click(c.x, c.y); await p.waitForTimeout(60); };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  // 1. meniu + limbă
  let p = await fresh(b);
  ok(await p.isVisible('#menu') && (await p.textContent('#bPlay')) === 'Joacă', 'meniul principal apare în română (după limba browserului)');
  ok(await ev(p, () => VERSION === '1.0'), 'VERSION = 1.0');
  await p.click('#bLang'); const l2 = await p.textContent('#bPlay');
  await p.click('#bLang'); const l3 = await p.textContent('#bPlay');
  ok([l2, l3].includes('Play') && [l2, l3].includes('Играть'), 'butonul de limbă trece prin EN și RU');
  while ((await p.textContent('#bPlay')) !== 'Joacă') await p.click('#bLang');
  ok(await ev(p, () => LANGS.every(l => Object.keys(TX.en).every(k => TX[l][k] !== undefined) && TX[l].sp.length === 10 && TX[l].stn.length === 6 && TX[l].w.length === 4)), 'toate textele există în RO / EN / RU');
  // 2. nivelurile: 60, toate verificate de rezolvitor
  const lv = await ev(p, () => {
    const bad = [];
    LEVELS.forEach((L, i) => {
      if (!check(L, L.sol) || L.par !== L.sol.length) bad.push(i + ':sol');
      const again = solve({ sh: L.sh, caps: L.caps, kinds: L.kinds, counts: L.counts, open: L.open }, 250000, 3);
      if (!again || !check(L, again)) bad.push(i + ':resolve');
      const jars = L.sh.flat(); for (let c = 0; c < L.n; c++) if (jars.filter(x => x === c).length !== 4) bad.push(i + ':count');
      if (solved(L.sh, L.counts)) bad.push(i + ':trivial');
    });
    return { n: LEVELS.length, bad };
  });
  ok(lv.n === 60 && lv.bad.length === 0, '60 de niveluri, fiecare rezolvat de rezolvitor și soluția verificată mutare cu mutare ' + lv.bad.join(','));
  ok(await ev(p, () => LEVELS.slice(0, 15).every(L => !L.lids && !L.tiny && !L.drawer) && LEVELS.slice(15, 30).every(L => L.lids) && LEVELS.slice(30, 45).every(L => L.tiny && L.caps.includes(1)) && LEVELS.slice(45).every(L => L.drawer && L.kinds.includes(2) && !L.open)), 'fiecare bucătărie aduce o noutate: capace, poliță mică, sertar încuiat');
  ok(await ev(p, () => LEVELS[59].n > LEVELS[0].n * 3 - 1 && LEVELS[59].par > LEVELS[0].par * 3), 'dificultatea crește (nivelul 60 mult mai mare decât nivelul 1)');
  ok(await ev(p, () => { const a = dailyLevel(20261126), b2 = dailyLevel(20261126), c = dailyLevel(20261127); return JSON.stringify(a.sh) === JSON.stringify(b2.sh) && JSON.stringify(a.sh) !== JSON.stringify(c.sh) && check(a, a.sol) && check(c, c.sol); }), 'Cămara zilei e deterministă pe zi, diferită de la o zi la alta și rezolvabilă');
  ok(await ev(p, () => SPICES.length === 10 && new Set(SPICES.map(s => s.c)).size === 10), '10 condimente, fiecare cu culoare și simbol propriu');
  // 3. nivelul 1 cu atingeri reale + tutorial
  await p.click('#bPlay'); await p.waitForTimeout(300);
  ok(await ev(p, () => LI === 0 && mode === 'game') && await p.isVisible('#tip') && await p.isVisible('#hand'), 'Joacă pornește nivelul 1 cu tutorial și mâna care arată raftul');
  const sol = await ev(p, () => G.L.sol);
  await tap(p, sol[0][0]);
  ok(await ev(p, i => G.sel === i && G.step === 1, sol[0][0]), 'atingerea unui raft ridică borcanul din față (tutorial pasul 2)');
  await tap(p, sol[0][0]);
  ok(await ev(p, () => G.sel === -1 && G.moves === 0), 'a doua atingere pe același raft îl lasă jos');
  const badT = await ev(p, () => { for (let a = 0; a < G.sh.length; a++) for (let b2 = 0; b2 < G.sh.length; b2++) if (a !== b2 && G.sh[a].length && G.sh[b2].length && !canMove(G.sh, G.caps, G.kinds, G.open, a, b2)) return [a, b2]; return null; });
  await tap(p, badT[0]); await tap(p, badT[1]);
  ok(await ev(p, () => G.moves === 0 && G.sel === -1 && G.shake.i >= 0), 'mutare greșită (alt condiment) e refuzată cu tremur');
  for (const [a, c] of sol) { await tap(p, a); await tap(p, c); }
  await p.waitForTimeout(1900);
  ok(await ev(p, n => G.done && G.moves === n && S.done[0] === 1 && S.stars[0] === 3, sol.length), 'nivelul 1 rezolvat cu atingeri reale → salvat cu 3 stele');
  ok(await p.isVisible('#win') && (await p.textContent('#wTitle')).includes('locul'), 'ecranul de victorie apare');
  ok(await ev(p, () => S.hints === 4 && S.tips.t3 === 1), 'prima terminare dă +1 raft de rezervă și închide tutorialul');
  await p.click('#wNext'); await p.waitForTimeout(300);
  ok(await ev(p, () => LI === 1 && !G.done && mode === 'game'), '„Următorul” deschide nivelul 2');
  // 4. înapoi (undo)
  const s0 = await ev(p, () => JSON.stringify(G.sh)); const m1 = await ev(p, () => G.L.sol[0]);
  await tap(p, m1[0]); await tap(p, m1[1]);
  ok(await ev(p, s0 => G.moves === 1 && JSON.stringify(G.sh) !== s0, s0), 'o mutare reală schimbă rafturile');
  await p.click('#bUndo'); await p.waitForTimeout(100);
  ok(await ev(p, s0 => JSON.stringify(G.sh) === s0 && G.undos === 1 && G.moves === 1, s0), 'butonul ↶ readuce rafturile exact cum erau (mutările rămân numărate)');
  await p.keyboard.press(String(m1[0] + 1)); await p.keyboard.press(String(m1[1] + 1));
  ok(await ev(p, () => G.moves === 2 && G.hist.length === 1), 'tastele 1–9 mută borcanele');
  await p.keyboard.press('z');
  ok(await ev(p, s0 => JSON.stringify(G.sh) === s0, s0), 'tasta Z anulează');
  await ev(p, () => { KB.on = false; }); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter');
  ok(await ev(p, () => KB.on && G.sel === KB.i), 'săgeți + Enter aleg un raft');
  // 5. raftul de rezervă
  const ex = await ev(p, () => { const h0 = S.hints, n0 = G.sh.length; const r = extraShelf(); return r && S.hints === h0 - 1 && G.sh.length === n0 + 1 && G.caps[n0] === 4 && !G.sh[n0].length; });
  ok(ex, 'raftul de rezervă adaugă un raft gol și consumă unul');
  ok(await ev(p, () => !extraShelf() && G.sh.length === G.L.sh.length + 1), 'un singur raft de rezervă pe nivel');
  ok(await ev(p, () => { for (const [a, c] of G.L.sol) { tapShelf(a); tapShelf(c); } return G.done && S.stars[1] === 2; }), 'cu raft de rezervă ai maxim 2 stele');
  ok(await ev(p, () => { startLevel(3); S.hints = 0; return !extraShelf() && G.sh.length === G.L.sh.length; }), 'fără rafturi de rezervă nu se adaugă nimic');
  ok(await ev(p, () => starsFor(10, 10, 0) === 3 && starsFor(10, 14, 0) === 2 && starsFor(10, 20, 0) === 1 && starsFor(10, 8, 1) === 2), 'stele după mutări: 3 ≤ record, 2 ≤ 1,5×, 1 peste');
  // 6. noutățile din bucătării
  ok(await ev(p, () => { startLevel(20); const hid = G.hid.flat().filter(x => x).length; const i = G.L.sol[0][0], k = G.sh[i].length - 2; const was = G.hid[i][k]; tapShelf(G.L.sol[0][0]); tapShelf(G.L.sol[0][1]); return hid > 0 && G.hid.every((h, j) => !G.sh[j].length || !h[G.sh[j].length - 1]) && was && !G.hid[i][k]; }), 'capacele ascund borcanele din spate și se ridică când borcanul ajunge în față');
  ok(await ev(p, () => { startLevel(35); const t = G.kinds.indexOf(1); const a = G.sh.findIndex(s => s.length); return G.caps[t] === 1 && canMove(G.sh, G.caps, G.kinds, G.open, a, t) === 1; }), 'polița mică ține un singur borcan');
  ok(await ev(p, () => { startLevel(46); const d = G.kinds.indexOf(2); const locked = !tapShelf(d) && G.sel === -1; for (const [a, c] of G.L.sol) { tapShelf(a); tapShelf(c); if (G.open) break; } return locked && G.open && fullIdx().length >= 1 && G.sh.some((s, i) => i !== d && canMove(G.sh, G.caps, G.kinds, G.open, d, i)) !== undefined; }), 'sertarul e încuiat și se deschide după primul raft terminat');
  ok(await ev(p, () => { startLevel(50); const d = G.kinds.indexOf(2); return G.L.sol.findIndex(m => m[0] === d || m[1] === d) > G.L.sol.findIndex((m, k) => { const L = G.L, sh = L.sh.map(s => s.slice()); for (const [a, c] of L.sol.slice(0, k + 1)) { const q = canMove(sh, L.caps, L.kinds, true, a, c); sh[c].push(...sh[a].splice(sh[a].length - q)); } return anyFull(sh, L.caps); }); }), 'soluția atinge sertarul doar după ce un raft e complet');
  // 7. Cămara zilei: serie
  ok(await ev(p, () => { startLevel(-1); for (const [a, c] of G.L.sol) { tapShelf(a); tapShelf(c); } return G.done && S.daily === dayKey() && S.streak >= 1; }), 'Cămara zilei terminată → serie salvată');
  await p.waitForTimeout(1600);
  // 8. pauză și ecrane
  await ev(p, () => startLevel(2)); await p.waitForTimeout(200); await p.keyboard.press('Escape');
  ok(await p.isVisible('#pause'), 'Esc deschide pauza');
  await p.click('#pResume'); ok(await ev(p, () => cur === null && mode === 'game'), 'Continuă revine în joc');
  await p.click('#bPause'); await p.click('#pMenu'); await p.waitForTimeout(200);
  await p.click('#bLevels'); await p.waitForTimeout(200);
  ok((await p.$$('#worlds .lv')).length === 60 && (await p.$$('#worlds .world')).length === 4, 'ecranul Bucătării arată 4 bucătării × 15 niveluri');
  ok(await ev(p, () => document.querySelectorAll('#worlds .lv.lock').length > 0), 'nivelurile neîncepute sunt blocate');
  await p.click('#levels [data-back]'); await p.click('#bStyles'); await p.waitForTimeout(200);
  ok((await p.$$('#stList .st')).length === 6 && (await p.$$('#stList .st.lock')).length >= 4, 'ecranul Borcane: 6 stiluri, cele scumpe blocate după stele');
  await p.click('#styles [data-back]'); await p.click('#bSettings'); await p.waitForTimeout(200);
  const m0 = await ev(p, () => S.music); await p.click('#sMusic');
  ok(await ev(p, m0 => S.music !== m0 && JSON.parse(localStorage.getItem('spice-shelf-v1')).music === S.music, m0), 'setarea muzicii se salvează');
  await p.click('#sBig'); ok(await ev(p, () => S.big === 1), 'simbolurile mari se pot porni');
  ok(p.errs.length === 0, 'zero erori JS în sesiunea principală ' + p.errs.join(' | '));
  // 9. persistență
  await p.reload(); await p.waitForTimeout(500);
  ok(await ev(p, () => S.done[0] === 1 && S.stars[0] === 3 && S.lang === 'ro' && S.big === 1 && S.streak >= 1), 'progresul, setările și seria rămân după reîncărcare');
  await p.context().close();
  // 10. engleză desktop + rusă telefon mic
  p = await fresh(b, 'en-US', { width: 1280, height: 720 });
  ok((await p.textContent('#bPlay')) === 'Play', 'engleză pe desktop');
  await p.click('#bPlay'); await p.waitForTimeout(300);
  const inside = () => ev(p, () => R.every(r => r.cell.x >= 0 && r.cell.x + r.cell.w <= innerWidth && r.cell.y >= 60 && r.cell.y + r.cell.h <= innerHeight - 70 && r.x >= 0 && r.x + r.w <= innerWidth));
  ok(await inside(), 'rafturile încap pe desktop');
  ok(await ev(p, () => { startLevel(59); extraShelf(); return JW >= 40; }) && await inside(), 'nivelul 60 + raft de rezervă încape pe desktop cu borcane mari');
  ok(p.errs.length === 0, 'zero erori JS (EN desktop)'); await p.context().close();
  p = await fresh(b, 'ru-RU', { width: 360, height: 640 });
  ok((await p.textContent('#bPlay')) === 'Играть', 'rusă pe telefon mic');
  await p.click('#bPlay'); await p.waitForTimeout(300);
  ok(await ev(p, () => { startLevel(59); S.hints = 1; extraShelf(); return JW >= 24; }) && await inside(), 'cel mai mare nivel (13 rafturi) încape pe 360×640');
  const c = await ev(p, () => shelfCenter(0));
  await p.mouse.click(c.x, c.y); ok(await ev(p, () => G.sel === 0), 'atingere pe telefon mic selectează raftul');
  ok(p.errs.length === 0, 'zero erori JS (RU mobil)'); await p.context().close();
  await b.close();
  console.log(fails ? `\n${fails}/${n} teste au picat` : `\nToate cele ${n} teste au trecut`);
  process.exit(fails ? 1 : 0);
})();
