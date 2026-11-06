// Teste automate pentru fișele gratuite: node printabile/tests/run.js  (necesită playwright)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  const open = async (q = '', vw = { width: 390, height: 844 }, locale = 'ro-RO') => {
    const ctx = await b.newContext({ viewport: vw, locale });
    const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message));
    p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
    await p.goto(URL + q); return p;
  };

  let p = await open();
  ok(await p.evaluate(() => document.documentElement.lang) === 'ro', 'limba implicită din browser (RO)');
  ok(await p.$eval('#t-title', e => e.textContent) === 'Fișe gratuite de printat', 'titlu în română');
  ok(await p.$eval('#t-sub', e => e.textContent.length) > 60, 'descrierea paginii e afișată (nu eticheta unei opțiuni)');

  // Labirint: rezolvabil pe toate nivelurile, pe mai multe semințe
  for (const level of ['easy', 'medium', 'hard']) {
    await p.selectOption('#level', level);
    let solvable = true, perfect = true;
    for (let i = 0; i < 15; i++) {
      await p.click('#new');
      const r = await p.evaluate(() => {
        const c = window.__last.maze, h = c.length, w = c[0].length;
        let open = 0; for (const row of c) for (const k of row) open += (k.e ? 0 : 1) + (k.s ? 0 : 1);
        return { path: !!solveMaze(c), perfect: open === w * h - 1 };
      });
      solvable = solvable && r.path; perfect = perfect && r.perfect;
    }
    ok(solvable, `labirint ${level}: are drum de la start la final (15 variante)`);
    ok(perfect, `labirint ${level}: labirint perfect (un singur drum, fără zone închise)`);
  }
  ok(await p.$$eval('#out svg', s => s.length) === 2, 'labirint + soluție (soluția doar la printare)');

  // Aceeași sămânță => aceeași fișă
  const u = await p.evaluate(() => location.search);
  const svg1 = await p.$eval('#out', e => e.innerHTML);
  const p2 = await open(u);
  ok(await p2.$eval('#out', e => e.innerHTML) === svg1, 'linkul cu ?seed= reproduce aceeași fișă');

  // Cuvinte ascunse, în toate limbile și temele
  for (const lang of ['ro', 'en', 'ru']) {
    const q = await open(`?lang=${lang}&k=words`);
    let good = true;
    for (const level of ['easy', 'medium', 'hard']) for (const theme of ['space', 'animals', 'fruits']) {
      await q.selectOption('#level', level); await q.selectOption('#theme', theme);
      const r = await q.evaluate(() => {
        const { g, placed } = window.__last.ws;
        const full = g.every(row => row.every(ch => ch && ch.length === 1));
        const found = placed.every(p => [...p.w].every((ch, i) => g[p.y + p.dy * i][p.x + p.dx * i] === ch));
        return full && found && placed.length >= 8;
      });
      good = good && r;
    }
    ok(good, `cuvinte ascunse ${lang}: grila plină, minim 8 cuvinte, toate se găsesc (9 combinații)`);
    ok(q.errs.length === 0, `fără erori în consolă (${lang})`);
  }

  // Matematică: rezultate corecte, fără numere negative, în interval
  p = await open('?lang=en&k=math');
  let mathOk = true;
  for (const op of ['add', 'sub', 'mix']) for (const range of ['10', '20', '100']) {
    await p.selectOption('#op', op); await p.selectOption('#range', range);
    mathOk = mathOk && await p.evaluate(max => window.__last.math.every(x =>
      (x.o === '+' ? x.a + x.b : x.a - x.b) === x.res && x.res >= 0 && x.res <= max && x.a <= max && x.b <= max) &&
      window.__last.math.length === 24, +range);
  }
  ok(mathOk, 'matematică: 24 de exerciții corecte, în interval, fără negative (9 combinații)');

  // Schimbarea limbii
  await p.click('.langs button[data-l=ru]');
  ok(await p.$eval('#tab-maze', e => e.textContent) === 'Лабиринт', 'comutare în rusă');

  // Ceasul: ore valide, minute pe nivel, fără duplicate, mod citire/desen
  for (const lang of ['ro', 'en', 'ru']) {
    const c = await open(`?lang=${lang}&k=clock`);
    let good = true;
    const MIN = { easy: [0, 30], medium: [0, 15, 30, 45], hard: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] };
    for (const level of ['easy', 'medium', 'hard']) for (const mode of ['read', 'draw']) {
      await c.selectOption('#level', level); await c.selectOption('#mode', mode);
      for (let i = 0; i < 5; i++) {
        await c.click('#new');
        const r = await c.evaluate(() => ({ cs: window.__last.clocks, hands: document.querySelectorAll('#out > .clocks svg line[stroke-width="4"]').length, n: document.querySelectorAll('#out > .clocks figure').length }));
        const keys = new Set(r.cs.map(x => x.h + ':' + x.m));
        good = good && r.n === 9 && r.cs.length === 9 && keys.size === 9 &&
          r.cs.every(x => x.h >= 1 && x.h <= 12 && MIN[level].includes(x.m)) && r.hands === (mode === 'read' ? 9 : 0);
      }
    }
    ok(good, `ceas ${lang}: 9 ceasuri valide, minute pe nivel, fără duplicate, ace doar la citire`);
    ok(await c.$$eval('.key .clocks svg line[stroke-width="4"]', l => l.length) === 9, `ceas ${lang}: răspunsurile au acele desenate`);
    ok(c.errs.length === 0, `ceas: fără erori în consolă (${lang})`);
  }

  // Fracții: k < d, numitori pe nivel, fără duplicate, colorare doar în modul „scrie fracția”
  for (const lang of ['ro', 'en', 'ru']) {
    const f = await open(`?lang=${lang}&k=frac`);
    let good = true;
    const DEN = { easy: [2, 4, 8], medium: [3, 6], hard: [2, 3, 4, 5, 6, 8] };
    for (const level of ['easy', 'medium', 'hard']) for (const fmode of ['name', 'shade']) {
      await f.selectOption('#level', level); await f.selectOption('#fmode', fmode);
      for (let i = 0; i < 5; i++) {
        await f.click('#new');
        const r = await f.evaluate(() => {
          const figs = [...document.querySelectorAll('#out > .fracs figure')];
          return { fs: window.__last.fracs, n: figs.length,
            parts: figs.map(g => g.querySelectorAll('svg path, svg rect').length),
            shaded: figs.map(g => g.querySelectorAll('svg [fill="#c9ced8"]').length) };
        });
        const keys = new Set(r.fs.map(x => x.k + '/' + x.d + x.sh));
        good = good && r.n === 9 && keys.size === 9 &&
          r.fs.every((x, j) => x.k >= 1 && x.k < x.d && DEN[level].includes(x.d) && (x.sh !== 'grid' || x.d % 2 === 0) &&
            r.parts[j] === x.d && r.shaded[j] === (fmode === 'name' ? x.k : 0));
      }
    }
    ok(good, `fracții ${lang}: 9 fracții valide, numitori pe nivel, părți = numitor, colorare corectă pe mod`);
    ok(await f.$$eval('.key .fracs figure', g => g.every(x => /^\d+\d+$/.test(x.querySelector('figcaption').textContent))), `fracții ${lang}: răspunsurile au fracția scrisă`);
    ok(f.errs.length === 0, `fracții: fără erori în consolă (${lang})`);
  }

  // Mobil: fără scroll orizontal
  for (const k of ['maze', 'words', 'math', 'clock', 'frac']) {
    const m = await open(`?k=${k}&lang=ru`, { width: 360, height: 740 });
    if (k === 'words') await m.selectOption('#level', 'hard');
    ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `mobil 360px fără scroll orizontal (${k})`);
  }

  // Printare: interfața ascunsă, răspunsurile pe pagină separată
  await p.emulateMedia({ media: 'print' });
  ok(await p.$eval('.controls', e => getComputedStyle(e).display) === 'none', 'la printare butoanele sunt ascunse');
  ok(await p.$eval('.promo', e => getComputedStyle(e).display) === 'none', 'la printare reclama proprie e ascunsă');
  ok(await p.$eval('.key', e => getComputedStyle(e).display) === 'block', 'la printare apare foaia cu răspunsuri');

  // Linkuri către produsele proprii
  const links = await p.$$eval('.cards a', as => as.map(a => a.href));
  ok(links.length === 7 && links.every(h => h.startsWith('https://')), 'linkurile către joc, cărți și Payhip sunt https');

  await b.close();
  console.log(fails ? `\n${fails} teste au eșuat` : '\nToate testele au trecut');
  process.exit(fails ? 1 : 0);
})();
