#!/usr/bin/env python3
"""
Generate two PDFs:
  1. PPT_Content.pdf  -- Full presentation content
  2. System_Architecture.pdf -- Architecture diagram
"""

import os
import re
from fpdf import FPDF
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MD_FILE = os.path.join(BASE_DIR, "PPT_Content.md")
IMG_FILE = os.path.join(BASE_DIR, "System_Architecture.png")
PDF_CONTENT_OUT = os.path.join(BASE_DIR, "PPT_Content.pdf")
PDF_ARCH_OUT = os.path.join(BASE_DIR, "System_Architecture.pdf")

CONTENT_W = 190  # usable width in mm (A4 with 10mm margins)


def sanitize(text):
    """Replace non-latin1 Unicode chars with ASCII equivalents."""
    text = text.replace('\u2014', '--')
    text = text.replace('\u2013', '-')
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u201C', '"').replace('\u201D', '"')
    text = text.replace('\u2026', '...')
    text = text.replace('\u2022', '-')
    text = text.replace('\u00d7', 'x')
    text = text.replace('\u2192', '->')
    text = text.replace('\u2264', '<=').replace('\u2265', '>=')
    text = text.replace('\u2713', 'Y').replace('\u2717', 'N')
    text = text.replace('\u2714', 'Y').replace('\u2716', 'N')
    text = text.replace('\u25bc', 'v').replace('\u25b6', '>')
    # Box drawing chars
    for ch in '\u2500\u2501\u2502\u2503\u250c\u250f\u2510\u2513\u2514\u2517\u2518\u251b\u251c\u2523\u2524\u252b\u252c\u2533\u2534\u253b\u253c\u254b':
        text = text.replace(ch, '+' if ch not in '\u2500\u2501' else '-')
    for ch in '\u2550\u2551\u2554\u2557\u255a\u255d\u2560\u2563\u2566\u2569\u256c':
        text = text.replace(ch, '=' if ch == '\u2550' else ('|' if ch == '\u2551' else '+'))
    # Remaining box drawing
    for code in range(0x2500, 0x2580):
        text = text.replace(chr(code), '+')
    # Remove emoji ranges
    text = re.sub(r'[\U0001F300-\U0001F9FF]', '', text)
    text = re.sub(r'[\u2600-\u27BF]', '', text)
    # Final fallback
    text = text.encode('latin-1', 'replace').decode('latin-1')
    return text


def clean_md(text):
    """Remove markdown formatting."""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'`(.+?)`', r'\1', text)
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)
    text = text.replace('>', '').replace('$', '')
    return sanitize(text.strip())


# ============================================================
# PDF 1: PPT Content
# ============================================================

class ContentPDF(FPDF):
    def header(self):
        if self.page_no() <= 1:
            return
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(140, 140, 140)
        self.cell(0, 5, "VBIT CSE-DS | AI-Powered Academic Timetable System", align="L")
        self.cell(0, 5, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(220, 220, 220)
        self.line(10, 13, 200, 13)
        self.ln(3)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 6)
        self.set_text_color(160, 160, 160)
        self.cell(0, 5, "Dept. of CSE (Data Science) -- Vignana Bharathi Institute of Technology", align="C")

    def safe_write(self, h, text):
        """Write text safely, resetting x to left margin first."""
        self.set_x(10)
        self.multi_cell(CONTENT_W, h, text)

    def write_bullet(self, text, indent=4):
        if self.get_y() > 272:
            self.add_page()
        self.set_x(10 + indent)
        self.cell(4, 5, "-")
        w = CONTENT_W - indent - 4
        self.multi_cell(w, 5, text)

    def write_numbered(self, num, text):
        if self.get_y() > 272:
            self.add_page()
        self.set_x(10)
        self.cell(8, 5, f"{num}.")
        self.multi_cell(CONTENT_W - 8, 5, text)
        self.ln(0.5)


def build_title_page(pdf):
    pdf.add_page()
    pdf.ln(28)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(0, 100, 0)
    pdf.cell(0, 12, "VIGNANA BHARATHI", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 12, "INSTITUTE OF TECHNOLOGY", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 5, "(A UGC Autonomous Institution, Approved by AICTE, Accredited by NBA & NAAC - A Grade, Affiliated to JNTUH)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(0, 0, 120)
    pdf.cell(0, 8, "DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, "(Data Science)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)
    pdf.set_draw_color(0, 100, 0)
    pdf.set_line_width(0.6)
    pdf.line(45, pdf.get_y(), 165, pdf.get_y())
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 7, "Proposed System:", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(180, 0, 0)
    pdf.set_x(10)
    pdf.multi_cell(CONTENT_W, 8, "AI-Powered Academic Timetable Generation\nand Resource Management System", align="C")
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 6, "Domain: Artificial Intelligence / Operations Research & Data Science", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(35)
    sig_y = pdf.get_y()
    for i, label in enumerate(["Student", "Guide", "Coordinator"]):
        x = 15 + i * 63
        pdf.set_draw_color(0, 0, 0)
        pdf.line(x, sig_y, x + 55, sig_y)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(0, 0, 0)
        pdf.set_xy(x, sig_y + 3)
        pdf.cell(55, 5, label, align="C")


def generate_ppt_pdf():
    pdf = ContentPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    build_title_page(pdf)

    with open(MD_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by SLIDE markers
    # Find content between SLIDE markers
    slide_pattern = r'## SLIDE \d+ [^\n]*\n'
    parts = re.split(slide_pattern, content)
    headers = re.findall(slide_pattern, content)

    # Skip first part (before SLIDE 2) and title slide
    for idx, header in enumerate(headers):
        # Extract section number and title
        match = re.search(r'(\d+)\.\s+(.+)', header)
        if match:
            title = clean_md(match.group(0))
        else:
            title = clean_md(header.replace("## ", "").strip())

        body = parts[idx + 1] if idx + 1 < len(parts) else ""

        # Skip title slide
        if "Title Slide" in header:
            continue

        pdf.add_page()

        # Section header
        pdf.set_font("Helvetica", "B", 15)
        pdf.set_text_color(0, 70, 140)
        pdf.set_x(10)
        pdf.multi_cell(CONTENT_W, 9, title[:90])
        pdf.set_draw_color(0, 70, 140)
        pdf.set_line_width(0.4)
        pdf.line(10, pdf.get_y() + 1, 200, pdf.get_y() + 1)
        pdf.ln(5)

        # Stop at sign-off or speaker notes
        if "SIGN-OFF" in body or "SPEAKER NOTES" in body:
            cutoff = body.find("## SIGN-OFF")
            if cutoff == -1:
                cutoff = body.find("## ")
            if cutoff > 0:
                body = body[:cutoff]

        # Process body lines
        body_lines = body.split("\n")
        in_code = False
        code_buf = []
        in_table = False
        table_buf = []

        for bline in body_lines:
            raw = bline.rstrip()

            # Stop markers
            if "SIGN-OFF PAGE" in raw or "SPEAKER NOTES" in raw:
                break

            # Code blocks
            if raw.startswith("```"):
                if in_code:
                    in_code = False
                    # Render code block
                    pdf.set_font("Courier", "", 6)
                    pdf.set_text_color(50, 50, 50)
                    pdf.set_fill_color(243, 243, 243)
                    for cl in code_buf:
                        if pdf.get_y() > 272:
                            pdf.add_page()
                        safe = sanitize(cl)
                        pdf.set_x(12)
                        pdf.cell(186, 3.2, "  " + safe, new_x="LMARGIN", new_y="NEXT", fill=True)
                    pdf.ln(2)
                    code_buf = []
                else:
                    in_code = True
                    code_buf = []
                continue

            if in_code:
                code_buf.append(raw)
                continue

            # Tables
            if "|" in raw and raw.strip().startswith("|"):
                if not in_table:
                    in_table = True
                    table_buf = []
                # Skip separator rows
                if re.match(r'^\|[\s\-:|]+\|$', raw.strip()):
                    continue
                cells = [c.strip() for c in raw.split("|")[1:-1]]
                table_buf.append(cells)
                continue
            elif in_table:
                in_table = False
                if table_buf:
                    render_table(pdf, table_buf)
                    table_buf = []
                # Fall through

            # Skip ---
            if raw.strip() == "---":
                continue

            # H3
            if raw.startswith("### "):
                text = clean_md(raw[4:])
                if not text:
                    continue
                if pdf.get_y() > 268:
                    pdf.add_page()
                pdf.ln(2)
                pdf.set_font("Helvetica", "B", 11)
                pdf.set_text_color(0, 55, 110)
                pdf.set_x(10)
                pdf.multi_cell(CONTENT_W, 6, text)
                pdf.ln(1.5)
                continue

            # H4
            if raw.startswith("#### "):
                text = clean_md(raw[5:])
                if not text:
                    continue
                if pdf.get_y() > 270:
                    pdf.add_page()
                pdf.ln(1)
                pdf.set_font("Helvetica", "B", 9.5)
                pdf.set_text_color(40, 40, 40)
                pdf.set_x(10)
                pdf.multi_cell(CONTENT_W, 5, text)
                pdf.ln(1)
                continue

            # Numbered list
            nm = re.match(r'^(\d+)\.\s+(.+)', raw)
            if nm:
                pdf.set_font("Helvetica", "", 9)
                pdf.set_text_color(30, 30, 30)
                pdf.write_numbered(nm.group(1), clean_md(nm.group(2)))
                continue

            # Bullet (nested or top-level)
            bm = re.match(r'^(\s*)([-*])\s+(.+)', raw)
            if bm:
                indent = 4 if len(bm.group(1)) < 2 else 12
                text = clean_md(bm.group(3))
                if text:
                    pdf.set_font("Helvetica", "", 9)
                    pdf.set_text_color(30, 30, 30)
                    pdf.write_bullet(text, indent)
                continue

            # Regular text
            text = clean_md(raw)
            if text:
                if pdf.get_y() > 272:
                    pdf.add_page()
                pdf.set_font("Helvetica", "", 9)
                pdf.set_text_color(30, 30, 30)
                pdf.set_x(10)
                pdf.multi_cell(CONTENT_W, 5, text)
                pdf.ln(0.5)

        # Flush any remaining table
        if in_table and table_buf:
            render_table(pdf, table_buf)

    pdf.output(PDF_CONTENT_OUT)
    print(f"[OK] PPT_Content.pdf -> {PDF_CONTENT_OUT}")


def render_table(pdf, rows):
    """Render table with cell() only (no multi_cell) for safety."""
    if not rows:
        return
    num_cols = max(len(r) for r in rows)
    col_w = min(CONTENT_W / num_cols, 65)
    max_chars = max(8, int(col_w / 1.6))

    if pdf.get_y() > 258:
        pdf.add_page()

    # Header
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_fill_color(0, 70, 140)
    pdf.set_text_color(255, 255, 255)
    pdf.set_x(10)
    for c in rows[0]:
        pdf.cell(col_w, 5.5, clean_md(c)[:max_chars], border=1, fill=True)
    pdf.ln()

    # Body
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(30, 30, 30)
    for ri, row in enumerate(rows[1:]):
        if pdf.get_y() > 272:
            pdf.add_page()
        fill = ri % 2 == 0
        pdf.set_fill_color(244, 244, 250) if fill else pdf.set_fill_color(255, 255, 255)
        pdf.set_x(10)
        for c in row:
            pdf.cell(col_w, 4.5, clean_md(c)[:max_chars], border=1, fill=fill)
        pdf.ln()
    pdf.ln(2)


# ============================================================
# PDF 2: Architecture Image
# ============================================================

def generate_architecture_pdf():
    img = Image.open(IMG_FILE)
    aspect = img.height / img.width

    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=False)
    pdf.add_page()

    pw, ph = 297, 210
    margin = 12

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(0, 70, 140)
    pdf.cell(0, 10, "System Architecture -- AI-Powered Academic Timetable Generation", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 6, "Vignana Bharathi Institute of Technology -- Department of CSE (Data Science)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    top = pdf.get_y()
    avail_h = ph - top - margin
    avail_w = pw - 2 * margin

    if avail_w * aspect <= avail_h:
        fw, fh = avail_w, avail_w * aspect
    else:
        fh, fw = avail_h, avail_h / aspect

    x = (pw - fw) / 2
    y = top + (avail_h - fh) / 2
    pdf.image(IMG_FILE, x=x, y=y, w=fw, h=fh)

    pdf.set_y(ph - 8)
    pdf.set_font("Helvetica", "I", 6)
    pdf.set_text_color(160, 160, 160)
    pdf.cell(0, 5, "Dept. of CSE (Data Science) -- VBIT", align="C")

    pdf.output(PDF_ARCH_OUT)
    print(f"[OK] System_Architecture.pdf -> {PDF_ARCH_OUT}")


# ============================================================
if __name__ == "__main__":
    print("Generating PDFs...")
    generate_ppt_pdf()
    generate_architecture_pdf()
    print("\nDone! Both PDFs are in the project directory.")
