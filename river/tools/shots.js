// Capturi și coperți pentru portaluri: node river/tools/shots.js  → river/launch/
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'launch');
// o scenă de joc frumoasă: noapte la amurg, felinare, lotus, barca Aurora
const SCENE = (d, skin) => { S.skin = skin; S.tut = true; startRun(false); newRun(777, false); G.d = d; genAhead(); G.x = (G.rows.find(r => r.y > G.d + 30) || { gx: 180 }).gx; G.lan = 37; G.shield = true; };
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (name, vp, locale, fn, arg) => {
    const ctx = await b.newContext({ viewport: vp, locale, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(400);
    if (fn) { await p.evaluate(fn, arg); await p.waitForTimeout(600); }
    await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  const play = `(${SCENE})(3000, 5); window.__noLoop = true;`;
  await shot('menu-mobile-en.png', { width: 405, height: 720 }, 'en-US');
  await shot('menu-mobile-ro.png', { width: 405, height: 720 }, 'ro-RO');
  await shot('game-mobile-en.png', { width: 405, height: 720 }, 'en-US', s => eval(s), play);
  await shot('game-mobile-ru.png', { width: 405, height: 720 }, 'ru-RU', s => eval(s), `(${SCENE})(4600, 3); window.__noLoop = true;`);
  await shot('game-desktop-en.png', { width: 1280, height: 720 }, 'en-US', s => eval(s), play);
  await shot('shop-mobile-en.png', { width: 405, height: 720 }, 'en-US', () => { S.coins = 420; S.owned = [0, 1, 2]; S.skin = 2; show('shop'); });
  // coperți: scenă + titlu, fără interfață
  const cover = async (name, w, h, title = true) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'en-US' }); const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(300);
    await p.evaluate(s => eval(s), `(${SCENE})(1700, 5); window.__noLoop = true; mode='cover';`);
    await p.evaluate(t => { document.querySelectorAll('.screen,#hud,#tut').forEach(e => e.style.display = 'none');
      if (t) { const d = document.createElement('div'); d.innerHTML = 'Paper River'; d.style.cssText = `position:fixed;left:0;right:0;top:${Math.round(innerHeight * 0.08)}px;text-align:center;font:800 ${Math.round(Math.min(innerWidth / 6.5, innerHeight / 5))}px system-ui,sans-serif;color:#fff6e5;text-shadow:0 0 30px rgba(255,179,71,.8),0 4px 10px rgba(0,0,0,.6);z-index:9`; document.body.appendChild(d); } }, title);
    await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  await cover('cover-630x500.png', 630, 500);
  await cover('cover-1280x720.png', 1280, 720);
  await cover('icon-512.png', 512, 512, false);
  await b.close();
})();
