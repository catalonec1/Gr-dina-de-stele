# Publicare: pas cu pas

Build-urile se fac cu `node tools/build.js` → `dist/<platformă>.zip`. Copii gata de urcat: `launch/builds/` din folderul proiectului.
Textele de copiat: `launch/store-texts.md`. Imagini: `launch/cover-630x500.png`, `launch/screenshot-*.png`.

| Platformă | Fișier | Reclame | Ce face Dragos |
| --- | --- | --- | --- |
| GitHub Pages | automat din CI | nu | nimic |
| itch.io | `itch.zip` | nu (donații) | urcă zip + copertă, Save |
| CrazyGames | `crazygames.zip` | SDK v3 (rewarded + midgame) | cont dezvoltator, urcă zip |
| GameDistribution | `gamedistribution.zip` | SDK GD | cont, creează jocul, îmi dă Game ID |
| Poki | `poki.zip` | SDK Poki v2 | aplică pe Poki for Developers |
| Microsoft Store | PWA de pe GitHub Pages → MSIX (PWABuilder) | nu | cont Partner Center + verificare identitate |

## 1. itch.io
1. Dashboard → Create new project (formularul l-a completat Claude).
2. Uploads → `itch.zip` → bifează „This file will be played in the browser”.
3. Upload Cover Image → `cover-630x500.png`. Save. Apoi Visibility: Public.

## 2. CrazyGames
1. https://developer.crazygames.com → Submit game → `crazygames.zip`.
2. Basic Launch fără reclame; la Full Launch reclamele sunt deja integrate.

## 3. GameDistribution
1. Cont de dezvoltator: https://gamedistribution.com/ (Developers → Sign up).
2. Upload game → completează titlul, descrierea, imaginile (din launch/).
3. După creare, copiază **Game ID** și trimite-l lui Claude: el reface build-ul (`GD_GAME_ID=... node tools/build.js`)
   și îți dă `gamedistribution.zip` final de urcat.

## 4. Poki
1. Aplicare: https://developers.poki.com (Poki for Developers) cu link-ul jocului de pe GitHub Pages.
2. Poki selectează jocurile. Dacă e acceptat, se urcă `poki.zip` (SDK-ul Poki e deja integrat).

## 5. Microsoft Store (aplicație Windows din PWA)
1. Cont Partner Center: https://partner.microsoft.com/dashboard/registration (cont individual; verifică taxa curentă la înregistrare). Verificarea identității o face doar Dragos.
2. În Partner Center: Apps and games → New product → MSIX or PWA app → rezervă numele „Star Garden”.
3. Product identity: copiază Package ID, Publisher ID, Publisher display name.
4. https://www.pwabuilder.com → URL: https://catalonec1.github.io/Gr-dina-de-stele/ → Package for stores → Windows → introdu datele de la pasul 3 → descarcă pachetul.
5. Partner Center → submission → Packages: urcă `.msixbundle`; Store listing: texte din store-texts.md; Age rating: questionnaire (fără violență, fără chat, fără cumpărături).
Pașii 2–5 îi poate completa Claude în browserul tău, după ce contul e verificat.
