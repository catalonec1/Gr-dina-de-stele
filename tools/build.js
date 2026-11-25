// Construiește câte o versiune pe platformă în dist/<platformă>/ și dist/<platformă>.zip
// Folosire: node tools/build.js   (GD_GAME_ID=... pentru GameDistribution; GM_GAME_ID=... pentru GameMonetize; Y8_APP_ID=... Y8_GAME_ID=... pentru Y8)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), DIST = path.join(ROOT, 'dist');
const BUILD = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const PLATFORMS = {
  web:              { pwa: true },                 // GitHub Pages + Microsoft Store (PWA)
  itch:             {},                            // itch.io: fără reclame, bonus gratuit
  crazygames:       { platform: 'crazygames' },
  poki:             { platform: 'poki' },
  gamedistribution: { platform: 'gamedistribution', gdId: process.env.GD_GAME_ID || '' },
  gamepix:          { platform: 'gamepix' },
  y8:               { platform: 'y8', y8App: process.env.Y8_APP_ID || '', y8Game: process.env.Y8_GAME_ID || '' },
  gamemonetize:     { platform: 'gamemonetize', gmId: process.env.GM_GAME_ID || '' },
  newgrounds:       {},                            // Newgrounds: fără SDK de reclame (ca itch)
};

function copyDir(a, b) { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a)) {
  const s = path.join(a, f), d = path.join(b, f); fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d); } }

fs.rmSync(DIST, { recursive: true, force: true });
for (const [name, o] of Object.entries(PLATFORMS)) {
  const out = path.join(DIST, name);
  let head = '';
  if (o.platform) head += `<script>window.GAME_PLATFORM=${JSON.stringify(o.platform)};</script>\n`;
  if (o.platform === 'gamedistribution') head += `<script>window.GD_GAME_ID=${JSON.stringify(o.gdId)};</script>\n`;
  if (o.platform === 'gamemonetize') head += `<script>window.GM_GAME_ID=${JSON.stringify(o.gmId)};</script>\n`;
  if (o.platform === 'gamepix') head += '<script src="https://integration.gamepix.com/sdk/v3/gamepix.sdk.js"></script>\n';
  if (o.platform === 'y8') head += `<script>window.Y8_APP_ID=${JSON.stringify(o.y8App)};window.Y8_GAME_ID=${JSON.stringify(o.y8Game)};</script>\n`;
  if (o.pwa) head += '<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#070a1f">\n<link rel="apple-touch-icon" href="icons/icon-192.png">\n';
  const html = src.replace('<title>', head + '<title>');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
  copyDir(path.join(ROOT, 'music'), path.join(out, 'music'));
  if (o.pwa) {
    fs.copyFileSync(path.join(ROOT, 'pwa/manifest.webmanifest'), path.join(out, 'manifest.webmanifest'));
    fs.writeFileSync(path.join(out, 'sw.js'), fs.readFileSync(path.join(ROOT, 'pwa/sw.js'), 'utf8').replace('__BUILD__', 'sg-' + BUILD));
    copyDir(path.join(ROOT, 'pwa/icons'), path.join(out, 'icons'));
    copyDir(path.join(ROOT, 'pwa/screenshots'), path.join(out, 'screenshots'));
    fs.copyFileSync(path.join(ROOT, 'launch/cover-630x500.png'), path.join(out, 'cover.png'));
    fs.copyFileSync(path.join(ROOT, 'pwa/privacy.html'), path.join(out, 'privacy.html'));
  }
  execFileSync('zip', ['-qr', path.join(DIST, name + '.zip'), '.'], { cwd: out });
  console.log('OK', name, o.platform === 'gamedistribution' && !o.gdId ? '(fără GD_GAME_ID: reclamele GD rămân oprite)' : '');
}
