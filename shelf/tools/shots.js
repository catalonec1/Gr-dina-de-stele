// Capturi și coperți: node shelf/tools/shots.js → shelf/launch/
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'launch'); fs.mkdirSync(OUT, { recursive: true });
const base = (o) => JSON.stringify(Object.assign({ lang: null, done: [], stars: [], best: [], hints: 4, style: 0, music: 0, sound: 0, vibe: 0, big: 0, tut: 0, daily: 0, streak: 0, gift: 0, tips: { t3: 1, extra: 1, lids: 1, tiny: 1, drawer: 1 }, seen: '1.0' }, o));
const PROG = { done: Array(38).fill(1), stars: Array(38).fill(3).map((s, i) => i % 5 === 4 ? 2 : s), streak: 5 };
// face k mutări din soluție, apoi ridică următorul borcan
const play = (lv, k, lift = true) => `FAST=true;startLevel(${lv});for(const [a,b] of G.L.sol.slice(0,${k})){tapShelf(a);tapShelf(b);}${lift ? `tapShelf(G.L.sol[${k}][0]);` : ''}FAST=false;`;
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (name, vp, locale, store, code, wait = 900, clip) => {
    const ctx = await b.newContext({ viewport: vp, locale, deviceScaleFactor: 1 });
    if (store) await ctx.addInitScript(s => localStorage.setItem('spice-shelf-v1', s), store);
    const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(900);
    if (code) { await p.evaluate(c => eval(c), code); await p.waitForTimeout(wait); }
    const buf = await p.screenshot(clip ? { clip } : { path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name); return buf;
  };
  const M = { width: 405, height: 720 };
  await shot('menu-mobile-en.png', M, 'en-US', base(PROG), null, 0);
  await shot('game-grandma-en.png', M, 'en-US', base(Object.assign({ style: 0 }, PROG)), play(11, 9), 900);
  await shot('game-cellar-ro.png', M, 'ro-RO', base(Object.assign({ style: 3 }, PROG)), play(24, 8), 900);
  await shot('game-summer-ru.png', M, 'ru-RU', base(Object.assign({ style: 1 }, PROG)), play(37, 10), 900);
  await shot('game-winter-en.png', M, 'en-US', base(Object.assign({ style: 5 }, PROG)), play(49, 6, false), 900);
  await shot('levels-en.png', M, 'en-US', base(PROG), "renderLevels();show('levels');", 500);
  await shot('jars-ro.png', M, 'ro-RO', base(PROG), "renderStyles();show('styles');", 500);
  await shot('game-desktop-en.png', { width: 1280, height: 720 }, 'en-US', base(Object.assign({ style: 0 }, PROG)), play(43, 12), 900);
  await shot('game-desktop-ru.png', { width: 1280, height: 720 }, 'ru-RU', base(Object.assign({ style: 4 }, PROG)), play(55, 14), 2600);
  const scene = (await shot('_s', { width: 1280, height: 720 }, 'en-US', base(Object.assign({ style: 0 }, PROG)), play(9, 7) + "['hud','tools'].forEach(i=>document.getElementById(i).classList.remove('on'));", 900, { x: 0, y: 0, width: 1280, height: 720 })).toString('base64');
  const cover = async (name, w, h) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const k = Math.min(w / 1280, h / 720);
    const html = `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#3b2516 url(data:image/png;base64,${scene}) left 38% center/cover no-repeat;font-family:'Trebuchet MS',sans-serif;position:relative">
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(48,26,12,.96) 30%,rgba(48,26,12,.55) 50%,rgba(48,26,12,0) 70%)"></div>
        <div style="position:absolute;left:${w * .05}px;top:${h * .2}px;line-height:.92;font-weight:900;font-size:${140 * k}px;color:#fff3dc;text-shadow:0 ${8 * k}px 0 #b5562c,0 0 ${40 * k}px rgba(255,190,110,.35)">Spice<br><span style="color:#ffcf6e;text-shadow:0 ${8 * k}px 0 #a5611f,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.6)">Shelf</span></div>
        <div style="position:absolute;left:${w * .055}px;top:${h * .2 + 285 * k}px;font-size:${34 * k}px;color:#fff;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.8)">cozy pantry sorting puzzle<br>60 levels · daily pantry</div></body>`;
    await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  await cover('cover-630x500.png', 630, 500); await cover('cover-1280x720.png', 1280, 720);
  // iconiță: trei borcane pe un raft, desenate cu funcțiile jocului
  const ctx = await b.newContext({ viewport: { width: 512, height: 512 } }); const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(500);
  await p.evaluate(() => {
    document.querySelectorAll('.screen,#hud,#tools').forEach(e => e.style.display = 'none');
    const c = document.createElement('canvas'); c.width = c.height = 512; c.style.cssText = 'position:fixed;inset:0;z-index:99'; document.body.appendChild(c); const g = c.getContext('2d');
    const bg = g.createRadialGradient(256, 200, 30, 256, 256, 380); bg.addColorStop(0, '#f6e3c6'); bg.addColorStop(1, '#c98a4f'); g.fillStyle = bg; g.fillRect(0, 0, 512, 512);
    g.fillStyle = '#7d4a22'; rr(g, 36, 392, 440, 34, 12); g.fill(); g.fillStyle = '#d8995c'; rr(g, 30, 380, 452, 26, 10); g.fill();
    drawJar(g, 52, 384, 120, 0, 0, false, true); drawJar(g, 196, 384, 120, 2, 0, false, true); drawJar(g, 340, 384, 120, 1, 0, false, true);
  });
  await p.waitForTimeout(100); await p.screenshot({ path: path.join(OUT, 'icon-512.png') }); await ctx.close(); console.log('OK icon-512.png');
  await b.close();
})();
