"""Write listing.json (EN store texts) for each Payhip product. Run after build.py."""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
P = os.path.join(ROOT, "products")
meta = json.load(open(os.path.join(P, "build.json")))
mc = meta["products"]["math-practice"]["page_counts"]
ac = meta["products"]["alphabet-tracing"]["page_counts"]

LICENSE = ("Licence: for personal use and for use in one classroom. "
           "Please do not resell, share or upload the files elsewhere.")
FORMAT = ("Instant download: one ZIP with PDF files in A4 and US Letter. "
          "Print at 100% (\"Actual size\") on any home printer. No physical product will be shipped.")

listings = {
    "math-practice": {
        "title": "Math Worksheets Ages 5-8 | English, Romanian, Russian | Printable PDF",
        "price_usd": 4.99,
        "description": "\n".join([
            "A calm, no-prep math workbook for kids aged 5 to 8, in three languages: English, Romanian (română) and Russian (русский). "
            "Every language has the same %d pages, so bilingual families can practise the same exercise in either language." % mc["en-A4"],
            "",
            "What's inside (per language):",
            "• Number tracing 0–20 with dot pictures",
            "• Count and write (4 pages, up to 20)",
            "• Picture addition and take-away",
            "• Addition and subtraction up to 10 and up to 20",
            "• Column addition with two-digit numbers (no carrying)",
            "• Number bonds, compare numbers (<, >, =)",
            "• Missing numbers and skip counting by 2, 5 and 10",
            "• Telling time: o'clock and half past (read and draw)",
            "• Note for grown-ups, certificate, and a full answer key",
            "",
            "Black-and-white, printer friendly, large clear font designed for early readers (Andika).",
            "",
            FORMAT,
            LICENSE,
        ]),
        "files": ["products/math-practice/math-practice.zip"],
        "images": ["products/math-practice/images/01-cover.png", "products/math-practice/images/02-inside.png",
                   "products/math-practice/images/03-inside.png", "products/math-practice/images/04-languages.png"],
        "seo_keywords": ["math worksheets", "kindergarten math", "first grade math", "romanian worksheets",
                         "russian worksheets", "bilingual kids", "homeschool printable", "addition subtraction"],
    },
    "alphabet-tracing": {
        "title": "Alphabet Tracing Worksheets | English, Romanian & Russian Alphabet | PDF",
        "price_usd": 3.99,
        "description": "\n".join([
            "Letter tracing pages for children aged 4 to 7, for three alphabets: English (26 letters), "
            "Romanian with Ă Â Î Ș Ț (31 letters) and Russian Cyrillic (33 letters).",
            "",
            "Every letter gets its own page:",
            "• A big hollow letter to colour",
            "• A simple word with the letter highlighted",
            "• Find-and-circle the letter",
            "• Trace the capital, the small letter and the word on handwriting lines",
            "• One empty line to write alone",
            "",
            "Also included: a note for grown-ups, an alphabet chart and a certificate in each language "
            "(%d + %d + %d pages)." % (ac["en-A4"], ac["ro-A4"], ac["ru-A4"]),
            "",
            "Great for bilingual families, Romanian and Russian schools abroad, and homeschool.",
            "",
            FORMAT,
            LICENSE,
        ]),
        "files": ["products/alphabet-tracing/alphabet-tracing.zip"],
        "images": ["products/alphabet-tracing/images/01-cover.png", "products/alphabet-tracing/images/02-inside.png",
                   "products/alphabet-tracing/images/03-inside.png"],
        "seo_keywords": ["alphabet tracing", "romanian alphabet", "russian alphabet", "cyrillic tracing",
                         "letter tracing", "preschool printable", "bilingual kids", "homeschool"],
    },
    "bundle": {
        "title": "Math + Alphabet Worksheet Bundle | English, Romanian, Russian",
        "price_usd": 6.99,
        "description": "\n".join([
            "Both packs together at a lower price than buying them separately:",
            "• Math Worksheets Ages 5-8 (%d pages per language)" % mc["en-A4"],
            "• Alphabet Tracing Worksheets (English 26, Romanian 31, Russian 33 letters)",
            "",
            "Each pack comes in English, Romanian and Russian, in A4 and US Letter. "
            "Black-and-white and printer friendly, with a clear font designed for early readers.",
            "",
            FORMAT,
            LICENSE,
        ]),
        "files": [],
        "bundle_of": ["math-practice", "alphabet-tracing"],
        "images": ["products/bundle/images/01-cover.png"],
        "seo_keywords": ["worksheet bundle", "bilingual kids", "romanian", "russian", "homeschool"],
    },
    "free-sample": {
        "title": "Free Sample: Math & Alphabet Worksheets (EN / RO / RU)",
        "price_usd": 0,
        "description": "\n".join([
            "Try before you buy: 6 free printable pages from our worksheet packs.",
            "• Math: cover, number tracing, addition up to 10",
            "• Alphabet: letter A in English, Romanian and Russian",
            "",
            "If your child enjoys them, the full packs have 33 math pages and a page for every letter, "
            "in three languages, with A4 and US Letter versions.",
            "",
            "Instant download, PDF, A4. For personal and classroom use. Please do not resell or share the file.",
        ]),
        "files": ["products/free-sample/files/Free-Sample-Worksheets.pdf"],
        "images": ["products/free-sample/images/01-cover.png"],
        "seo_keywords": ["free worksheets", "free printable", "bilingual kids"],
    },
}

for slug, L in listings.items():
    d = os.path.join(P, slug)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "listing.json"), "w") as fh:
        json.dump(L, fh, ensure_ascii=False, indent=1)
    with open(os.path.join(d, "description.txt"), "w") as fh:
        fh.write(L["title"] + "\n\n" + L["description"] + "\n")
print("ok", list(listings))
