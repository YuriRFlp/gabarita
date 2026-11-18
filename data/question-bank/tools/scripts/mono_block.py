"""Reconstrói um trecho de código (fonte monoespaçada) de uma região do PDF, preservando a indentação.

Uso: mono_block.py arquivo.pdf página "texto da primeira linha" "texto da última linha" [coluna: L|R|F]
Procura a primeira e a última linha pelo início do texto e devolve as linhas entre elas (inclusive),
com espaços calculados pela largura média de um caractere da fonte monoespaçada.
"""
import sys

import pdfplumber

pdf, page, first, last = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
col = sys.argv[5] if len(sys.argv) > 5 else "F"
xmin = float(sys.argv[6]) if len(sys.argv) > 6 else 0
extra = int(sys.argv[7]) if len(sys.argv) > 7 else 0

with pdfplumber.open(pdf) as p:
    pg = p.pages[page - 1]
    mid = pg.width / 2
    chars = [c for c in pg.chars if (c["text"].strip() or c["text"] == " ") and c["x0"] >= xmin]
    if col == "L":
        chars = [c for c in chars if c["x1"] <= mid + 2]
    elif col == "R":
        chars = [c for c in chars if c["x0"] >= mid - 2]
    rows = {}
    for c in chars:
        key = round(c["top"] / 2)
        rows.setdefault(key, []).append(c)
    lines = []
    for key in sorted(rows):
        cs = sorted(rows[key], key=lambda c: c["x0"])
        while cs and not cs[0]["text"].strip():
            cs = cs[1:]
        if cs:
            lines.append(cs)

    def plain(cs):
        return "".join(c["text"] for c in cs).strip()

    start = next(i for i, cs in enumerate(lines) if plain(cs).replace(" ", "").startswith(first.replace(" ", "")))
    end = next(i for i in range(start, len(lines)) if plain(lines[i]).replace(" ", "").startswith(last.replace(" ", "")))
    block = lines[start:end + 1 + extra]
    mono = [c for cs in block for c in cs if c["text"].strip()]
    cw = sorted(c["x1"] - c["x0"] for c in mono)[len(mono) // 2]
    left = min(cs[0]["x0"] for cs in block)
    for cs in block:
        out = " " * round((cs[0]["x0"] - left) / cw)
        prev = None
        for c in cs:
            if prev is not None:
                gap = c["x0"] - prev["x1"]
                if gap > cw * 0.5:
                    out += " " * max(1, round(gap / cw))
            if c["text"] != " ":
                out += c["text"]
            elif prev is not None and prev["text"] != " ":
                pass
            prev = c if c["text"] != " " else prev
        print(out.rstrip())
