"""
pdf_generator.py — Vigilix
==========================
Patch ini menggantikan fungsi _draw_header() yang sudah ada dan menambahkan
dukungan custom logo perusahaan (upload dari Supabase Storage).

CARA INTEGRASI:
1. Taruh vigilix_logo_renderer.py di folder yang sama dengan pdf_generator.py
2. Ganti fungsi _draw_header() lama dengan versi baru di bawah
3. Update fungsi generate_report() untuk menerima parameter `org_logo_url`
4. Pastikan `requests` ada di requirements.txt (sudah ada jika pakai Supabase)

STRUKTUR HEADER PDF (kiri ke kanan):
  [Logo Vigilix] | [Logo Client (opsional)] | [Judul + Meta laporan]
"""

import io
import os
import requests
import tempfile
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, Color
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# Import renderer logo Vigilix
from vigilix_logo_renderer import draw_vigilix_logo

# ── Konstanta warna ───────────────────────────────────────────────────────────
C_PURPLE      = HexColor("#534AB7")
C_PURPLE_FILL = HexColor("#EEEDFE")
C_PURPLE_MID  = HexColor("#7F77DD")
C_PURPLE_LIGHT= HexColor("#AFA9EC")
C_GRAY_DARK   = HexColor("#2C2C2A")
C_GRAY_MID    = HexColor("#5F5E5A")
C_GRAY_LIGHT  = HexColor("#D3D1C7")
C_GRAY_BG     = HexColor("#F1EFE8")

# Severity colors
SEVERITY_COLORS = {
    "critical": HexColor("#E24B4A"),
    "high":     HexColor("#EF9F27"),
    "medium":   HexColor("#378ADD"),
    "low":      HexColor("#1D9E75"),
    "info":     HexColor("#888780"),
}

W, H = A4
MARGIN = 20 * mm
HEADER_H = 32 * mm   # tinggi area header


# ── Utility: download logo client dari URL ────────────────────────────────────

def _fetch_org_logo(logo_url: str) -> str | None:
    """
    Download logo organisasi dari Supabase Storage URL.
    Return path file sementara (.png / .jpg), atau None jika gagal.
    Format yang didukung: PNG, JPG, JPEG, GIF, BMP.
    """
    if not logo_url:
        return None
    try:
        resp = requests.get(logo_url, timeout=8)
        resp.raise_for_status()
        content_type = resp.headers.get("content-type", "")
        # Tentukan ekstensi
        if "png" in content_type:
            suffix = ".png"
        elif "jpeg" in content_type or "jpg" in content_type:
            suffix = ".jpg"
        elif "gif" in content_type:
            suffix = ".gif"
        else:
            suffix = ".png"  # default
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp.write(resp.content)
        tmp.close()
        return tmp.name
    except Exception as e:
        print(f"[PDF] Gagal download org logo: {e}")
        return None


# ── Header renderer ───────────────────────────────────────────────────────────

def _draw_header(
    c: canvas.Canvas,
    project_name: str,
    org_name: str,
    generated_at: str,
    org_logo_path: str | None = None,
    page_num: int = 1,
    total_pages: int = 1,
):
    """
    Gambar header di atas setiap halaman PDF.

    Layout:
    ┌────────────────────────────────────────────────────────────────┐
    │ [Vigilix logo]  │  [Client logo?]  │  Judul  ·  Meta  · Hal  │
    └────────────────────────────────────────────────────────────────┘
    """
    # Background header
    c.setFillColor(C_PURPLE_FILL)
    c.rect(MARGIN, H - HEADER_H - 8*mm, W - 2*MARGIN, HEADER_H, fill=1, stroke=0)
    # Garis bawah header
    c.setStrokeColor(C_PURPLE)
    c.setLineWidth(0.8)
    c.line(MARGIN, H - HEADER_H - 8*mm, W - MARGIN, H - HEADER_H - 8*mm)

    logo_scale = 0.48
    logo_x = MARGIN + 2*mm
    logo_y = H - HEADER_H - 6*mm

    # ── Logo Vigilix ─────────────────────────────────────────────────────────
    draw_vigilix_logo(c, x=logo_x, y=logo_y, scale=logo_scale, show_tagline=False)
    vigilix_logo_w = 42 * mm * logo_scale   # lebar efektif logo

    content_x = logo_x + vigilix_logo_w + 4*mm

    # ── Logo client (opsional) ───────────────────────────────────────────────
    if org_logo_path:
        try:
            # Divider vertikal
            c.setStrokeColor(C_PURPLE_LIGHT)
            c.setLineWidth(0.7)
            c.line(content_x, logo_y + 2*mm, content_x, logo_y + HEADER_H - 4*mm)
            content_x += 3*mm

            # Hitung ukuran logo agar muat dalam kotak 28mm x 24mm
            from reportlab.lib.utils import ImageReader
            img_reader = ImageReader(org_logo_path)
            iw, ih = img_reader.getSize()
            max_w, max_h = 28*mm, 24*mm
            ratio = min(max_w / iw, max_h / ih)
            draw_w, draw_h = iw * ratio, ih * ratio
            img_y = logo_y + (HEADER_H - draw_h) / 2
            c.drawImage(
                org_logo_path,
                content_x, img_y,
                width=draw_w, height=draw_h,
                preserveAspectRatio=True, mask="auto"
            )
            content_x += draw_w + 5*mm
        except Exception as e:
            print(f"[PDF] Gagal render org logo: {e}")

    # ── Divider sebelum teks ─────────────────────────────────────────────────
    c.setStrokeColor(C_PURPLE_LIGHT)
    c.setLineWidth(0.7)
    c.line(content_x, logo_y + 2*mm, content_x, logo_y + HEADER_H - 4*mm)
    content_x += 4*mm

    # ── Teks: judul laporan, org, tanggal ────────────────────────────────────
    text_y_top = logo_y + HEADER_H - 7*mm
    c.setFillColor(C_PURPLE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(content_x, text_y_top, "Security Findings Report")

    c.setFillColor(C_GRAY_MID)
    c.setFont("Helvetica", 8.5)
    c.drawString(content_x, text_y_top - 5.5*mm, f"Project: {project_name}")
    c.drawString(content_x, text_y_top - 10*mm, f"Organization: {org_name}")
    c.drawString(content_x, text_y_top - 14.5*mm, f"Generated: {generated_at}")

    # ── Nomor halaman (pojok kanan) ───────────────────────────────────────────
    c.setFillColor(C_GRAY_MID)
    c.setFont("Helvetica", 8)
    page_text = f"Page {page_num} of {total_pages}"
    page_text_w = c.stringWidth(page_text, "Helvetica", 8)
    c.drawString(W - MARGIN - page_text_w, H - 8*mm, page_text)


# ── Footer renderer ───────────────────────────────────────────────────────────

def _draw_footer(c: canvas.Canvas):
    """Footer tipis di bawah setiap halaman."""
    c.setStrokeColor(C_GRAY_LIGHT)
    c.setLineWidth(0.4)
    c.line(MARGIN, 12*mm, W - MARGIN, 12*mm)
    c.setFillColor(C_GRAY_MID)
    c.setFont("Helvetica", 7.5)
    c.drawString(MARGIN, 8*mm, "Vigilix — Security Management Platform  ·  vigilix.id")
    c.setFillColor(C_PURPLE)
    c.drawRightString(W - MARGIN, 8*mm, "CONFIDENTIAL")


# ── Severity badge ────────────────────────────────────────────────────────────

def _draw_severity_badge(c: canvas.Canvas, x: float, y: float, severity: str):
    """Gambar badge severity berwarna (lebar ~18mm, tinggi ~5mm)."""
    color = SEVERITY_COLORS.get(severity.lower(), C_GRAY_MID)
    badge_w, badge_h = 18*mm, 5*mm
    c.setFillColor(color)
    c.roundRect(x, y - 1*mm, badge_w, badge_h, 1.5*mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 7.5)
    label = severity.upper()
    label_w = c.stringWidth(label, "Helvetica-Bold", 7.5)
    c.drawString(x + (badge_w - label_w) / 2, y + 0.8*mm, label)


# ── Fungsi utama: generate_report() ──────────────────────────────────────────

def generate_report(
    findings: list[dict],
    project_name: str,
    org_name: str,
    org_logo_url: str | None = None,   # ← BARU: URL logo dari Supabase Storage
    output_path: str = "report.pdf",
) -> str:
    """
    Generate PDF laporan temuan keamanan.

    Parameters
    ----------
    findings      : list of dict, setiap item minimal punya:
                    { "title", "severity", "status", "cvss_score",
                      "description", "steps_to_reproduce" }
    project_name  : nama project
    org_name      : nama organisasi
    org_logo_url  : URL publik / signed URL logo dari Supabase Storage (opsional)
    output_path   : path output PDF

    Returns
    -------
    str : path PDF yang dihasilkan
    """
    generated_at = datetime.now().strftime("%d %B %Y, %H:%M WIB")
    org_logo_path = _fetch_org_logo(org_logo_url)

    # Hitung total halaman (estimasi kasar: 1 halaman per ~4 temuan + cover)
    est_pages = max(2, 1 + math.ceil(len(findings) / 4))

    c = canvas.Canvas(output_path, pagesize=A4)
    total_pages = est_pages   # akan di-update di pass kedua jika perlu

    # ── Halaman 1: Cover ─────────────────────────────────────────────────────
    c.setFillColor(white)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Background dekoratif atas
    c.setFillColor(C_PURPLE_FILL)
    c.rect(0, H * 0.55, W, H * 0.45, fill=1, stroke=0)

    # Logo besar di cover
    cover_logo_scale = 1.1
    logo_center_x = W / 2 - (42 * mm * cover_logo_scale) / 2
    draw_vigilix_logo(
        c, x=logo_center_x, y=H * 0.62,
        scale=cover_logo_scale, show_tagline=True
    )

    # Garis pemisah cover
    c.setStrokeColor(C_PURPLE)
    c.setLineWidth(1)
    c.line(MARGIN, H * 0.55, W - MARGIN, H * 0.55)

    # Teks cover
    c.setFillColor(C_GRAY_DARK)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(W / 2, H * 0.48, "Security Findings Report")

    c.setFillColor(C_GRAY_MID)
    c.setFont("Helvetica", 13)
    c.drawCentredString(W / 2, H * 0.43, project_name)

    c.setFillColor(C_GRAY_LIGHT)
    c.setLineWidth(0.4)
    c.line(MARGIN + 30*mm, H * 0.40, W - MARGIN - 30*mm, H * 0.40)

    # Logo client di cover (jika ada)
    if org_logo_path:
        try:
            from reportlab.lib.utils import ImageReader
            img_reader = ImageReader(org_logo_path)
            iw, ih = img_reader.getSize()
            max_w, max_h = 35*mm, 28*mm
            ratio = min(max_w / iw, max_h / ih)
            draw_w, draw_h = iw * ratio, ih * ratio
            c.drawImage(
                org_logo_path,
                W / 2 - draw_w / 2, H * 0.32,
                width=draw_w, height=draw_h,
                preserveAspectRatio=True, mask="auto"
            )
            offset_y = H * 0.30
        except Exception:
            offset_y = H * 0.36
    else:
        offset_y = H * 0.36

    c.setFillColor(C_GRAY_MID)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, offset_y,        f"Organization: {org_name}")
    c.drawCentredString(W / 2, offset_y - 6*mm, f"Generated: {generated_at}")

    # Summary boxes di cover
    summary = {
        "critical": sum(1 for f in findings if f.get("severity","").lower() == "critical"),
        "high":     sum(1 for f in findings if f.get("severity","").lower() == "high"),
        "medium":   sum(1 for f in findings if f.get("severity","").lower() == "medium"),
        "low":      sum(1 for f in findings if f.get("severity","").lower() == "low"),
    }
    box_labels = [("CRITICAL", "critical"), ("HIGH", "high"), ("MEDIUM", "medium"), ("LOW", "low")]
    box_w = 28*mm
    box_h = 20*mm
    total_box_w = len(box_labels) * box_w + (len(box_labels) - 1) * 4*mm
    start_x = (W - total_box_w) / 2
    box_y = H * 0.18

    for i, (label, key) in enumerate(box_labels):
        bx = start_x + i * (box_w + 4*mm)
        color = SEVERITY_COLORS[key]
        # Box background
        c.setFillColor(HexColor(color.hexval() + "22") if hasattr(color, "hexval") else C_GRAY_BG)
        c.setStrokeColor(color)
        c.setLineWidth(1)
        c.roundRect(bx, box_y, box_w, box_h, 2*mm, fill=1, stroke=1)
        # Angka
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 18)
        count_str = str(summary[key])
        count_w = c.stringWidth(count_str, "Helvetica-Bold", 18)
        c.drawString(bx + (box_w - count_w) / 2, box_y + 8*mm, count_str)
        # Label
        c.setFont("Helvetica", 7)
        label_w = c.stringWidth(label, "Helvetica", 7)
        c.drawString(bx + (box_w - label_w) / 2, box_y + 3*mm, label)

    # Total findings
    c.setFillColor(C_GRAY_MID)
    c.setFont("Helvetica", 9)
    c.drawCentredString(W / 2, box_y - 6*mm, f"Total: {len(findings)} findings")

    _draw_footer(c)
    c.showPage()

    # ── Halaman temuan ────────────────────────────────────────────────────────
    for idx, finding in enumerate(findings, 1):
        c.setFillColor(white)
        c.rect(0, 0, W, H, fill=1, stroke=0)

        _draw_header(
            c,
            project_name=project_name,
            org_name=org_name,
            generated_at=generated_at,
            org_logo_path=org_logo_path,
            page_num=idx + 1,
            total_pages=total_pages,
        )

        # Content area
        content_y = H - HEADER_H - 14*mm
        content_x = MARGIN

        # ── Finding number + judul ────────────────────────────────────────
        c.setFillColor(C_PURPLE)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(content_x, content_y, f"#{idx:02d}  {finding.get('title', 'Untitled')}")
        content_y -= 7*mm

        # ── Severity badge + CVSS + Status ───────────────────────────────
        severity = finding.get("severity", "info")
        _draw_severity_badge(c, content_x, content_y, severity)

        cvss = finding.get("cvss_score")
        if cvss is not None:
            c.setFillColor(C_GRAY_MID)
            c.setFont("Helvetica", 8.5)
            c.drawString(content_x + 22*mm, content_y + 0.8*mm,
                         f"CVSS: {float(cvss):.1f}")

        status = finding.get("status", "open")
        status_colors = {
            "open": C_GRAY_MID,
            "in_progress": HexColor("#BA7517"),
            "resolved": HexColor("#1D9E75"),
        }
        c.setFillColor(status_colors.get(status, C_GRAY_MID))
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(content_x + 45*mm, content_y + 0.8*mm, status.replace("_", " ").upper())
        content_y -= 9*mm

        # Garis tipis
        c.setStrokeColor(C_GRAY_LIGHT)
        c.setLineWidth(0.4)
        c.line(MARGIN, content_y, W - MARGIN, content_y)
        content_y -= 6*mm

        # ── Description ───────────────────────────────────────────────────
        c.setFillColor(C_GRAY_DARK)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(content_x, content_y, "Description")
        content_y -= 5*mm
        c.setFont("Helvetica", 9)
        c.setFillColor(C_GRAY_MID)
        desc = finding.get("description", "-")
        # Word wrap sederhana ~85 karakter per baris
        from textwrap import wrap
        for line in wrap(desc, 95)[:6]:   # max 6 baris
            c.drawString(content_x, content_y, line)
            content_y -= 4.5*mm
        content_y -= 3*mm

        # ── Steps to reproduce ────────────────────────────────────────────
        steps = finding.get("steps_to_reproduce", "")
        if steps:
            c.setFillColor(C_GRAY_DARK)
            c.setFont("Helvetica-Bold", 9)
            c.drawString(content_x, content_y, "Steps to Reproduce")
            content_y -= 5*mm
            c.setFont("Helvetica", 9)
            c.setFillColor(C_GRAY_MID)
            # Background kotak abu untuk steps
            steps_lines = wrap(steps, 90)[:8]
            box_h_steps = len(steps_lines) * 4.5*mm + 4*mm
            c.setFillColor(C_GRAY_BG)
            c.rect(content_x, content_y - box_h_steps + 2*mm,
                   W - 2*MARGIN, box_h_steps, fill=1, stroke=0)
            c.setFillColor(C_GRAY_MID)
            for line in steps_lines:
                c.drawString(content_x + 2*mm, content_y, line)
                content_y -= 4.5*mm
            content_y -= 5*mm

        # ── Remediation notes (jika ada) ──────────────────────────────────
        remed = finding.get("remediation_notes", "")
        if remed:
            c.setFillColor(HexColor("#1D9E75"))
            c.setFont("Helvetica-Bold", 9)
            c.drawString(content_x, content_y, "Remediation Notes")
            content_y -= 5*mm
            c.setFont("Helvetica", 9)
            c.setFillColor(C_GRAY_MID)
            for line in wrap(remed, 95)[:4]:
                c.drawString(content_x, content_y, line)
                content_y -= 4.5*mm

        _draw_footer(c)
        c.showPage()

    # Simpan PDF
    c.save()

    # Cleanup temp file
    if org_logo_path and os.path.exists(org_logo_path):
        os.unlink(org_logo_path)

    return output_path


# ── Import yang dibutuhkan di atas tapi lupa ──────────────────────────────────
import math
