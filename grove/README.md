# Glowcap Grove

Puzzle original de noapte în pădure. Atingi o rădăcină ca s-o rotești și legi ciotul bătrân de toate ciupercile; când nu mai rămâne niciun capăt liber, toată poiana strălucește.

- 60 de poieni în 4 lumi: Primele rădăcini, Pietre cu mușchi (celule fără rădăcini), Două rețele (două cioturi, ciuperci în două culori, rețelele nu se ating), Tuneluri (marginile se leagă).
- Poienile sunt generate determinist (rețea fără bucle, apoi rotite aleator); „ideal” = numărul minim de rotiri până la soluție (3 stele la ideal, 2 la ideal+30%, maxim 2 cu indiciu).
- Poiana zilei (aceeași pentru toți, serie 🔥), indicii (fixează o rădăcină la locul ei), ↶ înapoi, ↺ restart, cadou zilnic +2 indicii, 10 lumini deblocate cu stele (v1.1: Brumă și Lumina stelelor).
- RO/EN/RU, mobil (atingere) + desktop (click, săgeți + Space, Z, H, R, Esc). Fără reclame, fără date personale.

Teste: `node grove/tests/run.js` (50). Capturi și coperți: `node grove/tools/shots.js` → `grove/launch/`.

Teste v1.1: `node grove/tests/v11.js`. Teste v1.2: `node grove/tests/v12.js` (20: decor nou, migrare salvare v1.1, Noutăți o singură dată, RO/EN/RU, fără erori JS).

## Note de versiune v1.2 (decembrie 2026)

**EN (Amazon „What's new” / itch devlog / GamePix):**
v1.2 — Snowy Glade! A new winter scenery unlocks at ★ 30 (Settings → Scenery): snow falls over the forest, stones wear little snow caps and the ground turns frosty. Your progress, glows and streak are kept.

**RO:**
v1.2 — Poiana înzăpezită! Un decor nou de iarnă se deblochează la ★ 30 (Setări → Decor): ninge peste pădure, pietrele au căciulițe de zăpadă și pământul e brumat. Progresul, luminile și seria se păstrează.

**RU:**
v1.2 — Заснеженная поляна! Новый зимний декор открывается при ★ 30 (Настройки → Декор): над лесом идёт снег, на камнях снежные шапки, земля покрыта инеем. Прогресс, свечения и серия сохраняются.
