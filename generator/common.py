"""Shared drawing helpers for the printable packs (ReportLab).

All art is vector code drawn here (no AI images, no third-party clip art).
Font: Andika (SIL, OFL 1.1) - designed for early readers, covers Latin + Cyrillic.
"""
import math
import os

from reportlab.lib.colors import Color, black, white
from reportlab.lib.pagesizes import A4, letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "..", "fonts")
FONT = "Andika"
FONT_B = "Andika-Bold"
pdfmetrics.registerFont(TTFont(FONT, os.path.join(FONT_DIR, "Andika-Regular.ttf")))
pdfmetrics.registerFont(TTFont(FONT_B, os.path.join(FONT_DIR, "Andika-Bold.ttf")))

# Andika metrics (units per em 2048): cap height 1485, x-height 1040, descender ~ -560
CAP = 1485 / 2048
XH = 1040 / 2048
DESC = 560 / 2048

PAGE_SIZES = {"A4": A4, "Letter": letter}
MARGIN = 42  # pt; >= 0.5 in so home printers never clip
SAFE = 0.45 * 72  # tests check no ink closer than this to the edge

INK = black
GRAY = Color(0.55, 0.55, 0.55)
TRACE = Color(0.78, 0.78, 0.78)
LIGHT = Color(0.88, 0.88, 0.88)
ACCENT = Color(0.20, 0.35, 0.65)
BRAND = "Star Garden Learning"


def text_w(s, font=FONT, size=12):
    return pdfmetrics.stringWidth(s, font, size)


def fit_size(s, max_w, size, font=FONT_B, min_size=8):
    while size > min_size and text_w(s, font, size) > max_w:
        size -= 0.5
    return size


def header(c, W, H, title, instr, name_label, pageno=None):
    """Title + instruction + 'Name: ____' line. Returns y of content top."""
    top = H - MARGIN
    c.setFillColor(INK)
    nl = name_label + ": "
    c.setFont(FONT, 11)
    nx = W - MARGIN - 170
    c.drawString(nx, top - 11, nl)
    c.setLineWidth(0.8)
    c.setStrokeColor(GRAY)
    c.line(nx + text_w(nl, FONT, 11), top - 13, W - MARGIN, top - 13)
    shape(c, "star", nx - 16, top - 8, 18, lw=1.2)
    size = fit_size(title, nx - MARGIN - 34, 22)
    c.setFont(FONT_B, size)
    c.drawString(MARGIN, top - 20, title)
    c.setFont(FONT, 12.5)
    c.setFillColor(Color(0.2, 0.2, 0.2))
    isz = fit_size(instr, W - 2 * MARGIN, 12.5, FONT)
    c.setFont(FONT, isz)
    c.drawString(MARGIN, top - 42, instr)
    c.setStrokeColor(LIGHT)
    c.setLineWidth(1.2)
    c.line(MARGIN, top - 52, W - MARGIN, top - 52)
    c.setFillColor(INK)
    return top - 62


def footer(c, W, pageno, note):
    c.setFont(FONT, 8)
    c.setFillColor(GRAY)
    c.drawString(MARGIN, MARGIN - 14, note)
    c.drawRightString(W - MARGIN, MARGIN - 14, str(pageno))
    small_star(c, W - MARGIN - 22, MARGIN - 11, 4, GRAY)
    c.setFillColor(INK)


# ---------- simple vector shapes ----------

def star_pts(x, y, r, r_in=None, n=5, rot=90):
    r_in = r_in if r_in is not None else r * 0.45
    pts = []
    for i in range(n * 2):
        rr = r if i % 2 == 0 else r_in
        a = math.radians(rot + i * 180 / n)
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    return pts


def poly(c, pts, fill=0, stroke=1):
    p = c.beginPath()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    p.close()
    c.drawPath(p, fill=fill, stroke=stroke)


def small_star(c, x, y, r, color):
    c.saveState()
    c.setFillColor(color)
    c.setStrokeColor(color)
    poly(c, star_pts(x, y, r), fill=1, stroke=0)
    c.restoreState()


def shape(c, kind, x, y, s, lw=1.4, fill=None):
    """Outline shape centred on (x, y), size s (roughly its diameter)."""
    c.saveState()
    c.setStrokeColor(INK)
    c.setLineWidth(lw)
    c.setLineJoin(1)
    f = 0
    if fill is not None:
        c.setFillColor(fill)
        f = 1
    r = s / 2
    if kind == "star":
        poly(c, star_pts(x, y, r), fill=f)
    elif kind == "circle":
        c.circle(x, y, r * 0.85, fill=f, stroke=1)
    elif kind == "square":
        c.rect(x - r * 0.75, y - r * 0.75, r * 1.5, r * 1.5, fill=f, stroke=1)
    elif kind == "triangle":
        poly(c, [(x, y + r * 0.85), (x - r * 0.9, y - r * 0.7), (x + r * 0.9, y - r * 0.7)], fill=f)
    elif kind == "heart":
        p = c.beginPath()
        p.moveTo(x, y - r * 0.85)
        p.curveTo(x - r * 1.25, y - r * 0.05, x - r * 0.75, y + r * 1.0, x, y + r * 0.45)
        p.curveTo(x + r * 0.75, y + r * 1.0, x + r * 1.25, y - r * 0.05, x, y - r * 0.85)
        p.close()
        c.drawPath(p, fill=f, stroke=1)
    elif kind == "flower":
        for i in range(5):
            a = math.radians(90 + i * 72)
            c.circle(x + r * 0.5 * math.cos(a), y + r * 0.5 * math.sin(a), r * 0.38, fill=f, stroke=1)
        c.setFillColor(white)
        c.circle(x, y, r * 0.26, fill=1, stroke=1)
    elif kind == "dot":
        c.setFillColor(INK)
        c.circle(x, y, r * 0.6, fill=1, stroke=0)
    else:
        raise ValueError(kind)
    c.restoreState()


SHAPES = ["star", "circle", "square", "triangle", "heart", "flower"]


def answer_box(c, x, y, w, h, lw=1.2):
    c.saveState()
    c.setStrokeColor(INK)
    c.setLineWidth(lw)
    c.roundRect(x, y, w, h, 4, fill=0, stroke=1)
    c.restoreState()


def ruling(c, x, y_base, w, size):
    """Handwriting guide for glyphs of font size `size` sitting on y_base:
    solid top (cap) line, dashed mid (x-height) line, solid baseline, light descender line."""
    cap = y_base + CAP * size
    mid = y_base + XH * size
    desc = y_base - DESC * size
    c.saveState()
    c.setStrokeColor(GRAY)
    c.setLineWidth(0.9)
    c.line(x, cap, x + w, cap)
    c.setLineWidth(1.3)
    c.setStrokeColor(Color(0.35, 0.35, 0.35))
    c.line(x, y_base, x + w, y_base)
    c.setStrokeColor(GRAY)
    c.setLineWidth(0.8)
    c.setDash(4, 4)
    c.line(x, mid, x + w, mid)
    c.setStrokeColor(LIGHT)
    c.setDash(1, 3)
    c.line(x, desc, x + w, desc)
    c.restoreState()


def trace_text(c, s, x, y, size, color=TRACE, font=FONT, dotted_outline=True):
    """Light-gray glyphs to trace over, with a thin dotted outline so they show
    even on printers that drop light grays."""
    c.saveState()
    t = c.beginText(x, y)
    t.setFont(font, size)
    c.setFillColor(color)
    c.setStrokeColor(GRAY)
    c.setLineWidth(0.5)
    if dotted_outline:
        c.setDash(1.2, 2.2)
        t.setTextRenderMode(2)  # fill + stroke
    else:
        t.setTextRenderMode(0)
    t.textOut(s)
    c.drawText(t)
    c.restoreState()


def outline_text(c, s, x, y, size, font=FONT_B, lw=2.2):
    """Hollow letters for colouring in."""
    c.saveState()
    t = c.beginText(x, y)
    t.setFont(font, size)
    c.setStrokeColor(INK)
    c.setLineWidth(lw)
    c.setLineJoin(1)
    t.setTextRenderMode(1)
    t.textOut(s)
    c.drawText(t)
    c.restoreState()


def clock(c, x, y, r, hour, minute, show_hands=True):
    c.saveState()
    c.setStrokeColor(INK)
    c.setLineWidth(2)
    c.circle(x, y, r, fill=0, stroke=1)
    c.setFont(FONT, r * 0.2)
    for h in range(1, 13):
        a = math.radians(90 - h * 30)
        c.drawCentredString(x + r * 0.7 * math.cos(a), y + r * 0.7 * math.sin(a) - r * 0.07, str(h))
    c.setLineWidth(1)
    for m in range(60):
        a = math.radians(90 - m * 6)
        r0 = r * (0.92 if m % 5 else 0.88)
        c.line(x + r0 * math.cos(a), y + r0 * math.sin(a), x + r * 0.98 * math.cos(a), y + r * 0.98 * math.sin(a))
    if show_hands:
        c.setLineCap(1)
        ha = math.radians(90 - ((hour % 12) + minute / 60) * 30)
        ma = math.radians(90 - minute * 6)
        c.setLineWidth(3.2)
        c.line(x, y, x + r * 0.45 * math.cos(ha), y + r * 0.45 * math.sin(ha))
        c.setLineWidth(2)
        c.line(x, y, x + r * 0.7 * math.cos(ma), y + r * 0.7 * math.sin(ma))
    c.setFillColor(INK)
    c.circle(x, y, r * 0.05, fill=1, stroke=0)
    c.restoreState()


def frame(c, W, H, inset=MARGIN - 10, lw=2.5):
    c.saveState()
    c.setStrokeColor(INK)
    c.setLineWidth(lw)
    c.roundRect(inset, inset, W - 2 * inset, H - 2 * inset, 18, fill=0, stroke=1)
    c.restoreState()


def star_border(c, W, H, inset=MARGIN - 4, step=34):
    """Decorative ring of outline stars (cover / certificate)."""
    xs = int((W - 2 * inset) // step)
    ys = int((H - 2 * inset) // step)
    dx = (W - 2 * inset) / xs
    dy = (H - 2 * inset) / ys
    for i in range(xs + 1):
        for yy in (inset, H - inset):
            shape(c, "star" if i % 2 == 0 else "circle", inset + i * dx, yy, 13 if i % 2 == 0 else 6, lw=1.1)
    for j in range(1, ys):
        for xx in (inset, W - inset):
            shape(c, "star" if j % 2 == 0 else "circle", xx, inset + j * dy, 13 if j % 2 == 0 else 6, lw=1.1)


def wrap(s, font, size, max_w):
    words, lines, cur = s.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if text_w(t, font, size) <= max_w:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def paragraph(c, s, x, y, max_w, size=12, lead=1.4, font=FONT):
    c.setFont(font, size)
    for line in wrap(s, font, size, max_w):
        c.drawString(x, y, line)
        y -= size * lead
    return y
