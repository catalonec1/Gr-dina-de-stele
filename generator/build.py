"""Build every product: PDFs (EN/RO/RU x A4/Letter), zips, product images, build.json.

python3 generator/build.py            -> products/
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader, PdfWriter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import alphabet_pack  # noqa: E402
import math_pack  # noqa: E402
from i18n import LANGS, T  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, ".."))
OUT = os.path.join(ROOT, "products")
SIZES = ["A4", "Letter"]
SEED = 2026
FONT_R = os.path.join(ROOT, "fonts", "Andika-Regular.ttf")
FONT_B = os.path.join(ROOT, "fonts", "Andika-Bold.ttf")

BG = (247, 243, 233)
INK = (30, 34, 48)
ACC = (52, 90, 166)

README = {
    "math-practice": "Math Practice / Matematică distractivă / Весёлая математика\n"
    "Ages 5-8. Three languages (EN, RO, RU), each in A4 and US Letter.\n"
    "Print at 100% (\"Actual size\"). Answers are at the end of each file.\n"
    "Licence: personal and single-classroom use. Please do not resell or share the files.\n"
    "Font: Andika by SIL International, SIL Open Font License 1.1 (OFL.txt).\n",
    "alphabet-tracing": "Alphabet Tracing / Alfabetul de urmărit / Прописи: алфавит\n"
    "English (26 letters), Romanian (31 letters), Russian (33 letters), each in A4 and US Letter.\n"
    "Print at 100% (\"Actual size\").\n"
    "Licence: personal and single-classroom use. Please do not resell or share the files.\n"
    "Font: Andika by SIL International, SIL Open Font License 1.1 (OFL.txt).\n",
}


def raster(pdf, page, dpi, out_png):
    base = out_png[:-4]
    subprocess.run(["pdftoppm", "-r", str(dpi), "-png", "-singlefile", "-f", str(page), "-l", str(page), pdf, base], check=True)
    return Image.open(out_png).convert("RGB")


def card(im, w, shadow=10):
    """Page thumbnail with border + soft shadow."""
    im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    c = Image.new("RGBA", (im.width + shadow * 2, im.height + shadow * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(c)
    d.rectangle([shadow + 6, shadow + 6, shadow + im.width + 5, shadow + im.height + 5], fill=(0, 0, 0, 45))
    c.paste(im, (shadow, shadow))
    ImageDraw.Draw(c).rectangle([shadow, shadow, shadow + im.width - 1, shadow + im.height - 1], outline=(190, 190, 190), width=2)
    return c


def badge(d, x, y, text, font, fill=ACC):
    w = d.textlength(text, font=font)
    d.rounded_rectangle([x, y, x + w + 36, y + font.size + 24], radius=(font.size + 24) // 2, fill=fill)
    d.text((x + 18, y + 9), text, font=font, fill="white")
    return x + w + 36


def product_image(title, subtitle, covers, badges, path, size=(1600, 1000)):
    W, H = size
    img = Image.new("RGB", size, BG)
    d = ImageDraw.Draw(img)
    ft = ImageFont.truetype(FONT_B, 76)
    fs = ImageFont.truetype(FONT_R, 38)
    fb = ImageFont.truetype(FONT_B, 30)
    d.text((70, 50), title, font=ft, fill=INK)
    d.text((72, 150), subtitle, font=fs, fill=(70, 74, 90))
    x = 70
    for b in badges:
        x = badge(d, x, 220, b, fb) + 16
    n = len(covers)
    cw = int((W - 140 - (n - 1) * 40) / n)
    cw = min(cw, 470, int((H - 340) / 1.42))
    total = n * cw + (n - 1) * 40
    x0 = (W - total) // 2
    for i, im in enumerate(covers):
        c = card(im, cw)
        img.paste(c, (x0 + i * (cw + 40) - 10, 310), c)
    img.save(path, optimize=True)


def pages_image(title, pages, path, size=(1600, 1000)):
    W, H = size
    img = Image.new("RGB", size, BG)
    d = ImageDraw.Draw(img)
    ft = ImageFont.truetype(FONT_B, 60)
    d.text((70, 45), title, font=ft, fill=INK)
    n = len(pages)
    cw = min(int((W - 140 - (n - 1) * 30) / n), 480, int((H - 180) / 1.42))
    total = n * cw + (n - 1) * 30
    x0 = (W - total) // 2
    for i, im in enumerate(pages):
        c = card(im, cw)
        img.paste(c, (x0 + i * (cw + 30) - 10, 150), c)
    img.save(path, optimize=True)


def zip_product(folder, name, pdfs):
    zpath = os.path.join(folder, name + ".zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for p in pdfs:
            z.write(p, os.path.basename(p))
        z.writestr("README.txt", README[name])
        z.write(os.path.join(ROOT, "fonts", "OFL.txt"), "OFL.txt")
    return zpath


def main():
    if os.path.isdir(OUT):
        for sub in ("math-practice", "alphabet-tracing", "free-sample"):
            shutil.rmtree(os.path.join(OUT, sub, "files"), ignore_errors=True)
    meta = {"seed": SEED, "products": {}}
    tmp = tempfile.mkdtemp()

    # ---- math
    folder = os.path.join(OUT, "math-practice")
    os.makedirs(os.path.join(folder, "files"), exist_ok=True)
    os.makedirs(os.path.join(folder, "images"), exist_ok=True)
    pages = math_pack.generate(SEED)
    pdfs, counts = [], {}
    for lang in LANGS:
        for sz in SIZES:
            p = os.path.join(folder, "files", "Math-Practice-%s-%s.pdf" % (lang.upper(), sz))
            counts["%s-%s" % (lang, sz)] = math_pack.render(pages, lang, sz, p)
            pdfs.append(p)
    zip_product(folder, "math-practice", pdfs)
    meta["products"]["math-practice"] = {
        "pdfs": [os.path.relpath(p, ROOT) for p in pdfs],
        "page_counts": counts,
        "pages": pages,
        "answers": {i + 1: math_pack.answers_for(p) for i, p in enumerate(pages)},
    }
    covers = [raster(os.path.join(folder, "files", "Math-Practice-%s-A4.pdf" % l.upper()), 1, 110, os.path.join(tmp, "mc%s.png" % l)) for l in LANGS]
    product_image("Math Practice Worksheets", "Ages 5–8 · %d printable pages · answer key included" % counts["en-A4"],
                  covers, ["English", "Română", "Русский", "A4 + US Letter"], os.path.join(folder, "images", "01-cover.png"))
    en = os.path.join(folder, "files", "Math-Practice-EN-A4.pdf")
    inner = [raster(en, n, 110, os.path.join(tmp, "mi%d.png" % n)) for n in (5, 9, 13)]
    pages_image("Tracing, counting, adding", inner, os.path.join(folder, "images", "02-inside.png"))
    inner = [raster(en, n, 110, os.path.join(tmp, "mj%d.png" % n)) for n in (22, 26, 29)]
    pages_image("Number bonds, sequences, clocks", inner, os.path.join(folder, "images", "03-inside.png"))
    ro = os.path.join(folder, "files", "Math-Practice-RO-A4.pdf")
    ru = os.path.join(folder, "files", "Math-Practice-RU-A4.pdf")
    inner = [raster(en, 18, 110, os.path.join(tmp, "l1.png")), raster(ro, 18, 110, os.path.join(tmp, "l2.png")), raster(ru, 18, 110, os.path.join(tmp, "l3.png"))]
    pages_image("Same pages in 3 languages", inner, os.path.join(folder, "images", "04-languages.png"))

    # ---- alphabet
    folder = os.path.join(OUT, "alphabet-tracing")
    os.makedirs(os.path.join(folder, "files"), exist_ok=True)
    os.makedirs(os.path.join(folder, "images"), exist_ok=True)
    pdfs, counts = [], {}
    for lang in LANGS:
        for sz in SIZES:
            p = os.path.join(folder, "files", "Alphabet-Tracing-%s-%s.pdf" % (lang.upper(), sz))
            counts["%s-%s" % (lang, sz)] = alphabet_pack.render(lang, sz, p)
            pdfs.append(p)
    zip_product(folder, "alphabet-tracing", pdfs)
    meta["products"]["alphabet-tracing"] = {
        "pdfs": [os.path.relpath(p, ROOT) for p in pdfs],
        "page_counts": counts,
        "find_rows": {l: [pg.get("find") for pg in alphabet_pack.pages_for(l) if pg["kind"] == "letter"] for l in LANGS},
    }
    files = {l: os.path.join(folder, "files", "Alphabet-Tracing-%s-A4.pdf" % l.upper()) for l in LANGS}
    covers = [raster(files[l], 1, 110, os.path.join(tmp, "ac%s.png" % l)) for l in LANGS]
    total = sum(counts["%s-A4" % l] for l in LANGS)
    product_image("Alphabet Tracing Worksheets", "English · Romanian · Russian alphabets · %d pages in total" % total,
                  covers, ["26 + 31 + 33 letters", "A4 + US Letter", "Ages 4–7"], os.path.join(folder, "images", "01-cover.png"))
    inner = [raster(files["en"], 3, 110, os.path.join(tmp, "a1.png")), raster(files["ro"], 25, 110, os.path.join(tmp, "a2.png")), raster(files["ru"], 9, 110, os.path.join(tmp, "a3.png"))]
    pages_image("One page per letter", inner, os.path.join(folder, "images", "02-inside.png"))
    n_ro = counts["ro-A4"]
    inner = [raster(files["ro"], n_ro - 1, 110, os.path.join(tmp, "a4.png")), raster(files["ru"], counts["ru-A4"], 110, os.path.join(tmp, "a5.png"))]
    pages_image("Alphabet chart + certificate", inner, os.path.join(folder, "images", "03-inside.png"))

    # ---- free sample (lead magnet): 4 pages taken from the paid files
    folder = os.path.join(OUT, "free-sample")
    os.makedirs(os.path.join(folder, "files"), exist_ok=True)
    w = PdfWriter()
    picks = [(os.path.join(OUT, "math-practice", "files", "Math-Practice-EN-A4.pdf"), [0, 4, 12]),
             (os.path.join(OUT, "alphabet-tracing", "files", "Alphabet-Tracing-EN-A4.pdf"), [2]),
             (os.path.join(OUT, "alphabet-tracing", "files", "Alphabet-Tracing-RO-A4.pdf"), [2]),
             (os.path.join(OUT, "alphabet-tracing", "files", "Alphabet-Tracing-RU-A4.pdf"), [2])]
    for f, idxs in picks:
        r = PdfReader(f)
        for i in idxs:
            w.add_page(r.pages[i])
    w.add_metadata({"/Title": "Free sample - Star Garden Learning worksheets", "/Author": "Star Garden Learning"})
    sample = os.path.join(folder, "files", "Free-Sample-Worksheets.pdf")
    with open(sample, "wb") as fh:
        w.write(fh)
    os.makedirs(os.path.join(folder, "images"), exist_ok=True)
    ims = [raster(sample, n, 110, os.path.join(tmp, "s%d.png" % n)) for n in (2, 3, 4)]
    product_image("Free Sample Worksheets", "Try 6 pages: math + alphabet in English, Romanian, Russian", ims,
                  ["FREE", "A4"], os.path.join(folder, "images", "01-cover.png"))
    meta["products"]["free-sample"] = {"pdfs": [os.path.relpath(sample, ROOT)], "page_counts": {"en-A4": 6}}

    with open(os.path.join(OUT, "build.json"), "w") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=1)
    shutil.rmtree(tmp)
    print(json.dumps({k: v["page_counts"] for k, v in meta["products"].items()}, indent=1))


if __name__ == "__main__":
    main()
