"""Confere se enunciados, alternativas e textos-base aparecem no texto do PDF de origem.

Normaliza os dois lados (sem marcas de ênfase, espaços, hifens e aspas) e procura cada trecho.
Uso: check_fidelity.py prova.json caderno1.pdf [caderno2.pdf ...]
"""
import json
import re
import subprocess
import sys


def norm(s):
    s = re.sub(r"```\w*", "", s)
    s = re.sub(r"\*\*|__|`|\*", "", s)
    s = re.sub(r"(\d)\s*[ºªoa]\b", r"\1", s)
    s = re.sub(r"\bn\s*[ºo]\s*(?=\d)", "n", s)
    s = s.replace("−", "-").replace("–", "-").replace("\uf04b", "")
    s = re.sub(r"[\s\-‐“”\"'’‘|]", "", s)
    return s.lower()


paper = json.load(open(sys.argv[1], encoding="utf-8"))
pdf_text = "".join(subprocess.run(["pdftotext", p, "-"], capture_output=True, text=True).stdout for p in sys.argv[2:])
pdf_text += "".join(subprocess.run(["pdftotext", "-layout", p, "-"], capture_output=True, text=True).stdout for p in sys.argv[2:])
try:
    import pdfplumber
    for p in sys.argv[2:]:
        with pdfplumber.open(p) as doc:
            pdf_text += "".join((pg.extract_text(x_tolerance=1.5) or "") + "\n" for pg in doc.pages)
except ImportError:
    pass
hay = norm(pdf_text.replace("²", "2"))
miss = []


def check(label, text):
    # quebra em pedaços (linhas/frases) para tolerar reordenação de colunas
    text = (text or "").replace("²", "2")
    for part in re.split(r"\n|(?<=[.;:?!])\s+|\.\.\.[IVX]+\.\.\.|■", text):
        n = norm(part)
        if len(n) >= 12 and n not in hay:
            miss.append((label, part[:90]))


for st in paper["stimuli"]:
    check(st["id"], st["text"])
for q in paper["questions"]:
    check(f"q{q['number']}", q["statement"])
    for o in q["options"] or []:
        check(f"q{q['number']}{o['key']}", o["text"])
total = sum(1 + len(q["options"] or []) for q in paper["questions"])
print(f"{paper['id']}: {len(miss)} trechos não encontrados")
for m in miss:
    print("  ", m)
