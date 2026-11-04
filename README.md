# Payhip printables (Star Garden Learning)

Code-generated digital products for Payhip, in English, Romanian and Russian.
No AI images: all art is vector code, the font is Andika (SIL OFL 1.1, `fonts/OFL.txt`).

| Product | Folder | Upload file | Price |
|---|---|---|---|
| Math Worksheets 5-8 (33 p./lang, A4+Letter) | `products/math-practice` | `math-practice.zip` | $4.99 |
| Alphabet Tracing EN/RO/RU | `products/alphabet-tracing` | `alphabet-tracing.zip` | $3.99 |
| Bundle (both packs) | `products/bundle` | (Payhip bundle) | $6.99 |
| Free sample (6 p.) | `products/free-sample` | `files/Free-Sample-Worksheets.pdf` | $0 |
| Budget Planner (xlsx) | `products/budget-planner` | `budget-planner.zip` | $4.99 |
| Habit Tracker (xlsx) | `products/habit-tracker` | `habit-tracker.zip` | $2.99 |

Each product folder has `listing.json`, `description.txt` (title + text to paste) and `images/` (1600x1000 PNG).

```
./run_all.sh     # rebuild everything + 249 automatic checks
```

- `generator/` math_pack, alphabet_pack (PDF, ReportLab), sheets (openpyxl), build*, listings
- `tests/test_products.py` page sizes, embedded fonts, print margins, glyph coverage, maths correctness, answer key, listings
- `tests/test_sheets.py` fills the spreadsheets with sample data, recalculates them in LibreOffice and checks every total

New math volume: change `SEED` in `generator/build.py`. Requires python3, reportlab, pypdf, Pillow, fonttools, openpyxl, poppler-utils, LibreOffice.
Upload guide (RO): `LISTARE-PAYHIP-RO.md`.
