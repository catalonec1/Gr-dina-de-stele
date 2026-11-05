# Paper River

Joc arcade HTML5 original, un singur fișier (`index.html`), RO / EN / RU, pentru mobil și desktop.

Condu o bărcuță de hârtie pe un râu infinit la apus: adună felinare 🏮, ocolește stâncile și buștenii, prinde lotusul (scut) și steaua (magnet). Felinarele cumpără bărci noi (6) sau o continuare. „Râul zilei” are același traseu pentru toți, toată ziua.

- Control: tragi stânga/dreapta (deget sau mouse), tastatură A/D sau ←/→, Esc/P pauză.
- Râul e generat determinist dintr-un seed; generatorul garantează mereu o trecere accesibilă (verificat de un pilot automat 12 × 3 minute).
- Teste: `node river/tests/run.js` (Playwright; `CHROME_PATH=...` opțional)
- Capturi și coperți: `node river/tools/shots.js` → `river/launch/`
- Live: https://catalonec1.github.io/Gr-dina-de-stele/river/ (după merge în `main`)
