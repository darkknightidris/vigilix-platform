"""
vigilix_logo_renderer.py
------------------------
Draw logo Vigilix (shield + radar, warna ungu) langsung sebagai vektor
di atas ReportLab canvas. Tidak butuh file gambar eksternal — cukup
import fungsi ini dan panggil draw_vigilix_logo().

Cara pakai:
    from vigilix_logo_renderer import draw_vigilix_logo
    draw_vigilix_logo(c, x=20*mm, y=height - 28*mm, scale=1.0)
"""

from reportlab.lib.colors import HexColor, white, Color
from reportlab.graphics.shapes import (
    Drawing, Path, Circle, Line, String, Group
)
from reportlab.graphics import renderPDF
from reportlab.lib.units import mm
import math

# ── Palet warna Vigilix ──────────────────────────────────────────────────────
PURPLE_DARK   = HexColor("#534AB7")   # shield border, V mark, wordmark
PURPLE_FILL   = HexColor("#EEEDFE")   # shield background
PURPLE_MID    = HexColor("#7F77DD")   # corner brackets
PURPLE_LIGHT  = HexColor("#AFA9EC")   # radar arcs
PURPLE_SUBTLE = HexColor("#534AB7")   # sweep dot
GRAY_TAGLINE  = HexColor("#888780")   # tagline text


def _shield_path(sx, sy, sw, sh):
    """
    Buat path shield dari koordinat SVG asli (viewBox 300x340)
    yang sudah di-scale ke ukuran target (sw x sh).
    Titik acuan SVG: M150 20 L230 52 L230 160 Q230 238 150 268 Q70 238 70 160 L70 52 Z
    ReportLab: y-axis dibalik (0 = bawah).
    """
    ox, oy = 150, 268      # origin SVG (titik bawah shield)
    vw, vh = 300, 268      # viewBox yang relevan (hanya bagian shield)

    def tx(x): return sx + (x / vw) * sw
    def ty(y): return sy + ((vh - y) / vh) * sh  # flip Y

    p = Path(fillColor=PURPLE_FILL, strokeColor=PURPLE_DARK,
             strokeWidth=sw * 0.008)
    p.moveTo(tx(150), ty(20))
    p.lineTo(tx(230), ty(52))
    p.lineTo(tx(230), ty(160))
    # Kurva kanan bawah
    p.curveTo(tx(230), ty(205), tx(200), ty(238), tx(150), ty(268))
    # Kurva kiri bawah
    p.curveTo(tx(100), ty(238), tx(70), ty(205), tx(70), ty(160))
    p.lineTo(tx(70), ty(52))
    p.closePath()
    return p, tx, ty, sw, sh, vw, vh


def draw_vigilix_logo(canvas_obj, x, y, scale=1.0, show_tagline=True):
    """
    Gambar logo Vigilix di posisi (x, y) — pojok kiri bawah logo.

    Parameters
    ----------
    canvas_obj  : ReportLab Canvas
    x, y        : posisi pojok kiri bawah (dalam unit ReportLab / pt)
    scale       : 1.0 = ukuran default ~40mm lebar
    show_tagline: tampilkan teks "SECURITY MANAGEMENT PLATFORM"
    """
    base_w = 40 * mm * scale
    base_h = 45 * mm * scale   # shield height

    sx, sy = x, y
    sw, sh = base_w, base_h
    vw, vh = 300, 268

    def tx(px): return sx + (px / vw) * sw
    def ty(py): return sy + ((vh - py) / vh) * sh

    c = canvas_obj
    c.saveState()

    # ── 1. Shield background ─────────────────────────────────────────────────
    c.setFillColor(PURPLE_FILL)
    c.setStrokeColor(PURPLE_DARK)
    c.setLineWidth(sw * 0.008)
    p = c.beginPath()
    p.moveTo(tx(150), ty(20))
    p.lineTo(tx(230), ty(52))
    p.lineTo(tx(230), ty(160))
    p.curveTo(tx(230), ty(205), tx(200), ty(238), tx(150), ty(268))
    p.curveTo(tx(100), ty(238), tx(70),  ty(205), tx(70),  ty(160))
    p.lineTo(tx(70), ty(52))
    p.close()
    c.drawPath(p, fill=1, stroke=1)

    # ── 2. Radar arcs (clipped visual — gambar arc secara manual) ────────────
    cx_r, cy_r = tx(150), ty(155)
    c.setStrokeColor(PURPLE_LIGHT)
    c.setFillColor(Color(0, 0, 0, 0))   # transparent
    for r_svg, opacity in [(110, 0.35), (82, 0.45), (54, 0.55)]:
        r = (r_svg / vw) * sw
        c.setLineWidth(0.4)
        c.setStrokeAlpha(opacity)
        # Arc dalam batas shield saja — gambar full circle, shield overlap cover sisanya
        # Karena kita sudah clip dengan menggambar shield di atas nanti, tapi
        # ReportLab tidak punya clip path mudah, kita gambar arc setengah atas saja
        # (bagian yang terlihat dalam shield)
        c.arc(cx_r - r, cy_r - r, cx_r + r, cy_r + r, startAng=0, extent=360)

    # ── 3. Crosshair ─────────────────────────────────────────────────────────
    c.setStrokeColor(PURPLE_LIGHT)
    c.setLineWidth(0.3)
    c.setStrokeAlpha(0.4)
    c.line(tx(40), ty(155), tx(260), ty(155))
    c.line(tx(150), ty(30), tx(150), ty(265))

    # ── 4. V mark ────────────────────────────────────────────────────────────
    c.setStrokeAlpha(1.0)
    # Outer stroke (warna ungu)
    c.setStrokeColor(PURPLE_DARK)
    c.setLineWidth(sw * 0.03)
    c.setLineCap(1)   # round cap
    c.setLineJoin(1)  # round join
    vp = c.beginPath()
    vp.moveTo(tx(112), ty(90))
    vp.lineTo(tx(150), ty(188))
    vp.lineTo(tx(188), ty(90))
    c.drawPath(vp, fill=0, stroke=1)
    # Inner highlight (putih/fill)
    c.setStrokeColor(PURPLE_FILL)
    c.setLineWidth(sw * 0.012)
    c.drawPath(vp, fill=0, stroke=1)

    # ── 5. Radar sweep dot ───────────────────────────────────────────────────
    dot_x, dot_y = tx(210), ty(82)
    dot_r = sw * 0.017
    c.setFillColor(PURPLE_DARK)
    c.setStrokeColor(Color(0, 0, 0, 0))
    c.circle(dot_x, dot_y, dot_r, fill=1, stroke=0)
    c.setFillColor(Color(83/255, 74/255, 183/255, 0.18))
    c.circle(dot_x, dot_y, dot_r * 2, fill=1, stroke=0)

    # ── 6. Corner brackets ───────────────────────────────────────────────────
    c.setStrokeColor(PURPLE_MID)
    c.setLineWidth(sw * 0.006)
    c.setStrokeAlpha(0.75)
    c.setLineCap(1)
    blen = sw * 0.05
    # Top-left
    c.line(tx(80), ty(56), tx(80),    ty(56) - blen)
    c.line(tx(80), ty(56), tx(80) + blen, ty(56))
    # Top-right
    c.line(tx(220), ty(56), tx(220),     ty(56) - blen)
    c.line(tx(220), ty(56), tx(220) - blen, ty(56))
    # Bottom center-left
    c.line(tx(133), ty(268), tx(133),      ty(268) + blen)
    c.line(tx(133), ty(268), tx(133) + blen, ty(268))
    # Bottom center-right
    c.line(tx(167), ty(268), tx(167),      ty(268) + blen)
    c.line(tx(167), ty(268), tx(167) - blen, ty(268))

    # ── 7. Wordmark ──────────────────────────────────────────────────────────
    c.setStrokeAlpha(1.0)
    c.setFillColor(PURPLE_DARK)
    wordmark_y = sy - 5 * mm * scale
    wordmark_size = 9 * mm * scale
    c.setFont("Helvetica-Bold", wordmark_size)
    # Letter-spacing manual
    letters = "VIGILIX"
    letter_gap = wordmark_size * 0.22
    total_w = sum(c.stringWidth(l, "Helvetica-Bold", wordmark_size) for l in letters)
    total_w += letter_gap * (len(letters) - 1)
    lx = sx + (sw - total_w) / 2
    for letter in letters:
        c.drawString(lx, wordmark_y, letter)
        lx += c.stringWidth(letter, "Helvetica-Bold", wordmark_size) + letter_gap

    # ── 8. Tagline ────────────────────────────────────────────────────────────
    if show_tagline:
        c.setFillColor(GRAY_TAGLINE)
        tag_size = 2.8 * mm * scale
        c.setFont("Helvetica", tag_size)
        tagline = "SECURITY MANAGEMENT PLATFORM"
        tag_w = c.stringWidth(tagline, "Helvetica", tag_size)
        c.drawString(sx + (sw - tag_w) / 2, wordmark_y - tag_size * 1.6, tagline)

    c.restoreState()


def logo_total_height(scale=1.0):
    """Return total tinggi logo + wordmark + tagline dalam pt."""
    return (45 + 5 + 9 + 4) * mm * scale
