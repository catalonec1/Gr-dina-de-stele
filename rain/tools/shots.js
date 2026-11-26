// Capturi și coperți: node rain/tools/shots.js → rain/launch/
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'launch'); fs.mkdirSync(OUT, { recursive: true });
const base = (o) => JSON.stringify(Object.assign({ lang: null, done: [], stars: [], hints: 5, flower: 0, music: 0, rain: 0, sound: 0, vibe: 0, tut: 1, daily: 0, streak: 0, gift: 0, tips: { t3: 1, hint: 1, rock: 1, pond: 1, mix: 1 }, seen: '1.0' }, o));
const PROG = { done: Array(38).fill(1), stars: Array(38).fill(3).map((s, i) => i % 5 === 4 ? 2 : s), streak: 6 };
// pune la loc primele k pietre de pe drumul apei (florile de acolo înfloresc)
const part = (lv, frac, fl = 0) => `S.flower=${fl};startLevel(${lv});G.L.order.slice(0,Math.round(G.L.order.length*${frac})).forEach(i=>G.rot[i]=0);G.fl=null;update(true);hud();`;
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (name, vp, locale, store, code, wait = 900, clip) => {
    const ctx = await b.newContext({ viewport: vp, locale, deviceScaleFactor: 1 });
    if (store) await ctx.addInitScript(s => localStorage.setItem('rain-garden-v1', s), store);
    const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(700);
    if (code) { await p.evaluate(c => eval(c), code); await p.waitForTimeout(wait); }
    const buf = await p.screenshot(clip ? { clip } : { path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name); return buf;
  };
  const M = { width: 405, height: 720 };
  await shot('menu-mobile-en.png', M, 'en-US', base(PROG), 'demo.next=1e12;for(const i of G.L.order.slice(0,9))G.rot[i]=0;G.fl=null;update(true);', 400);
  await shot('game-drizzle-en.png', M, 'en-US', base(PROG), part(9, 0.6), 900);
  await shot('game-moss-ro.png', M, 'ro-RO', base(PROG), part(22, 0.7, 1), 900);
  await shot('game-pond-ru.png', M, 'ru-RU', base(PROG), part(36, 0.65, 2), 900);
  await shot('game-autumn-en.png', M, 'en-US', base(PROG), part(50, 0.7, 3), 900);
  await shot('levels-en.png', M, 'en-US', base(PROG), "renderLevels();show('levels');", 500);
  await shot('flowers-en.png', M, 'en-US', base(PROG), "renderFlowers();show('flowers');", 500);
  await shot('game-desktop-en.png', { width: 1280, height: 720 }, 'en-US', base(PROG), part(47, 0.75, 5), 900);
  const scene = (await shot('_s', { width: 520, height: 700 }, 'en-US', base(PROG), part(51, 1, 0) + "G.done=true;G.into=performance.now()-2000;document.getElementById('hud').classList.remove('on');document.getElementById('tools').classList.remove('on');", 900, { x: 0, y: 0, width: 520, height: 700 })).toString('base64');
  const cover = async (name, w, h, icon) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const k = Math.min(w / 1280, h / 720);
    const html = icon
      ? `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(circle at 50% 35%,#7fb0bb,#2c4a4f 78%)"><svg viewBox="0 0 512 512" width="${w}" height="${h}">
          <g fill="#eef6f8"><circle cx="190" cy="150" r="62"/><circle cx="262" cy="122" r="78"/><circle cx="335" cy="156" r="58"/><rect x="190" y="150" width="145" height="62" rx="30"/></g>
          <g fill="#5cc8ee"><ellipse cx="215" cy="262" rx="11" ry="19"/><ellipse cx="262" cy="292" rx="11" ry="19"/><ellipse cx="309" cy="262" rx="11" ry="19"/></g>
          <path d="M256 470 Q262 410 256 360" stroke="#4f8a3c" stroke-width="14" fill="none" stroke-linecap="round"/>
          <ellipse cx="226" cy="420" rx="26" ry="10" fill="#6cae4a" transform="rotate(-25 226 420)"/><ellipse cx="288" cy="410" rx="26" ry="10" fill="#6cae4a" transform="rotate(25 288 410)"/>
          <g fill="#ffa3bd" transform="translate(256 352)">${[0, 1, 2, 3, 4].map(i => `<ellipse cx="0" cy="-34" rx="22" ry="34" transform="rotate(${i * 72 + 18})"/>`).join('')}</g>
          <circle cx="256" cy="352" r="18" fill="#ffe08a"/></svg></body>`
      : `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#2c4a4f url(data:image/png;base64,${scene}) right 2% center/auto 96% no-repeat;font-family:Georgia,serif;position:relative">
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(24,46,50,.97) 32%,rgba(24,46,50,.05) 72%)"></div>
        <div style="position:absolute;left:${w * .06}px;top:${h * .18}px;line-height:.92;font-weight:700;font-style:italic;font-size:${138 * k}px;color:#eefaff;text-shadow:0 ${7 * k}px 0 #3b8aa3,0 0 ${40 * k}px rgba(143,214,232,.5)">Rain<br><span style="color:#ffb8cb;text-shadow:0 ${7 * k}px 0 #a8506e,0 ${14 * k}px ${30 * k}px rgba(0,0,0,.6)">Garden</span></div>
        <div style="position:absolute;left:${w * .065}px;top:${h * .18 + 290 * k}px;font-family:'Trebuchet MS',sans-serif;font-size:${34 * k}px;color:#fff;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.8)">cozy rainwater puzzle<br><span style="color:#bdf0f8">60 gardens · daily garden</span></div></body>`;
    await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, name) }); await ctx.close(); console.log('OK', name);
  };
  await cover('cover-630x500.png', 630, 500); await cover('cover-1280x720.png', 1280, 720); await cover('icon-512.png', 512, 512, true);
  await b.close();
})();
