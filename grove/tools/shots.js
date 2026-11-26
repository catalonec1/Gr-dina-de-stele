// Capturi și coperți: node grove/tools/shots.js → grove/launch/
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'launch'); fs.mkdirSync(OUT, { recursive: true });
const ALL = 'S.tips={tap:1,hint:1,stone:1,two:1,wrap:1};S.seen=VERSION;for(let i=0;i<60;i++){S.done[i]=i<38?1:0;S.stars[i]=i<38?(i%6?3:2):0;}S.hints=6;S.streak=3;';
// rezolvă parțial: primele k rădăcini greșite sunt puse la loc
const play = (lv, k, skin = 0) => ALL + `S.skin=${skin};FAST=true;startLevel(${lv});{const L=G.L;let n=0;for(let i=0;i<L.w*L.h&&n<${k};i++){if(!L.hole[i]&&G.m[i]!==L.sol[i]){n++;let t=0;while(G.m[i]!==L.sol[i]&&t++<4&&!G.done)turn(i);}}}FAST=false;parts=[];`;
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (name, vp, locale, code, wait = 700, clip) => {
    const ctx = await b.newContext({ viewport: vp, locale, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(1500);
    if (code) { await p.evaluate(c => eval(c), code); await p.waitForTimeout(wait); }
    const buf = await p.screenshot(clip ? { clip } : { path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name); return buf;
  };
  const M = { width: 405, height: 720 };
  await shot('menu-mobile-en.png', M, 'en-US', ALL + 'S.skin=0;save();menuInfo();', 2500);
  await shot('game-first-roots-en.png', M, 'en-US', play(12, 14, 0));
  await shot('game-stones-en.png', M, 'en-US', play(24, 22, 1));
  await shot('game-snowy-glade-en.png', M, 'en-US', 'S.scene=1;' + play(20, 18, 8)); // v1.2: Poiana înzăpezită
  await shot('game-two-networks-ru.png', M, 'ru-RU', play(38, 30, 0) + 'hint();', 900);
  await shot('win-mobile-ro.png', M, 'ro-RO', play(33, 999, 2), 2000);
  await shot('levels-mobile-en.png', M, 'en-US', ALL + "save();renderLevels();show('levels');");
  await shot('game-desktop-en.png', { width: 1280, height: 720 }, 'en-US', play(52, 20, 3));
  const board = (await shot('_b', { width: 440, height: 560 }, 'en-US', play(36, 26, 0) + "document.querySelectorAll('#hud,#tools,#tip').forEach(e=>e.style.display='none');", 900, { x: 0, y: 40, width: 440, height: 480 })).toString('base64');
  const cover = async (name, w, h, icon) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const k = Math.min(w / 1280, h / 720);
    const html = icon
      ? `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(circle at 50% 40%,#2a5a36,#0b1a10 75%);display:flex;align-items:center;justify-content:center;font-size:${w * .6}px;filter:drop-shadow(0 0 ${w * .05}px #9cff7a)">🍄</body>`
      : `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(ellipse at 30% 40%,#2a5a36,#09130c 75%);font-family:'Trebuchet MS',sans-serif;position:relative">
        <img src="data:image/png;base64,${board}" style="position:absolute;right:${w * .04}px;top:${h * .14}px;height:${h * .72}px;transform:rotate(5deg);border-radius:${20 * k}px;filter:drop-shadow(0 ${16 * k}px ${30 * k}px rgba(0,0,0,.6))">
        <div style="position:absolute;left:${w * .06}px;top:${h * .2}px;line-height:.92;font-weight:900;font-size:${100 * k}px;color:#eaffdf;text-shadow:0 ${8 * k}px 0 #3f8a2a,0 0 ${40 * k}px rgba(156,255,122,.6)">Glowcap<br><span style="color:#ffd76a;text-shadow:0 ${8 * k}px 0 #8c5a00,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.6)">Grove</span></div>
        <div style="position:absolute;left:${w * .065}px;top:${h * .2 + 205 * k}px;font-size:${30 * k}px;color:#dff5d6;font-weight:700;text-shadow:0 2px 8px rgba(0,0,0,.7)">60 cozy root-turning puzzles</div></body>`;
    await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  await cover('cover-630x500.png', 630, 500); await cover('cover-1280x720.png', 1280, 720); await cover('icon-512.png', 512, 512, true);
  await b.close();
})();
