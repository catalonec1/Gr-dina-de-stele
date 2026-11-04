"""Alphabet tracing pack: one page per letter, in EN / RO / RU."""
import random

from reportlab.pdfgen import canvas

import common as C
from common import FONT, FONT_B, MARGIN
from i18n import ALPHABET, LANGS, T
from math_pack import draw_cert, draw_cover, draw_parents


# Russian ъ ы ь never start a word; practise only the lowercase form.
LOWER_ONLY = set("ъыь")


def find_row(lang, idx, n=12, hits=4):
    """Mixed letters for 'circle every X'; target appears exactly `hits` times."""
    rng = random.Random(1000 * LANGS.index(lang) + idx)
    letters = ALPHABET[lang]
    up, lo, _ = letters[idx]
    others = [l for j, l in enumerate(letters) if j != idx]
    row = [lo if lo in LOWER_ONLY else rng.choice([up, lo]) for _ in range(hits)]
    while len(row) < n:
        o = rng.choice(others)
        row.append(o[1] if o[1] in LOWER_ONLY else rng.choice([o[0], o[1]]))
    rng.shuffle(row)
    return row


def pages_for(lang):
    pages = [dict(kind="cover"), dict(kind="parents")]
    for i, (up, lo, word) in enumerate(ALPHABET[lang]):
        pages.append(dict(kind="letter", up=up, lo=lo, word=word, find=find_row(lang, i)))
    pages.append(dict(kind="chart"))
    pages.append(dict(kind="cert"))
    return pages


def draw_word(c, word, letter, x, y, size):
    """Word with every occurrence of `letter` in bold + underlined."""
    for ch in word:
        hit = ch.lower() == letter.lower()
        f = FONT_B if hit else FONT
        c.setFont(f, size)
        c.setFillColor(C.INK if hit else C.Color(0.3, 0.3, 0.3))
        c.drawString(x, y, ch)
        w = C.text_w(ch, f, size)
        if hit:
            c.setStrokeColor(C.INK)
            c.setLineWidth(2)
            c.line(x, y - size * 0.12, x + w, y - size * 0.12)
        x += w
    return x


def trace_row(c, s, x0, x1, base, size, model=True, gap_em=0.55):
    C.ruling(c, x0, base, x1 - x0, size)
    x = x0 + 8
    w = C.text_w(s, FONT, size)
    step = w + size * gap_em
    if model:
        c.setFont(FONT, size)
        c.setFillColor(C.INK)
        c.drawString(x, base, s)
        x += step
    while x + w < x1 - 2:
        C.trace_text(c, s, x, base, size)
        x += step


def draw_letter(c, W, H, t, p, top):
    up, lo, word = p["up"], p["lo"], p["word"]
    bottom = MARGIN + 6
    band = 190
    big = 150
    pair = up + lo
    C.outline_text(c, pair, MARGIN + 6, top - band + 40, big, lw=2.4)
    px = MARGIN + 6 + C.text_w(pair, FONT_B, big) + 30
    ws = C.fit_size(word, W - MARGIN - px, 44, FONT_B)
    draw_word(c, word, up, px, top - 70, ws)
    lab = "%s %s" % (t["find"], lo) if lo in LOWER_ONLY else "%s %s %s" % (t["find"], up, lo)
    c.setFont(FONT, 12)
    c.setFillColor(C.INK)
    c.drawString(px, top - 112, lab)
    row = p["find"]
    cols = 6
    cw = (W - MARGIN - px) / cols
    fs = 26
    for j, ch in enumerate(row):
        r, k = divmod(j, cols)
        c.setFont(FONT, fs)
        c.drawCentredString(px + cw * (k + 0.5), top - 148 - r * 36, ch)
    rows_top = top - band - 10
    n = 4
    rh = (rows_top - bottom) / n
    size = min(rh * 0.62 / (C.CAP + C.DESC), 64)
    x0, x1 = MARGIN, W - MARGIN
    for i in range(n):
        base = rows_top - rh * i - rh * 0.5 - (C.CAP * size - C.DESC * size) / 2
        if i == 0:
            trace_row(c, lo if lo in LOWER_ONLY else up, x0, x1, base, size)
        elif i == 1:
            trace_row(c, lo, x0, x1, base, size)
        elif i == 2:
            trace_row(c, word, x0, x1, base, size * 0.8, gap_em=0.9)
        else:
            C.ruling(c, x0, base, x1 - x0, size)


def draw_chart(c, W, H, t, lang, top):
    letters = ALPHABET[lang]
    cols = 6
    rows = (len(letters) + cols - 1) // cols
    bottom = MARGIN + 6
    cw = (W - 2 * MARGIN) / cols
    rh = (top - bottom) / rows
    size = min(cw * 0.42, rh * 0.62 / C.CAP)
    for i, (up, lo, _) in enumerate(letters):
        r, k = divmod(i, cols)
        x = MARGIN + k * cw
        y = top - (r + 1) * rh
        c.setStrokeColor(C.LIGHT)
        c.setLineWidth(1)
        c.roundRect(x + 3, y + 3, cw - 6, rh - 6, 8, fill=0, stroke=1)
        s = up + lo
        C.outline_text(c, s, x + cw / 2 - C.text_w(s, FONT_B, size) / 2, y + rh / 2 - C.CAP * size / 2, size, lw=1.4)


def make_art(lang):
    first = " ".join(u for u, _, _ in ALPHABET[lang][:3])

    def art(c, W, H):
        cy = H / 2 + 20
        C.outline_text(c, first, W / 2 - C.text_w(first, FONT_B, 130) / 2, cy + 10, 130, lw=2.8)
        low = " ".join(l for _, l, _ in ALPHABET[lang][:3])
        C.outline_text(c, low, W / 2 - C.text_w(low, FONT_B, 100) / 2, cy - 120, 100, lw=2.4)
        for i, k in enumerate(["star", "heart", "flower", "star", "flower", "heart", "star"]):
            C.shape(c, k, W / 2 - 180 + i * 60, cy - 180, 30, lw=1.8)
    return art


def render(lang, size_name, path):
    t = T[lang]
    W, H = C.PAGE_SIZES[size_name]
    pages = pages_for(lang)
    c = canvas.Canvas(path, pagesize=(W, H), pageCompression=1)
    c.setTitle("%s - %s" % (t["alpha_title"], t["alpha_sub"]))
    c.setAuthor(C.BRAND)
    c.setSubject(t["alpha_sub"])
    c.setCreator(C.BRAND)
    c.setProducer(C.BRAND)
    for i, p in enumerate(pages, start=1):
        k = p["kind"]
        if k == "cover":
            draw_cover(c, W, H, t, "alpha_title", "alpha_sub", make_art(lang))
        elif k == "parents":
            draw_parents(c, W, H, t, "alpha_parents")
        elif k == "cert":
            draw_cert(c, W, H, t, "cert_alpha", "cert_awarded_a")
        elif k == "letter":
            top = C.header(c, W, H, "%s %s" % (p["up"], p["lo"]), t["letter_i"], t["name"])
            draw_letter(c, W, H, t, p, top)
            C.footer(c, W, i, t["note"])
        elif k == "chart":
            top = C.header(c, W, H, t["chart"], t["chart_i"], t["name"])
            draw_chart(c, W, H, t, lang, top)
            C.footer(c, W, i, t["note"])
        c.showPage()
    c.save()
    return len(pages)
