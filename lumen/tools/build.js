// Construiește lumen/dist/<platformă>/ și <platformă>.zip. Folosire: node lumen/tools/build.js  (GD_GAME_ID=..., Y8_APP_ID=..., Y8_GAME_ID=... opționale)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), DIST = path.join(ROOT, 'dist');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const PLATFORMS = { web: {}, itch: {}, crazygames: { platform: 'crazygames' }, poki: { platform: 'poki' },
  gamedistribution: { platform: 'gamedistribution', gdId: process.env.GD_GAME_ID || '' },
  gamepix: { platform: 'gamepix' }, newgrounds: {},
  y8: { platform: 'y8', y8App: process.env.Y8_APP_ID || '', y8Game: process.env.Y8_GAME_ID || '' } };
fs.rmSync(DIST, { recursive: true, force: true });
for (const [name, o] of Object.entries(PLATFORMS)) {
  const out = path.join(DIST, name); let head = '';
  if (o.platform) head += `<script>window.GAME_PLATFORM=${JSON.stringify(o.platform)};</script>\n`;
  if (o.gdId) head += `<script>window.GD_GAME_ID=${JSON.stringify(o.gdId)};</script>\n`;
  if (o.platform === 'gamepix') head += '<script src="https://integration.gamepix.com/sdk/v3/gamepix.sdk.js"></script>\n';
  if (o.platform === 'y8') head += `<script>window.Y8_APP_ID=${JSON.stringify(o.y8App)};window.Y8_GAME_ID=${JSON.stringify(o.y8Game)};</script>\n`;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), src.replace('<title>', head + '<title>'));
  execFileSync('zip', ['-qr', path.join(DIST, name + '.zip'), '.'], { cwd: out });
  console.log('OK', name);
}
