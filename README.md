# Grădina de stele / Star Garden

Joc idle HTML5 într-un singur fișier (`index.html`), în RO / EN / RU.

- Joacă: https://catalonec1.github.io/gr-dina-de-stele/
- Teste: `npm install && npx playwright install chromium && npm test`
- Publicare: orice push pe `main` rulează testele și, dacă trec, publică pe GitHub Pages.
- Pachet pentru portaluri (itch.io, CrazyGames): `launch/`
- Fișe gratuite de printat (labirinturi, cuvinte ascunse, matematică; RO/EN/RU): `printabile/` → https://catalonec1.github.io/Gr-dina-de-stele/printabile/ · teste: `node printabile/tests/run.js`
- **Paper River** (joc arcade: bărcuță de hârtie pe un râu infinit; RO/EN/RU): `river/` → https://catalonec1.github.io/Gr-dina-de-stele/river/ · teste: `node river/tests/run.js`
- **Hive Bloom** (puzzle hexagonal de unire: 3 piese egale → nivelul următor, 🌱→🌟; RO/EN/RU): `hive/` → https://catalonec1.github.io/Gr-dina-de-stele/hive/ · teste: `node hive/tests/run.js` · capturi: `node hive/tools/shots.js`

## Versiuni
- **v1.2** (2026-11-06): a 9-a stea, Galaxia spirală (cu brațe animate și 3 îmbunătățiri), ploi de meteori la ~10 min (30 s de comete dese, 25% aur), misiune zilnică nouă „prinde o cometă de aur”, 4 trofee noi (23 în total). Teste: `node tests/v12.js`.
- **v1.1** (2026-11-05): stele noi Pulsar și Quasar, 19 trofee (+2% lumină fiecare, păstrate la renaștere), comete de aur (x5), cumpărare x1 / x10 / Max, statistici, Space/Enter pe desktop, sufixe pentru numere mari. Bugfix: acord RU la misiuni, setarea de sunet nu se mai salvează greșit în timpul reclamelor, insigna „Zilnic” se actualizează la miezul nopții, mesaj „Noutăți” pentru jucătorii vechi.
- **v1.0** (2026-11-04): lansare.
