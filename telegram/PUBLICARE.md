# Orbita licuriciului: publicare ca Telegram Mini App

Joc original, cu o singură atingere: licuriciul se rotește în jurul unui felinar și sare între 3 inele. Culege picături de lumină (scântei) și ocolește moliile. Limbi: RO / EN / RU, alese după limba din Telegram.

## Ce e gata

| Parte | Fișier | Stare |
|---|---|---|
| Joc (canvas, HUD, magazin, termeni) | `index.html`, `core.js` | gata, testat |
| Salvare în Telegram CloudStorage + localStorage | `index.html` | gata |
| Reclame recompensate Adsgram (continuare o dată pe tură, cadou zilnic +50) | `index.html` | gata, aștept `ADSGRAM_BLOCK_ID` |
| Plăți Telegram Stars (XTR): Aurora+Jar 50 ⭐, Scântei ×2 100 ⭐, 10 scuturi 25 ⭐ | `bot/worker.js` | gata, aștept botul și Worker-ul |
| Bot: /start cu buton de joc, /terms, /paysupport, pre_checkout, successful_payment | `bot/worker.js` | gata |
| Verificarea semnăturii `initData` (HMAC-SHA256, „WebAppData”) | `bot/worker.js` | gata |
| Teste automate (32: logică, bot, browser cu Telegram simulat) | `tests/run.mjs` | trec |

Fără bot sau fără Adsgram configurate, jocul merge, iar butoanele plătite sunt ascunse.

## Pașii lui Dragos (doar ce nu pot face eu)

1. **Botul (2 minute).** În Telegram, la @BotFather: `/newbot`, un nume (ex. „Orbita licuriciului”) și un username care se termină în `bot`. Trimite-mi tokenul primit. Recomandat: verificarea în doi pași pe contul tău Telegram (cerută de Telegram pentru boții cu plăți).
2. **Cloudflare (gratuit).** Fă-ți cont pe dash.cloudflare.com și rămâi logat în Chrome. Restul (Worker, KV, secrete, webhook) îl fac eu prin browser.
3. **Adsgram.** Intră pe partner.adsgram.ai cu Telegram. După ce jocul e live, eu adaug aplicația și blocul de reclamă; tu confirmi doar contul și portofelul de plată.
4. **OK pentru publicare.** Merge-ul PR-ului pune jocul pe `https://catalonec1.github.io/Gr-dina-de-stele/telegram/`.

## Ce fac eu după ce am tokenul

1. Creez Worker-ul `orbita-bot` cu `bot/worker.js`, KV-ul `PURCHASES`, secretul `BOT_TOKEN` (îl lipește Dragos; secretul webhook-ului se derivă din el).
2. Deschid `https://<worker>/setup`: setează webhook-ul, comenzile și butonul „Play” din meniul botului.
3. Completez `config.js` (`API_BASE`, `ADSGRAM_BLOCK_ID`), rulez testele, fac commit și PR.
4. La BotFather: `/newapp` pentru linkul direct `t.me/<bot>/play`, cu descriere și imagine.

## Bani: ce am verificat (nu sunt estimări de venit)

- **Stars:** pentru bunuri digitale în Mini Apps, Telegram cere Stars (`currency: "XTR"`, `provider_token` gol); botul trebuie să răspundă la `pre_checkout_query` în 10 secunde și să ofere `/paysupport` și termeni. Sursă: https://core.telegram.org/bots/payments-stars
- **Retragere Stars:** prin Fragment, în TON. Un ghid terț (nu documentația oficială) spune: minimum 1.000 Stars, fiecare Star trebuie să aibă 21 de zile. Sursă: https://dev.to/starsearn/how-telegram-creators-cash-out-stars-the-complete-2026-withdrawal-guide-dko. Fragment folosește verificare de identitate prin Sumsub (act + selfie). Nu am găsit o regulă oficială care să excludă RO sau MD; se verifică la prima retragere.
- **Adsgram:** plătește în USDT pe rețeaua TON; minim 100 USD oricând sau minim 10 USD între 1 și 5 ale lunii; plata în 24–48 h; moderarea cere ca aplicația să funcționeze în momentul verificării. Sursă: https://adsgram.ai/blog/adsgram/adsgram-and-hilltopads-for-publishers-formats-requirements-and-payouts
- Ambele căi plătesc în cripto (TON / USDT), deci ai nevoie de un portofel TON (ex. Tonkeeper sau @wallet din Telegram).

## Rulare teste

```
node tests/run.mjs
```

Necesită Node 20+ și Playwright cu Chromium. Capturile ajung în `tests/out/`.
