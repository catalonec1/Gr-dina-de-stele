/* Cere pachetele Microsoft Store (MSIX) de la PWABuilder pentru Star Garden.
   Rulează în GitHub Actions (serviciul nu e accesibil din orice rețea).
   Ieșire: msix/star-garden.zip cu .msixbundle + .classic.appxbundle. */
const fs = require('fs');
const path = require('path');
const ENDPOINT = 'https://pwabuilder-windows-docker.azurewebsites.net/msix/generatezip';
const URL_BASE = 'https://catalonec1.github.io/Gr-dina-de-stele/';
const OUT = path.join(__dirname, '..', 'msix');

(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pwa', 'manifest.webmanifest'), 'utf8'));
  const body = {
    name: 'Star Garden',
    packageId: 'catalonec.StarGarden',
    url: URL_BASE,
    version: '1.0.1',
    allowSigning: true,
    publisher: { displayName: 'catalonec', commonName: 'CN=8129DE1D-E375-4EC4-9809-6CF037A07B8F' },
    generateModernPackage: true,
    classicPackage: { generate: true, version: '1.0.0', url: URL_BASE },
    edgeHtmlPackage: { generate: false },
    manifestUrl: URL_BASE + 'manifest.webmanifest',
    startUrl: URL_BASE,
    resourceLanguage: 'EN-US',
    manifest,
    images: { baseImage: URL_BASE + 'icons/icon-512.png', backgroundColor: 'transparent', padding: 0.3 }
  };
  const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok) throw new Error(`HTTP ${res.status} ${buf.toString('utf8').slice(0, 800)}`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'star-garden.zip'), buf);
  console.log(`star-garden: ${buf.length} bytes`);
})().catch(e => { console.error(e.message); process.exit(1); });
