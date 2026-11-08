// Capturi și coperți pentru portaluri: node putt/tools/shots.js → putt/launch/
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'launch'); fs.mkdirSync(OUT, { recursive: true });
const ALL = 'S.tips={aim:1,wall:1,bump:1,sand:1,water:1,slope:1,portal:1,move:1,boost:1};for(let i=0;i<30;i++){S.done[i]=1;S.stars[i]=i<22?3:2;}S.done[27]=0;S.stars[27]=0;S.done[28]=0;S.stars[28]=0;S.done[29]=0;S.stars[29]=0;';
const aim = (lv, skin, ang, pow) => ALL + `S.skin=${skin};startLevel(${lv});G.aim={ang:${ang},pow:${pow}};G.idle=0;window.__keepAim=G.aim;setInterval(()=>{G.aim=__keepAim},16);`;
const roll = (lv, skin, ang, pow, t) => ALL + `S.skin=${skin};startLevel(${lv});shoot(${ang},${pow});setTimeout(()=>{mode='frozen'},${t});`;
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (name, vp, locale, code, wait = 900) => {
    const ctx = await b.newContext({ viewport: vp, locale, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(2200);
    if (code) { await p.evaluate(c => eval(c), code); await p.waitForTimeout(wait); }
    await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  const M = { width: 405, height: 720 };
  await shot('menu-mobile-en.png', M, 'en-US', ALL + 'save();menuInfo();');
  await shot('game-meadow-en.png', M, 'en-US', aim(9, 0, -0.35, 0.72));
  await shot('game-dunes-en.png', M, 'en-US', roll(13, 3, -1.1, 0.95, 700), 1200);
  await shot('game-moon-ru.png', M, 'ru-RU', roll(29, 4, -1.62, 0.9, 520), 1000);
  await shot('win-mobile-ro.png', M, 'ro-RO', ALL + 'startLevel(3);G.strokes=1;finish(false);', 1600);
  await shot('levels-mobile-en.png', M, 'en-US', ALL + "save();show('levels');");
  await shot('game-desktop-en.png', { width: 1280, height: 720 }, 'en-US', roll(25, 6, -1.7, 0.8, 600), 1000);
  // coperți: 3 trasee (câte unul din fiecare lume) înclinate + titlu
  const course = async (lv, skin, ang, pow, t) => {
    const ctx = await b.newContext({ viewport: { width: 400, height: 640 }, locale: 'en-US' }); const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(300);
    await p.evaluate(c => eval(c), roll(lv, skin, ang, pow, t) + "document.querySelectorAll('.screen,#hud,#tip,#skip').forEach(e=>e.style.display='none');G.tipH=0;");
    await p.evaluate(() => { SC = 3.9; OX = 5; OY = 8; floorCache = null; });
    await p.waitForTimeout(t + 400); const buf = await p.screenshot({ clip: { x: 0, y: 0, width: 400, height: 640 } }); await ctx.close(); return buf.toString('base64');
  };
  const imgs = [await course(9, 0, -0.35, 0.8, 650), await course(16, 3, -1.25, 0.85, 700), await course(29, 4, -1.62, 0.9, 520)];
  const cover = async (name, w, h, icon) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
    const k = Math.min(w / 1280, h / 720) * (icon ? 1.9 : 1);
    const card = (i, x, y, r) => `<img src="data:image/png;base64,${imgs[i]}" style="position:absolute;left:${x}px;top:${y}px;width:${400 * k}px;border-radius:${18 * k}px;transform:rotate(${r}deg);box-shadow:0 ${20 * k}px ${50 * k}px rgba(0,0,0,.55)">`;
    const html = icon
      ? `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:repeating-linear-gradient(60deg,#5fbf5a 0 ${w*0.07}px,#56b352 ${w*0.07}px ${w*0.14}px);position:relative">
        <div style="position:absolute;inset:${w*0.045}px;border:${w*0.03}px solid #dda46a;border-radius:${w*0.12}px;box-shadow:inset 0 ${w*0.02}px ${w*0.04}px rgba(0,0,0,.35)"></div>
        <div style="position:absolute;left:${w*0.38}px;top:${h*0.5}px;width:${w*0.3}px;height:${w*0.3}px;border-radius:50%;background:#10200f;box-shadow:0 0 0 ${w*0.035}px rgba(255,255,255,.3),inset 0 ${w*0.03}px ${w*0.03}px #000"></div>
        <div style="position:absolute;left:${w*0.525}px;top:${h*0.12}px;width:${w*0.025}px;height:${h*0.53}px;background:#f4f1e8;border-radius:4px"></div>
        <div style="position:absolute;left:${w*0.55}px;top:${h*0.12}px;width:0;height:0;border-top:${h*0.08}px solid transparent;border-bottom:${h*0.08}px solid transparent;border-left:${w*0.26}px solid #ff5a5a"></div>
        <div style="position:absolute;left:${w*0.16}px;top:${h*0.56}px;width:${w*0.24}px;height:${w*0.24}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#e6e9e2 55%,#a9b0a4);box-shadow:${w*0.02}px ${w*0.035}px ${w*0.03}px rgba(0,0,0,.4)"></div></body>`
      : `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(ellipse at 30% 40%,#3f8f4f,#0f2a18 75%);font-family:'Trebuchet MS',sans-serif">
        ${card(2, w * 0.86 - 200 * k, h * 0.06, 10)}${card(1, w * 0.7 - 200 * k, h * 0.1, -1)}${card(0, w * 0.585 - 200 * k, h * 0.16, -11)}
        <div style="position:absolute;left:${w * 0.05}px;top:${h * 0.24}px;line-height:.92;font-weight:900;font-size:${150 * k}px;color:#fffbe6;text-shadow:0 ${8 * k}px 0 #2d6b33,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.6)">Pebble<br><span style="color:#ffd75e;text-shadow:0 ${8 * k}px 0 #8c5a00,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.6)">Putt</span></div>
        <div style="position:absolute;left:${w * 0.055}px;top:${h * 0.24 + 290 * k}px;font-size:${34 * k}px;color:#e8f5df;font-weight:700;text-shadow:0 2px 8px rgba(0,0,0,.7)">30 cozy minigolf puzzles</div></body>`;
    await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  await cover('cover-630x500.png', 630, 500);
  await cover('cover-1280x720.png', 1280, 720);
  await cover('icon-512.png', 512, 512, true);
  await b.close();
})();
