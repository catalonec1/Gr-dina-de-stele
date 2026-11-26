# Cocoon Garden

Joc idle / incremental original, un singur fișier (`index.html`), RO / EN / RU, mobil + desktop.

Scuturi stejarul ca să cadă frunze 🍃, cumperi creaturi care strâng frunze singure (omidă, gărgăriță, melc, albină, arici, broscuță, bufniță, floarea lunii; cost ×1.15), le dublezi cu îmbunătățiri la 10/25/50/100/150 bucăți.

- 4 anotimpuri de câte 45 s: fiecare dublează alte creaturi.
- Fluture auriu la 45–105 s: atingi → Ploaie de polen ×7 (30 s) sau un cadou de frunze.
- Migrație (prestigiu) de la 1 M frunze: 🌟 praf de aripi = √(frunze/1 M), +5% producție fiecare.
- 20 de trofee (+2% fiecare; v1.1: 50 de fluturi, 5 migrații, toate îmbunătățirile, un cvadrilion), producție offline 50% (max 8 h), cumpărare ×1/×10/Max, tutorial în 3 pași cu acțiuni reale, setări (muzică, sunete, efecte, tutorial, limbă), tastatură (Space, 1–8, B, Esc).

Teste: `node cocoon/tests/run.js` (48) și `node cocoon/tests/v11.js` (18). Capturi și coperți: `node cocoon/tools/shots.js` → `cocoon/launch/`.

## Update v1.1

Teste noi: `node cocoon/tests/v11.js` (18: trofeele noi, +40% cu toate cele 20, migrarea unei salvări v1.0 care primește la încărcare trofeele deja meritate, Noutăți o singură dată și păstrate după migrație, RO/EN/RU, zero erori JS).

**EN (What's new):** 4 new trophies to chase: 50 Butterflies, 5 Migrations, Every Upgrade and A Quadrillion leaves. Each one adds +2% production (20 trophies, up to +40%). Trophies you have already earned are awarded as soon as you open the game.

**RO (Noutăți):** 4 trofee noi: 50 de fluturi, 5 migrații, Toate îmbunătățirile și Un cvadrilion de frunze. Fiecare dă +2% producție (20 de trofee, până la +40%). Trofeele pe care le-ai meritat deja se acordă imediat ce deschizi jocul.

**RU (Что нового):** 4 новых трофея: «50 бабочек», «5 миграций», «Все улучшения» и «Квадриллион» листьев. Каждый даёт +2% к производству (20 трофеев, до +40%). Уже заслуженные трофеи выдаются сразу при запуске игры.
