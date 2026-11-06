from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak,
    KeepTogether, Table, TableStyle, ListFlowable, ListItem,
)
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "HEX_SETTLERS_GAME_REFERENCE.md"
OUTPUT = ROOT / "docs" / "HEX_SETTLERS_GAME_REFERENCE.pdf"


def register_fonts():
    candidates = [
        ("Aptos", Path(r"C:\Windows\Fonts\aptos.ttf")),
        ("Aptos-Bold", Path(r"C:\Windows\Fonts\aptos-bold.ttf")),
        ("Arial", Path(r"C:\Windows\Fonts\arial.ttf")),
        ("Arial-Bold", Path(r"C:\Windows\Fonts\arialbd.ttf")),
    ]
    for name, path in candidates:
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))
    regular = "Aptos" if "Aptos" in pdfmetrics.getRegisteredFontNames() else "Arial" if "Arial" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
    bold = "Aptos-Bold" if "Aptos-Bold" in pdfmetrics.getRegisteredFontNames() else "Arial-Bold" if "Arial-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"
    return regular, bold


REGULAR, BOLD = register_fonts()
NAVY = colors.HexColor("#15324A")
TEAL = colors.HexColor("#1E7A78")
GOLD = colors.HexColor("#D7A62A")
INK = colors.HexColor("#20313D")
MUTED = colors.HexColor("#667782")
PALE = colors.HexColor("#EAF4F3")
LINE = colors.HexColor("#C7D5DA")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="BookTitle", fontName=BOLD, fontSize=28, leading=32, textColor=colors.white, alignment=TA_CENTER, spaceAfter=18))
styles.add(ParagraphStyle(name="BookSub", fontName=REGULAR, fontSize=12, leading=17, textColor=colors.HexColor("#DCE9EE"), alignment=TA_CENTER))
styles.add(ParagraphStyle(name="H1x", fontName=BOLD, fontSize=18, leading=22, textColor=NAVY, spaceBefore=10, spaceAfter=8, keepWithNext=True))
styles.add(ParagraphStyle(name="H2x", fontName=BOLD, fontSize=13.5, leading=17, textColor=TEAL, spaceBefore=8, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle(name="H3x", fontName=BOLD, fontSize=11, leading=14, textColor=NAVY, spaceBefore=6, spaceAfter=3, keepWithNext=True))
styles.add(ParagraphStyle(name="Bodyx", fontName=REGULAR, fontSize=8.9, leading=11.8, textColor=INK, spaceAfter=4.5))
styles.add(ParagraphStyle(name="Smallx", fontName=REGULAR, fontSize=7.5, leading=9.4, textColor=MUTED))
styles.add(ParagraphStyle(name="Calloutx", fontName=REGULAR, fontSize=9.1, leading=12.5, textColor=NAVY, backColor=PALE, borderColor=TEAL, borderWidth=1, borderPadding=8, spaceBefore=5, spaceAfter=8))
styles.add(ParagraphStyle(name="Indexx", fontName=REGULAR, fontSize=9, leading=12, textColor=NAVY, leftIndent=8, spaceAfter=2))
styles.add(ParagraphStyle(name="TableHeadx", fontName=BOLD, fontSize=8, leading=9.5, textColor=colors.white))
styles.add(ParagraphStyle(name="TableBodyx", fontName=REGULAR, fontSize=7.4, leading=9.2, textColor=INK))


def esc(text):
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.+?)`", r"<font name='Courier'>\1</font>", text)
    text = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", text)
    return text


def parse_table(lines):
    rows = []
    for line in lines:
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", c) for c in cells):
            continue
        rows.append(cells)
    if not rows:
        return None
    count = max(len(r) for r in rows)
    rows = [r + [""] * (count - len(r)) for r in rows]
    wrapped = []
    for ri, row in enumerate(rows):
        style = styles["TableHeadx"] if ri == 0 else styles["TableBodyx"]
        wrapped.append([Paragraph(esc(cell), style) for cell in row])
    usable = 7.15 * inch
    if count == 2:
        widths = [usable * 0.34, usable * 0.66]
    elif count == 3:
        widths = [usable * 0.24, usable * 0.34, usable * 0.42]
    elif count == 6:
        widths = [usable * 0.16] + [usable * 0.168] * 5
    else:
        widths = [usable / count] * count
    table = Table(wrapped, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F8F9")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def page_decor(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setFillColor(NAVY)
    canvas.rect(0, height - 0.32 * inch, width, 0.32 * inch, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, height - 0.35 * inch, width, 0.03 * inch, fill=1, stroke=0)
    if doc.page > 1:
        canvas.setFont(REGULAR, 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(0.7 * inch, 0.38 * inch, "HEX SETTLERS - PLAYER AND DIAGNOSTIC REFERENCE")
        canvas.drawRightString(width - 0.7 * inch, 0.38 * inch, f"{doc.page}")
    canvas.restoreState()


class BookDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=letter, leftMargin=0.68*inch, rightMargin=0.68*inch, topMargin=0.58*inch, bottomMargin=0.62*inch, title="Hex Settlers: Player and Diagnostic Reference", author="Hex Settlers Project")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates(PageTemplate(id="book", frames=[frame], onPage=page_decor))


def build_story(markdown):
    lines = markdown.splitlines()
    story = []
    story.extend([
        Spacer(1, 0.7 * inch),
        Table([[Paragraph("HEX SETTLERS", styles["BookTitle"])], [Paragraph("Player and Diagnostic Reference", styles["BookSub"])], [Spacer(1, 0.2*inch)], [Paragraph("Public edition - Version 1.0 - 6 November 2026", styles["BookSub"]) ]], colWidths=[7.15*inch], rowHeights=[0.65*inch, 0.4*inch, 2.9*inch, 0.45*inch], style=TableStyle([("BACKGROUND",(0,0),(-1,-1),NAVY),("BOX",(0,0),(-1,-1),2,GOLD),("VALIGN",(0,0),(-1,-1),"MIDDLE")])) ,
        Spacer(1, 0.28*inch),
        Paragraph("A complete public guide to gameplay, maps, ranked play, tools, recovery, privacy boundaries, troubleshooting, and verified system behavior.", styles["Calloutx"]),
        PageBreak(),
    ])
    i = 3  # skip source title/version already rendered
    pending = []
    while i < len(lines):
        raw = lines[i].rstrip()
        if not raw:
            i += 1
            continue
        if raw == "---":
            story.append(Spacer(1, 6))
            i += 1
            continue
        if raw.startswith("## "):
            title = raw[3:].strip()
            if title == "Index":
                story.append(Paragraph(title, styles["H1x"]))
            else:
                story.extend([PageBreak(), Paragraph(esc(title), styles["H1x"])])
            i += 1
            continue
        if raw.startswith("### "):
            story.append(Paragraph(esc(raw[4:].strip()), styles["H2x"]))
            i += 1
            continue
        if raw.startswith("#### "):
            story.append(Paragraph(esc(raw[5:].strip()), styles["H3x"]))
            i += 1
            continue
        if raw.startswith("> "):
            story.append(Paragraph(esc(raw[2:]), styles["Calloutx"]))
            i += 1
            continue
        if raw.startswith("|"):
            block = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                block.append(lines[i])
                i += 1
            table = parse_table(block)
            if table:
                story.extend([Spacer(1, 3), table, Spacer(1, 7)])
            continue
        if re.match(r"^[-*] ", raw):
            items = []
            while i < len(lines) and re.match(r"^[-*] ", lines[i].strip()):
                items.append(ListItem(Paragraph(esc(re.sub(r"^[-*] ", "", lines[i].strip())), styles["Bodyx"]), leftIndent=11))
                i += 1
            story.append(ListFlowable(items, bulletType="bullet", start="circle", leftIndent=18, bulletFontName=REGULAR, bulletFontSize=6, spaceAfter=5))
            continue
        if re.match(r"^\d+\. ", raw):
            items = []
            while i < len(lines) and re.match(r"^\d+\. ", lines[i].strip()):
                items.append(ListItem(Paragraph(esc(re.sub(r"^\d+\. ", "", lines[i].strip())), styles["Bodyx"]), leftIndent=11))
                i += 1
            story.append(ListFlowable(items, bulletType="1", leftIndent=22, bulletFontName=BOLD, bulletFontSize=8, spaceAfter=5))
            continue
        para = [raw]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#{2,4} |[-*] |\d+\. |\||> |---$)", lines[i].strip()):
            para.append(lines[i].strip())
            i += 1
        text = " ".join(para)
        style = styles["Indexx"] if re.match(r"^\d+\. \[", text) else styles["Bodyx"]
        story.append(Paragraph(esc(text), style))
    return story


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    text = SOURCE.read_text(encoding="utf-8")
    doc = BookDoc(str(OUTPUT))
    doc.build(build_story(text))
    print(OUTPUT)


if __name__ == "__main__":
    main()
