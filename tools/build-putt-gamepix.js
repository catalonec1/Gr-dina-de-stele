// Build GamePix pentru Pebble Putt: ia putt/index.html (din git, ref dat ca argument),
// adaugă SDK GamePix v3 și un adaptor: pauză/reluare = sunet oprit; interstitial doar la trecerea
// la nivelul următor (pauză naturală, cel mult o dată la 3 minute); happyMoment la 3 stele. Fără reclame pe timer.
// Folosire: node tools/build-putt-gamepix.js <git-ref> <zip-ieșire>
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const ref = process.argv[2] || 'HEAD', outZip = path.resolve(process.argv[3] || 'pebble-putt-gamepix.zip');
let html = execSync(`git show ${ref}:putt/index.html`, { encoding: 'utf8', maxBuffer: 1 << 24 });
const sdk = '<script src="https://integration.gamepix.com/sdk/v3/gamepix.sdk.js"></script>\n';
const adapter = `<script>
(function () {
  var gp = window.GamePix; if (!gp || !gp.ads) return;
  var paused = false, inAd = false, last = Date.now();
  function mute() { try { if (AC) AC.suspend(); } catch (e) {} }
  function unmute() { if (paused || inAd) return; try { if (AC) AC.resume(); } catch (e) {} }
  gp.events.on('pause', function () { paused = true; mute(); });
  gp.events.on('resume', function () { paused = false; unmute(); });
  var n0 = next;
  next = function () {
    if (Date.now() - last < 180000) return n0.apply(this, arguments);
    last = Date.now(); inAd = true; mute();
    Promise.resolve().then(function () { return gp.ads.interstitial(); }).catch(function () {}).then(function () { inAd = false; unmute(); n0(); });
  };
  var f0 = finish;
  finish = function (skipped) { var r = f0.apply(this, arguments);
    try { if (!skipped && S.stars[LI] === 3) gp.happyMoment('three-stars'); } catch (e) {} return r; };
})();
</script>
`;
if (!html.includes('</head>') || !html.includes('</body>')) throw new Error('index.html fără </head> sau </body>');
html = html.replace('</head>', sdk + '</head>').replace(/<\/body>(?![\s\S]*<\/body>)/, adapter + '</body>');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'putt-gp-'));
fs.writeFileSync(path.join(dir, 'index.html'), html);
fs.rmSync(outZip, { force: true });
execSync(`zip -q -X ${JSON.stringify(outZip)} index.html`, { cwd: dir });
console.log('ok', outZip, fs.statSync(outZip).size);
