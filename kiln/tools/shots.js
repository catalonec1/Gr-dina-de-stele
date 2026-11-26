// Capturi și coperți: node kiln/tools/shots.js → kiln/launch/
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'launch'); fs.mkdirSync(OUT, { recursive: true });
const SK = 'clay-and-kiln-v1';
const base = (o) => JSON.stringify(Object.assign({ v: '1.0', coins: 0, run: 0, life: 0, own: [0, 0, 0, 0, 0, 0, 0, 0], ups: [0, 0, 0, 0, 0, 0, 0, 0], clickUps: 0, clicks: 0, pots: [0, 0, 0, 0], shape: 1, seals: 0, shops: 0, ach: [], fires: 0, perfect: 0, boostT: 0, boostM: 1, fireIn: 300, fireT: -1, cms: [null, null, null], cmNext: [0, 0, 0], cmDone: 0, seed: 7, music: 0, sfx: 0, fx: 1, tut: 1, step: 3, last: Date.now(), started: 1 }, o));
const MID = { coins: 48250, run: 3.2e5, life: 3.2e5, own: [42, 23, 11, 4, 1, 0, 0, 0], ups: [2, 1, 0, 0, 0, 0, 0, 0], clickUps: 2, clicks: 640, pots: [300, 200, 90, 20], fires: 4, cmDone: 6, ach: [0, 1, 5, 10, 12] };
const LATE = { coins: 3.4e9, run: 9e9, life: 2.1e10, own: [120, 96, 80, 64, 40, 25, 12, 5], ups: [5, 4, 4, 3, 2, 1, 1, 0], clickUps: 5, clicks: 4200, pots: [9000, 7000, 5000, 3000], fires: 40, perfect: 12, seals: 41, shops: 3, cmDone: 48, ach: [0, 1, 2, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14] };
const CMS = "S.cmNext=[0,0,0];for(let i=0;i<3;i++)newCm(i);S.cms[0].got=S.cms[0].need*.7;S.cms[1].got=S.cms[1].need;S.cms[1].done=true;S.cms[2].got=S.cms[2].need*.3;";
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (name, vp, locale, store, code, wait = 900, clip) => {
    const ctx = await b.newContext({ viewport: vp, locale, deviceScaleFactor: 1 });
    if (store) await ctx.addInitScript(([k, s]) => localStorage.setItem(k, s), [SK, store]);
    const p = await ctx.newPage(); await p.goto(URL); await p.addStyleTag({ content: '#toast{visibility:hidden}' }); await p.waitForTimeout(600);
    if (code) { await p.evaluate(c => eval(c), code); await p.waitForTimeout(wait); }
    const buf = await p.screenshot(clip ? { clip } : { path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name); return buf;
  };
  const M = { width: 405, height: 720 };
  await shot('menu-mobile-en.png', M, 'en-US', null, null, 0);
  await shot('game-tutorial-en.png', M, 'en-US', null, "play();for(let i=0;i<3;i++)tapWheel(120+i*55,210-i*35);pops=[];", 350);
  await shot('game-studio-en.png', M, 'en-US', base(MID), "play();S.shape=1;for(let i=0;i<3;i++)tapWheel(110+i*60,200-i*40);form=.85;pops=[];", 300);
  await shot('game-orders-ro.png', M, 'ro-RO', base(MID), "play();" + CMS + "tab='cm';renderList();S.fireT=0.7;", 120);
  await shot('game-kiln-ru.png', M, 'ru-RU', base(LATE), "play();S.fireT=0.78;tab='up';renderList();", 60);
  await shot('renown-en.png', M, 'en-US', base(LATE), "play();S.boostT=24;S.boostM=3;tab='ws';renderList();", 500);
  await shot('game-desktop-en.png', { width: 1280, height: 720 }, 'en-US', base(LATE), "play();" + CMS + "tab='cm';renderList();S.boostT=28;S.boostM=3;S.shape=1;for(let i=0;i<4;i++)tapWheel(270+i*70,380-i*45);form=.9;pops=[];", 350);
  await shot('game-desktop-ro.png', { width: 1280, height: 720 }, 'ro-RO', base(MID), "play();S.fireT=0.78;S.shape=2;form=.7;", 60);
  const scene = (await shot('_s', { width: 1300, height: 720 }, 'en-US', base(LATE), "play();S.boostT=28;S.boostM=3;S.shape=1;form=.95;document.getElementById('hud').style.display='none';document.getElementById('shapes').style.display='none';", 250, { x: 0, y: 0, width: 900, height: 720 })).toString('base64');
  const jug = await (async () => { const ctx = await b.newContext(); const p = await ctx.newPage(); await p.goto(URL); const s = await p.evaluate(() => document.getElementById('defs').outerHTML + '|' + potSvg(1)); await ctx.close(); return s; })();
  const [defs, jugSvg] = jug.split('|');
  const cover = async (name, w, h, icon) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const k = Math.min(w / 1280, h / 720);
    const orn = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='12'%3E%3Crect width='24' height='12' fill='%23f7ecd8'/%3E%3Cpath d='M12 1l5 5-5 5-5-5z' fill='%23b3261e'/%3E%3Cpath d='M12 4l2 2-2 2-2-2z' fill='%23f7ecd8'/%3E%3Cpath d='M0 3l3 3-3 3zM24 3l-3 3 3 3z' fill='%232a1a14'/%3E%3Crect width='24' height='1' fill='%232a1a14'/%3E%3Crect y='11' width='24' height='1' fill='%232a1a14'/%3E%3C/svg%3E\")";
    const html = icon
      ? `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(circle at 50% 42%,#e07a45,#8f3a1e 72%,#5a2010);position:relative">${defs}
        <div style="position:absolute;left:0;right:0;top:${h * .06}px;height:${h * .07}px;background:${orn} repeat-x;background-size:${h * .14}px ${h * .07}px"></div>
        <div style="position:absolute;left:0;right:0;bottom:${h * .06}px;height:${h * .07}px;background:${orn} repeat-x;background-size:${h * .14}px ${h * .07}px"></div>
        <div style="position:absolute;left:${w * .14}px;top:${h * .16}px;width:${w * .72}px;height:${h * .72}px;filter:drop-shadow(0 ${h * .03}px ${h * .03}px rgba(0,0,0,.45))">${jugSvg.replace('class="i "', 'width="100%" height="100%"')}</div></body>`
      : `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:url(data:image/png;base64,${scene}) center/cover;font-family:Georgia,'DejaVu Serif',serif;position:relative">${defs}
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(60,18,6,.82),rgba(60,18,6,.35) 48%,rgba(60,18,6,0) 70%)"></div>
        <div style="position:absolute;left:0;right:0;top:0;height:${20 * k}px;background:${orn} repeat-x;background-size:${40 * k}px ${20 * k}px"></div>
        <div style="position:absolute;left:0;right:0;bottom:0;height:${20 * k}px;background:${orn} repeat-x;background-size:${40 * k}px ${20 * k}px"></div>
        <div style="position:absolute;left:${w * .05}px;top:${h * .2}px;line-height:.9;font-weight:900;font-size:${132 * k}px;color:#fff3dc;text-shadow:0 ${8 * k}px 0 #5a2010,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.5)">Clay<br><span style="font-size:.55em;color:#ffd08a;letter-spacing:${8 * k}px;margin-left:${10 * k}px">&amp;</span><br>Kiln</div>
        <div style="position:absolute;left:${w * .055}px;top:${h * .2 + 330 * k}px;font-family:'Trebuchet MS',sans-serif;font-size:${32 * k}px;color:#fff;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.8)">cozy pottery idle · folk village studio</div></body>`;
    await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  await cover('cover-630x500.png', 630, 500); await cover('cover-1280x720.png', 1280, 720); await cover('icon-512.png', 512, 512, true);
  await b.close();
})();
