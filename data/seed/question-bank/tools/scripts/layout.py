"""Extrai o texto de um PDF na ordem de leitura, tratando páginas com duas colunas e trechos de largura total.

Uso: layout.py arquivo.pdf saida.txt [--top N] [--bottom N]

Cada linha é classificada como de largura total (o texto atravessa o meio da página) ou de coluna.
Entre dois trechos de largura total, sai primeiro a coluna esquerda e depois a direita.
Marcadores: '@@PAGE n' no início de cada página.
"""
import argparse
import re
import pdfplumber

ap = argparse.ArgumentParser()
ap.add_argument("pdf")
ap.add_argument("out")
ap.add_argument("--top", type=float, default=0)
ap.add_argument("--bottom", type=float, default=0)
ap.add_argument("--maxgap", type=float, default=9, help="vão máximo entre palavras para considerar a linha contínua")
ap.add_argument("--mono", action="store_true", help="marca palavras em fonte monoespaçada como `texto`")
ap.add_argument("--italic", action="store_true", help="marca palavras em itálico como *texto*")
ap.add_argument("--bold", action="store_true", help="marca palavras em negrito como **texto**")
ap.add_argument("--underline", action="store_true", help="marca palavras sublinhadas como __texto__")
ap.add_argument("--xpos", action="store_true", help="prefixa cada linha com a coordenada x da primeira palavra: '123|'")
ap.add_argument("--indent", type=float, default=6, help="recuo mínimo para marcar início de parágrafo")
ap.add_argument("--gutter", type=float, default=6, help="folga em pontos em torno do meio da página")
a = ap.parse_args()


def lines_of(words, tol=2.5):
    rows = []
    for w in sorted(words, key=lambda w: (round(w["top"]), w["x0"])):
        for r in rows:
            if abs(r["top"] - w["top"]) <= tol:
                r["words"].append(w)
                break
        else:
            rows.append({"top": w["top"], "words": [w]})
    for r in rows:
        r["words"].sort(key=lambda w: w["x0"])
    rows.sort(key=lambda r: r["top"])
    return rows


MARKS = (("u", "__"), ("b", "**"), ("i", "*"), ("m", "`"))


def text(ws):
    """Junta as palavras marcando ênfases: __sublinhado__, **negrito**, *itálico*, `monoespaçado`.
    As marcas são aninhadas corretamente (pilha)."""
    out = ""
    stack = []
    sym = dict(MARKS)
    for i, w in enumerate(ws):
        want = [k for k, _ in MARKS if w.get(k, False)]
        if i:
            # fecha o que não continua (e o que estiver acima na pilha)
            while any(k not in want for k in stack):
                out += sym[stack.pop()]
            gap = w["x0"] - ws[i - 1]["x1"]
            glued = gap < 1.0 and (re.match(r"^[,.;:!?)\]”’-]", w["text"]) or re.search(r"[“‘(\[]$", ws[i - 1]["text"]))
            if not glued:
                out += " "
        for k in want:
            if k not in stack:
                stack.append(k)
                out += sym[k]
        out += w["text"]
    while stack:
        out += sym[stack.pop()]
    out = re.sub(r"`([IVXivx]+|[A-Ea-e])`", r"\1", out)
    return out


def mark_underlines(pg, words):
    segs = [(r["x0"], r["x1"], r["top"]) for r in pg.rects if r["height"] < 1.6 and r["width"] > 2]
    segs += [(l["x0"], l["x1"], l["top"]) for l in pg.lines if abs(l["top"] - l["bottom"]) < 1.6]
    for w in words:
        wd = w["x1"] - w["x0"]
        for x0, x1, top in segs:
            if 0 <= top - w["bottom"] <= 3.5 or -1.5 <= top - w["bottom"] <= 0:
                ov = min(x1, w["x1"]) - max(x0, w["x0"])
                if wd > 0 and ov / wd > 0.6 and (x1 - x0) < 300:
                    w["u"] = True
                    break


with pdfplumber.open(a.pdf) as pdf, open(a.out, "w", encoding="utf-8") as f:
    for n, pg in enumerate(pdf.pages, 1):
        mid = pg.width / 2
        ws = [w for w in pg.extract_words(keep_blank_chars=False, use_text_flow=False, x_tolerance=1.5, extra_attrs=["fontname"])
              if a.top <= w["top"] <= pg.height - a.bottom]
        if a.underline:
            mark_underlines(pg, ws)
        if a.bold:
            for w in ws:
                w["b"] = "bold" in w.get("fontname", "").lower()
        if a.italic:
            for w in ws:
                fn = w.get("fontname", "").lower()
                w["i"] = "italic" in fn or "oblique" in fn
        if a.mono:
            for w in ws:
                fn = w.get("fontname", "").lower()
                w["m"] = "courier" in fn or "mono" in fn or "consola" in fn
        f.write(f"@@PAGE {n}\n")
        left, right = [], []

        def emit(col):
            if not col:
                return
            margin = min(x for x, _ in col)
            for x, t in col:
                pre = f"{x:.0f}|" if a.xpos else ""
                f.write(pre + ("\t" if x - margin > a.indent else "") + t + "\n")

        def flush():
            emit(left)
            emit(right)
            left.clear()
            right.clear()

        for r in lines_of(ws):
            L = [w for w in r["words"] if w["x1"] <= mid + a.gutter]
            R = [w for w in r["words"] if w["x0"] >= mid - a.gutter and w not in L]
            crossing = [w for w in r["words"] if w not in L and w not in R]
            gap = (R[0]["x0"] - L[-1]["x1"]) if (L and R) else 999
            if crossing or gap < a.maxgap:
                flush()
                pre = f"{r['words'][0]['x0']:.0f}|" if a.xpos else ""
                f.write(pre + text(r["words"]) + "\n")  # largura total
                continue
            if L:
                left.append((L[0]["x0"], text(L)))
            if R:
                right.append((R[0]["x0"], text(R)))
        flush()
