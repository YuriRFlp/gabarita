"""Extrai texto por coluna de PDFs em duas colunas (pdfplumber). Uso: cols.py pdf saida [top] [bottom]"""
import sys, pdfplumber
pdf, out = sys.argv[1], sys.argv[2]
top = float(sys.argv[3]) if len(sys.argv) > 3 else 0
bot = float(sys.argv[4]) if len(sys.argv) > 4 else 0
with pdfplumber.open(pdf) as p, open(out, "w") as f:
    for i, pg in enumerate(p.pages, 1):
        w, h = pg.width, pg.height
        for side, box in (("L", (0, top, w / 2, h - bot)), ("R", (w / 2, top, w, h - bot))):
            t = pg.crop(box).extract_text() or ""
            f.write(f"\n@@PAGE {i}{side} imgs={len(pg.images)}\n{t}\n")
