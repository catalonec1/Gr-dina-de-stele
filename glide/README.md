# Otter Glide

Puzzle original cu alunecare pe gheață. Glisezi, vidra alunecă până se lovește de o piatră; prinzi toți peștii și intri în vizuină.

- 60 de iazuri în 4 lumi: Prima gheață, Pești de prins (vizuina se deschide după toți peștii), Nămeți (te opresc pe loc), Gheață subțire (gheața crăpată devine apă după o trecere).
- Iazurile sunt generate determinist; „ideal” = soluția minimă găsită prin BFS (3 stele la ideal, 2 la ideal+3, maxim 2 cu indiciu).
- Iazul zilei (același pentru toți, serie 🔥), indicii, ↶ înapoi, ↺ restart, cadou zilnic +2 indicii, 6 fulare deblocate cu stele.
- RO/EN/RU, mobil (glisare sau atingere lângă vidră) + desktop (săgeți/WASD, Z, H, R, Esc). Fără reclame, fără date personale.

Teste: `CHROME_PATH=/opt/pw-browsers/chromium node glide/tests/run.js` (43). Capturi și coperți: `node glide/tools/shots.js` → `glide/launch/`.
