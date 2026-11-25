// Împachetează un joc HTML5 fără SDK pentru portalurile cu reclame (GameDistribution, GameMonetize).
// Folosire: node tools/portal-wrap.js <index.html> <folder-ieșire> <gamedistribution|gamemonetize> <gameId> [selectori-pauze]
// Reclama (interstițial) apare la pauzele naturale: clic pe butoanele din selectori, cel mult o dată la 3 minute.
// În timpul reclamei tot sunetul (AudioContext + <audio>) e oprit.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [src, out, platform, gameId, sel = '#bPlay,#awayOk,#cfYes'] = process.argv.slice(2);
if (!src || !out || !['gamedistribution', 'gamemonetize'].includes(platform) || !gameId) {
  console.error('Folosire: node tools/portal-wrap.js <index.html> <out> <gamedistribution|gamemonetize> <gameId> [selectori]'); process.exit(1);
}
const head = `<script>(function(){var L=[],m=false,A=window.AudioContext||window.webkitAudioContext;
if(A){var W=function(o){var c=o?new A(o):new A();var r=c.resume.bind(c);c.resume=function(){return m?Promise.resolve():r();};L.push(c);return c;};W.prototype=A.prototype;window.AudioContext=W;window.webkitAudioContext=W;}
window.__portalMute=function(v){m=v;L.forEach(function(c){try{v?c.suspend():c.resume();}catch(e){}});document.querySelectorAll('audio,video').forEach(function(a){try{if(v){a.__pw=!a.paused;a.pause();}else if(a.__pw)a.play();}catch(e){}});};})();</script>
`;
const sdk = platform === 'gamedistribution'
  ? { opt: 'GD_OPTIONS', url: 'https://html5.api.gamedistribution.com/main.min.js', show: 'window.gdsdk&&typeof window.gdsdk.showAd==="function"&&window.gdsdk.showAd()' }
  : { opt: 'SDK_OPTIONS', url: 'https://api.gamemonetize.com/sdk.js', show: 'window.sdk&&typeof window.sdk.showBanner==="function"&&window.sdk.showBanner()' };
const body = `<script>(function(){var last=0,CD=180000;
window.${sdk.opt}={gameId:${JSON.stringify(gameId)},onEvent:function(e){if(e.name==="SDK_GAME_PAUSE")window.__portalMute(true);if(e.name==="SDK_GAME_START")window.__portalMute(false);}};
var s=document.createElement("script");s.src=${JSON.stringify(sdk.url)};document.head.appendChild(s);
function ad(){var n=Date.now();if(n-last<CD)return;last=n;try{Promise.resolve(${sdk.show}).catch(function(){window.__portalMute(false);});}catch(e){window.__portalMute(false);}}
document.addEventListener("click",function(e){if(e.target&&e.target.closest&&e.target.closest(${JSON.stringify(sel)}))setTimeout(ad,0);},true);})();</script>
`;
let html = fs.readFileSync(src, 'utf8');
if (!html.includes('<head>') || !html.includes('</body>')) throw new Error('index.html fără <head> sau </body>');
html = html.replace('<head>', '<head>\n' + head).replace('</body>', body + '</body>');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(path.dirname(src))) { const p = path.join(path.dirname(src), f); if (f !== 'index.html' && fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(out, f)); }
fs.writeFileSync(path.join(out, 'index.html'), html);
const zip = out.replace(/\/$/, '') + '.zip'; fs.rmSync(zip, { force: true });
execFileSync('zip', ['-qr', path.resolve(zip), '.'], { cwd: out });
console.log('OK', zip);
