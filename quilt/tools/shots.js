// Capturi și coperți pentru portaluri: node quilt/tools/shots.js → quilt/launch/
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'launch'); fs.mkdirSync(OUT, { recursive: true });
const ALL = 'S.tips={drag:1,hint:1,rotate:1,button:1,flip:1};S.seen=VERSION;for(let i=0;i<60;i++){S.done[i]=i<41?1:0;S.stars[i]=i<41?(i%7?3:2):0;}S.hints=7;S.streak=4;';
// așază o parte din petice; unul e „în mână” deasupra locului lui
const partial = (lv, fab, frac, dragIt = true) => ALL + `S.fab=${fab};patCache={};startLevel(${lv});
  const ps=G.pieces.slice().sort((a,b)=>a.sol[1]-b.sol[1]||a.sol[0]-b.sol[0]);const k=Math.round(ps.length*${frac});
  ps.slice(0,k).forEach(P=>place(P.id,P.sol[0],P.sol[1],0,0));
  if(${dragIt}){const P=ps[k];P.r=0;P.f=0;const [w,h]=dims(cellsOf(P));G.sel=P.id;G.drag={p:P,ox:w*CS/2,oy:h*CS/2,sx:0,sy:0,x:BX+(P.sol[0]+w/2+0.18)*CS,y:BY+(P.sol[1]+h/2-0.22)*CS,moved:true,onBoard:false,lift:0,sc:1};}
  G.hand=false;`;
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (name, vp, locale, code, wait = 700) => {
    const ctx = await b.newContext({ viewport: vp, locale, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(1800);
    if (code) { await p.evaluate(c => eval(c), code); await p.waitForTimeout(wait); }
    await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  const M = { width: 405, height: 720 };
  await shot('menu-mobile-en.png', M, 'en-US', ALL + 'save();menuInfo();', 1500);
  await shot('game-patches-en.png', M, 'en-US', partial(12, 0, 0.5));
  await shot('game-heart-en.png', M, 'en-US', partial(16 + 14, 1, 0.55));
  await shot('game-mirror-ru.png', M, 'ru-RU', partial(55, 4, 0.45));
  await shot('win-mobile-ro.png', M, 'ro-RO', ALL + 'S.fab=2;patCache={};startLevel(22);G.t0-=83000;S.best[22]=71.4;solveAll();', 2200);
  await shot('levels-mobile-en.png', M, 'en-US', ALL + "save();renderLevels();show('levels');");
  await shot('fabrics-mobile-en.png', M, 'en-US', ALL + "S.fab=1;save();renderFabrics();show('fabrics');");
  await shot('game-desktop-en.png', { width: 1280, height: 720 }, 'en-US', partial(47, 5, 0.5));
  // coperți: 3 pilote terminate, înclinate + titlu
  const quilt = async (lv, fab) => {
    const ctx = await b.newContext({ viewport: { width: 420, height: 420 }, locale: 'en-US' }); const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(300);
    await p.evaluate(c => eval(c), ALL + `S.fab=${fab};patCache={};startLevel(${lv});for(const P of G.pieces)place(P.id,P.sol[0],P.sol[1],0,0);G.sel=null;document.querySelectorAll('.screen,#hud,#tools,#tip').forEach(e=>e.style.display='none');mode='frozen';
      CS=Math.floor(380/Math.max(G.L.w,G.L.h));BX=(420-CS*G.L.w)/2;BY=(420-CS*G.L.h)/2;slots=[];drawBg=()=>{cx.clearRect(0,0,W,H)};document.documentElement.style.background=document.body.style.background='transparent';`);
    await p.waitForTimeout(400);
    const buf = await p.screenshot({ clip: { x: 0, y: 0, width: 420, height: 420 }, omitBackground: true }); await ctx.close(); return buf.toString('base64');
  };
  const imgs = [await quilt(30, 0), await quilt(44, 1), await quilt(13, 4)];
  const cover = async (name, w, h, icon) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
    const k = Math.min(w / 1280, h / 720) * (icon ? 1.9 : 1);
    const card = (i, x, y, r, s = 1) => `<img src="data:image/png;base64,${imgs[i]}" style="position:absolute;left:${x}px;top:${y}px;width:${420 * k * s}px;transform:rotate(${r}deg);filter:drop-shadow(0 ${16 * k}px ${30 * k}px rgba(0,0,0,.5))">`;
    const html = icon
      ? `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#3a2440;position:relative">${card(0, (w - 420 * k * 1.12) / 2, (h - 420 * k * 1.12) / 2, -6, 1.12)}</body>`
      : `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(ellipse at 30% 40%,#5a3460,#1f1424 75%);font-family:'Trebuchet MS',sans-serif">
        ${card(2, w * 0.9 - 210 * k, h * 0.03, 9, 0.85)}${card(1, w * 0.75 - 210 * k, h * 0.42, -4, 0.85)}${card(0, w * 0.6 - 210 * k, h * 0.1, -10, 0.9)}
        <div style="position:absolute;left:${w * 0.05}px;top:${h * 0.22}px;line-height:.92;font-weight:900;font-size:${150 * k}px;color:#fff4e2;text-shadow:0 ${8 * k}px 0 #a8475a,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.6)">Cozy<br><span style="color:#ffc95e;text-shadow:0 ${8 * k}px 0 #8c5200,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.6)">Quilt</span></div>
        <div style="position:absolute;left:${w * 0.055}px;top:${h * 0.22 + 290 * k}px;font-size:${34 * k}px;color:#f6e2ea;font-weight:700;text-shadow:0 2px 8px rgba(0,0,0,.7)">60 cozy patchwork puzzles</div></body>`;
    await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  await cover('cover-630x500.png', 630, 500);
  await cover('cover-1280x720.png', 1280, 720);
  await cover('icon-512.png', 512, 512, true);
  await b.close();
})();
