"""Automatic checks for every Payhip product. Run after generator/build.py.

python3 tests/test_products.py      -> exit 0 when all checks pass
"""
import glob
import json
import os
import re
import subprocess
import sys
import tempfile
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(ROOT, "generator"))

from fontTools.ttLib import TTFont  # noqa: E402
from PIL import Image  # noqa: E402
from pypdf import PdfReader  # noqa: E402

import i18n  # noqa: E402

SIZES = {"A4": (595.28, 841.89), "Letter": (612.0, 792.0)}
SAFE_IN = 0.30  # no ink closer than this to the paper edge (home printers need ~0.25 in)

results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))


def pdf_fonts_embedded(path):
    out = subprocess.run(["pdffonts", path], capture_output=True, text=True).stdout.splitlines()[2:]
    return out and all(re.split(r"\s+", l.strip())[-5] == "yes" for l in out if l.strip())


def ink_margin_ok(path, dpi=24):
    tmp = tempfile.mkdtemp()
    subprocess.run(["pdftoppm", "-r", str(dpi), "-gray", path, os.path.join(tmp, "p")], check=True)
    bad = []
    m = int(SAFE_IN * dpi)
    for f in sorted(glob.glob(os.path.join(tmp, "p*.pgm"))):
        im = Image.open(f)
        w, h = im.size
        px = im.load()
        for y in range(h):
            for x in list(range(m)) + list(range(w - m, w)):
                if px[x, y] < 200:
                    bad.append(os.path.basename(f))
                    break
            else:
                continue
            break
        else:
            for y in list(range(m)) + list(range(h - m, h)):
                if any(px[x, y] < 200 for x in range(w)):
                    bad.append(os.path.basename(f))
                    break
        os.remove(f)
    return bad


def main():
    meta = json.load(open(os.path.join(ROOT, "products", "build.json")))
    cmap = TTFont(os.path.join(ROOT, "fonts", "Andika-Regular.ttf")).getBestCmap()
    cmap_b = TTFont(os.path.join(ROOT, "fonts", "Andika-Bold.ttf")).getBestCmap()

    # ---- glyph coverage for every string we print
    chars = set("0123456789+−=<>:)·–— ")
    for lang in i18n.LANGS:
        for v in i18n.T[lang].values():
            chars |= set("".join(v) if isinstance(v, list) else v)
        for u, l, w in i18n.ALPHABET[lang]:
            chars |= set(u + l + w)
    missing = sorted(ch for ch in chars if ord(ch) not in cmap or ord(ch) not in cmap_b)
    check("font covers every printed character", not missing, "".join(missing))

    # ---- Romanian: comma-below only; Russian: no Latin look-alikes in words
    ro_text = json.dumps(i18n.T["ro"], ensure_ascii=False) + json.dumps(i18n.ALPHABET["ro"], ensure_ascii=False)
    check("RO uses ș/ț with comma below (no cedilla ş/ţ)", not re.search("[şţŞŢ]", ro_text))
    ru_words = "".join(u + l + w for u, l, w in i18n.ALPHABET["ru"])
    check("RU alphabet words are pure Cyrillic", not re.search("[A-Za-z]", ru_words))
    for lang, n in (("en", 26), ("ro", 31), ("ru", 33)):
        al = i18n.ALPHABET[lang]
        check("%s alphabet has %d letters" % (lang, n), len(al) == n and len({a[0] for a in al}) == n)
        bad = [w for u, l, w in al if l not in w.lower()]
        check("%s every word contains its letter" % lang, not bad, str(bad))
        check("%s upper/lower pairs match" % lang, all(u.lower() == l for u, l, _ in al))

    # ---- PDFs: size, page count, fonts, margins
    for prod, info in meta["products"].items():
        counts = info["page_counts"]
        for rel in info["pdfs"]:
            p = os.path.join(ROOT, rel)
            check("%s exists" % rel, os.path.isfile(p))
            r = PdfReader(p)
            size = "Letter" if "Letter" in rel else "A4"
            ok = all(abs(float(pg.mediabox.width) - SIZES[size][0]) < 1 and abs(float(pg.mediabox.height) - SIZES[size][1]) < 1 for pg in r.pages)
            check("%s page size %s" % (rel, size), ok)
            key = [k for k in counts if k.endswith(size) and k.split("-")[0].upper() + "-" in os.path.basename(rel).upper() + "-"] or list(counts)
            check("%s page count" % rel, len(r.pages) == counts.get(key[0], len(r.pages)) and len(r.pages) >= 6, str(len(r.pages)))
            check("%s fonts embedded" % rel, pdf_fonts_embedded(p))
            if size == "A4" or prod != "free-sample":
                bad = ink_margin_ok(p)
                check("%s no ink within %.2f in of edge" % (rel, SAFE_IN), not bad, str(bad[:5]))
            check("%s has title metadata" % rel, bool(r.metadata and r.metadata.title))

    # ---- math content
    mp = meta["products"]["math-practice"]
    pages = mp["pages"]
    for i, pg in enumerate(pages, start=1):
        k, it = pg["kind"], pg["items"]
        title = pg.get("title")
        if k == "count":
            check("p%d count: n matches slots, n<=20" % i, all(x["n"] == len(set(x["slots"])) and 1 <= x["n"] <= 20 and max(x["slots"]) < 20 for x in it))
        if k in ("eq", "col", "add_pic", "sub_pic"):
            keys = [(x["a"], x["b"]) for x in it]
            check("p%d no duplicate problems" % i, len(keys) == len(set(keys)))
        if title == "add10":
            check("p%d sums <= 10" % i, all(x["a"] + x["b"] <= 10 and x["b"] >= 0 for x in it))
        if title == "add20":
            check("p%d sums 11..20" % i, all(11 <= x["a"] + x["b"] <= 20 and x["a"] <= 10 and x["b"] <= 10 for x in it))
        if title in ("sub10", "sub20"):
            lim = 10 if title == "sub10" else 20
            check("p%d subtraction non-negative, <= %d" % (i, lim), all(0 <= x["a"] - x["b"] and x["a"] <= lim for x in it))
        if k == "col":
            check("p%d column addition: 2-digit, no carrying" % i, all(10 <= x["a"] <= 99 and x["a"] % 10 + x["b"] % 10 < 10 and x["a"] + x["b"] < 100 for x in it))
        if k == "add_pic":
            check("p%d picture addition <= 10" % i, all(1 <= x["a"] <= 5 and 1 <= x["b"] <= 5 for x in it))
        if k == "sub_pic":
            check("p%d take-away leaves >= 1" % i, all(1 <= x["b"] < x["a"] <= 10 for x in it))
        if k == "bonds":
            check("p%d number bonds valid" % i, all(1 <= x["part"] < x["whole"] for x in it))
        if k == "compare":
            check("p%d compare has all three signs or two" % i, len({"<" if x["a"] < x["b"] else ">" if x["a"] > x["b"] else "=" for x in it}) >= 2)
        if k == "missing":
            ok = True
            for x in it:
                s = x["seq"]
                d = s[1] - s[0]
                ok &= all(s[j + 1] - s[j] == d for j in range(len(s) - 1)) and min(s) >= 0 and len(x["blanks"]) >= 2 and 0 not in x["blanks"]
                if pg.get("skip"):
                    ok &= d == x["step"] and all(v % x["step"] == 0 for v in s)
            check("p%d sequences arithmetic, first number shown" % i, ok)
        if k in ("clock", "draw_clock"):
            check("p%d clock times valid" % i, all(1 <= x["h"] <= 12 and x["m"] in (0, 30) for x in it) and len({(x["h"], x["m"]) for x in it}) == len(it))
        if k == "trace":
            check("p%d trace numbers 0..20" % i, all(0 <= n <= 20 for n in it))
    traced = sorted(n for pg in pages if pg["kind"] == "trace" for n in pg["items"])
    check("numbers 0..20 traced exactly once", traced == list(range(21)))
    with_ans = [i for i, pg in enumerate(pages, start=1) if mp["answers"][str(i)]]
    for lang in i18n.LANGS:
        p = os.path.join(ROOT, "products", "math-practice", "files", "Math-Practice-%s-A4.pdf" % lang.upper())
        r = PdfReader(p)
        text = "".join(r.pages[j].extract_text() for j in range(len(pages), len(r.pages)))
        word = i18n.T[lang]["page"]
        found = [int(n) for n in re.findall(re.escape(word) + r"\s*(\d+)", text)]
        check("math %s answer key lists every answer page" % lang, found == with_ans, "%s vs %s" % (found, with_ans))
        t1 = r.pages[0].extract_text()
        check("math %s cover has localized title" % lang, i18n.T[lang]["math_title"].split()[0] in t1)

    # ---- alphabet content
    for lang in i18n.LANGS:
        rows = meta["products"]["alphabet-tracing"]["find_rows"][lang]
        al = i18n.ALPHABET[lang]
        ok = all(sum(1 for ch in row if ch.lower() == al[j][1]) == 4 for j, row in enumerate(rows))
        check("alphabet %s find-the-letter rows have exactly 4 targets" % lang, ok)
        p = os.path.join(ROOT, "products", "alphabet-tracing", "files", "Alphabet-Tracing-%s-A4.pdf" % lang.upper())
        r = PdfReader(p)
        check("alphabet %s pages = letters + 4" % lang, len(r.pages) == len(al) + 4, str(len(r.pages)))
        miss = [w for j, (u, l, w) in enumerate(al) if w.replace("-", "") not in r.pages[2 + j].extract_text().replace("-", "").replace(" ", "")]
        check("alphabet %s each letter page shows its word" % lang, not miss, str(miss))

    # ---- zips and images
    for prod in ("math-practice", "alphabet-tracing"):
        z = os.path.join(ROOT, "products", prod, prod + ".zip")
        names = zipfile.ZipFile(z).namelist()
        check("%s.zip has 6 PDFs + README + OFL" % prod, sum(n.endswith(".pdf") for n in names) == 6 and "README.txt" in names and "OFL.txt" in names, str(names))
        check("%s.zip under 25 MB" % prod, os.path.getsize(z) < 25e6, str(os.path.getsize(z)))
    for img in glob.glob(os.path.join(ROOT, "products", "*", "images", "*.png")):
        im = Image.open(img)
        check("%s is 1600x1000" % os.path.relpath(img, ROOT), im.size == (1600, 1000))

    # ---- listings
    for lf in glob.glob(os.path.join(ROOT, "products", "*", "listing.json")):
        L = json.load(open(lf))
        name = os.path.relpath(lf, ROOT)
        check("%s title <= 100 chars" % name, 0 < len(L["title"]) <= 100, str(len(L["title"])))
        check("%s has price" % name, isinstance(L["price_usd"], (int, float)) and L["price_usd"] >= 0)
        check("%s description non-empty, no placeholders" % name, len(L["description"]) > 200 and "TODO" not in L["description"] and "{" not in L["description"])
        for f in L.get("files", []) + L.get("images", []):
            check("%s file exists: %s" % (name, f), os.path.isfile(os.path.join(ROOT, f)))

    failed = [r for r in results if not r[1]]
    for n, ok, d in results:
        if not ok:
            print("FAIL", n, d)
    print("%d checks, %d failed" % (len(results), len(failed)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
