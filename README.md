# Grădina de stele / Star Garden

Joc idle HTML5 într-un singur fișier (`index.html`), în RO / EN / RU.

- Joacă: https://catalonec1.github.io/gr-dina-de-stele/
- Teste: `npm install && npx playwright install chromium && npm test`
- Publicare: orice push pe `main` rulează testele și, dacă trec, publică pe GitHub Pages.
- Pachet pentru portaluri (itch.io, CrazyGames): `launch/`
- Fișe gratuite de printat (labirinturi, cuvinte ascunse, matematică; RO/EN/RU): `printabile/` → https://catalonec1.github.io/Gr-dina-de-stele/printabile/ · teste: `node printabile/tests/run.js`
- **Paper River** (joc arcade: bărcuță de hârtie pe un râu infinit; RO/EN/RU): `river/` → https://catalonec1.github.io/Gr-dina-de-stele/river/ · teste: `node river/tests/run.js`
- **Hive Bloom** (puzzle hexagonal de unire: 3 piese egale → nivelul următor, 🌱→🌟; RO/EN/RU): `hive/` → https://catalonec1.github.io/Gr-dina-de-stele/hive/ · teste: `node hive/tests/run.js` · capturi: `node hive/tools/shots.js`
- **Pebble Putt** (minigolf-puzzle: 30 de trasee în 3 lumi, nisip, apă, ciuperci, portaluri, pereți mobili; RO/EN/RU): `putt/` → https://catalonec1.github.io/Gr-dina-de-stele/putt/ · teste: `node putt/tests/run.js` · capturi: `node putt/tools/shots.js`
- **Cozy Quilt** (puzzle cu petice: 60 de pilote în 4 lumi, rotire, nasturi, oglindire, Pilota zilei; RO/EN/RU): `quilt/` → https://catalonec1.github.io/Gr-dina-de-stele/quilt/ · teste: `node quilt/tests/run.js` · capturi: `node quilt/tools/shots.js`
- **Otter Glide** (puzzle cu alunecare pe gheață: 60 de iazuri în 4 lumi, pești, nămeți, gheață crăpată, Iazul zilei; RO/EN/RU): `glide/` → https://catalonec1.github.io/Gr-dina-de-stele/glide/ · teste: `node glide/tests/run.js` · capturi: `node glide/tools/shots.js`
- **Glowcap Grove** (puzzle cu rădăcini rotite: 60 de poieni în 4 lumi, pietre, două rețele, tuneluri, Poiana zilei; RO/EN/RU): `grove/` → https://catalonec1.github.io/Gr-dina-de-stele/grove/ · teste: `node grove/tests/run.js` · capturi: `node grove/tools/shots.js`
- **Cocoon Garden** (idle / incremental: stejar, 8 creaturi, anotimpuri, fluturi aurii, migrație cu praf de aripi, trofee, offline; RO/EN/RU): `cocoon/` → https://catalonec1.github.io/Gr-dina-de-stele/cocoon/ · teste: `node cocoon/tests/run.js` · capturi: `node cocoon/tools/shots.js`

## Versiuni
- **v1.2** (2026-11-06): a 9-a stea, Galaxia spirală (cu brațe animate și 3 îmbunătățiri), ploi de meteori la ~10 min (30 s de comete dese, 25% aur), misiune zilnică nouă „prinde o cometă de aur”, 4 trofee noi (23 în total). Teste: `node tests/v12.js`.
- **v1.1** (2026-11-05): stele noi Pulsar și Quasar, 19 trofee (+2% lumină fiecare, păstrate la renaștere), comete de aur (x5), cumpărare x1 / x10 / Max, statistici, Space/Enter pe desktop, sufixe pentru numere mari. Bugfix: acord RU la misiuni, setarea de sunet nu se mai salvează greșit în timpul reclamelor, insigna „Zilnic” se actualizează la miezul nopții, mesaj „Noutăți” pentru jucătorii vechi.
- **v1.0** (2026-11-04): lansare.

## Grădina de stele v1.7 — note de versiune (decembrie 2026)

Teste noi: `node tests/v17.js` (14: îmbunătățire nouă, 3 trofee, migrare salvare v1.6, Noutăți o singură dată, RO/EN/RU, fără erori JS).

**EN (Amazon „What's new” / itch devlog / GamePix):**
v1.7 — Winter sky update! An 8th “Clear sky” upgrade (all light x1.5) and 3 new winter trophies: Polar night, Comet blizzard and A hundred thousand snowflakes (39 trophies, each +2% light). Your garden and progress are kept.

**RO:**
v1.7 — Cerul de iarnă! A 8-a îmbunătățire „Cer senin” (toată lumina x1.5) și 3 trofee noi de iarnă: Noaptea polară, Viscolul de comete și O sută de mii de fulgi (39 de trofee, fiecare +2% lumină). Grădina și progresul se păstrează.

**RU:**
v1.7 — Зимнее небо! Восьмое улучшение «Ясное небо» (весь свет x1.5) и 3 новых зимних трофея: «Полярная ночь», «Кометная метель» и «Сто тысяч снежинок» (39 трофеев, каждый +2% света). Сад и прогресс сохраняются.
