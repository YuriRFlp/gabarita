"""Separa questões de múltipla escolha (enunciado + alternativas) e os textos que as antecedem.

Uso: parse_mc.py texto_layout.txt config_parser.json saida.json

config_parser:
  q_re        regex do início da questão, com grupos (número, resto)
  opt_re      regex do início da alternativa, com grupos (letra, resto)
  letters     "abcde" ou "ABCDE"
  noise       lista de regex de linhas a descartar (cabeçalhos, rodapés)
  header      lista de regex de linhas que abrem um bloco de texto-base (ex.: ^Texto [IVX]+$)
  first, last faixa de questões
  start_after regex da linha a partir da qual começa a prova (opcional)
  stop_at     regex da linha em que termina a parte objetiva (opcional)
  opt_cont_tab  true se a continuação da última alternativa vem sempre recuada (\\t)
"""
import json
import re
import sys

src, cfgp, out = sys.argv[1:4]
cfg = json.load(open(cfgp, encoding="utf-8"))
q_re = re.compile(cfg["q_re"])
opt_re = re.compile(cfg["opt_re"])
noise = [re.compile(x) for x in cfg.get("noise", [])]
header = [re.compile(x) for x in cfg.get("header", [])]
section_headers = [re.compile(x) for x in cfg.get("section_headers", [])]
letters = cfg.get("letters", "abcde")

raw = open(src, encoding="utf-8").read().splitlines()
lines = []
started = "start_after" not in cfg
page = 0
for ln in raw:
    if ln.startswith("@@PAGE"):
        page = int(ln.split()[1])
        continue
    x = None
    if cfg.get("xpos") and "|" in ln and ln.split("|", 1)[0].isdigit():
        x, ln = ln.split("|", 1)
        x = int(x)
    s = ln.strip()
    plain = s.replace("__", "").replace("**", "").replace("`", "")
    if not started:
        if re.search(cfg["start_after"], plain):
            started = True
        continue
    if "stop_at" in cfg and re.search(cfg["stop_at"], plain):
        break
    if not s or any(p.search(s.replace("__", "").replace("**", "").replace("`", "")) for p in noise):
        continue
    lines.append((page, ln.rstrip(), x))


def is_header(s):
    return any(p.search(s.strip().replace("__", "").replace("*", "").replace("`", "")) for p in header)


questions = []
stimuli = []
pending = []  # linhas de texto-base aguardando a próxima questão
cur = None
expected = cfg["first"]
state = None  # 'stem' | ('opt', letra) | 'after'
in_text = False  # dentro de um texto-base que termina numa linha de crédito
stim_end = re.compile(cfg["stimulus_end"]) if cfg.get("stimulus_end") else None
needs_end = re.compile(cfg["stimulus_needs_end"]) if cfg.get("stimulus_needs_end") else None

for pg, ln, x in lines:
    s = ln.lstrip("\t")
    plain_s = s.replace("__", "").replace("**", "").replace("`", "")
    if in_text:
        pending.append([x, ln])
        if stim_end.search(plain_s):
            in_text = False
        continue
    m = q_re.match(s) or q_re.match(s.replace("__", "").replace("**", "").replace("`", ""))
    if m and int(m.group(1)) == expected:
        sid = None
        if pending:
            sid = f"s{len(stimuli) + 1:02d}"
            stimuli.append({"id": sid, "lines": pending})
            pending = []
        first = m.group(2) if m.lastindex and m.lastindex >= 2 else ""
        cur = {"number": expected, "page": pg, "stimulus_id": sid, "stem": [first] if first else [], "options": {}}
        questions.append(cur)
        expected += 1
        state = "stem"
        continue
    if any(p.search(s.strip().replace("__", "").replace("*", "").replace("`", "")) for p in section_headers):
        state = "after" if cur is not None else state
        continue
    if cur is None:
        if is_header(ln) and needs_end and needs_end.search(plain_s):
            in_text = True
        pending.append([x, ln])
        continue
    mo = opt_re.match(s)
    nxt = letters[len(cur["options"])] if len(cur["options"]) < len(letters) else None
    if mo and mo.group(1) == nxt and state != "after":
        cur["options"][nxt] = [mo.group(2)]
        state = ("opt", nxt)
        continue
    if state == "after" or is_header(ln):
        if is_header(ln) and needs_end and needs_end.search(plain_s):
            in_text = True
        state = "after"
        pending.append([x, ln])
        continue
    if state == "stem":
        cur["stem"].append(s)
    elif isinstance(state, tuple):
        last = state[1] == letters[-1]
        if last and cfg.get("opt_cont_tab") and not ln.startswith("\t"):
            state = "after"
            pending.append([x, ln])
        else:
            cur["options"][state[1]].append(s)

if expected != cfg["last"] + 1:
    sys.exit(f"parou na questão {expected - 1}; esperado {cfg['last']}")
bad = [q["number"] for q in questions if len(q["options"]) != len(letters)]
json.dump({"stimuli": stimuli, "questions": questions, "trailing": pending}, open(out, "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print(f"{len(questions)} questões, {len(stimuli)} blocos de texto; sem 5 alternativas: {bad}")
