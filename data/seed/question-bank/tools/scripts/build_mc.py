"""Monta a prova final (schema exam_paper 1.0) para provas de múltipla escolha.

Uso: build_mc.py config.json saida.json
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from keys import grid_key, pairs_key  # noqa: E402
from textutil import reflow_item, is_code, set_dehyphen, DEHYPHEN  # noqa: E402

cfg = json.load(open(sys.argv[1], encoding="utf-8"))
out_path = sys.argv[2]
paper = cfg["paper"]
raw = json.load(open(cfg["parsed"], encoding="utf-8"))

ENUM = re.compile(r"^(\(\s*\)|[IVX]+\s*[.)–-]|\(\d+\)|\d+[.)]\s|\([A-E]\)\s|[A-E]\)\s|[a-e]\s*[.)]\s+[A-Z]|•|[-−–]\s|[A-ZÀ-Ú]\w+:\s*[−–-])")


CLOSING = re.compile(r"^(Assinale|Estão|Está|Ordene|Marque|Indique|Da relação|Das afirmativas|Quais|Qual|É correto|Considerando|Com base|A sequência|Analise)\b")


def reflow_stem(lines, code=False):
    """Como reflow_item, mas abre linha nova em enumerações (I., ( ), (1), 1.) e na frase que as encerra."""
    blocks = []
    in_enum = False
    for ln in lines:
        s = ln.strip()
        if not s:
            continue
        plain0 = re.sub(r"\*\*|__|`|(?<!\*)\*(?!\*)", "", s)
        closes = in_enum and blocks and ((re.search(r"[.:;?*_`]$", blocks[-1][-1]) and plain0[:1].isupper()) or CLOSING.match(plain0))
        plain = re.sub(r"\*\*|__|`|(?<!\*)\*(?!\*)", "", s)
        if not blocks or ENUM.match(plain) or closes or (code and (is_code(s) or is_code(blocks[-1][-1]))):
            in_enum = bool(ENUM.match(plain)) or (in_enum and not closes)
            blocks.append([s])
        else:
            blocks[-1].append(s)
    return "\n".join(reflow_item(b, code) for b in blocks)


def verbatim(lines):
    """Mantém as quebras de linha, mas desfaz a translineação de palavras em maiúsculas (TRABA-/LHADOR)."""
    out = []
    for ln in (x.strip() for x in lines):
        if out and re.search(r"[A-Z]-$", out[-1]) and re.match(r"^[A-Z]", ln):
            out[-1] = out[-1][:-1] + ln
        else:
            out.append(ln)
    return "\n".join(out)


def load_key(spec):
    text = open(spec["file"], encoding="utf-8").read()
    if "after" in spec:
        m = re.search(spec["after"], text)
        text = text[m.end():]
    if "before" in spec:
        m = re.search(spec["before"], text)
        if m:
            text = text[: m.start()]
    k = grid_key(text) if spec["method"] == "grid" else pairs_key(text)
    if "string" in spec:  # gabarito transcrito
        k = {i + 1: c for i, c in enumerate(spec["string"].replace(" ", ""))}
    return k


if cfg.get("dehyphenate"):
    vocab = set()
    for ln in open(cfg["layout"], encoding="utf-8"):
        for w in re.findall(r"[\wÀ-ÿ]+(?:-[\wÀ-ÿ]+)+", ln.split("|", 1)[-1]):
            if not ln.rstrip().endswith(w + "-"):
                vocab.add(w.lower())
    vocab |= {x.lower() for x in cfg.get("keep_hyphen", [])}
    set_dehyphen(True, vocab)

key = load_key(cfg["key"])
pre = load_key(cfg["preliminary_key"]) if cfg.get("preliminary_key") else None

# textos-base
stimuli, stim_of, cmd_of = [], {}, {}
for s in raw["stimuli"]:
    sc = cfg["stimuli"].get(s["id"], {})
    lines = [(x, t) for x, t in s["lines"]]
    if "command_for" in sc:
        cmd = sc.get("command") or reflow_item([t for _, t in lines], code=False)
        a, b = sc["command_for"]
        for n in range(a, b + 1):
            cmd_of[n] = cmd
        continue
    if sc.get("skip"):
        continue
    if sc.get("command_lines"):
        cmd = reflow_item([t for _, t in lines[: sc["command_lines"]]], code=False)
        lines = lines[sc["command_lines"]:]
        a, b_ = sc["range"]
        for n in range(a, b_ + 1):
            cmd_of[n] = cmd
    title = None
    if sc.get("title_lines"):
        title = " ".join(t.strip() for _, t in lines[: sc["title_lines"]]).replace("__", "")
        lines = lines[sc["title_lines"]:]
    source = None
    if sc.get("source_lines"):
        source = reflow_item([t.replace("__", "") for _, t in lines[-sc["source_lines"]:]], code=False)
        lines = lines[: -sc["source_lines"]]
    xs = [x for x, _ in lines if x is not None]
    margin = (min(xs) if sc.get("para_numbers") else max(set(xs), key=xs.count)) if xs else 0
    if sc.get("numbered_lines"):
        out_lines = []
        for i, (_, t) in enumerate(lines, 1):
            t = t.strip()
            if re.match(rf"^{i}\s", t):
                t = t[len(str(i)):].strip()
            out_lines.append(t)
        new_id = f"t{len(stimuli) + 1:02d}"
        stimuli.append({"id": new_id, "title": sc.get("title", title), "text": "\n".join(out_lines),
                        "source": sc.get("source", source), "language": sc.get("language", "pt")})
        a, b_ = sc["range"]
        for n in range(a, b_ + 1):
            stim_of[n] = new_id
        continue
    if sc.get("verbatim"):
        pre_n = sc.get("prefix_lines", 0)
        prefix = reflow_item([t for _, t in lines[:pre_n]], code=False)
        code_lines = lines[pre_n:]
        levels = sorted({round(x / 3) for x, _ in code_lines if x is not None})
        body = "\n".join(" " * (4 * levels.index(round(x / 3)) if x is not None else 0)
                         + re.sub(r"\*\*|__|`|(?<!\*)\*(?!\*)", "", t.strip()) for x, t in code_lines)
        fence = sc.get("fence", "")
        text = (prefix + "\n" if prefix else "") + "```" + fence + "\n" + body + "\n```"
        new_id = f"t{len(stimuli) + 1:02d}"
        stimuli.append({"id": new_id, "title": sc.get("title", title), "text": sc.get("text", text),
                        "source": sc.get("source", source), "language": sc.get("language", "pt")})
        a, b_ = sc["range"]
        for n in range(a, b_ + 1):
            stim_of[n] = new_id
        continue
    paras = []
    for x, t in lines:
        if sc.get("para_numbers"):
            m_ = re.match(r"^(\d+)\.\s+(?:[−–-]\s*(?=[*_]*[−–-])?)?", t.strip())
            if m_:
                t = t.strip()[len(m_.group(1)) + 1:].strip()
                paras.append([t])
                continue
        new = not paras or (x is not None and x - margin > sc.get("indent", 5)) or sc.get("keep_lines")
        if new:
            paras.append([t])
        else:
            paras[-1].append(t)
    text = "\n".join(reflow_item(p, code=sc.get("code", False)) for p in paras)
    new_id = f"t{len(stimuli) + 1:02d}"
    stimuli.append({"id": new_id, "title": sc.get("title", title), "text": sc.get("text", text),
                    "source": sc.get("source", source), "language": sc.get("language", "pt")})
    a, b = sc["range"]
    for n in range(a, b + 1):
        stim_of[n] = new_id

assets = os.path.join(os.path.dirname(os.path.abspath(out_path)), "..", "assets")
questions = []
for q in raw["questions"]:
    n = q["number"]
    sec = next(s for s in cfg["sections"] if s["from"] <= n <= s["to"])
    ans = key.get(n)
    if ans is None:
        sys.exit(f"sem gabarito para {n}")
    annulled = ans in ("*", "X")
    changed = None
    if pre and not annulled and pre.get(n) and pre[n] != ans:
        changed = pre[n]
    ov = cfg.get("overrides", {}).get(str(n), {})
    stem_lines = ov.get("stem_lines", q["stem"])
    opts = {k: ov.get("options", {}).get(k, v) for k, v in q["options"].items()}
    fig = cfg.get("figures", {}).get(str(n))
    figures = []
    if fig:
        os.makedirs(assets, exist_ok=True)
        name = f"{paper['id']}-q{n:03d}.png"
        r = 150
        x0, y0, x1, y1 = fig["bbox"]
        sc = r / 72
        subprocess.run(["pdftoppm", "-f", str(fig["page"]), "-l", str(fig["page"]), "-r", str(r), "-png", "-singlefile",
                        "-x", str(int(x0 * sc)), "-y", str(int(y0 * sc)), "-W", str(int((x1 - x0) * sc)),
                        "-H", str(int((y1 - y0) * sc)), fig["pdf"], os.path.join(assets, name[:-4])], check=True)
        figures.append({"file": f"assets/{name}", "description": fig["description"]})
    item = {
        "id": f"{paper['id']}-q{n:03d}",
        "number": n,
        "section": sec["section"],
        "subject": sec.get("subject"),
        "stimulus_id": stim_of.get(n),
        "command": cmd_of.get(n),
        "statement": ov.get("statement", reflow_stem(stem_lines, code=n in cfg.get("code", []))),
        "options": [{"key": k.upper(), "text": (ov.get("options_text", {}).get(k.upper())
                                                 or (verbatim(v) if n in cfg.get("verbatim_options", [])
                                                     else reflow_item(v, code=n in cfg.get("code", []))))}
                    for k, v in opts.items()],
        "answer": None if annulled else ans.upper(),
        "status": "anulada" if annulled else "valida",
        "status_note": cfg.get("status_notes", {}).get(str(n)),
        "answer_changed_from": changed,
        "language": sec.get("language", "pt"),
        "has_table": n in cfg.get("tables", []),
        "has_code": n in cfg.get("code", []) or n in cfg.get("verbatim_options", []) or n in cfg.get("code_flag", []),
        "has_figure": bool(figures),
        "figures": figures,
        "page": q.get("page"),
        "topic_ids": [],
        "review": cfg.get("review", {}).get(str(n)),
    }
    questions.append(item)

if DEHYPHEN["on"]:
    log_path = os.path.join(os.path.dirname(os.path.abspath(out_path)), "..", "work",
                            os.path.basename(out_path).replace(".json", ".hifens.txt"))
    open(log_path, "w", encoding="utf-8").write("\n".join(sorted(set(DEHYPHEN["log"]))))
if cfg.get("ordinals"):
    def ordn(s):
        if not isinstance(s, str):
            return s
        s = re.sub(r"\b(\d{1,3})o\b", r"\1º", s)
        s = re.sub(r"\b(\d{1,3})a\b(?=\s+(Região|estrofe|edição|Turma|Vara|Seção|Instância|série|parte|fase|via|classe))", r"\1ª", s)
        s = re.sub(r"\b(Lei|Decreto|Resolução|Portaria|Emenda Constitucional|Súmula|Ato|Provimento|Instrução Normativa|"
                   r"Lei Complementar|Decreto-Lei|Medida Provisória|Recomendação)\s+no\s+(?=\d)", r"\1 nº ", s)
        return s
    for st in stimuli:
        for k in ("text", "title", "source"):
            st[k] = ordn(st[k])
    for q in questions:
        for k in ("statement", "command"):
            q[k] = ordn(q[k])
        for o in q["options"]:
            o["text"] = ordn(o["text"])
paper["stimuli"] = stimuli
paper["questions"] = questions
json.dump(paper, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"{len(questions)} questões, {len(stimuli)} textos-base; anuladas {[q['number'] for q in questions if q['status'] == 'anulada']}; "
      f"alteradas {[(q['number'], q['answer_changed_from'], q['answer']) for q in questions if q['answer_changed_from']]}")
