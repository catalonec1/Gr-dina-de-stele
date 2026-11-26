// Build GamePix pentru Cozy Quilt: ia quilt/index.html (din git, ref dat ca argument),
// adaugă SDK GamePix v3 și un adaptor: pauză/reluare = sunet oprit; interstitial doar la pornirea
// unui nivel nou după unul terminat (pauză naturală, cel mult o dată la 3 minute); happyMoment la 3 stele.
// Folosire: node tools/build-quilt-gamepix.js <git-ref> <zip-ieșire>
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const ref = process.argv[2] || 'HEAD', outZip = path.resolve(process.argv[3] || 'cozy-quilt-gamepix.zip');
let html = execSync(`git show ${ref}:quilt/index.html`, { encoding: 'utf8', maxBuffer: 1 << 24 });
const sdk = '<script src="https://integration.gamepix.com/sdk/v3/gamepix.sdk.js"></script>\n';
const adapter = `<script>
(function () {
  var gp = window.GamePix; if (!gp || !gp.ads) return;
  var paused = false, inAd = false, last = Date.now(), played = 0;
  function mute() { try { if (AC) AC.suspend(); } catch (e) {} }
  function unmute() { if (paused || inAd) return; try { if (AC) AC.resume(); } catch (e) {} }
  gp.events.on('pause', function () { paused = true; mute(); });
  gp.events.on('resume', function () { paused = false; unmute(); });
  var s0 = startLevel;
  startLevel = function (i) {
    var args = arguments;
    if (played === 0 || Date.now() - last < 180000) { played++; return s0.apply(this, args); }
    last = Date.now(); inAd = true; mute(); played++;
    Promise.resolve().then(function () { return gp.ads.interstitial(); }).catch(function () {}).then(function () { inAd = false; s0.apply(null, args); unmute(); });
  };
  var f0 = finish;
  finish = function () { var three = G && G.hints === 0; var r = f0.apply(this, arguments);
    try { if (three) gp.happyMoment('three-stars'); } catch (e) {} return r; };
})();
</script>
`;
if (!html.includes('</head>') || !html.includes('</body>')) throw new Error('index.html fără </head> sau </body>');
for (const fn of ['function startLevel(', 'function finish(', 'let AC']) if (!html.includes(fn)) throw new Error('lipsește ' + fn);
html = html.replace('</head>', sdk + '</head>').replace(/<\/body>(?![\s\S]*<\/body>)/, adapter + '</body>');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quilt-gp-'));
fs.writeFileSync(path.join(dir, 'index.html'), html);
fs.rmSync(outZip, { force: true });
execSync(`zip -q -X ${JSON.stringify(outZip)} index.html`, { cwd: dir });
console.log('ok', outZip, fs.statSync(outZip).size);
