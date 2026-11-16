"""Gabarita — gera supabase/seed.sql a partir de data/seed/taxonomia_tribunais_ti_v0.1.json.

Uso: python scripts/gerar_seed.py
Documentação: docs/03-modelo-de-dados.md (seção "Carga inicial")
"""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "data/seed/taxonomia_tribunais_ti_v0.1.json"
DESTINO = RAIZ / "supabase/seed.sql"

BANCAS = [
    ("fumarc", "Fundação Mariana Resende Costa", "multipla_escolha", 0),
    ("fcc", "Fundação Carlos Chagas", "multipla_escolha", 0),
    ("ibfc", "Instituto Brasileiro de Formação e Capacitação", "multipla_escolha", 0),
    ("cebraspe", "Cebraspe", "certo_errado", 1),
]
BANCA_POR_NOME = {"Fumarc": "fumarc", "FCC": "fcc", "IBFC": "ibfc", "Cebraspe": "cebraspe"}
RUBRICA_BANCA = {"fumarc_redacao": "fumarc", "fcc_redacao": "fcc",
                 "ibfc_estudo_caso": "ibfc", "cebraspe_redacao": "cebraspe"}
RUBRICA_TIPO = {"fumarc_redacao": "redacao_tema_geral", "fcc_redacao": "redacao_tema_geral",
                "ibfc_estudo_caso": "estudo_de_caso_tecnico", "cebraspe_redacao": "redacao_tema_geral"}


def q(v):
    """Literal SQL seguro para texto, número, booleano, nulo ou JSON."""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (dict, list)):
        return q(json.dumps(v, ensure_ascii=False)) + "::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def main():
    d = json.loads(ORIGEM.read_text(encoding="utf-8"))
    pesos = d["meta"]["pesos_alvo"]
    out = ["-- Gerado por scripts/gerar_seed.py. Não editar à mão.", "begin;"]

    for b in BANCAS:
        out.append(f"insert into bancas values ({', '.join(q(x) for x in b)}) on conflict (id) do nothing;")

    for rid, definicao in d["rubricas"].items():
        out.append(
            f"insert into rubricas (id, banca_id, tipo, definicao) values "
            f"({q(rid)}, {q(RUBRICA_BANCA[rid])}, {q(RUBRICA_TIPO[rid])}, {q(definicao)}) "
            f"on conflict (id) do update set definicao = excluded.definicao;")

    for c in d["concursos"]:
        out.append(
            "insert into concursos (id, tribunal, ano, banca_id, cargo, duracao_min, objetiva, discursiva, rubrica_id, peso_alvo) values "
            f"({q(c['id'])}, {q(c['tribunal'])}, {c['ano']}, {q(BANCA_POR_NOME[c['banca']])}, {q(c['cargo'])}, "
            f"{int(c['duracao_h'] * 60)}, {q(c['objetiva'])}, {q(c['discursiva'])}, {q(c['discursiva']['rubrica'])}, "
            f"{pesos[c['id']]}) on conflict (id) do update set peso_alvo = excluded.peso_alvo;")

    ordem = 0
    for grupo in ("especificos", "gerais"):
        for a in d["taxonomia"][grupo]:
            ordem += 1
            out.append(
                "insert into assuntos (id, grupo, nome, perfil, fase, ordem) values "
                f"({q(a['id'])}, {q(grupo)}, {q(a['nome'])}, {q(a.get('perfil'))}, {q(a['fase'])}, {ordem}) "
                "on conflict (id) do update set nome = excluded.nome, fase = excluded.fase;")
            for i, s in enumerate(a["subtopicos"], 1):
                out.append(
                    f"insert into subtopicos (assunto_id, nome, ordem) values ({q(a['id'])}, {q(s)}, {i}) "
                    "on conflict (assunto_id, nome) do nothing;")
            for cid, valor in a["incidencia"].items():
                out.append(
                    f"insert into incidencias values ({q(cid)}, {q(a['id'])}, {valor}) "
                    "on conflict (concurso_id, assunto_id) do update set valor = excluded.valor;")

    out.append("commit;")
    DESTINO.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"{DESTINO.relative_to(RAIZ)}: {len(out)} linhas")


if __name__ == "__main__":
    main()
