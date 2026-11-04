"""Product images for the spreadsheet templates: fill the EN files with demo data,
print them with LibreOffice, and lay the real pages out on 1600x1000 images."""
import datetime as dt
import os
import random
import subprocess
import sys
import tempfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sheets  # noqa: E402
from build import FONT_B, card, product_image, pages_image, raster  # noqa: E402
from openpyxl import load_workbook  # noqa: E402
from sheets_i18n import S  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, ".."))


def demo_budget(path, lang="en"):
    t = S[lang]
    sheets.budget(lang, path)
    wb = load_workbook(path)
    rng = random.Random(3)
    y = sheets.DEFAULT_YEAR
    inc, exp = t["income_default"], t["expense_default"]
    tx = wb[t["tx"]]
    r = 2
    for m in range(1, 13):
        for c, v in ((inc[0], 3200), (inc[1], 450)):
            tx.cell(row=r, column=1, value=dt.date(y, m, 5)); tx.cell(row=r, column=2, value=c)
            tx.cell(row=r, column=4, value=v + rng.randint(-50, 150)); r += 1
        for i, c in enumerate(exp):
            tx.cell(row=r, column=1, value=dt.date(y, m, rng.randint(1, 28))); tx.cell(row=r, column=2, value=c)
            tx.cell(row=r, column=4, value=950 if i == 0 else rng.randint(30, 300)); r += 1
        ws = wb[t["months"][m - 1]]
        ws.cell(row=9, column=2, value=3200); ws.cell(row=10, column=2, value=400)
        for i in range(len(exp)):
            ws.cell(row=22 + i, column=2, value=950 if i == 0 else 220)
    dp = wb[t["deposits"]]
    goals = [g for g, _ in t["goals_default"]]
    for i, (g, a) in enumerate(((0, 1200), (1, 600), (2, 850), (0, 400))):
        dp.cell(row=2 + i, column=1, value=dt.date(y, 1 + i, 10)); dp.cell(row=2 + i, column=2, value=goals[g]); dp.cell(row=2 + i, column=3, value=a)
    gs = wb[t["goals"]]
    for i, d in enumerate((dt.date(y + 1, 6, 1), dt.date(y + 1, 7, 1), dt.date(y + 1, 3, 1))):
        gs.cell(row=2 + i, column=3, value=d)
    wb.save(path)


def demo_habits(path, lang="en"):
    t = S[lang]
    sheets.habits(lang, path)
    wb = load_workbook(path)
    rng = random.Random(5)
    ws = wb[t["months"][0]]
    for i, p in enumerate((0.9, 0.7, 0.6, 0.5, 0.75, 0.55, 0.4)):
        for d in range(1, 32):
            if rng.random() < p:
                ws.cell(row=5 + i, column=1 + d, value="✓")
    wb.save(path)


def to_pdf(xlsx, tmp):
    subprocess.run(["soffice", "-env:UserInstallation=file://" + os.path.join(tmp, "prof"), "--headless",
                    "--convert-to", "pdf", "--outdir", tmp, xlsx], check=True, capture_output=True, timeout=180)
    return xlsx[:-5] + ".pdf"


def find_page(pdf, text):
    n = int([l for l in subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout.splitlines() if l.startswith("Pages")][0].split()[1])
    for p in range(1, n + 1):
        s = subprocess.run(["pdftotext", "-f", str(p), "-l", str(p), pdf, "-"], capture_output=True, text=True).stdout
        if text in s:
            return p
    raise ValueError(text)


def crop_white(im, pad=20):
    g = im.convert("L").point(lambda v: 0 if v > 245 else 255)
    box = g.getbbox()
    if not box:
        return im
    return im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)))


def wide(title, im, path, size=(1600, 1000)):
    from PIL import ImageDraw, ImageFont
    from build import BG, INK
    W, H = size
    img = Image.new("RGB", size, BG)
    d = ImageDraw.Draw(img)
    d.text((70, 45), title, font=ImageFont.truetype(FONT_B, 60), fill=INK)
    maxw, maxh = W - 140, H - 190
    s = min(maxw / im.width, maxh / im.height)
    c = card(im, int(im.width * s))
    img.paste(c, ((W - c.width) // 2, 150), c)
    img.save(path, optimize=True)


def cover(title, subtitle, badges, ims, path, size=(1600, 1000)):
    from PIL import ImageDraw, ImageFont
    from build import BG, INK, badge
    W, H = size
    img = Image.new("RGB", size, BG)
    d = ImageDraw.Draw(img)
    d.text((70, 50), title, font=ImageFont.truetype(FONT_B, 76), fill=INK)
    from build import FONT_R
    d.text((72, 150), subtitle, font=ImageFont.truetype(FONT_R, 38), fill=(70, 74, 90))
    x = 70
    for b in badges:
        x = badge(d, x, 220, b, ImageFont.truetype(FONT_B, 30)) + 16
    top, gap = 310, 40
    avail_h = H - top - 30
    ws = [im.width * avail_h / im.height for im in ims]
    scale = min(1.0, (W - 140 - gap * (len(ims) - 1)) / sum(ws))
    x = (W - sum(w * scale for w in ws) - gap * (len(ims) - 1)) / 2
    for im, w in zip(ims, ws):
        c = card(im, int(w * scale))
        img.paste(c, (int(x) - 10, top), c)
        x += w * scale + gap
    img.save(path, optimize=True)


def main():
    tmp = tempfile.mkdtemp()
    t = S["en"]
    b = os.path.join(tmp, "Budget.xlsx")
    demo_budget(b)
    bp = to_pdf(b, tmp)
    jan = crop_white(raster(bp, find_page(bp, "January %d" % sheets.DEFAULT_YEAR), 110, os.path.join(tmp, "j.png")))
    summ = crop_white(raster(bp, find_page(bp, "Year summary %d" % sheets.DEFAULT_YEAR), 110, os.path.join(tmp, "s.png")))
    goals = crop_white(raster(bp, find_page(bp, "Needed per month"), 110, os.path.join(tmp, "g.png")))
    out = os.path.join(ROOT, "products", "budget-planner", "images")
    os.makedirs(out, exist_ok=True)
    cover("Budget Planner Spreadsheet", "Excel + Google Sheets · 12 months · year summary · savings goals",
          ["English", "Română", "Русский", "Auto totals"], [summ], os.path.join(out, "01-cover.png"))
    wide("Each month: planned vs actual", jan, os.path.join(out, "02-month.png"))
    wide("Savings goals with progress bars", goals, os.path.join(out, "03-goals.png"))
    h = os.path.join(tmp, "Habits.xlsx")
    demo_habits(h)
    hp = to_pdf(h, tmp)
    hj = crop_white(raster(hp, find_page(hp, "January"), 110, os.path.join(tmp, "h.png")))
    out = os.path.join(ROOT, "products", "habit-tracker", "images")
    os.makedirs(out, exist_ok=True)
    wide("Habit Tracker · Excel + Google Sheets", hj, os.path.join(out, "01-cover.png"))
    print("images ok")


if __name__ == "__main__":
    main()
