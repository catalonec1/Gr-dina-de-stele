# Nibble Trail

Al 11-lea joc original. Puzzle „dintr-o singură trăsătură”: omida mănâncă toate frunzele dintr-o plimbare, fără să-și taie drumul, apoi zboară ca fluture.

- Joc live: https://catalonec1.github.io/Gr-dina-de-stele/trail/
- Teste: `node trail/tests/run.js` (35 de verificări, inclusiv soluție validă pentru toate cele 60 de grădini)
- Capturi și coperți: `node trail/tools/shots.js` → `trail/launch/`
- Zip pentru portaluri: `trail/launch/nibble-trail-web.zip` (copie în `/mnt/project-files/portal-builds/`)

## Pagina itch (pregătită; itch e blocat de limita de 20 de proiecte)

- Titlu: **Nibble Trail**
- Tagline: *A cozy one-stroke puzzle: eat every leaf, never cross your trail, fly away as a butterfly.*
- Preț: gratuit + donație sugerată $1.99
- Tip: HTML, joacă în browser, viewport 405×720, mobile friendly, buton fullscreen
- Genre: Puzzle
- Tags: puzzle, cozy, casual, relaxing, cute, logic, minimalist, short, mobile, singleplayer
- Coperta: `launch/cover-630x500.png`; capturi: `launch/game-*.png`, `launch/levels-en.png`, `launch/menu-mobile-en.png`

### Descriere (EN)

A hungry little caterpillar wakes up in a spring garden. Guide it across the grid and eat **every leaf in one single walk**, without ever crossing your own trail. Eat the last leaf and it flutters away as a butterfly.

- **60 hand-tuned gardens** in 4 worlds: First Leaves, Pebbles, The Cocoon and Wild Berries
- **Daily Garden**: a fresh puzzle every day, with a streak counter
- Drag to move, drag back onto your body to undo; keyboard arrows / WASD work too
- Gentle hints when you're stuck, never a timer, never a fail screen
- Unlock new caterpillars with your stars
- Every garden is checked by a solver, so every one has a solution
- English, Romanian and Russian

Made with love by Star Garden Games.

## Update v1.1

Teste noi: `node trail/tests/v11.js` (21: omizi noi, migrarea unei salvări v1.0, deblocare la 110★ după o grădină rezolvată cu soluția generatorului, Noutăți o singură dată, RO/EN/RU, zero erori JS). `node trail/tests/run.js` (35) trece neschimbat.

**EN (What's new):** Winter is here! Two new caterpillars to unlock with stars: Snowflake (110★) and Garland (170★). Your gardens, stars and streak carry over.

**RO (Noutăți):** A venit iarna! Două omizi noi de deblocat cu stele: Fulg de nea (110★) și Ghirlandă (170★). Grădinile, stelele și seria ta rămân neschimbate.

**RU (Что нового):** Пришла зима! Две новые гусеницы за звёзды: «Снежинка» (110★) и «Гирлянда» (170★). Ваши сады, звёзды и серия сохраняются.
