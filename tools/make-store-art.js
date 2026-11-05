/* Capturi și imagini pentru Microsoft Store: launch/msstore/ */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'dist', 'web'), OUT = path.join(__dirname, '..', 'launch', 'msstore');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
(async () => {
  await new Promise(r => srv.listen(8765, r));
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const save = { light: 48250, lifeLight: 2.4e6, owned: [42, 31, 18, 9, 4, 1, 0, 0].slice(0, 8), ups: {}, dust: 3, lang: 'en', sound: false, music: false, last: Date.now(),
    stats: { taps: 1820, comets: 14, gold: 1, rebirths: 1, total: 3.1e6, time: 7200 }, ach: { taps1: 1, taps2: 1, comets1: 1, comets2: 1, total1: 1, total2: 1, constel1: 1, rebirths1: 1, gold1: 1 } };
  const shots = [['stars', 'shot1'], ['upgrades', 'shot2'], ['daily', 'shot3'], ['trophies', 'shot4']];
  for (const [tab, name] of shots) {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    await p.addInitScript(s => { localStorage.setItem('gradina-de-stele-v1', JSON.stringify(Object.assign(s, { seen: undefined }))); }, save);
    await p.goto('http://localhost:8765/');
    await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelectorAll('.modal,.news,#news').forEach(e => e.remove()));
    await p.click(`#tabs button[data-tab="${tab}"]`).catch(() => {});
    for (let i = 0; i < 25; i++) await p.mouse.click(960 + (i % 5) * 30, 300 + (i % 3) * 25);
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(OUT, name + '-1920x1080.png') });
    await p.close();
  }
  const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'icons', 'icon-512.png')).toString('base64');
  const shot = 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, 'shot1-1920x1080.png')).toString('base64');
  const art = (w, h) => `<html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:radial-gradient(ellipse at 50% 30%,#2a2f7a,#070a1f 70%);font-family:Georgia,serif;color:#ffe9a8;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative">
    ${Array.from({ length: 120 }, (_, i) => `<i style="position:absolute;left:${(i * 137) % 100}%;top:${(i * 61) % 100}%;width:${1 + i % 3}px;height:${1 + i % 3}px;border-radius:50%;background:#fff;opacity:${0.3 + (i % 5) / 8}"></i>`).join('')}
    <img src="${icon}" style="width:${Math.round(w * 0.55)}px;filter:drop-shadow(0 0 40px #ffd76a88)">
    <div style="font-size:${Math.round(w * 0.12)}px;font-weight:bold;letter-spacing:2px;text-shadow:0 0 30px #ffd76a">Star Garden</div>
    <div style="font-size:${Math.round(w * 0.045)}px;color:#cfd3ff;margin-top:${Math.round(w * 0.02)}px">A relaxing idle game</div></body></html>`;
  for (const [w, h, n] of [[1440, 2160, 'poster-1440x2160'], [2160, 2160, 'boxart-2160x2160']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(art(w, h)); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, n + '.png') }); await p.close();
  }
  await b.close(); srv.close();
  console.log(fs.readdirSync(OUT).join('\n'));
})();
