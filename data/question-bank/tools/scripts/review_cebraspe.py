"""Mostra itens agrupados pelo bloco de texto/comando que os antecede (conferência visual)."""
import json
import sys

d = json.load(open(sys.argv[1], encoding="utf-8"))
S = {s["id"]: s for s in d["stimuli"]}
last = None
for it in d["items"]:
    if it["stimulus_id"] != last:
        s = S.get(it["stimulus_id"], {})
        print(f"\n  [{s.get('id')}] " + s.get("text", "").replace("\n", " | ")[:400])
        last = it["stimulus_id"]
    print(f"   {it['number']}: " + " | ".join(it["lines"])[:300])
