# Publicare: pas cu pas

Fișierul de urcat pe toate platformele: `launch/gradina-de-stele-web.zip` (conține `index.html` și folderul `music/`).
Textele de copiat sunt în `launch/store-texts.md`. Imaginile: `cover-630x500.png` și `screenshot-*.png`.

## 1. itch.io (gratuit, donații)
1. Cont: https://itch.io/register, apoi Dashboard → **Create new project**.
2. Câmpuri:
   - Title: `Star Garden`
   - Project URL: `star-garden`
   - Short description: din store-texts.md (EN)
   - Classification: **Games** · Kind of project: **HTML**
   - Release status: **Released**
   - Pricing: **No payments** sau **Donate** (recomandat: Donate, suggested 2 USD)
   - Uploads: urcă zip-ul și bifează **This file will be played in the browser**
   - Embed options: Viewport **540 × 960**, bifează **Mobile friendly** (Orientation: Portrait), **Fullscreen button**
   - Description: descrierea lungă din store-texts.md
   - Genre: **Simulation** · Tags: idle, clicker, incremental, casual, relaxing, space
   - Cover image: `cover-630x500.png` · Screenshots: `screenshot-*.png`
   - Visibility: **Public** → Save
3. Plățile (pentru donații) se setează în Settings → Payouts, cu datele tale.

## 2. CrazyGames (venit din reclame)
1. Cont de dezvoltator: https://developer.crazygames.com → **Submit game**.
2. Câmpuri:
   - Name: `Star Garden` · Engine: **HTML5** · upload: zip-ul
   - Orientation: **Both** / mobil compatibil: **Yes**
   - Description, controls, tags: din store-texts.md
   - Cover + screenshots: din `launch/`
3. Jocul pornește ca **Basic Launch** (fără reclame). Dacă CrazyGames îl selectează pentru **Full Launch**,
   reclamele sunt deja integrate: pe domeniul CrazyGames jocul folosește automat SDK-ul v3
   (reclamă recompensată la „Lumină x2”, reclamă scurtă după Renaștere, maxim una la 3 minute).
4. Datele de plată se completează în portal, cu datele tale.

## 3. Poki (opțional, mai târziu)
Poki selectează jocurile. Se aplică pe https://developers.poki.com după ce avem date de joc
de pe itch.io și CrazyGames. Necesită SDK-ul Poki (îl integrez când e cazul).

## 4. GitHub Pages (deja activ)
https://catalonec1.github.io/Gr-dina-de-stele/ — se actualizează singur la fiecare push pe `main`, după ce trec testele.
