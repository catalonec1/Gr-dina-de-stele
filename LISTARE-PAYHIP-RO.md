# Listare pe Payhip — pași

## Ce faci tu (o singură dată)
1. Cont gratuit: https://payhip.com/signup (plan Free Forever: fără abonament, 5% comision Payhip pe vânzare + comisionul PayPal/Stripe).
2. Settings → Payment: conectează **PayPal** (merge din RO și MD). Stripe doar dacă încasezi în RO.
3. Nume magazin propus: **Star Garden Learning**.

## Produse (Claude completează formularele; tu dai upload la fișiere și Publish)
Pentru fiecare: Products → Add product → Digital product.
- **Name / Description**: din `products/<produs>/description.txt` (primul rând = titlul).
- **Price**: din tabel.
- **Images**: toate din `products/<produs>/images/` (ordinea 01, 02, 03…).
- **File**: fișierul din coloana „Upload”.

| Ordine | Produs | Upload | Preț |
|---|---|---|---|
| 1 | Math Worksheets Ages 5-8 | `products/math-practice/math-practice.zip` | $4.99 |
| 2 | Alphabet Tracing Worksheets | `products/alphabet-tracing/alphabet-tracing.zip` | $3.99 |
| 3 | Free Sample (preț 0) | `products/free-sample/files/Free-Sample-Worksheets.pdf` | $0 |
| 4 | Budget Planner Spreadsheet | `products/budget-planner/budget-planner.zip` | $4.99 |
| 5 | Habit Tracker Spreadsheet | `products/habit-tracker/habit-tracker.zip` | $2.99 |
| 6 | Bundle Math + Alphabet (din produsele 1 și 2) | — | $6.99 |

Fișierele pentru upload trebuie să fie pe calculatorul tău: descarcă-le din folderul proiectului (Library) într-un folder, de ex. `Descărcări/payhip`.

## De știut
- Payhip nu interzice conținut generat cu AI în lista lui de produse interzise (help.payhip.com, articolul 205). Oricum, aici totul e generat din cod (fără imagini AI); fontul Andika are licență OFL care permite folosirea în produse comerciale.
- Licența pentru cumpărători: uz personal / o singură clasă (scris în fiecare fișier și descriere).
- Veniturile se declară după regulile fiscale din țara în care încasezi; nu am verificat regulile fiscale pentru tine.
- Nu există estimări de vânzări; vom vedea cifrele reale în Payhip → Dashboard.
