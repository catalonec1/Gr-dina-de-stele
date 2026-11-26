# Pebble Putt

Minigolf-puzzle original, văzut de sus. Tragi înapoi de oriunde pe ecran, ții direcția și dai drumul; pietricica ricoșează din pereți până în gaură.

- 30 de trasee făcute de mână în 3 lumi: Pajiștea cu trifoi (pereți, ciuperci), Dunele însorite (nisip, apă, pante), Grădina lunii (portaluri, pereți mobili, trambuline).
- Fiecare mecanică nouă are un sfat la prima apariție; primul traseu are un deget animat care arată gestul.
- 1–3 stele după par, 8 pietricele deblocate cu stele, „Sari traseul” după par+5 lovituri.
- Meniu cu traseu demo animat, efecte (urmă, confetti, stropi, nisip), sunete și muzică sintetizate, vibrații.
- RO/EN/RU, mobil + desktop, tastatură (← → direcție, ↑ ↓ forță, Spațiu, R, Esc). Fără reclame, fără date personale.

Teste: `CHROME_PATH=/opt/pw-browsers/chromium node putt/tests/run.js` (51 de teste, inclusiv un bot care termină fiecare traseu în par și unul cu imprecizie umană).
Capturi și coperți: `node putt/tools/shots.js` → `putt/launch/` (zip pentru itch: `pebble-putt-web.zip`).
Unelte de echilibrare: `node putt/tools/noisy.js`, `node putt/tools/peek.js 1,2,3`.

## Note de versiune v1.3 (decembrie 2026)

Teste noi: `node putt/tests/v13.js` (17: pietricele noi, migrare salvare v1.2, Noutăți o singură dată, RO/EN/RU, fără erori JS).

**EN (Amazon „What's new” / itch devlog / GamePix):**
v1.3 — Two winter pebbles! Snowball (25★) and Icicle (60★) leave a sparkly snowflake trail as they roll. Your holes, stars and pebbles are kept.

**RO:**
v1.3 — Două pietricele de iarnă! Bulgăre (25★) și Țurțure (60★) lasă în urmă fulgi sclipitori când se rostogolesc. Traseele, stelele și pietricelele se păstrează.

**RU:**
v1.3 — Два зимних камешка! «Снежок» (25★) и «Сосулька» (60★) оставляют сверкающий снежный след. Лунки, звёзды и камешки сохраняются.
