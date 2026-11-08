import json
T=json.load(open('/workspace/civicspherenav/work/eval_gp/p5/final/p5_tables.json'))
def p(x): return f'{x:.3g}' if x>=0.001 else f'{x:.1e}'
L=[]
def block(key,title):
    v=T[key]; L.append(f'\n#### {title}  (n={v["n"]}: {v["nNav"]} navigate, {v["nClar"]} clarify, {v["nRej"]} reject)\n')
    L.append('| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |'); L.append('|---|---|---|---|---|')
    c=v['committedCorrect']; L.append(f'| committed correct (navigate items; list = top-1) | {c["GP"]} | {c["a"]} | {c["a2"]} | {c["b"]} |')
    w=v['wrongDestNavItems']; L.append(f'| wrong destination, navigate items | {w["GP"]} | {w["a"]} | {w["a2"]} | {w["b"]} |')
    w=v['wrongDestAll']; L.append(f'| wrong destination, all items (a list always commits) | {w["GP"]} | {w["a"]} | {w["a2"]} | {w["b"]} |')
    w=v['within1']; L.append(f'| within one step (Goalpost) vs hit@3 (lists) | {w["GP"]} | {w["a_hit3"]} | {w["a2_hit3"]} | {w["b_hit3"]} |')
    L.append(f'| clarification rate / gold in options | {v["clarificationRate"]} / {v["clarGoldInOptions"]} | – | – | – |')
    L.append(f'| rejection (reject items) | {v["rejection"]} | 0 (cannot reject) | 0 | 0 |')
    L.append(f'| decision correct, all items | {v["decisionCorrectAll"]} | – | – | – |')
    s=v.get('savedState') or {}
    if s.get('positives_n'): L.append(f'| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | {s["goalpostNavigated"]} / {s["goalpostNavigatedOrOffered"]}; hijack {s["goalpostHijacked"]} | top-1 {s["a_top1"]} | {s["a2_top1"]} | {s["b_top1"]} |')
    t=v.get('twins') or {}
    if t.get('n'): L.append(f'| twin pages: correct / wrong twin / twin question | {t["goalpostCorrect"]} / {t["goalpostWrongTwin"]} / {t["goalpostTwinQuestion"]} | wrong twin top-1 {t["a_wrongTwinTop1"]} | {t["a2_wrongTwinTop1"]} | {t["b_wrongTwinTop1"]} |')
    m=v['mcnemar_committedCorrect']; n=v['mcnemar_noWrongDestAll']
    L.append(f'| McNemar committed correct (Goalpost-only / list-only, exact p) | | {m["a"][0]}/{m["a"][1]}, p={p(m["a"][2])} | {m["a2"][0]}/{m["a2"][1]}, p={p(m["a2"][2])} | {m["b"][0]}/{m["b"][1]}, p={p(m["b"][2])} |')
    L.append(f'| McNemar avoided wrong destination, all items | | {n["a"][0]}/{n["a"][1]}, p={p(n["a"][2])} | {n["a2"][0]}/{n["a2"][1]}, p={p(n["a2"][2])} | {n["b"][0]}/{n["b"][1]}, p={p(n["b"][2])} |')
for site in ['insura','lumenet']:
    S=site.capitalize(); L.append(f'\n### {S}\n')
    block(f'{site}|heldout_fresh_p5_FROZEN|v4',f'{S} FRESH held-out (independent, run once) — GP3 / {S} v4')
    block(f'{site}|heldout_fresh_p5_FROZEN|v3',f'{S} FRESH held-out — GP2 / {S} v3 (reference, same run)')
    block(f'{site}|fresh_minus_strict_neardups|v4',f'{S} fresh minus strict near-duplicates of tuned items — GP3')
    block(f'{site}|fresh_minus_broad_neardups|v4',f'{S} fresh minus broad near-duplicates — GP3')
    block(f'{site}|heldout_FROZEN|v4',f'{S} v1 held-out (SEEN in P5 — no longer independent) — GP3')
    block(f'{site}|heldout_FROZEN|v3',f'{S} v1 held-out (SEEN) — GP2 reference')
    block(f'{site}|tuned_v2|v4',f'{S} tuned v2 (development set) — GP3')
    block(f'{site}|tuned_v2|v3',f'{S} tuned v2 — GP2 reference')
open('/workspace/civicspherenav/work/eval_gp/p5/final/tables.md','w').write('\n'.join(L)); print(len(L))
