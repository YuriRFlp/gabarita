"""Gera os arquivos derivados do banco a partir de papers/*.json.

- valida cada prova contra schema/exam_paper.schema.json
- remove figuras duplicadas (mesmo conteúdo) e aponta as questões para um único arquivo
- escreve questions.jsonl (uma questão por linha, com os dados da prova copiados)
- escreve stimuli.jsonl (um texto-base por linha)
- escreve index.json (resumo das provas)

Uso: python3 flatten.py <raiz do banco>
"""
import glob
import hashlib
import json
import os
import sys

import jsonschema

root = sys.argv[1] if len(sys.argv) > 1 else "."
schema = json.load(open(os.path.join(root, "schema", "exam_paper.schema.json"), encoding="utf-8"))
validator = jsonschema.Draft202012Validator(schema)

PAPER_FIELDS = ["court_id", "court", "justice_branch", "state", "year", "exam_board", "level", "position",
                "specialty", "position_code", "format", "taxonomy_edition"]

seen = {}
index, questions, stimuli = [], [], []
for path in sorted(glob.glob(os.path.join(root, "papers", "*.json"))):
    paper = json.load(open(path, encoding="utf-8"))
    errors = list(validator.iter_errors(paper))
    if errors:
        sys.exit(f"{path}: {errors[0].message}")

    changed = False
    for q in paper["questions"]:
        for fig in q.get("figures", []):
            fp = os.path.join(root, fig["file"])
            h = hashlib.sha256(open(fp, "rb").read()).hexdigest()
            if h in seen and seen[h] != fig["file"]:
                os.remove(fp)
                fig["file"] = seen[h]
                changed = True
            else:
                seen[h] = fig["file"]
    if changed:
        json.dump(paper, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    common = {k: paper.get(k) for k in PAPER_FIELDS}
    common["answer_key_status"] = paper["answer_key"]["status"]
    for st in paper["stimuli"]:
        stimuli.append({"key": f"{paper['id']}#{st['id']}", "paper_id": paper["id"], **st})
    for q in paper["questions"]:
        row = {"id": q["id"], "paper_id": paper["id"], **common}
        row.update({k: v for k, v in q.items() if k != "id"})
        row.setdefault("duplicate_of", None)
        row["stimulus_key"] = f"{paper['id']}#{q['stimulus_id']}" if q.get("stimulus_id") else None
        questions.append(row)

    qs = paper["questions"]
    index.append({
        "id": paper["id"], "file": f"papers/{os.path.basename(path)}", "court_id": paper["court_id"],
        "court": paper["court"], "year": paper["year"], "exam_board": paper["exam_board"], "level": paper["level"],
        "position": paper["position"], "specialty": paper.get("specialty"), "format": paper["format"],
        "answer_key_status": paper["answer_key"]["status"], "taxonomy_edition": paper.get("taxonomy_edition"),
        "questions": len(qs), "annulled": sum(q["status"] == "anulada" for q in qs),
        "with_figure": sum(q["has_figure"] for q in qs), "stimuli": len(paper["stimuli"]),
    })

with open(os.path.join(root, "questions.jsonl"), "w", encoding="utf-8") as f:
    for row in questions:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
with open(os.path.join(root, "stimuli.jsonl"), "w", encoding="utf-8") as f:
    for row in stimuli:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
json.dump({"schema_version": "1.0", "papers": index,
           "totals": {"papers": len(index), "questions": len(questions),
                      "annulled": sum(p["annulled"] for p in index), "stimuli": len(stimuli)}},
          open(os.path.join(root, "index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"{len(index)} provas, {len(questions)} questões, {len(stimuli)} textos-base")
