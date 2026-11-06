// Capturi și coperți pentru portaluri: node hive/tools/shots.js  → hive/launch/
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'launch');
// o scenă frumoasă: fagure pe jumătate plin, piese mari, o unire pregătită
const SCENE = (skin) => {
  S.skin = skin; S.tut = true; S.coins = 148; startRun(false);
  const L = [0, 1, 2, 0, 3, 1, 0, 4, 2, 5, 0, 1, 6, 0, 3, 7, 0, 2, 1, 0, 4, 8, 0, 5, 1, 0, 2, 3, 0, ROCK, 1, 6, 0, 2, 0, 4, 1];
  G.cells = L.slice(0, NCELL); G.cells[IDX.get('1,0')] = 2; G.cells[IDX.get('-1,0')] = 2; G.cells[IDX.get('0,0')] = 0;
  G.cur = 2; G.next = 3; G.score = 12480; G.top = 8; G.kbd = true; G.cursor = IDX.get('0,0'); window.__noLoop = true;
};
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (name, vp, locale, fn, arg) => {
    const ctx = await b.newContext({ viewport: vp, locale, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(400);
    if (fn) { await p.evaluate(fn, arg); await p.waitForTimeout(600); }
    await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  const play = s => `(${SCENE})(${s});`;
  await shot('menu-mobile-en.png', { width: 405, height: 720 }, 'en-US');
  await shot('menu-mobile-ro.png', { width: 405, height: 720 }, 'ro-RO');
  await shot('game-mobile-en.png', { width: 405, height: 720 }, 'en-US', s => eval(s), play(0));
  await shot('game-mobile-ru.png', { width: 405, height: 720 }, 'ru-RU', s => eval(s), play(3));
  await shot('game-desktop-en.png', { width: 1280, height: 720 }, 'en-US', s => eval(s), play(5));
  await shot('shop-mobile-en.png', { width: 405, height: 720 }, 'en-US', () => { S.coins = 420; S.owned = [0, 1, 2]; S.skin = 2; show('shop'); });
  // coperți: fagure + titlu, fără interfață
  const cover = async (name, w, h, title = true) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'en-US' }); const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(300);
    await p.evaluate(s => eval(s), `(${SCENE})(0); G.kbd = false; mode = 'cover'; HS *= 0.82; OY = innerHeight * 0.6;`);
    await p.evaluate(t => { document.querySelectorAll('.screen,#hud,#tools,#tut').forEach(e => e.style.display = 'none');
      if (t) { const d = document.createElement('div'); d.innerHTML = 'Hive Bloom'; d.style.cssText = `position:fixed;left:0;right:0;top:${Math.round(innerHeight * 0.06)}px;text-align:center;font:800 ${Math.round(Math.min(innerWidth / 6.5, innerHeight / 5.5))}px system-ui,sans-serif;color:#fff3cf;text-shadow:0 0 30px rgba(255,201,60,.9),0 4px 10px rgba(0,0,0,.7);z-index:9`; document.body.appendChild(d); } }, title);
    await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  await cover('cover-630x500.png', 630, 500);
  await cover('cover-1280x720.png', 1280, 720);
  await cover('icon-512.png', 512, 512, false);
  await b.close();
})();
