# Otter Glide

Puzzle original cu alunecare pe gheață. Glisezi, vidra alunecă până se lovește de o piatră; prinzi toți peștii și intri în vizuină.

- 60 de iazuri în 4 lumi: Prima gheață, Pești de prins (vizuina se deschide după toți peștii), Nămeți (te opresc pe loc), Gheață subțire (gheața crăpată devine apă după o trecere).
- Iazurile sunt generate determinist; „ideal” = soluția minimă găsită prin BFS (3 stele la ideal, 2 la ideal+3, maxim 2 cu indiciu).
- Iazul zilei (același pentru toți, serie 🔥), indicii, ↶ înapoi, ↺ restart, cadou zilnic +2 indicii, 6 fulare deblocate cu stele.
- RO/EN/RU, mobil (glisare sau atingere lângă vidră) + desktop (săgeți/WASD, Z, H, R, Esc). Fără reclame, fără date personale.

Teste: `CHROME_PATH=/opt/pw-browsers/chromium node glide/tests/run.js` (43). Capturi și coperți: `node glide/tools/shots.js` → `glide/launch/`.

## Update v1.2

Teste noi: `node glide/tests/v12.js` (16: fulare noi, migrarea unei salvări v1.1, deblocare după un iaz rezolvat cu soluția verificată, Noutăți o singură dată, RO/EN/RU, zero erori JS). `node glide/tests/run.js` (45) trece.

**EN (What's new):** Two holiday scarves for your otter: Candy Cane (120★) and Frosty Mint (170★). Your ponds, stars and streak carry over.

**RO (Noutăți):** Două fulare de sărbători pentru vidră: Acadea (120★) și Mentă înghețată (170★). Iazurile, stelele și seria ta rămân neschimbate.

**RU (Что нового):** Два праздничных шарфа для выдры: «Леденец» (120★) и «Морозная мята» (170★). Ваши пруды, звёзды и серия сохраняются.
