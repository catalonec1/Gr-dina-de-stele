"""Math Practice pack (ages 5-8): problem generation (pure, seeded) + rendering."""
import random

from reportlab.lib.colors import Color, white
from reportlab.pdfgen import canvas

import common as C
from common import FONT, FONT_B, MARGIN
from i18n import T

MINUS = "−"


# ---------------- problem generation ----------------

def _uniq(rng, n, make, key=lambda p: p):
    out, seen, tries = [], set(), 0
    while len(out) < n:
        p = make()
        tries += 1
        if key(p) in seen and tries < 5000:
            continue
        seen.add(key(p))
        out.append(p)
    return out


def generate(seed=2026):
    rng = random.Random(seed)
    pages = []

    def add(kind, title, instr, items, **kw):
        pages.append(dict(kind=kind, title=title, instr=instr, items=items, **kw))

    add("cover", None, None, [])
    add("parents", None, None, [])
    for grp in ([0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14, 15], [16, 17, 18, 19, 20]):
        add("trace", "trace_numbers", "trace_numbers_i", grp)
    for lo, hi in ((1, 6), (3, 10), (6, 15), (10, 20)):
        items = []
        for n in _uniq(rng, 8, lambda: rng.randint(lo, hi)):
            items.append(dict(n=n, shape=rng.choice(C.SHAPES), slots=sorted(rng.sample(range(20), n))))
        add("count", "count", "count_i", items)
    for _ in range(2):
        items = _uniq(rng, 8, lambda: (rng.randint(1, 5), rng.randint(1, 5)))
        add("add_pic", "add_pic", "add_pic_i", [dict(a=a, b=b, shape=rng.choice(C.SHAPES)) for a, b in items])
    for _ in range(2):
        items = _uniq(rng, 20, lambda: (lambda a: (a, rng.randint(0, 10 - a)))(rng.randint(1, 9)))
        add("eq", "add10", "add_i", [dict(a=a, b=b, op="+") for a, b in items])
    for _ in range(2):
        def mk():
            s = rng.randint(11, 20)
            a = rng.randint(s - 10, 10)
            return (a, s - a)
        items = _uniq(rng, 20, mk)
        add("eq", "add20", "add_i", [dict(a=a, b=b, op="+") for a, b in items])
    def mkcol():
        a = rng.randint(1, 8) * 10 + rng.randint(0, 8)
        bt = rng.randint(0, 9 - a // 10)
        bu = rng.randint(0, 9 - a % 10)
        b = bt * 10 + bu
        return (a, b) if b >= 2 else (a, 2 if a % 10 <= 7 else 0)
    items = _uniq(rng, 16, mkcol)
    add("col", "add_col", "add_i", [dict(a=a, b=b, op="+") for a, b in items])
    items = _uniq(rng, 8, lambda: (lambda n: (n, rng.randint(1, n - 1)))(rng.randint(3, 10)))
    add("sub_pic", "sub_pic", "sub_pic_i", [dict(a=a, b=b, shape=rng.choice(C.SHAPES)) for a, b in items])
    for _ in range(2):
        items = _uniq(rng, 20, lambda: (lambda a: (a, rng.randint(0, a)))(rng.randint(2, 10)))
        add("eq", "sub10", "add_i", [dict(a=a, b=b, op="-") for a, b in items])
    def mksub20():
        a = rng.randint(11, 20)
        return (a, rng.randint(1, min(a, 10)))
    items = _uniq(rng, 20, mksub20)
    add("eq", "sub20", "add_i", [dict(a=a, b=b, op="-") for a, b in items])
    for lo, hi in ((4, 10), (10, 20)):
        def mkb():
            w = rng.randint(lo, hi)
            p = rng.randint(1, w - 1)
            return (w, p, rng.choice(["left", "right"]))
        items = _uniq(rng, 9, mkb, key=lambda t: t[:2])
        add("bonds", "bonds", "bonds_i", [dict(whole=w, part=p, blank=bl) for w, p, bl in items])
    for lo, hi in ((0, 20), (10, 99)):
        def mkc():
            a = rng.randint(lo, hi)
            b = a if rng.random() < 0.15 else rng.randint(lo, hi)
            return (a, b)
        items = _uniq(rng, 20, mkc)
        add("compare", "compare", "compare_i", [dict(a=a, b=b) for a, b in items])
    for lo, hi, back in ((1, 24, False), (20, 94, True)):
        items = []
        for _ in range(10):
            step = -1 if back and rng.random() < 0.4 else 1
            start = rng.randint(lo, hi) if step == 1 else rng.randint(lo + 6, hi + 6)
            seq = [start + i * step for i in range(7)]
            blanks = sorted(rng.sample(range(1, 7), 2))
            items.append(dict(seq=seq, blanks=blanks))
        add("missing", "missing", "missing_i", items)
    items = []
    for step in (2, 2, 5, 5, 10, 10):
        start = step * rng.randint(0, 3 if step != 10 else 2)
        seq = [start + i * step for i in range(8)]
        items.append(dict(step=step, seq=seq, blanks=sorted(rng.sample(range(1, 8), 3))))
    add("missing", "skip", "skip_i", items, skip=True)
    times = _uniq(rng, 9, lambda: (rng.randint(1, 12), rng.choice([0, 30])))
    add("clock", "clock", "clock_i", [dict(h=h, m=m) for h, m in times])
    times = _uniq(rng, 9, lambda: (rng.randint(1, 12), rng.choice([0, 30])))
    add("draw_clock", "draw_clock", "draw_clock_i", [dict(h=h, m=m) for h, m in times])
    add("cert", None, None, [])
    return pages


def answers_for(page):
    k = page["kind"]
    it = page["items"]
    if k == "count":
        return [str(i["n"]) for i in it]
    if k == "add_pic":
        return [str(i["a"] + i["b"]) for i in it]
    if k in ("eq", "col"):
        return [str(i["a"] + i["b"] if i["op"] == "+" else i["a"] - i["b"]) for i in it]
    if k == "sub_pic":
        return [str(i["a"] - i["b"]) for i in it]
    if k == "bonds":
        return [str(i["whole"] - i["part"]) for i in it]
    if k == "compare":
        return ["<" if i["a"] < i["b"] else ">" if i["a"] > i["b"] else "=" for i in it]
    if k == "missing":
        return [" ".join(str(i["seq"][b]) for b in i["blanks"]) for i in it]
    if k == "clock":
        return ["%d:%02d" % (i["h"], i["m"]) for i in it]
    return []


# ---------------- rendering ----------------

def _bottom():
    return MARGIN + 6


def draw_trace(c, W, top, page):
    grp = page["items"]
    bottom = _bottom()
    rh = (top - bottom) / len(grp)
    size = min(rh * 0.5 / C.CAP, 70)
    for r, n in enumerate(grp):
        ytop = top - r * rh
        base = ytop - rh * 0.5 - C.CAP * size * 0.4
        # dots (rows of five) showing the quantity
        bx, bw = MARGIN, 90
        cols = 5
        dr = 4.6
        rows_d = max(1, (n + cols - 1) // cols)
        gy = base + C.CAP * size / 2 + (rows_d - 1) * 6.5
        for i in range(n):
            C.shape(c, "dot", bx + 8 + (i % cols) * 15, gy - (i // cols) * 15, 15)
        if n == 0:
            c.setStrokeColor(C.GRAY)
            c.setLineWidth(1)
            c.circle(bx + 38, base + C.CAP * size / 2, 9, fill=0, stroke=1)
        x0 = bx + bw
        C.ruling(c, x0, base, W - MARGIN - x0, size)
        s = str(n)
        c.setFont(FONT, size)
        c.setFillColor(C.INK)
        c.drawString(x0 + 6, base, s)
        step = C.text_w(s, FONT, size) + size * 0.45
        x = x0 + 6 + step
        while x + C.text_w(s, FONT, size) < W - MARGIN - 2:
            C.trace_text(c, s, x, base, size)
            x += step


def draw_count(c, W, top, page):
    bottom = _bottom()
    cols, rows = 2, 4
    gap = 12
    bw = (W - 2 * MARGIN - gap) / cols
    bh = (top - bottom - gap * (rows - 1)) / rows
    for idx, it in enumerate(page["items"]):
        r, k = divmod(idx, cols)
        x = MARGIN + k * (bw + gap)
        y = top - (r + 1) * bh - r * gap
        c.setStrokeColor(C.GRAY)
        c.setLineWidth(1)
        c.roundRect(x, y, bw, bh, 10, fill=0, stroke=1)
        aw = 46
        area_w = bw - aw - 26
        sc, sr = 5, 4
        cw, ch = area_w / sc, (bh - 16) / sr
        s = min(cw, ch) * 0.8
        for slot in it["slots"]:
            rr, kk = divmod(slot, sc)
            C.shape(c, it["shape"], x + 10 + cw * (kk + 0.5), y + bh - 8 - ch * (rr + 0.5), s)
        C.answer_box(c, x + bw - aw - 10, y + bh / 2 - 22, aw, 44)


def _group(c, x, yc, n, shape, s, per_row=5, cross=0):
    pitch = s * 1.25
    rows = (n + per_row - 1) // per_row
    for i in range(n):
        rr, kk = divmod(i, per_row)
        px = x + pitch * (kk + 0.5)
        py = yc + (rows - 1) * pitch / 2 - rr * pitch
        C.shape(c, shape, px, py, s)
        if i >= n - cross:
            c.saveState()
            c.setLineWidth(2)
            c.setStrokeColor(C.INK)
            d = s * 0.6
            c.line(px - d, py - d, px + d, py + d)
            c.line(px - d, py + d, px + d, py - d)
            c.restoreState()
    return x + pitch * min(n, per_row)


def draw_add_pic(c, W, top, page, sub=False):
    bottom = _bottom()
    n = len(page["items"])
    rh = (top - bottom) / n
    s = min(rh * 0.6, 22)
    for r, it in enumerate(page["items"]):
        yc = top - rh * (r + 0.5)
        c.setFont(FONT_B, 24)
        c.setFillColor(C.INK)
        if not sub:
            x = _group(c, MARGIN + 4, yc, it["a"], it["shape"], s)
            c.drawCentredString(x + 16, yc - 8, "+")
            x = _group(c, x + 32, yc, it["b"], it["shape"], s)
            c.drawCentredString(x + 16, yc - 8, "=")
            C.answer_box(c, x + 34, yc - 20, 46, 40)
        else:
            per = 10
            x = _group(c, MARGIN + 4, yc, it["a"], it["shape"], s, per_row=per, cross=it["b"])
            c.setFont(FONT, 20)
            eq = "%d %s %d =" % (it["a"], MINUS, it["b"])
            ex = W - MARGIN - 64 - C.text_w(eq, FONT, 20) - 10
            c.drawString(ex, yc - 7, eq)
            C.answer_box(c, W - MARGIN - 60, yc - 20, 56, 40)
        if r < n - 1:
            c.setStrokeColor(C.LIGHT)
            c.setLineWidth(0.8)
            c.line(MARGIN, yc - rh / 2, W - MARGIN, yc - rh / 2)


def draw_eq(c, W, top, page):
    bottom = _bottom()
    items = page["items"]
    cols = 2
    rows = (len(items) + 1) // 2
    rh = (top - bottom) / rows
    cw = (W - 2 * MARGIN) / cols
    size = min(22, rh * 0.5)
    for idx, it in enumerate(items):
        r, k = idx % rows, idx // rows
        x = MARGIN + k * cw + 18
        y = top - rh * (r + 0.5) - size * 0.35
        op = "+" if it["op"] == "+" else MINUS
        lab = "%d)" % (idx + 1)
        c.setFont(FONT, 10)
        c.setFillColor(C.GRAY)
        c.drawRightString(x - 4, y + 2, lab)
        c.setFillColor(C.INK)
        c.setFont(FONT, size)
        s = "%d %s %d =" % (it["a"], op, it["b"])
        c.drawString(x + 6, y, s)
        lx = x + 6 + C.text_w("20 + 20 =", FONT, size) + 10
        c.setStrokeColor(C.INK)
        c.setLineWidth(1.2)
        c.line(lx, y - 3, lx + 60, y - 3)


def draw_col(c, W, top, page):
    bottom = _bottom()
    cols, rows = 4, 4
    cw = (W - 2 * MARGIN) / cols
    rh = (top - bottom) / rows
    size = min(30, rh * 0.22)
    for idx, it in enumerate(page["items"]):
        r, k = divmod(idx, cols)
        xr = MARGIN + cw * (k + 0.5) + C.text_w("00", FONT, size) / 2
        y0 = top - rh * r - rh * 0.25
        c.setFont(FONT, size)
        c.setFillColor(C.INK)
        c.drawRightString(xr, y0, str(it["a"]))
        c.drawRightString(xr, y0 - size * 1.15, str(it["b"]))
        c.drawRightString(xr - C.text_w("00", FONT, size) - 6, y0 - size * 1.15, "+")
        c.setLineWidth(1.6)
        c.line(xr - C.text_w("000", FONT, size) - 8, y0 - size * 1.45, xr + 4, y0 - size * 1.45)
        C.answer_box(c, xr - C.text_w("00", FONT, size) - 6, y0 - size * 2.75, C.text_w("00", FONT, size) + 10, size * 1.15)


def draw_bonds(c, W, top, page):
    bottom = _bottom()
    cols, rows = 3, 3
    cw = (W - 2 * MARGIN) / cols
    rh = (top - bottom) / rows
    R = min(cw, rh) * 0.17
    for idx, it in enumerate(page["items"]):
        r, k = divmod(idx, cols)
        cx = MARGIN + cw * (k + 0.5)
        cy = top - rh * (r + 0.5)
        tx, ty = cx, cy + R * 1.5
        lx, ly = cx - R * 1.6, cy - R * 1.3
        rx, ry = cx + R * 1.6, cy - R * 1.3
        c.setStrokeColor(C.INK)
        c.setLineWidth(1.6)
        c.line(tx, ty, lx, ly)
        c.line(tx, ty, rx, ry)
        c.setFillColor(white)
        for (x, y) in ((tx, ty), (lx, ly), (rx, ry)):
            c.circle(x, y, R, fill=1, stroke=1)
        c.setFillColor(C.INK)
        c.setFont(FONT_B, R * 0.95)
        c.drawCentredString(tx, ty - R * 0.33, str(it["whole"]))
        known = (lx, ly) if it["blank"] == "right" else (rx, ry)
        c.setFont(FONT, R * 0.95)
        c.drawCentredString(known[0], known[1] - R * 0.33, str(it["part"]))


def draw_compare(c, W, top, page):
    bottom = _bottom()
    items = page["items"]
    rows = 10
    rh = (top - bottom) / rows
    cw = (W - 2 * MARGIN) / 2
    size = min(24, rh * 0.5)
    for idx, it in enumerate(items):
        r, k = idx % rows, idx // rows
        cx = MARGIN + cw * (k + 0.5)
        y = top - rh * (r + 0.5)
        c.setFont(FONT, size)
        c.setFillColor(C.INK)
        c.drawRightString(cx - 26, y - size * 0.35, str(it["a"]))
        c.drawString(cx + 26, y - size * 0.35, str(it["b"]))
        c.setStrokeColor(C.INK)
        c.setLineWidth(1.4)
        c.circle(cx, y, size * 0.62, fill=0, stroke=1)


def draw_missing(c, W, top, page, t):
    bottom = _bottom()
    items = page["items"]
    rows = len(items)
    rh = (top - bottom) / rows
    skip = page.get("skip")
    lab_w = 0
    if skip:
        lab_w = max(C.text_w("%s %d:" % (t["count_by"], 10), FONT_B, 13), 60) + 10
    n = len(items[0]["seq"])
    gap = 6
    bw = min((W - 2 * MARGIN - lab_w - gap * (n - 1)) / n, 64)
    bh = min(rh * 0.62, 46)
    size = min(bh * 0.55, 22)
    for r, it in enumerate(items):
        yc = top - rh * (r + 0.5)
        x = MARGIN
        if skip:
            c.setFont(FONT_B, 13)
            c.setFillColor(C.INK)
            c.drawString(x, yc - 5, "%s %d:" % (t["count_by"], it["step"]))
            x += lab_w
        for i, v in enumerate(it["seq"]):
            bx = x + i * (bw + gap)
            c.setStrokeColor(C.INK)
            c.setLineWidth(1.2)
            c.roundRect(bx, yc - bh / 2, bw, bh, 5, fill=0, stroke=1)
            if i not in it["blanks"]:
                c.setFont(FONT, size)
                c.setFillColor(C.INK)
                c.drawCentredString(bx + bw / 2, yc - size * 0.35, str(v))


def draw_clocks(c, W, top, page, draw=False):
    bottom = _bottom()
    cols, rows = 3, 3
    cw = (W - 2 * MARGIN) / cols
    rh = (top - bottom) / rows
    R = min(cw, rh) * 0.33
    for idx, it in enumerate(page["items"]):
        r, k = divmod(idx, cols)
        cx = MARGIN + cw * (k + 0.5)
        cy = top - rh * r - R - 10
        C.clock(c, cx, cy, R, it["h"], it["m"], show_hands=not draw)
        ly = cy - R - 34
        if draw:
            c.setFont(FONT_B, 22)
            c.setFillColor(C.INK)
            c.drawCentredString(cx, ly + 2, "%d:%02d" % (it["h"], it["m"]))
        else:
            C.answer_box(c, cx - 48, ly - 6, 40, 34)
            C.answer_box(c, cx + 8, ly - 6, 40, 34)
            c.setFont(FONT_B, 22)
            c.drawCentredString(cx, ly + 4, ":")


def draw_cover(c, W, H, t, title_key, sub_key, art):
    C.star_border(c, W, H)
    c.setFillColor(C.INK)
    size = C.fit_size(t[title_key], W - 2 * MARGIN - 60, 46)
    c.setFont(FONT_B, size)
    c.drawCentredString(W / 2, H - 170, t[title_key])
    c.setFont(FONT, 17)
    c.drawCentredString(W / 2, H - 205, t[sub_key])
    art(c, W, H)
    nl = t["name"] + ":"
    c.setFont(FONT, 16)
    x0 = W / 2 - 160
    c.drawString(x0, 130, nl)
    c.setLineWidth(1)
    c.line(x0 + C.text_w(nl, FONT, 16) + 6, 128, W / 2 + 160, 128)
    c.setFont(FONT, 9)
    c.setFillColor(C.GRAY)
    c.drawCentredString(W / 2, 92, t["note"])


def math_art(c, W, H):
    cy = H / 2 + 20
    C.outline_text(c, "1 2 3", W / 2 - C.text_w("1 2 3", FONT_B, 120) / 2, cy + 40, 120, lw=2.6)
    C.outline_text(c, "+ " + MINUS + " =", W / 2 - C.text_w("+ " + MINUS + " =", FONT_B, 90) / 2, cy - 90, 90, lw=2.6)
    for i, k in enumerate(["star", "heart", "circle", "triangle", "flower", "square", "star"]):
        C.shape(c, k, W / 2 - 180 + i * 60, cy - 160, 30, lw=1.8)
    C.clock(c, W / 2, cy - 250, 52, 3, 0)


def draw_parents(c, W, H, t, key):
    C.frame(c, W, H)
    c.setFillColor(C.INK)
    c.setFont(FONT_B, 28)
    c.drawString(MARGIN + 30, H - 130, t["parents_title"])
    y = H - 190
    for line in t[key]:
        C.small_star(c, MARGIN + 38, y + 5, 7, C.INK)
        y = C.paragraph(c, line, MARGIN + 56, y, W - 2 * MARGIN - 90, size=14) - 14
    c.setFont(FONT, 10)
    c.setFillColor(C.GRAY)
    C.paragraph(c, t["note"] + ".", MARGIN + 30, 120, W - 2 * MARGIN - 60, size=10)


def draw_cert(c, W, H, t, sub_key, awarded_key):
    C.star_border(c, W, H)
    C.frame(c, W, H, inset=MARGIN + 18, lw=1.5)
    c.setFillColor(C.INK)
    c.setFont(FONT_B, 54)
    c.drawCentredString(W / 2, H - 200, t["cert"])
    c.setFont(FONT, 18)
    c.drawCentredString(W / 2, H - 240, t[sub_key])
    C.shape(c, "star", W / 2, H / 2 + 40, 170, lw=3)
    c.setLineWidth(1.2)
    c.line(W / 2 - 180, H / 2 - 110, W / 2 + 180, H / 2 - 110)
    c.setFont(FONT, 11)
    c.setFillColor(C.GRAY)
    c.drawCentredString(W / 2, H / 2 - 126, t["name"])
    c.setFillColor(C.INK)
    c.setFont(FONT_B, 22)
    c.drawCentredString(W / 2, H / 2 - 170, t[awarded_key])
    c.setFont(FONT, 14)
    dl = t["date"] + ":"
    c.drawString(W / 2 - 120, 170, dl)
    c.line(W / 2 - 120 + C.text_w(dl, FONT, 14) + 6, 168, W / 2 + 120, 168)


def draw_answers(c, W, H, t, entries, start_pageno):
    """entries: list of (pageno, title, answers). Returns number of pages used."""
    used = 0
    y = None
    for pageno, title, ans in entries:
        line = "  ".join("%d) %s" % (i + 1, a) for i, a in enumerate(ans))
        lines = C.wrap(line, FONT, 11, W - 2 * MARGIN - 10)
        need = 18 + len(lines) * 15 + 8
        if y is None or y - need < MARGIN + 10:
            if y is not None:
                C.footer(c, W, start_pageno + used, t["note"])
                c.showPage()
            used += 1
            y = C.header(c, W, H, t["answers"], "", t["name"]) - 6
        c.setFont(FONT_B, 12)
        c.setFillColor(C.INK)
        c.drawString(MARGIN, y - 12, "%s %d · %s" % (t["page"], pageno, title))
        y -= 18
        c.setFont(FONT, 11)
        for ln in lines:
            y -= 15
            c.drawString(MARGIN + 10, y + 3, ln)
        y -= 8
    C.footer(c, W, start_pageno + used - 1, t["note"])
    c.showPage()
    return used


def render(pages, lang, size_name, path):
    t = T[lang]
    W, H = C.PAGE_SIZES[size_name]
    c = canvas.Canvas(path, pagesize=(W, H), pageCompression=1, initialFontName=FONT)
    c.setTitle("%s - %s" % (t["math_title"], t["math_sub"]))
    c.setAuthor(C.BRAND)
    c.setSubject(t["math_sub"])
    c.setCreator(C.BRAND)
    c.setProducer(C.BRAND)
    answer_entries = []
    for i, p in enumerate(pages, start=1):
        k = p["kind"]
        if k == "cover":
            draw_cover(c, W, H, t, "math_title", "math_sub", math_art)
        elif k == "parents":
            draw_parents(c, W, H, t, "math_parents")
        elif k == "cert":
            draw_cert(c, W, H, t, "cert_math", "cert_awarded")
        else:
            top = C.header(c, W, H, t[p["title"]], t[p["instr"]], t["name"])
            if k == "trace":
                draw_trace(c, W, top, p)
            elif k == "count":
                draw_count(c, W, top, p)
            elif k == "add_pic":
                draw_add_pic(c, W, top, p)
            elif k == "sub_pic":
                draw_add_pic(c, W, top, p, sub=True)
            elif k == "eq":
                draw_eq(c, W, top, p)
            elif k == "col":
                draw_col(c, W, top, p)
            elif k == "bonds":
                draw_bonds(c, W, top, p)
            elif k == "compare":
                draw_compare(c, W, top, p)
            elif k == "missing":
                draw_missing(c, W, top, p, t)
            elif k == "clock":
                draw_clocks(c, W, top, p)
            elif k == "draw_clock":
                draw_clocks(c, W, top, p, draw=True)
            else:
                raise ValueError(k)
            C.footer(c, W, i, t["note"])
            ans = answers_for(p)
            if ans:
                answer_entries.append((i, t[p["title"]], ans))
        c.showPage()
    n_ans = draw_answers(c, W, H, t, answer_entries, len(pages) + 1)
    c.save()
    return len(pages) + n_ans
