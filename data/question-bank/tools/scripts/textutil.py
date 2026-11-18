"""Reconstrução de texto a partir das linhas do PDF."""
import re

CODE = re.compile(
    r"[;{}]\s*$|^\s*[{}]|^\s*-\s+\w+:|^\s*\w[\w-]*:\s*$|^\s*[\w.-]+:\s+\S+$|"
    r"^\s*(for|while|if|switch)\s*\(|^\s*(int|long|String|var|let|const|def|function)\s+\w+.*[=(\[;]|"
    r"^\s*(import|package)\s+[\w.*]+;?\s*$|^\s*(public|private|protected|class)\s+\w+|System\.\w+|"
    r"^\s*(SET|DROP|DEL|SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\s+[A-Z@*(]|^\s*git\s+\w+"
)


def is_code(line):
    return bool(CODE.search(line))


CLITICS = {"se", "me", "te", "lhe", "lhes", "nos", "vos", "o", "a", "os", "as", "lo", "la", "los", "las",
           "no", "na", "nas", "mo", "ma", "lho", "lha"}
DEHYPHEN = {"on": False, "vocab": set(), "log": []}


def set_dehyphen(on, vocab=()):
    DEHYPHEN["on"] = on
    DEHYPHEN["vocab"] = set(vocab)
    DEHYPHEN["log"] = []


def join_hyphen(prev, nxt):
    """Decide se o hífen no fim da linha é de translineação (remove) ou de palavra composta (mantém)."""
    if not DEHYPHEN["on"]:
        return prev + nxt
    m1 = re.search(r"([\wÀ-ÿ]+)-$", prev)
    m2 = re.match(r"([\wÀ-ÿ]+)", nxt)
    if not m1 or not m2:
        return prev + nxt
    a, b = m1.group(1), m2.group(1)
    token = prev.split()[-1] if prev.split() else ""
    if "/" in token or "http" in token or "www" in token:
        decision = "mantém"
    elif a.isupper() and b.isupper():
        decision = "remove"
    elif (b.lower() in CLITICS and len(a) >= 3) or b[:1].isupper() or b[:1].isdigit():
        decision = "mantém"
    elif (a + "-" + b).lower() in DEHYPHEN["vocab"]:
        decision = "mantém"
    else:
        decision = "remove"
    DEHYPHEN["log"].append(f"{a}-|{b} → {decision}")
    return (prev[:-1] + nxt) if decision == "remove" else (prev + nxt)


def reflow_item(lines, code=True):
    """Junta linhas quebradas pelo PDF; mantém quebra de linha em trechos de código (code=True)."""
    out = ""
    prev = None
    for raw in lines:
        ln = raw.strip()
        for mk in ("**", "__", "`", "*"):
            if mk == "*" and (out.endswith("-**") or ln.startswith("**")):
                continue
            if prev is not None and out.endswith("-" + mk) and ln.startswith(mk):
                out, ln = out[: -len(mk)], ln[len(mk):]
                prev = out
        merged = False
        if prev is not None:
            for mk in ("**", "__", "`", "*"):
                if out.endswith(mk) and ln.startswith(mk) and not out.endswith("-" + mk):
                    if mk == "*" and (out.endswith("**") or ln.startswith("**")):
                        continue
                    out, ln = out[: -len(mk)], ln[len(mk):]
                    out += " " + ln
                    merged = True
                    break
        if merged:
            prev = ln
            continue
        if prev is None:
            out = ln
        elif code and (is_code(ln) or is_code(prev) or len(prev) < 3):
            out += "\n" + ln
        elif prev.endswith("-") and not prev.endswith(" -"):
            out = join_hyphen(out, ln)
        else:
            out += " " + ln
        prev = ln
    return out


def reflow_passage(lines):
    """Linhas começando com tab (recuo) abrem parágrafo; as demais continuam o anterior."""
    paras = []
    for raw in lines:
        ln = raw.strip()
        new = raw.startswith("\t") or not paras
        if new or is_code(ln) or (paras and is_code(paras[-1][-1])):
            paras.append([ln])
        else:
            paras[-1].append(ln)
    out = []
    for p in paras:
        out.append(reflow_item(p))
    return "\n".join(out)
