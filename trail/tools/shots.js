// Capturi și coperți: node trail/tools/shots.js → trail/launch/
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'launch'); fs.mkdirSync(OUT, { recursive: true });
const base = (o) => JSON.stringify(Object.assign({ lang: null, done: [], stars: [], hints: 5, skin: 0, music: 0, sound: 0, vibe: 0, tut: 0, daily: 0, streak: 0, gift: 0, tips: { t3: 1, hint: 1, stone: 1, end: 1, ber: 1 }, seen: '1.0' }, o));
const PROG = { done: Array(34).fill(1), stars: Array(34).fill(3).map((s, i) => i % 5 === 4 ? 2 : s), streak: 6, skin: 2 };
// merge k pași pe soluție
const walk = (lv, k) => `startLevel(${lv});for(const j of G.L.sol.slice(1,${k}))move(j);`;
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (name, vp, locale, store, code, wait = 900, clip) => {
    const ctx = await b.newContext({ viewport: vp, locale, deviceScaleFactor: 1 });
    if (store) await ctx.addInitScript(s => localStorage.setItem('nibble-trail-v1', s), store);
    const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(700);
    if (code) { await p.evaluate(c => eval(c), code); await p.waitForTimeout(wait); }
    const buf = await p.screenshot(clip ? { clip } : { path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name); return buf;
  };
  const M = { width: 405, height: 720 };
  await shot('menu-mobile-en.png', M, 'en-US', base(PROG), null, 0);
  await shot('game-first-leaves-en.png', M, 'en-US', base(PROG), walk(8, 14), 900);
  await shot('game-pebbles-ro.png', M, 'ro-RO', base(PROG), walk(24, 17), 900);
  await shot('game-cocoon-ru.png', M, 'ru-RU', base(PROG), walk(38, 22), 900);
  await shot('game-berries-en.png', M, 'en-US', base(PROG), walk(52, 20), 900);
  await shot('skins-en.png', M, 'en-US', base(Object.assign({}, PROG, { done: Array(60).fill(1), stars: Array(60).fill(3), skin: 8 })), "renderSkins();show('skins');", 500); // v1.1
  await shot('game-snowflake-en.png', M, 'en-US', base(Object.assign({}, PROG, { skin: 8 })), walk(20, 16), 900); // v1.1
  await shot('levels-en.png', M, 'en-US', base(PROG), "renderLevels();show('levels');", 500);
  await shot('game-desktop-en.png', { width: 1280, height: 720 }, 'en-US', base(PROG), walk(47, 25), 900);
  const scene = (await shot('_s', { width: 560, height: 700 }, 'en-US', base(PROG), walk(33, 24) + "document.getElementById('hud').classList.remove('on');document.getElementById('tools').classList.remove('on');", 900, { x: 0, y: 0, width: 560, height: 700 })).toString('base64');
  const cover = async (name, w, h, icon) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const k = Math.min(w / 1280, h / 720);
    const html = icon
      ? `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(circle at 50% 40%,#5f9c4a,#24452c 75%);display:flex;align-items:center;justify-content:center;font-size:${w * .6}px">🐛</body>`
      : `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#24452c url(data:image/png;base64,${scene}) right 3% center/auto 92% no-repeat;font-family:'Trebuchet MS',sans-serif;position:relative">
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(20,44,26,.96) 30%,rgba(20,44,26,.1) 75%)"></div>
        <div style="position:absolute;left:${w * .05}px;top:${h * .2}px;line-height:.92;font-weight:900;font-size:${130 * k}px;color:#f7fbef;text-shadow:0 ${8 * k}px 0 #3d6b2a,0 0 ${40 * k}px rgba(168,224,108,.5)">Nibble<br><span style="color:#ffd166;text-shadow:0 ${8 * k}px 0 #a86f12,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.6)">Trail</span></div>
        <div style="position:absolute;left:${w * .055}px;top:${h * .2 + 260 * k}px;font-size:${34 * k}px;color:#fff;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.8)">cozy one-stroke puzzle <br>60 gardens · daily puzzle</div></body>`;
    await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  await cover('cover-630x500.png', 630, 500); await cover('cover-1280x720.png', 1280, 720); await cover('icon-512.png', 512, 512, true);
  await b.close();
})();
