"""Separa itens certo/errado (Cebraspe) e os textos/comandos que os antecedem.

Uso: parse_cebraspe.py texto_layout.txt primeiro_item ultimo_item saida.json

Saída: {"stimuli": [...], "items": [...]} sem gabarito. Cada item aponta para o bloco de
comando que o antecede (e para o texto-base, quando o comando se refere a um texto anterior).
"""
import json
import re
import sys

src, first, last, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]

NOISE = [
    re.compile(r"^@@PAGE"),
    re.compile(r"^--.*--$"),
    re.compile(r"^Espaço livre$"),
    re.compile(r"^•"),
]

raw = open(src, encoding="utf-8").read().splitlines()
# descarta o bloco de instruções da 1ª página (até o primeiro marcador de seção)
lines, started = [], False
for ln in raw:
    s = ln.rstrip()
    if not started:
        if re.match(r"^--.*--$", s.strip()) and "OBJETIVAS" not in s:
            started = True
        continue
    if not s.strip() or any(p.match(s.strip()) for p in NOISE):
        continue
    lines.append(s)

# 1) localiza o início de cada item
starts = {}
expected = first
i = 0
while i < len(lines) and expected <= last:
    s = lines[i].lstrip("\t")
    m = re.match(rf"^{expected}(\s+(.*))?$", s)
    if m:
        if m.group(2):
            starts[expected] = (i, m.group(2))
        else:  # número sozinho na linha: o item começa na linha anterior
            starts[expected] = (i - 1, lines[i - 1].lstrip("\t"))
            lines[i] = None
        expected += 1
    i += 1
missing = [n for n in range(first, last + 1) if n not in starts]
if missing:
    sys.exit(f"itens não encontrados: {missing}")

order = sorted(starts)
bounds = []
for k, n in enumerate(order):
    a = starts[n][0]
    b = starts[order[k + 1]][0] if k + 1 < len(order) else len(lines)
    bounds.append((n, a, b))

JULGUE = re.compile(r"[Jj]ulgue|[Jj]udge")
END = re.compile(r"[.?!:]\)?[”\"]?$")


def sentence_start(seg, j):
    """volta da linha j até o início da frase que a contém"""
    while j > 0 and not END.search(seg[j - 1]):
        j -= 1
    return j


stimuli, items = [], []
cur_stim = None
last_text_stim = None
pending = None  # bloco de estímulo que antecede o primeiro item


def add_stim(block):
    global last_text_stim
    sid = f"s{len(stimuli) + 1:02d}"
    text = "\n".join(block)
    cmd_only = len(block) <= 6 and JULGUE.search(block[0] + " " + " ".join(block))
    refs_text = bool(re.search(r"\btexto", text, re.I)) and cmd_only
    st = {"id": sid, "text": text}
    if refs_text and last_text_stim:
        st["refers_to"] = last_text_stim
    stimuli.append(st)
    if not cmd_only:
        last_text_stim = sid
    return sid


# estímulo antes do primeiro item
pre = [x for x in lines[: bounds[0][1]] if x is not None]
if pre:
    cur_stim = add_stim(pre)

for n, a, b in bounds:
    seg = [x for x in lines[a:b] if x is not None]
    seg[0] = starts[n][1] if lines[a] is not None and re.match(rf"^{n}\s", lines[a].lstrip("\t")) else seg[0]
    # existe comando ("julgue") depois do fim do item?
    cmd = None
    for j in range(1, len(seg)):
        if JULGUE.search(seg[j]):
            cmd = j
    item_lines, stim_lines = seg, []
    if cmd is not None:
        cstart = sentence_start(seg, cmd)
        # o item termina na primeira linha que fecha frase
        end = next((j for j in range(0, cstart) if END.search(seg[j])), cstart - 1)
        item_lines, stim_lines = seg[: end + 1], seg[end + 1:]
    stim_for_item = cur_stim
    items.append({
        "number": n,
        "lines": [x.lstrip("\t") for x in item_lines],
        "stimulus_id": stim_for_item,
    })
    if stim_lines:
        cur_stim = add_stim(stim_lines)

json.dump({"stimuli": stimuli, "items": items}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(items)} itens, {len(stimuli)} estímulos")
