"""Leitura de gabaritos oficiais em texto (pdftotext -layout)."""
import re


def grid_key(text):
    """Gabaritos em grade: uma linha de números seguida de uma linha de respostas (IBFC)."""
    key, nums = {}, None
    for ln in text.splitlines():
        t = ln.split()
        if t and all(x.isdigit() for x in t):
            nums = [int(x) for x in t]
            continue
        if nums:
            ans = [x for x in t if re.fullmatch(r"[A-E*]", x)]
            if len(ans) == len(nums):
                key.update(dict(zip(nums, ans)))
                nums = None
    return key


def pairs_key(text):
    """Gabaritos em pares 'número letra' ou 'número - letra' (FCC, Fumarc)."""
    return {int(n): a for n, a in re.findall(r"\b(\d{1,3})\s*-?\s+([A-E*X])\b", text)}


def section(text, start, end=None):
    i = text.index(start)
    j = text.index(end, i + len(start)) if end else len(text)
    return text[i:j]
