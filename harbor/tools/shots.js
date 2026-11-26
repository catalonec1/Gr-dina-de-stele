// Capturi și coperți: node harbor/tools/shots.js → harbor/launch/
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'launch'); fs.mkdirSync(OUT, { recursive: true });
const SK = 'lantern-harbor-v1';
const base = (o) => JSON.stringify(Object.assign({ v: '1.0', glow: 0, run: 0, life: 0, own: [0, 0, 0, 0, 0, 0, 0, 0], ups: [0, 0, 0, 0, 0, 0, 0, 0], lens: 0, taps: 0, ships: 0, pearls: 0, voyages: 0, ach: [], time: 0, festT: 0, music: 0, sound: 0, fx: 1, tut: 1, step: 3, last: Date.now(), started: 1, seed: 7 }, o));
const MID = { glow: 48250, run: 3.2e5, life: 3.2e5, own: [42, 23, 11, 4, 0, 0, 0, 0], ups: [2, 1, 0, 0, 0, 0, 0, 0], lens: 2, taps: 640, ships: 4, ach: [0, 1, 5, 11, 14] };
const LATE = { glow: 3.4e9, run: 9e9, life: 2.1e10, own: [120, 96, 80, 64, 40, 25, 12, 5], ups: [5, 4, 4, 3, 2, 1, 1, 0], lens: 5, taps: 4200, ships: 22, pearls: 41, voyages: 3, ach: [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15] };
const only = process.argv[2];
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (name, vp, locale, store, code, wait = 900, clip) => {
    if (only && !name.includes(only) && !clip) return;
    const ctx = await b.newContext({ viewport: vp, locale, deviceScaleFactor: 1 });
    if (store) await ctx.addInitScript(([k, s]) => localStorage.setItem(k, s), [SK, store]);
    const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(600);
    if (code) { await p.evaluate(c => eval(c), code); await p.waitForTimeout(wait); }
    const buf = await p.screenshot(clip ? { clip } : { path: path.join(OUT, name) }); await ctx.close(); if (!clip) console.log('OK', name); return buf;
  };
  const M = { width: 405, height: 720 };
  await shot('menu-mobile-en.png', M, 'en-US', null, null, 0);
  await shot('game-hightide-en.png', M, 'en-US', base(MID), "play();S.time=10;for(let i=0;i<6;i++)tapHouse(100+i*14,150);", 300);
  await shot('game-ship-ro.png', M, 'ro-RO', base(Object.assign({}, MID, { time: 50, own: [42, 23, 11, 8, 3, 0, 0, 0] })), "play();spawnShip();ship.t=5;tab='up';renderList();", 500);
  await shot('game-starfall-ru.png', M, 'ru-RU', base(Object.assign({}, LATE, { time: 90 })), "play();S.festT=20;", 1500);
  await shot('new-harbor-en.png', M, 'en-US', base(Object.assign({}, LATE, { time: 130 })), "play();tab='pre';renderList();", 800);
  await shot('game-desktop-en.png', { width: 1280, height: 720 }, 'en-US', base(Object.assign({}, LATE, { time: 20 })), "play();spawnShip();ship.t=4;for(let i=0;i<5;i++)tapHouse(240+i*20,300);", 400);
  await shot('game-desktop-ro.png', { width: 1280, height: 720 }, 'ro-RO', base(Object.assign({}, MID, { time: 125, own: [42, 23, 11, 8, 3, 2, 0, 0] })), "play();tab='ach';renderList();", 600);
  if (only) { await b.close(); return; }
  const scene = (await shot('_s', { width: 1300, height: 700 }, 'en-US', base(Object.assign({}, LATE, { time: 15 })), "play();spawnShip();ship.dir=-1;ship.t=3.2;document.getElementById('hud').style.display='none';", 900, { x: 0, y: 0, width: 900, height: 700 })).toString('base64');
  const cover = async (name, w, h, icon) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const k = Math.min(w / 1280, h / 720);
    const html = icon
      ? `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:url(data:image/png;base64,${scene}) 28% 30%/260% auto"><div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 40%,rgba(3,6,20,.55))"></div></body>`
      : `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:url(data:image/png;base64,${scene}) center/cover;font-family:'Trebuchet MS',sans-serif;position:relative">
        <div style="position:absolute;inset:0;background:linear-gradient(270deg,rgba(5,8,26,.78),rgba(5,8,26,.0) 62%)"></div>
        <div style="position:absolute;right:${w * .05}px;top:${h * .2}px;text-align:right;line-height:.92;font-weight:900;font-size:${120 * k}px;color:#fff4dc;text-shadow:0 ${7 * k}px 0 #b4621c,0 0 ${44 * k}px rgba(255,190,90,.7)">Lantern<br><span style="color:#6fe3d6;text-shadow:0 ${7 * k}px 0 #1c6a72,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.6)">Harbor</span></div>
        <div style="position:absolute;right:${w * .055}px;top:${h * .2 + 250 * k}px;font-size:${34 * k}px;color:#ffc86b;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.9)">cozy idle · night harbor</div></body>`;
    await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  await cover('cover-630x500.png', 630, 500); await cover('cover-1280x720.png', 1280, 720); await cover('icon-512.png', 512, 512, true);
  await b.close();
})();
