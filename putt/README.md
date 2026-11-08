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
