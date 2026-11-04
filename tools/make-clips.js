// Generează clipuri verticale (1080x1920) de gameplay pentru TikTok / YouTube Shorts / Reels.
// Folosire: node tools/make-clips.js <folder-ieșire> [ro,en,ru]
// Necesită: playwright (chromium) și ffmpeg în PATH.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const OUT = path.resolve(process.argv[2] || 'clips');
const LANGS = (process.argv[3] || 'ro,en,ru').split(',');
const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SITE = 'https://catalonec1.github.io/Gr-dina-de-stele/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const HOOKS = {
  fresh:         { ro: 'Am plantat o singură stea…', en: 'I planted just one star…', ru: 'Я посадил всего одну звезду…' },
  constellation: { ro: 'Momentul în care constelația se închide ✦', en: 'When the constellation finally connects ✦', ru: 'Момент, когда созвездие замыкается ✦' },
  comet:         { ro: 'Prinde cometa dacă poți ☄', en: 'Catch the comet if you can ☄', ru: 'Поймай комету, если сможешь ☄' },
  rebirth:       { ro: 'Am resetat tot pentru praf cosmic', en: 'I reset everything for stardust', ru: 'Я сбросил всё ради звёздной пыли' },
  garden:        { ro: 'Cum arată grădina după o săptămână', en: 'My star garden after one week', ru: 'Мой звёздный сад через неделю' },
};
const CAPTION = {
  ro: { cta: 'Joacă gratuit în browser, link în bio', tags: '#joc #jocuri #idlegame #relaxare #stele #indiegame #gaming' },
  en: { cta: 'Play free in your browser, link in bio', tags: '#idlegame #indiegame #satisfying #relaxing #browsergame #gaming #stars' },
  ru: { cta: 'Играй бесплатно в браузере, ссылка в профиле', tags: '#игры #idle #инди #расслабление #звезды #gaming' },
};

// Fiecare scenă: pregătește starea, apoi joacă ~15 secunde.
const SCENES = {
  async fresh(p) {
    for (let i = 0; i < 18; i++) { await tap(p); await sleep(140); }
    await p.evaluate(() => { S.light = Math.max(S.light, 15); renderList(); });
    await buy(p, 2); await sleep(600);
    for (let i = 0; i < 25; i++) { await tap(p); await sleep(110); }
    await p.evaluate(() => { S.light += 400; renderList(); });
    for (let i = 0; i < 4; i++) { await buy(p, 2); await sleep(350); }
    await buy(p, 3); await sleep(500);
    for (let i = 0; i < 20; i++) { await tap(p); await sleep(120); }
  },
  async constellation(p) {
    await p.evaluate(() => { S.owned = [9, 9, 9, 4, 0, 0]; S.light = 5e5; S.lifeLight = 6e5; renderList(); renderHud(); });
    await sleep(1500);
    for (const r of [2, 3, 4]) { await buy(p, r); await sleep(1800); }
    for (let i = 0; i < 6; i++) { await buy(p, 5); await sleep(450); }
    for (let i = 0; i < 15; i++) { await tap(p); await sleep(150); }
  },
  async comet(p) {
    await p.evaluate(() => { S.owned = [25, 18, 10, 4, 0, 0]; S.light = 8e4; renderList(); renderHud(); });
    for (let i = 0; i < 10; i++) { await tap(p); await sleep(150); }
    await p.evaluate(() => { nextComet = 0; });
    await sleep(200);
    await p.evaluate(() => { if (comet) { comet.vx = Math.sign(comet.vx) * 1.6; comet.vy = 0.35; } });
    let caught = false;
    for (let t = 0; t < 60 && !caught; t++) {
      await sleep(100);
      const c = await p.evaluate(() => comet && comet.x > innerWidth * 0.35 && comet.x < innerWidth * 0.65 ? { x: comet.x, y: comet.y } : null);
      if (c) { await sleep(400); const c2 = await p.evaluate(() => comet && { x: comet.x, y: comet.y }); if (c2) await p.mouse.click(c2.x, c2.y); caught = true; }
    }
    await sleep(2500);
    for (let i = 0; i < 12; i++) { await tap(p); await sleep(140); }
  },
  async rebirth(p) {
    await p.evaluate(() => { S.owned = [60, 45, 30, 22, 12, 5]; S.light = 3e7; S.lifeLight = 9e7; tab = 'rebirth'; renderList(); renderHud(); });
    await sleep(3500);
    await p.click('.row .buy'); await sleep(2500);
    for (let i = 0; i < 25; i++) { await tap(p); await sleep(120); }
    await p.evaluate(() => { tab = 'stars'; S.light = 200; renderList(); });
    await buy(p, 2); await sleep(400); await buy(p, 2);
    await sleep(2000);
  },
  async garden(p) {
    await p.evaluate(() => { S.owned = [40, 40, 34, 26, 15, 6]; S.dust = 6; S.light = 4.2e8; S.lifeLight = 5e8; renderList(); renderHud(); });
    await sleep(3000);
    for (let i = 0; i < 30; i++) { await tap(p); await sleep(130); }
    for (let i = 0; i < 3; i++) { await buy(p, 7); await sleep(600); }
    await sleep(3000);
  },
};

async function tap(p) { await p.mouse.click(60 + Math.random() * 420, 150 + Math.random() * 320); }
async function buy(p, row) { const b = await p.$(`.row:nth-child(${row}) .buy:not(:disabled)`); if (b) await b.click(); }

async function record(browser, scene, lang) {
  const dir = fs.mkdtempSync(path.join(OUT, '.rec-'));
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, locale: lang, recordVideo: { dir, size: { width: 540, height: 960 } } });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(GAME);
  await p.evaluate(([lang, hook]) => {
    S.lang = lang; S.sound = false; applyLang();
    const h = document.createElement('div');
    h.textContent = hook;
    h.style.cssText = 'position:fixed;left:16px;right:16px;top:118px;text-align:center;font:800 26px system-ui,sans-serif;color:#fff;' +
      'text-shadow:0 2px 12px rgba(0,0,0,.9);pointer-events:none;z-index:9';
    document.body.appendChild(h);
  }, [lang, HOOKS[scene][lang]]);
  await sleep(500);
  await SCENES[scene](p);
  const vid = p.video(); await ctx.close();
  const webm = await vid.path();
  const mp4 = path.join(OUT, `${scene}-${lang}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.6', '-i', webm, '-r', '30', '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4]);
  fs.rmSync(dir, { recursive: true, force: true });
  return mp4;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const lines = ['# Clipuri și texte de postare', '', `Link joc: ${SITE}`, ''];
  for (const scene of Object.keys(SCENES)) for (const lang of LANGS) {
    const f = await record(browser, scene, lang);
    console.log('OK', path.basename(f));
    lines.push(`## ${path.basename(f)}`, '', `${HOOKS[scene][lang]} ${CAPTION[lang].cta}`, '', CAPTION[lang].tags, '');
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'captions.md'), lines.join('\n'));
})();
