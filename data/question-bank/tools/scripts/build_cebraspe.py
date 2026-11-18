"""Monta a prova final (schema exam_paper 1.0) a partir das partes extraídas do Cebraspe.

Uso: build_cebraspe.py config.json saida.json
"""
import json
import re
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from textutil import reflow_item, reflow_passage, is_code  # noqa: E402

cfg = json.load(open(sys.argv[1], encoding="utf-8"))
JULGUE = re.compile(r"[Jj]ulgue|[Jj]udge")
END = re.compile(r"[.?!:]\)?[”\"]?$")
SOURCE = re.compile(r"^(Internet:|[A-ZÀ-Ú][^.]{2,80}\.\s.*\(com adaptações\)|.*\((com adaptações|adapted)\)\.?$)")


def parse_key(path):
    """Gabarito definitivo do Cebraspe: pares 'Item ...' / 'Gabarito ...'."""
    key = {}
    nums = None
    for ln in open(path, encoding="utf-8"):
        t = ln.split()
        if t[:1] == ["Item"]:
            nums = [int(x) for x in t[1:] if x != "0"]
        elif t[:1] == ["Gabarito"] and nums:
            vals = [x for x in t[1:] if x != "0"][: len(nums)]
            key.update(dict(zip(nums, vals)))
            nums = None
    return key


paper = cfg["paper"]
questions, stimuli = [], []
stim_seq = 0

for part in cfg["parts"]:
    raw = json.load(open(part["parsed"], encoding="utf-8"))
    key = parse_key(part["answer_key"])
    items = {it["number"]: it for it in raw["items"]}
    blocks = {s["id"]: s["text"].split("\n") for s in raw["stimuli"]}

    # ajustes manuais: linhas do início de um bloco que pertencem ao item anterior
    for fx in part.get("move_to_item", []):
        moved = blocks[fx["stimulus"]][: fx["lines"]]
        blocks[fx["stimulus"]] = blocks[fx["stimulus"]][fx["lines"]:]
        items[fx["item"]]["lines"] += [x.lstrip("\t") for x in moved]

    # separa cada bloco em texto-base (opcional) + comando
    split = {}
    for sid, lines in blocks.items():
        fim = next((j for j, x in enumerate(lines) if x.strip() == "FimDoTexto"), None)
        if fim is not None:
            split[sid] = (lines[:fim], lines[fim + 1:])
            continue
        cmd_line = max((j for j, x in enumerate(lines) if JULGUE.search(x)), default=None)
        if cmd_line is None:
            split[sid] = (lines, [])
            continue
        j = cmd_line
        while j > 0 and not END.search(lines[j - 1].strip()) and not lines[j].startswith("\t") \
                and not lines[j - 1].startswith("\t") and not is_code(lines[j - 1]):
            j -= 1
        split[sid] = (lines[:j], lines[j:])

    stim_map = {}
    last_text = None
    for sid in [s["id"] for s in raw["stimuli"]]:
        text_lines, cmd_lines = split[sid]
        override_text = part.get("stim_text", {}).get(sid)
        if override_text is not None:
            stim_seq += 1
            new_id = f"t{stim_seq:02d}"
            stimuli.append({"id": new_id, "title": part.get("stim_title", {}).get(sid), "text": override_text,
                            "source": part.get("stim_source", {}).get(sid), "language": "pt"})
            last_text = new_id
            stim_map[sid] = (new_id, part.get("stim_command", {}).get(sid) or reflow_item(cmd_lines) or None)
            continue
        if text_lines:
            src_lines = []
            k = max((j for j, x in enumerate(text_lines) if SOURCE.match(x.strip())), default=None)
            if k is not None and k >= len(text_lines) - 4:
                j = k
                while j > 0 and text_lines[j - 1].startswith("\t") and (
                        j < 2 or text_lines[j - 2].startswith("\t") or END.search(text_lines[j - 2].strip())):
                    j -= 1
                src_lines = text_lines[j:]
                text_lines = text_lines[:j]
            stim_seq += 1
            new_id = f"t{stim_seq:02d}"
            lang = "en" if part.get("english") and int(sid[1:]) in part["english"] else "pt"
            stimuli.append({
                "id": new_id,
                "title": None,
                "text": reflow_passage(text_lines),
                "source": " ".join(x.strip() for x in src_lines) or None,
                "language": lang,
            })
            last_text = new_id
            stim_map[sid] = (new_id, reflow_item(cmd_lines) or None)
        else:
            cmd = reflow_item(cmd_lines) or None
            refers = bool(cmd and re.search(r"texto|text\b", cmd, re.I))
            stim_map[sid] = (last_text if refers else None, cmd)

    for n in sorted(items):
        it = items[n]
        sec = next(s for s in part["sections"] if s["from"] <= n <= s["to"])
        stim_id, cmd = stim_map.get(it["stimulus_id"], (None, None))
        ans = key.get(n)
        status = "anulada" if ans == "X" else "valida"
        ov = part.get("item_overrides", {}).get(str(n), {})
        st = ov.get("statement") or reflow_item(it["lines"])
        if "command" in ov:
            cmd = ov["command"]
        q = {
            "id": f"{paper['id']}-q{n:03d}",
            "number": n,
            "section": sec["section"],
            "subject": sec.get("subject"),
            "stimulus_id": stim_id,
            "command": cmd,
            "statement": st,
            "options": None,
            "answer": None if status == "anulada" else ans,
            "status": status,
            "status_note": part.get("status_notes", {}).get(str(n)),
            "answer_changed_from": part.get("changed", {}).get(str(n)),
            "language": sec.get("language", "pt"),
            "has_table": n in part.get("tables", []),
            "has_code": any(is_code(x) for x in it["lines"]) or n in part.get("code", []) or "```" in st,
            "has_figure": n in part.get("figures", []),
            "figures": [],
            "page": None,
            "topic_ids": [],
            "review": part.get("review", {}).get(str(n)),
        }
        if part.get("duplicate_of_paper"):
            q["duplicate_of"] = f"{part['duplicate_of_paper']}-q{n:03d}"
        if ans is None:
            sys.exit(f"sem gabarito para o item {n}")
        questions.append(q)

def clean(s):
    if not isinstance(s, str):
        return s
    s = s.replace("\uf02d", "–").replace("\uf04b\uf04b", "______").replace("\uf04b", "_")
    s = re.sub(r"@ (?=[A-Z][a-z])", "@", s)
    return s


for st in stimuli:
    for k in ("text", "title", "source"):
        st[k] = clean(st[k])
        if isinstance(st[k], str):
            st[k] = re.sub(r"\s*FimDoTexto\s*$", "", st[k])
    m = re.match(r"(Texto [A-Z0-9]+-[IVX]+)\n", st["text"])
    if m and not st["title"]:
        st["title"], st["text"] = m.group(1), st["text"][m.end():]
for q in questions:
    for k in ("statement", "command", "status_note"):
        q[k] = clean(q[k])
for st in stimuli:
    if st["id"] in cfg.get("stimulus_overrides", {}):
        st["text"] = cfg["stimulus_overrides"][st["id"]]
paper["stimuli"] = stimuli
paper["questions"] = questions
json.dump(paper, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"{len(questions)} questões, {len(stimuli)} textos-base, anuladas: {[q['number'] for q in questions if q['status'] == 'anulada']}")
