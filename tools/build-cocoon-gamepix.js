// Build GamePix pentru Cocoon Garden: ia cocoon/index.html (din git, ref dat ca argument),
// adaugă SDK GamePix v3 în <head> și un adaptor mic înainte de </body>, scrie zip-ul.
// Folosire: node tools/build-cocoon-gamepix.js <git-ref>
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const ref = process.argv[2] || 'HEAD';
let html = execSync(`git show ${ref}:cocoon/index.html`, { encoding: 'utf8', maxBuffer: 1 << 24 });
const sdk = '<script src="https://integration.gamepix.com/sdk/v3/gamepix.sdk.js"></script>\n';
const adapter = `<script>
// Adaptor GamePix: pauza/reluarea opresc sunetul; reclamă interstitial doar după migrație (pauză naturală);
// happyMoment când prinzi un fluture auriu. Fără reclame pe timer.
(function () {
  var gp = window.GamePix; if (!gp || !gp.ads) return;
  var paused = false, inAd = false;
  function mute() { try { if (AC) AC.suspend(); } catch (e) {} }
  function unmute() { if (paused || inAd) return; try { if (AC) AC.resume(); } catch (e) {} }
  gp.events.on('pause', function () { paused = true; mute(); });
  gp.events.on('resume', function () { paused = false; unmute(); });
  var m0 = migrate;
  migrate = function () { var r = m0.apply(this, arguments); if (r) { inAd = true; mute();
    Promise.resolve().then(function () { return gp.ads.interstitial(); }).catch(function () {}).then(function () { inAd = false; unmute(); }); } return r; };
  var c0 = catchFly;
  catchFly = function () { var r = c0.apply(this, arguments); if (r) { try { gp.happyMoment('butterfly'); } catch (e) {} } return r; };
})();
</script>
`;
if (!html.includes('</head>') || !html.includes('</body>')) throw new Error('index.html fără </head> sau </body>');
html = html.replace('</head>', sdk + '</head>').replace(/<\/body>(?![\s\S]*<\/body>)/, adapter + '</body>');
const out = path.join(__dirname, '..', 'cocoon', 'launch', 'gamepix');
fs.mkdirSync(path.join(out, 'build'), { recursive: true });
fs.writeFileSync(path.join(out, 'build', 'index.html'), html);
execSync('rm -f ../cocoon-garden-gamepix.zip && zip -q -X ../cocoon-garden-gamepix.zip index.html', { cwd: path.join(out, 'build') });
console.log('ok', fs.statSync(path.join(out, 'cocoon-garden-gamepix.zip')).size);
