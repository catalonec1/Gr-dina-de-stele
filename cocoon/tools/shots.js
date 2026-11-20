// Capturi și coperți: node cocoon/tools/shots.js → cocoon/launch/
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'launch'); fs.mkdirSync(OUT, { recursive: true });
const base = (o) => JSON.stringify(Object.assign({ leaves: 0, run: 0, life: 0, own: [0, 0, 0, 0, 0, 0, 0, 0], ups: [0, 0, 0, 0, 0, 0, 0, 0], clickUps: 0, clicks: 0, flies: 0, dust: 0, migs: 0, ach: [], time: 0, rushT: 0, music: 0, sound: 0, fx: 1, tut: 1, step: 3, last: Date.now(), started: 1 }, o));
const MID = { leaves: 48250, run: 3.2e5, life: 3.2e5, own: [42, 23, 11, 4, 0, 0, 0, 0], ups: [2, 1, 0, 0, 0, 0, 0, 0], clickUps: 2, clicks: 640, flies: 4, ach: [0, 1, 5, 11, 14] };
const LATE = { leaves: 3.4e9, run: 9e9, life: 2.1e10, own: [120, 96, 80, 64, 40, 25, 12, 5], ups: [5, 4, 4, 3, 2, 1, 1, 0], clickUps: 5, clicks: 4200, flies: 22, dust: 41, migs: 3, ach: [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15] };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (name, vp, locale, store, code, wait = 900, clip) => {
    const ctx = await b.newContext({ viewport: vp, locale, deviceScaleFactor: 1 });
    if (store) await ctx.addInitScript(s => localStorage.setItem('cocoon-garden-v1', s), store);
    const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(600);
    if (code) { await p.evaluate(c => eval(c), code); await p.waitForTimeout(wait); }
    const buf = await p.screenshot(clip ? { clip } : { path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name); return buf;
  };
  const M = { width: 405, height: 720 };
  await shot('menu-mobile-en.png', M, 'en-US', null, null, 0);
  await shot('game-spring-en.png', M, 'en-US', base(MID), "play();S.time=10;for(let i=0;i<6;i++)tapTree(150+i*20,140);", 300);
  await shot('game-autumn-butterfly-ro.png', M, 'ro-RO', base(Object.assign({}, MID, { time: 100 })), "play();spawnFly();fly.t=5;tab='up';renderList();", 500);
  await shot('game-winter-ru.png', M, 'ru-RU', base(Object.assign({}, LATE, { time: 140 })), "play();S.rushT=20;", 900);
  await shot('migration-en.png', M, 'en-US', base(Object.assign({}, LATE, { time: 50 })), "play();tab='mig';renderList();", 500);
  await shot('game-desktop-en.png', { width: 1280, height: 720 }, 'en-US', base(Object.assign({}, LATE, { time: 20 })), "play();spawnFly();fly.t=4;for(let i=0;i<5;i++)tapTree(400+i*30,300);", 400);
  const scene = (await shot('_s', { width: 1300, height: 700 }, 'en-US', base(Object.assign({}, LATE, { time: 100 })), "play();spawnFly();fly.dir=-1;fly.y0=0.3;fly.t=2;document.getElementById('hud').style.display='none';", 600, { x: 0, y: 0, width: 900, height: 700 })).toString('base64');
  const cover = async (name, w, h, icon) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const k = Math.min(w / 1280, h / 720);
    const html = icon
      ? `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(circle at 50% 40%,#fbe3a8,#e98f3c 75%);display:flex;align-items:center;justify-content:center;font-size:${w * .6}px">🦋</body>`
      : `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:url(data:image/png;base64,${scene}) center/cover;font-family:'Trebuchet MS',sans-serif;position:relative">
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(30,20,8,.65),rgba(30,20,8,.05) 60%)"></div>
        <div style="position:absolute;left:${w * .05}px;top:${h * .2}px;line-height:.92;font-weight:900;font-size:${120 * k}px;color:#fff7e0;text-shadow:0 ${8 * k}px 0 #a8551d,0 0 ${40 * k}px rgba(255,209,102,.6)">Cocoon<br><span style="color:#ffd166;text-shadow:0 ${8 * k}px 0 #8c5a00,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.6)">Garden</span></div>
        <div style="position:absolute;left:${w * .055}px;top:${h * .2 + 240 * k}px;font-size:${34 * k}px;color:#fff;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.8)">cozy idle · incremental</div></body>`;
    await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  await cover('cover-630x500.png', 630, 500); await cover('cover-1280x720.png', 1280, 720); await cover('icon-512.png', 512, 512, true);
  await b.close();
})();
