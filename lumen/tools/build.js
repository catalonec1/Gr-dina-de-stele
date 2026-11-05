// Construiește lumen/dist/<platformă>/ și <platformă>.zip. Folosire: node lumen/tools/build.js  (GD_GAME_ID=... opțional)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), DIST = path.join(ROOT, 'dist');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const PLATFORMS = { web: {}, itch: {}, crazygames: { platform: 'crazygames' }, poki: { platform: 'poki' },
  gamedistribution: { platform: 'gamedistribution', gdId: process.env.GD_GAME_ID || '' } };
fs.rmSync(DIST, { recursive: true, force: true });
for (const [name, o] of Object.entries(PLATFORMS)) {
  const out = path.join(DIST, name); let head = '';
  if (o.platform) head += `<script>window.GAME_PLATFORM=${JSON.stringify(o.platform)};</script>\n`;
  if (o.gdId) head += `<script>window.GD_GAME_ID=${JSON.stringify(o.gdId)};</script>\n`;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), src.replace('<title>', head + '<title>'));
  execFileSync('zip', ['-qr', path.join(DIST, name + '.zip'), '.'], { cwd: out });
  console.log('OK', name);
}
