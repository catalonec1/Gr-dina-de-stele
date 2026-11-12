// Capturi și coperți: node glide/tools/shots.js → glide/launch/
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'launch'); fs.mkdirSync(OUT, { recursive: true });
const ALL = 'S.tips={swipe:1,hint:1,fish:1,snow:1,crack:1};S.seen=VERSION;for(let i=0;i<60;i++){S.done[i]=i<38?1:0;S.stars[i]=i<38?(i%6?3:2):0;}S.hints=6;S.streak=3;S.skin=1;';
const play = (lv, k, skin = 1) => ALL + `S.skin=${skin};FAST=true;startLevel(${lv});G.L.sol.slice(0,${k}).forEach(d=>doMove(d));FAST=false;parts=[];`;
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (name, vp, locale, code, wait = 700, clip) => {
    const ctx = await b.newContext({ viewport: vp, locale, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(1500);
    if (code) { await p.evaluate(c => eval(c), code); await p.waitForTimeout(wait); }
    const buf = await p.screenshot(clip ? { clip } : { path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name); return buf;
  };
  const M = { width: 405, height: 720 };
  await shot('menu-mobile-en.png', M, 'en-US', ALL + 'save();menuInfo();', 1500);
  await shot('game-first-ice-en.png', M, 'en-US', play(9, 2, 0));
  await shot('game-fish-en.png', M, 'en-US', play(24, 3, 1));
  await shot('game-thin-ice-ru.png', M, 'ru-RU', play(50, 4, 2) + 'hint();');
  await shot('win-mobile-ro.png', M, 'ro-RO', play(33, 99, 3), 1600);
  await shot('levels-mobile-en.png', M, 'en-US', ALL + "save();renderLevels();show('levels');");
  await shot('game-desktop-en.png', { width: 1280, height: 720 }, 'en-US', play(40, 3, 4));
  const board = (await shot('_b', { width: 420, height: 560 }, 'en-US', play(28, 3, 0) + "document.querySelectorAll('#hud,#tools,#tip').forEach(e=>e.style.display='none');", 900, { x: 0, y: 0, width: 420, height: 560 })).toString('base64');
  const cover = async (name, w, h, icon) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const k = Math.min(w / 1280, h / 720);
    const html = icon
      ? `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:linear-gradient(#bfe6f5,#7fc3e0);display:flex;align-items:center;justify-content:center;font-size:${w * .62}px">🦦</body>`
      : `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(ellipse at 30% 40%,#2d6a92,#0d2235 75%);font-family:'Trebuchet MS',sans-serif;position:relative">
        <img src="data:image/png;base64,${board}" style="position:absolute;right:${w * .06}px;top:${h * .06}px;height:${h * .95}px;transform:rotate(6deg);border-radius:${20 * k}px;filter:drop-shadow(0 ${16 * k}px ${30 * k}px rgba(0,0,0,.5))">
        <div style="position:absolute;left:${w * .06}px;top:${h * .2}px;line-height:.92;font-weight:900;font-size:${150 * k}px;color:#f4fbff;text-shadow:0 ${8 * k}px 0 #3a7ea6,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.6)">Otter<br><span style="color:#ffcf6a;text-shadow:0 ${8 * k}px 0 #8c5200,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.6)">Glide</span></div>
        <div style="position:absolute;left:${w * .065}px;top:${h * .2 + 290 * k}px;font-size:${34 * k}px;color:#e2f3fb;font-weight:700;text-shadow:0 2px 8px rgba(0,0,0,.7)">60 cozy ice-sliding puzzles</div></body>`;
    await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  await cover('cover-630x500.png', 630, 500); await cover('cover-1280x720.png', 1280, 720); await cover('icon-512.png', 512, 512, true);
  await b.close();
})();
