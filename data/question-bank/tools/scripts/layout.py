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
ap.add_argument("--code", action="store_true",
                help="linhas cujo conteúdo é todo em fonte monoespaçada saem como '§§x,cw§texto' (x da 1ª palavra, largura do caractere), com o espaçamento interno preservado; um prefixo '(A)' ou 'N.' fica antes do marcador")
ap.add_argument("--fontmap", default="",
                help="estilos por trecho do nome da fonte, para PDFs com fontes sem nome descritivo: 'B42=b,BA2=i,C82=opt'. "
                     "b negrito, i itálico, m monoespaçada, opt letra de alternativa (sai como '(A)')")
ap.add_argument("--automono", action="store_true", help="detecta fontes monoespaçadas pela largura constante dos caracteres")
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


PREFIX = re.compile(r"^(\([A-E]\)|\d{1,2}\.)$")
ROMAN_ONLY = re.compile(r"^[IVX]+[.)]?$|^[a-e]\)$")


def merge_lacunas(ws):
    """Lacuna da FCC: pontilhado (glifo MTExtra) com o número romano em cima. Vira uma palavra '...II...'."""
    dots = [w for w in ws if "mtextra" in w.get("fontname", "").lower() and set(w["text"]) <= {"\uf04b"}]
    drop = set()
    for d in dots:
        lab = next((w for w in ws if id(w) not in drop and re.fullmatch(r"[IVX]+", w["text"])
                    and 2 <= d["top"] - w["top"] <= 8 and w["x0"] >= d["x0"] - 3 and w["x1"] <= d["x1"] + 3), None)
        if lab:
            drop.add(id(lab))
            d["text"] = f"...{lab['text']}..."
            d["lacuna"] = True
            near = [w for w in ws if w is not d and w is not lab and not set(w["text"]) <= {"\uf04b"} and abs(w["top"] - d["top"]) <= 6]
            if near:
                d["top"] = min(near, key=lambda w: abs(w["top"] - d["top"]))["top"]
    return [w for w in ws if id(w) not in drop]


FONTMAP = {}
MONO_FONTS = set()


def styles(w):
    fn = w.get("fontname", "")
    for k, v in FONTMAP.items():
        if k in fn:
            return v
    return ""


def is_mono(w):
    if w.get("lacuna"):
        return True
    if w.get("fontname", "") in MONO_FONTS or "m" in styles(w):
        return True
    fn = w.get("fontname", "").lower()
    return "courier" in fn or "mono" in fn or "consola" in fn


def code_text(ws):
    """Linha de código: espaços proporcionais aos vãos entre palavras; marcador com x e largura do caractere."""
    real = [w for w in ws if not w.get("lacuna")] or ws
    cw = sum((w["x1"] - w["x0"]) / max(1, len(w["text"])) for w in real) / len(real)
    out = ws[0]["text"]
    for p, w in zip(ws, ws[1:]):
        gap = w["x0"] - p["x1"]
        out += " " * (max(1, round(gap / cw)) if gap > cw * 0.4 else 0) + w["text"]
    return f"§§{ws[0]['x0']:.1f},{cw:.2f}§" + out


def render(ws):
    if a.code:
        pre = ws[:1] if ws and PREFIX.match(ws[0]["text"]) and not is_mono(ws[0]) else []
        body = ws[len(pre):]
        if body and all(is_mono(w) for w in body) and not (len(body) <= 3 and all(ROMAN_ONLY.match(w["text"]) or w["text"] in ("e", ",") for w in body)):
            return (text(pre) + " " if pre else "") + code_text(body)
    return text(ws)


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


FONTMAP.update(dict(x.split("=", 1) for x in a.fontmap.split(",") if x))
with pdfplumber.open(a.pdf) as pdf, open(a.out, "w", encoding="utf-8") as f:
    if a.automono:
        ratios = {}
        for pg in pdf.pages:
            for c in pg.chars:
                if c["text"].strip() and c["size"]:
                    ratios.setdefault(c["fontname"], []).append(round(c["width"] / c["size"], 2))
        for fn, v in ratios.items():
            if len(v) >= 20 and len(set(v)) <= 2 and 0.55 <= sum(v) / len(v) <= 0.65:
                MONO_FONTS.add(fn)
    for n, pg in enumerate(pdf.pages, 1):
        mid = pg.width / 2
        ws = [w for w in pg.extract_words(keep_blank_chars=False, use_text_flow=False, x_tolerance=1.5, extra_attrs=["fontname"])
              if a.top <= w["top"] <= pg.height - a.bottom]
        ws = merge_lacunas(ws)
        if a.underline:
            mark_underlines(pg, ws)
        if a.bold:
            for w in ws:
                w["b"] = "bold" in w.get("fontname", "").lower() or "b" in styles(w)
        if a.italic:
            for w in ws:
                fn = w.get("fontname", "").lower()
                w["i"] = "italic" in fn or "oblique" in fn or "i" in styles(w).replace("opt", "")
        if a.mono:
            for w in ws:
                w["m"] = is_mono(w) and not w.get("lacuna")
        for w in ws:
            if styles(w) == "opt" and re.fullmatch(r"[A-E]", w["text"]):
                w["text"] = f"({w['text']})"
                w["opt"] = True
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
                f.write(pre + render(r["words"]) + "\n")  # largura total
                continue
            if L:
                left.append((L[0]["x0"], render(L)))
            if R:
                right.append((R[0]["x0"], render(R)))
        flush()
