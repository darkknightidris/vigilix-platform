from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import io

SEVERITY_COLORS = {
    "critical": colors.HexColor("#dc2626"),
    "high": colors.HexColor("#f97316"),
    "medium": colors.HexColor("#eab308"),
    "low": colors.HexColor("#3b82f6"),
    "info": colors.HexColor("#6b7280"),
}

STATUS_LABELS = {
    "open": "Open",
    "in_progress": "In Progress",
    "fixed": "Fixed",
    "closed": "Closed",
}

def generate_pdf(data) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    story = []

    # Styles
    title_style = ParagraphStyle("title", fontSize=22, alignment=TA_CENTER,
                                  spaceAfter=6, textColor=colors.HexColor("#111827"), fontName="Helvetica-Bold")
    subtitle_style = ParagraphStyle("subtitle", fontSize=16, alignment=TA_CENTER,
                                     spaceAfter=4, textColor=colors.HexColor("#2563eb"), fontName="Helvetica-Bold")
    normal_style = ParagraphStyle("normal", fontSize=11, spaceAfter=4,
                                   textColor=colors.HexColor("#374151"), fontName="Helvetica")
    small_style = ParagraphStyle("small", fontSize=9, spaceAfter=2,
                                  textColor=colors.HexColor("#6b7280"), fontName="Helvetica")
    heading_style = ParagraphStyle("heading", fontSize=13, spaceAfter=6, spaceBefore=16,
                                    textColor=colors.HexColor("#111827"), fontName="Helvetica-Bold")
    center_small = ParagraphStyle("center_small", fontSize=9, alignment=TA_CENTER,
                                   textColor=colors.HexColor("#9ca3af"), fontName="Helvetica")

    vulns = data.vulnerabilities
    total = len(vulns)
    counts = {sev: sum(1 for v in vulns if v.severity.lower() == sev)
              for sev in ["critical","high","medium","low","info"]}
    open_count = sum(1 for v in vulns if v.status == "open")
    fixed_count = sum(1 for v in vulns if v.status == "fixed")

    # COVER
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(data.org_name, title_style))
    story.append(Paragraph("Security Assessment Report", title_style))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(data.project_name, subtitle_style))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(f"Prepared by: {data.prepared_by or data.org_name}", small_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#2563eb"), spaceAfter=20))

    # EXECUTIVE SUMMARY
    story.append(Paragraph("Executive Summary", heading_style))
    summary_data = [
        ["Total Temuan", "Critical & High", "Open", "Fixed"],
        [str(total), str(counts["critical"] + counts["high"]), str(open_count), str(fixed_count)]
    ]
    summary_table = Table(summary_data, colWidths=[4*cm]*4)
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1f2937")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 10),
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#f9fafb"), colors.white]),
        ("FONTNAME", (0,1), (-1,-1), "Helvetica-Bold"),
        ("FONTSIZE", (0,1), (-1,-1), 18),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#e5e7eb")),
        ("ROUNDEDCORNERS", [4]),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.5*cm))

    # SEVERITY BREAKDOWN
    story.append(Paragraph("Severity Breakdown", heading_style))
    sev_data = [["Severity", "Jumlah", "Persentase"]]
    for sev in ["critical","high","medium","low","info"]:
        count = counts[sev]
        pct = f"{round(count/total*100)}%" if total > 0 else "0%"
        sev_data.append([sev.upper(), str(count), pct])

    sev_table = Table(sev_data, colWidths=[5*cm, 3*cm, 3*cm])
    sev_style = [
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1f2937")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 10),
        ("ALIGN", (1,0), (-1,-1), "CENTER"),
        ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#e5e7eb")),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]
    for i, sev in enumerate(["critical","high","medium","low","info"], 1):
        sev_style.append(("TEXTCOLOR", (0,i), (0,i), SEVERITY_COLORS.get(sev, colors.gray)))
        sev_style.append(("FONTNAME", (0,i), (0,i), "Helvetica-Bold"))
    sev_table.setStyle(TableStyle(sev_style))
    story.append(sev_table)
    story.append(Spacer(1, 0.5*cm))

    # VULNERABILITY TABLE
    story.append(Paragraph("Daftar Temuan", heading_style))
    vuln_data = [["#", "Judul Temuan", "Severity", "CVSS", "Status"]]
    for i, v in enumerate(vulns, 1):
        cvss = f"{v.cvss_score:.1f}" if v.cvss_score else "-"
        status = STATUS_LABELS.get(v.status, v.status)
        vuln_data.append([str(i), v.title, v.severity.upper(), cvss, status])

    vuln_table = Table(vuln_data, colWidths=[1*cm, 7.5*cm, 2.5*cm, 2*cm, 3*cm])
    vuln_ts = [
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1f2937")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ALIGN", (2,0), (-1,-1), "CENTER"),
        ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#e5e7eb")),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#f9fafb"), colors.white]),
        ("WORDWRAP", (1,1), (1,-1), True),
    ]
    for i, v in enumerate(vulns, 1):
        color = SEVERITY_COLORS.get(v.severity.lower(), colors.gray)
        vuln_ts.append(("TEXTCOLOR", (2,i), (2,i), color))
        vuln_ts.append(("FONTNAME", (2,i), (2,i), "Helvetica-Bold"))
    vuln_table.setStyle(TableStyle(vuln_ts))
    story.append(vuln_table)

    # DETAIL SECTIONS
    has_detail = any(v.description or v.steps_to_reproduce for v in vulns)
    if has_detail:
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph("Detail Temuan", heading_style))
        for i, v in enumerate(vulns, 1):
            if v.description or v.steps_to_reproduce:
                color = SEVERITY_COLORS.get(v.severity.lower(), colors.gray)
                sev_label = v.severity.upper()
                story.append(Spacer(1, 0.3*cm))
                story.append(Paragraph(f"{i}. {v.title} [{sev_label}]", ParagraphStyle(
                    "vuln_title", fontSize=11, fontName="Helvetica-Bold",
                    textColor=colors.HexColor("#111827"), spaceAfter=4
                )))
                if v.description:
                    story.append(Paragraph("<b>Deskripsi:</b>", normal_style))
                    story.append(Paragraph(v.description.replace("\n","<br/>"), normal_style))
                if v.steps_to_reproduce:
                    story.append(Paragraph("<b>Langkah Reproduksi:</b>", normal_style))
                    story.append(Paragraph(v.steps_to_reproduce.replace("\n","<br/>"),
                        ParagraphStyle("steps", fontSize=9, fontName="Courier",
                                       backColor=colors.HexColor("#f9fafb"),
                                       textColor=colors.HexColor("#374151"),
                                       leftIndent=12, rightIndent=12,
                                       spaceAfter=4, spaceBefore=2)))

    # FOOTER
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb"), spaceAfter=8))
    story.append(Paragraph("Laporan ini dibuat menggunakan Vigilix — Platform Vulnerability Management", center_small))
    story.append(Paragraph(f"{data.org_name} | Confidential", center_small))

    doc.build(story)
    return buffer.getvalue()