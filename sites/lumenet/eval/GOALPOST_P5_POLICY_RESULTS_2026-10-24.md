> **Name note (26 Oct 2026):** the system described here was renamed from **Goalpost** to **Usher** on 26 Oct 2026. This report is kept as written at the time (formerly Goalpost); file, key and label names in it refer to the pre-rename builds. Results are unchanged by the rename.

# Goalpost P5: decision-policy results (RESOLVER7_GP3), 24 Oct 2026

All times Europe/London (BST). Engine `goalpost-engine.js`, sha256 `3beea34a8e8040445d844487ba443a01a6022968c87fdacb77bc7f13098a293f`. It was frozen before the fresh run and is identical in RESOLVER7_GP3, Goalpost_Insura_v4 and Goalpost_Lumenet_v4.
Fresh held-out sets: `insura_heldout_fresh_p5_FROZEN.json` (file sha256 f58ecdf0…, items 0f4052b7…) and `lumenet_heldout_fresh_p5_FROZEN.json` (dad5bea2…, items 987e325b…). Both were frozen at 16:34 before any policy work. They were run ONCE at 16:46 and not edited afterwards.
Harness: `tools/goalpost-eval-v2.js`. Tables: `p5/tools/p5_report.py` and `p5_md.py`, built from `p5/final/*.json` without re-running anything.

## Bottom line (honest)
- **Goalpost does NOT clearly beat the ranked lists on committed-correct.** On the fresh sets, Goalpost commits correctly on 25/50 (Insura) and 30/50 (Lumenet) navigate items.
  - The semantic list's top-1 gets 30/50 and 34/50; BM25+desc gets 30/50 and 29/50.
  - None of these differences is significant (exact McNemar p ≥ 0.18). Goalpost asks instead of committing on 30–37% of items.
- **Goalpost DOES clearly beat every list on wrong destinations.**
  - Navigate items, fresh: 7/50 (14%) on both sites, against 20/50 (Insura a2/b) and 16–21/50 (Lumenet b/a2).
  - All items: 15% and 17%, against 43–65%.
  - McNemar on "avoided a wrong destination" gives p < 1e-4 against all three lists on both sites. A list always commits and cannot reject.
- **Goalpost does not beat hit@3 on "within one step".** Fresh: Insura 68% vs semantic hit@3 82%; Lumenet 82% vs 88%.
- **GP3 vs GP2 on the fresh sets (paired): a modest, consistent improvement that is not significant at n=60.**
  - Insura: decision-correct 29→32, wrong-destination 12→9, within one step 30→34, saved-state 1/8→2/8, wrong twin 1/6→0/6.
  - Lumenet: decision-correct 34→35, wrong-destination 13→10, within one step 38→41, saved-state 0/8→2/8 navigated (4/8 navigated or offered). No hijacks of saved-state negatives (0/3 on each site).
- **On the SEEN v1 held-out sets, GP3 commits more wrongly than GP2** (Insura +3 net, Lumenet +1). See "Failure modes".
- On the development (tuned) sets the gains were large: Insura 29→38/47 decision-correct. Those gains did not carry over at that size to unseen queries.

## Rules added (generic and profile-driven; no site word lists, no per-query cases)
New parameters live in a separate `POLICY` object (`profile.policy` can override them). `PARAMS` is unchanged, so with no rule firing the output is byte-for-byte GP2's.
1. **Rule S: saved-state routing** (runs after low-specificity, before qualifiers). Candidates are the profile's saved states (`account.savedStates`), compared on the saved item's own texts and its owner page.
   - Skipped when the query names a third party (mum, friend, he/she…) or is general ("in general", "usually").
   - Skipped when the best non-saved page is a sibling of the owner page whose own title word appears in the query but not in the saved item (the "names sibling" guard).
   - **S1:** resume intent, or status intent + first person → go to the saved item if relevance ≥ clarifyMin and ≥ best other − 0.12.
   - **S2:** first person, saved sim ≥ navigateMin and within 0.03 of the best other page → go to the saved item.
   - **S3:** within 0.06 and ≥ navigateMin → ONE question: "Is this about your {saved label}? If not, choose the closest option." The saved item is listed first, plus up to 2 other pages.
2. **Rule T: twin pages** (runs after resume, before navigate). Pages get a role from `area.role` or `destination.role` (task | information).
   - Twins are mutual nearest neighbours across roles, by page-centroid cosine ≥ 0.65, same type.
   - If the top page's twin is within 0.10, generic event cues decide:
     - task: past event (not hypothetical), report, create/status/resume intent
     - information: a question without narrative, hypothetical, general, eligibility
   - If only one side fires and the top ≥ navigateMin, go there. Otherwise ask ONE question naming both twins: "Is this about something that has already happened ({task page}) or about how it works and what is included ({information page})?"
   - Profiles: only Insura v4 declares a role (claims area = task: one added line). Lumenet and CivicSphere have no roles, so rule T is inactive there.
3. **Not adopted:** raising the commit margin. On tuned data it removed as many correct commits as wrong ones (4/4).
4. **Explain layer:** one added "why here" line for saved-state routing. Widget and UI are unchanged.

## CivicSphere impact (RESOLVER7_GP3 vs frozen reference RESOLVER7_GP2)
- **Gate** (tests/gate_g1_g7.js, unchanged; results in tests/results_2026-10-24_GP3/):
  - G1, G2b (lexical and ranked list identical, 2186/2186), G3 and G7: PASS.
  - G2 decision equivalence with R6: FAIL by design. Full JSON is identical on 2151/2186 and discrete decisions on 2162/2186.
  - G4: FAIL by design. Held-out r6 is 28/44 instead of 27/44; tuned (46/46), r3, r4 and r5 are unchanged.
- **Fixtures:** one destination change. r6 S36 went from wrong to right (the saved item). The other changed rows differ only in the reason text (resume reasons now read "saved state (resume intent)…").
- **Random variants** (2000) and dummy queries (21): 17 destination changes, all to the single saved parking application.
  - 9 wrong→right and 7 right→wrong, judged against the variant's source page as proxy gold.
  - The 7 losses are generic "saved applications / continue" fragments whose source is the in-progress list page.
  - 1 dummy query ("I started the form for my car on my street…") now goes to the saved parking application.
- These sets were all seen before (r3–r6 were used in earlier rounds). R7_GP2 remains the frozen reference build.

## Failure modes seen after the freeze (not fixed: fixing would need a new fresh set)
- **S2 hijacks on SEEN v1 held-out:**
  - "what photos should I take of the damage" → saved water claim (gold: water-claim page)
  - "how can I bring my renewal price down" and "sell the car part way…" → saved car quote
  - Lumenet "can the new house be checked before I order" → saved move
  - First person plus a 0.03 window is too permissive when the saved item is topically close.
- **Twin rule** on seen v1: "reversed into a lamppost" went to the home accidental-damage claim. The top page was already in the wrong area, and the rule picked its task twin. "Knocked the cooker" went to the claim page, though gold was the cover page.
- **Fresh Insura saved-state status questions** ("any news on my claim", "what's happening with the leak claim") hit the older qualifier step. Status intent was not detected, so rule S did not fire. "I've got the photos of the damp ceiling now" went to the claim twin instead of the saved claim.
- **Close-margin semantic errors** (margin 0.02–0.06) still cause most wrong commits on both sites.

## Caveats
- Same author for the items and the rules, and the fresh items were written from page cards. Near-duplicates of tuned items exist; see the sensitivity rows. Removing them does not change any conclusion.
- The thresholds (0.03 / 0.06 / 0.12 / 0.10 / 0.65) were chosen on tuned data only.
- n = 60 per site, so the CIs are wide.
- The tuned v2 relabel and the earlier box-migration restore are documented in r7gp_progress.md.

## Tables

### Insura


#### Insura FRESH held-out (independent, run once) — GP3 / Insura v4  (n=60: 50 navigate, 5 clarify, 5 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 50.0% [37-63] (25/50) | 54.0% [40-67] (27/50) | 60.0% [46-72] (30/50) | 60.0% [46-72] (30/50) |
| wrong destination, navigate items | 14.0% [7-26] (7/50) | 46.0% [33-60] (23/50) | 40.0% [28-54] (20/50) | 40.0% [28-54] (20/50) |
| wrong destination, all items (a list always commits) | 15.0% [8-26] (9/60) | 55.0% [42-67] (33/60) | 50.0% [38-62] (30/60) | 50.0% [38-62] (30/60) |
| within one step (Goalpost) vs hit@3 (lists) | 68.0% [54-79] (34/50) | 62.0% [48-74] (31/50) | 80.0% [67-89] (40/50) | 82.0% [69-90] (41/50) |
| clarification rate / gold in options | 36.7% [26-49] (22/60) / 54.5% [35-73] (12/22) | – | – | – |
| rejection (reject items) | 80.0% [38-96] (4/5) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 53.3% [41-65] (32/60) | – | – | – |
| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | 25.0% [7-59] (2/8) / 25.0% [7-59] (2/8); hijack 0.0% [0-56] (0/3) | top-1 62.5% [31-86] (5/8) | 25.0% [7-59] (2/8) | 37.5% [14-69] (3/8) |
| twin pages: correct / wrong twin / twin question | 50.0% [19-81] (3/6) / 0.0% [0-39] (0/6) / 33.3% [10-70] (2/6) | wrong twin top-1 33.3% [10-70] (2/6) | 66.7% [30-90] (4/6) | 50.0% [19-81] (3/6) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 8/10, p=0.815 | 4/9, p=0.267 | 2/7, p=0.18 |
| McNemar avoided wrong destination, all items | | 27/3, p=8.4e-06 | 23/2, p=1.9e-05 | 21/0, p=9.5e-07 |

#### Insura FRESH held-out — GP2 / Insura v3 (reference, same run)  (n=60: 50 navigate, 5 clarify, 5 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 46.0% [33-60] (23/50) | 54.0% [40-67] (27/50) | 60.0% [46-72] (30/50) | 60.0% [46-72] (30/50) |
| wrong destination, navigate items | 18.0% [10-31] (9/50) | 46.0% [33-60] (23/50) | 40.0% [28-54] (20/50) | 40.0% [28-54] (20/50) |
| wrong destination, all items (a list always commits) | 20.0% [12-32] (12/60) | 55.0% [42-67] (33/60) | 50.0% [38-62] (30/60) | 50.0% [38-62] (30/60) |
| within one step (Goalpost) vs hit@3 (lists) | 60.0% [46-72] (30/50) | 62.0% [48-74] (31/50) | 80.0% [67-89] (40/50) | 82.0% [69-90] (41/50) |
| clarification rate / gold in options | 35.0% [24-48] (21/60) / 42.9% [24-63] (9/21) | – | – | – |
| rejection (reject items) | 80.0% [38-96] (4/5) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 48.3% [36-61] (29/60) | – | – | – |
| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | 12.5% [2-47] (1/8) / 12.5% [2-47] (1/8); hijack 0.0% [0-56] (0/3) | top-1 62.5% [31-86] (5/8) | 25.0% [7-59] (2/8) | 37.5% [14-69] (3/8) |
| twin pages: correct / wrong twin / twin question | 16.7% [3-56] (1/6) / 16.7% [3-56] (1/6) / 0.0% [0-39] (0/6) | wrong twin top-1 33.3% [10-70] (2/6) | 66.7% [30-90] (4/6) | 50.0% [19-81] (3/6) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 6/10, p=0.454 | 2/9, p=0.0654 | 0/7, p=0.0156 |
| McNemar avoided wrong destination, all items | | 25/4, p=1.0e-04 | 21/3, p=2.8e-04 | 19/1, p=4.0e-05 |

#### Insura fresh minus strict near-duplicates of tuned items — GP3  (n=55: 46 navigate, 4 clarify, 5 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 47.8% [34-62] (22/46) | 54.3% [40-68] (25/46) | 60.9% [46-74] (28/46) | 58.7% [44-72] (27/46) |
| wrong destination, navigate items | 13.0% [6-26] (6/46) | 45.7% [32-60] (21/46) | 39.1% [26-54] (18/46) | 41.3% [28-56] (19/46) |
| wrong destination, all items (a list always commits) | 14.5% [8-26] (8/55) | 54.5% [42-67] (30/55) | 49.1% [36-62] (27/55) | 50.9% [38-64] (28/55) |
| within one step (Goalpost) vs hit@3 (lists) | 67.4% [53-79] (31/46) | 60.9% [46-74] (28/46) | 80.4% [67-89] (37/46) | 80.4% [67-89] (37/46) |
| clarification rate / gold in options | 38.2% [27-51] (21/55) / 52.4% [32-72] (11/21) | – | – | – |
| rejection (reject items) | 80.0% [38-96] (4/5) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 50.9% [38-64] (28/55) | – | – | – |
| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | 25.0% [7-59] (2/8) / 25.0% [7-59] (2/8); hijack 0.0% [0-56] (0/3) | top-1 62.5% [31-86] (5/8) | 25.0% [7-59] (2/8) | 37.5% [14-69] (3/8) |
| twin pages: correct / wrong twin / twin question | 50.0% [19-81] (3/6) / 0.0% [0-39] (0/6) / 33.3% [10-70] (2/6) | wrong twin top-1 33.3% [10-70] (2/6) | 66.7% [30-90] (4/6) | 50.0% [19-81] (3/6) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 6/9, p=0.607 | 2/8, p=0.109 | 2/7, p=0.18 |
| McNemar avoided wrong destination, all items | | 24/2, p=1.0e-05 | 20/1, p=2.1e-05 | 20/0, p=1.9e-06 |

#### Insura fresh minus broad near-duplicates — GP3  (n=51: 42 navigate, 4 clarify, 5 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 45.2% [31-60] (19/42) | 57.1% [42-71] (24/42) | 57.1% [42-71] (24/42) | 57.1% [42-71] (24/42) |
| wrong destination, navigate items | 11.9% [5-25] (5/42) | 42.9% [29-58] (18/42) | 42.9% [29-58] (18/42) | 42.9% [29-58] (18/42) |
| wrong destination, all items (a list always commits) | 13.7% [7-26] (7/51) | 52.9% [40-66] (27/51) | 52.9% [40-66] (27/51) | 52.9% [40-66] (27/51) |
| within one step (Goalpost) vs hit@3 (lists) | 66.7% [52-79] (28/42) | 64.3% [49-77] (27/42) | 78.6% [64-88] (33/42) | 81.0% [67-90] (34/42) |
| clarification rate / gold in options | 41.2% [29-55] (21/51) / 52.4% [32-72] (11/21) | – | – | – |
| rejection (reject items) | 80.0% [38-96] (4/5) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 49.0% [36-62] (25/51) | – | – | – |
| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | 25.0% [7-59] (2/8) / 25.0% [7-59] (2/8); hijack 0.0% [0-56] (0/3) | top-1 62.5% [31-86] (5/8) | 25.0% [7-59] (2/8) | 37.5% [14-69] (3/8) |
| twin pages: correct / wrong twin / twin question | 50.0% [19-81] (3/6) / 0.0% [0-39] (0/6) / 33.3% [10-70] (2/6) | wrong twin top-1 33.3% [10-70] (2/6) | 66.7% [30-90] (4/6) | 50.0% [19-81] (3/6) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 4/9, p=0.267 | 2/7, p=0.18 | 2/7, p=0.18 |
| McNemar avoided wrong destination, all items | | 22/2, p=3.6e-05 | 20/0, p=1.9e-06 | 20/0, p=1.9e-06 |

#### Insura v1 held-out (SEEN in P5 — no longer independent) — GP3  (n=60: 50 navigate, 5 clarify, 5 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 52.0% [39-65] (26/50) | 34.0% [22-48] (17/50) | 50.0% [37-63] (25/50) | 60.0% [46-72] (30/50) |
| wrong destination, navigate items | 30.0% [19-44] (15/50) | 66.0% [52-78] (33/50) | 50.0% [37-63] (25/50) | 40.0% [28-54] (20/50) |
| wrong destination, all items (a list always commits) | 28.3% [19-41] (17/60) | 71.7% [59-81] (43/60) | 58.3% [46-70] (35/60) | 50.0% [38-62] (30/60) |
| within one step (Goalpost) vs hit@3 (lists) | 56.0% [42-69] (28/50) | 54.0% [40-67] (27/50) | 68.0% [54-79] (34/50) | 82.0% [69-90] (41/50) |
| clarification rate / gold in options | 23.3% [14-35] (14/60) / 50.0% [27-73] (7/14) | – | – | – |
| rejection (reject items) | 60.0% [23-88] (3/5) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 56.7% [44-68] (34/60) | – | – | – |
| twin pages: correct / wrong twin / twin question | 50.0% [9-91] (1/2) / 50.0% [9-91] (1/2) / 0.0% [0-66] (0/2) | wrong twin top-1 0.0% [0-66] (0/2) | 0.0% [0-66] (0/2) | 50.0% [9-91] (1/2) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 13/4, p=0.049 | 8/7, p=1 | 1/5, p=0.219 |
| McNemar avoided wrong destination, all items | | 29/3, p=2.6e-06 | 23/5, p=9.1e-04 | 15/2, p=0.00235 |

#### Insura v1 held-out (SEEN) — GP2 reference  (n=60: 50 navigate, 5 clarify, 5 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 48.0% [35-61] (24/50) | 34.0% [22-48] (17/50) | 50.0% [37-63] (25/50) | 60.0% [46-72] (30/50) |
| wrong destination, navigate items | 24.0% [14-37] (12/50) | 66.0% [52-78] (33/50) | 50.0% [37-63] (25/50) | 40.0% [28-54] (20/50) |
| wrong destination, all items (a list always commits) | 23.3% [14-35] (14/60) | 71.7% [59-81] (43/60) | 58.3% [46-70] (35/60) | 50.0% [38-62] (30/60) |
| within one step (Goalpost) vs hit@3 (lists) | 60.0% [46-72] (30/50) | 54.0% [40-67] (27/50) | 68.0% [54-79] (34/50) | 82.0% [69-90] (41/50) |
| clarification rate / gold in options | 31.7% [21-44] (19/60) / 57.9% [36-77] (11/19) | – | – | – |
| rejection (reject items) | 60.0% [23-88] (3/5) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 53.3% [41-65] (32/60) | – | – | – |
| twin pages: correct / wrong twin / twin question | 50.0% [9-91] (1/2) / 50.0% [9-91] (1/2) / 0.0% [0-66] (0/2) | wrong twin top-1 0.0% [0-66] (0/2) | 0.0% [0-66] (0/2) | 50.0% [9-91] (1/2) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 11/4, p=0.118 | 6/7, p=1 | 1/7, p=0.0703 |
| McNemar avoided wrong destination, all items | | 31/2, p=1.3e-07 | 24/3, p=4.9e-05 | 18/2, p=4.0e-04 |

#### Insura tuned v2 (development set) — GP3  (n=47: 41 navigate, 3 clarify, 3 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 80.5% [66-90] (33/41) | 43.9% [30-59] (18/41) | 75.6% [61-86] (31/41) | 70.7% [56-82] (29/41) |
| wrong destination, navigate items | 9.8% [4-23] (4/41) | 56.1% [41-70] (23/41) | 24.4% [14-39] (10/41) | 29.3% [18-44] (12/41) |
| wrong destination, all items (a list always commits) | 10.6% [5-23] (5/47) | 61.7% [47-74] (29/47) | 34.0% [22-48] (16/47) | 38.3% [26-53] (18/47) |
| within one step (Goalpost) vs hit@3 (lists) | 87.8% [74-95] (36/41) | 65.9% [51-78] (27/41) | 97.6% [87-100] (40/41) | 85.4% [72-93] (35/41) |
| clarification rate / gold in options | 14.9% [7-28] (7/47) / 85.7% [49-97] (6/7) | – | – | – |
| rejection (reject items) | 66.7% [21-94] (2/3) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 80.9% [67-90] (38/47) | – | – | – |
| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | 100.0% [57-100] (5/5) / 100.0% [57-100] (5/5); hijack 0.0% [0-66] (0/2) | top-1 80.0% [38-96] (4/5) | 80.0% [38-96] (4/5) | 60.0% [23-88] (3/5) |
| twin pages: correct / wrong twin / twin question | 75.0% [30-95] (3/4) / 25.0% [5-70] (1/4) / 0.0% [0-49] (0/4) | wrong twin top-1 25.0% [5-70] (1/4) | 50.0% [15-85] (2/4) | 75.0% [30-95] (3/4) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 15/0, p=6.1e-05 | 5/3, p=0.727 | 5/1, p=0.219 |
| McNemar avoided wrong destination, all items | | 24/0, p=1.2e-07 | 13/2, p=0.00739 | 13/0, p=2.4e-04 |

#### Insura tuned v2 — GP2 reference  (n=47: 41 navigate, 3 clarify, 3 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 61.0% [46-74] (25/41) | 43.9% [30-59] (18/41) | 75.6% [61-86] (31/41) | 70.7% [56-82] (29/41) |
| wrong destination, navigate items | 24.4% [14-39] (10/41) | 56.1% [41-70] (23/41) | 24.4% [14-39] (10/41) | 29.3% [18-44] (12/41) |
| wrong destination, all items (a list always commits) | 25.5% [15-40] (12/47) | 61.7% [47-74] (29/47) | 34.0% [22-48] (16/47) | 38.3% [26-53] (18/47) |
| within one step (Goalpost) vs hit@3 (lists) | 70.7% [56-82] (29/41) | 65.9% [51-78] (27/41) | 97.6% [87-100] (40/41) | 85.4% [72-93] (35/41) |
| clarification rate / gold in options | 17.0% [9-30] (8/47) / 75.0% [41-93] (6/8) | – | – | – |
| rejection (reject items) | 66.7% [21-94] (2/3) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 61.7% [47-74] (29/47) | – | – | – |
| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | 20.0% [4-62] (1/5) / 20.0% [4-62] (1/5); hijack 0.0% [0-66] (0/2) | top-1 80.0% [38-96] (4/5) | 80.0% [38-96] (4/5) | 60.0% [23-88] (3/5) |
| twin pages: correct / wrong twin / twin question | 25.0% [5-70] (1/4) / 75.0% [30-95] (3/4) / 0.0% [0-49] (0/4) | wrong twin top-1 25.0% [5-70] (1/4) | 50.0% [15-85] (2/4) | 75.0% [30-95] (3/4) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 10/3, p=0.0923 | 2/8, p=0.109 | 1/5, p=0.219 |
| McNemar avoided wrong destination, all items | | 20/3, p=4.9e-04 | 10/6, p=0.454 | 9/3, p=0.146 |

### Lumenet


#### Lumenet FRESH held-out (independent, run once) — GP3 / Lumenet v4  (n=60: 50 navigate, 5 clarify, 5 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 60.0% [46-72] (30/50) | 42.0% [29-56] (21/50) | 58.0% [44-71] (29/50) | 68.0% [54-79] (34/50) |
| wrong destination, navigate items | 14.0% [7-26] (7/50) | 58.0% [44-71] (29/50) | 42.0% [29-56] (21/50) | 32.0% [21-46] (16/50) |
| wrong destination, all items (a list always commits) | 16.7% [9-28] (10/60) | 65.0% [52-76] (39/60) | 51.7% [39-64] (31/60) | 43.3% [32-56] (26/60) |
| within one step (Goalpost) vs hit@3 (lists) | 82.0% [69-90] (41/50) | 62.0% [48-74] (31/50) | 74.0% [60-84] (37/50) | 88.0% [76-94] (44/50) |
| clarification rate / gold in options | 30.0% [20-43] (18/60) / 77.8% [55-91] (14/18) | – | – | – |
| rejection (reject items) | 40.0% [12-77] (2/5) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 58.3% [46-70] (35/60) | – | – | – |
| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | 25.0% [7-59] (2/8) / 50.0% [22-78] (4/8); hijack 0.0% [0-56] (0/3) | top-1 50.0% [22-78] (4/8) | 12.5% [2-47] (1/8) | 12.5% [2-47] (1/8) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 16/7, p=0.0931 | 7/6, p=1 | 1/5, p=0.219 |
| McNemar avoided wrong destination, all items | | 32/3, p=4.2e-07 | 23/2, p=1.9e-05 | 16/0, p=3.1e-05 |

#### Lumenet FRESH held-out — GP2 / Lumenet v3 (reference, same run)  (n=60: 50 navigate, 5 clarify, 5 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 58.0% [44-71] (29/50) | 42.0% [29-56] (21/50) | 58.0% [44-71] (29/50) | 68.0% [54-79] (34/50) |
| wrong destination, navigate items | 20.0% [11-33] (10/50) | 58.0% [44-71] (29/50) | 42.0% [29-56] (21/50) | 32.0% [21-46] (16/50) |
| wrong destination, all items (a list always commits) | 21.7% [13-34] (13/60) | 65.0% [52-76] (39/60) | 51.7% [39-64] (31/60) | 43.3% [32-56] (26/60) |
| within one step (Goalpost) vs hit@3 (lists) | 76.0% [63-86] (38/50) | 62.0% [48-74] (31/50) | 74.0% [60-84] (37/50) | 88.0% [76-94] (44/50) |
| clarification rate / gold in options | 26.7% [17-39] (16/60) / 75.0% [51-90] (12/16) | – | – | – |
| rejection (reject items) | 40.0% [12-77] (2/5) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 56.7% [44-68] (34/60) | – | – | – |
| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | 0.0% [0-32] (0/8) / 0.0% [0-32] (0/8); hijack 0.0% [0-56] (0/3) | top-1 50.0% [22-78] (4/8) | 12.5% [2-47] (1/8) | 12.5% [2-47] (1/8) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 15/7, p=0.134 | 6/6, p=1 | 0/5, p=0.0625 |
| McNemar avoided wrong destination, all items | | 30/4, p=6.2e-06 | 20/2, p=1.2e-04 | 14/1, p=9.8e-04 |

#### Lumenet fresh minus strict near-duplicates of tuned items — GP3  (n=56: 46 navigate, 5 clarify, 5 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 56.5% [42-70] (26/46) | 37.0% [25-51] (17/46) | 56.5% [42-70] (26/46) | 65.2% [51-77] (30/46) |
| wrong destination, navigate items | 15.2% [8-28] (7/46) | 63.0% [49-75] (29/46) | 43.5% [30-58] (20/46) | 34.8% [23-49] (16/46) |
| wrong destination, all items (a list always commits) | 17.9% [10-30] (10/56) | 69.6% [57-80] (39/56) | 53.6% [41-66] (30/56) | 46.4% [34-59] (26/56) |
| within one step (Goalpost) vs hit@3 (lists) | 80.4% [67-89] (37/46) | 58.7% [44-72] (27/46) | 73.9% [60-84] (34/46) | 87.0% [74-94] (40/46) |
| clarification rate / gold in options | 32.1% [21-45] (18/56) / 77.8% [55-91] (14/18) | – | – | – |
| rejection (reject items) | 40.0% [12-77] (2/5) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 55.4% [42-68] (31/56) | – | – | – |
| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | 25.0% [7-59] (2/8) / 50.0% [22-78] (4/8); hijack 0.0% [0-56] (0/3) | top-1 50.0% [22-78] (4/8) | 12.5% [2-47] (1/8) | 12.5% [2-47] (1/8) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 16/7, p=0.0931 | 6/6, p=1 | 1/5, p=0.219 |
| McNemar avoided wrong destination, all items | | 32/3, p=4.2e-07 | 22/2, p=3.6e-05 | 16/0, p=3.1e-05 |

#### Lumenet fresh minus broad near-duplicates — GP3  (n=49: 41 navigate, 3 clarify, 5 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 53.7% [39-68] (22/41) | 39.0% [26-54] (16/41) | 56.1% [41-70] (23/41) | 63.4% [48-76] (26/41) |
| wrong destination, navigate items | 14.6% [7-28] (6/41) | 61.0% [46-74] (25/41) | 43.9% [30-59] (18/41) | 36.6% [24-52] (15/41) |
| wrong destination, all items (a list always commits) | 18.4% [10-31] (9/49) | 67.3% [53-79] (33/49) | 53.1% [39-66] (26/49) | 46.9% [34-61] (23/49) |
| within one step (Goalpost) vs hit@3 (lists) | 80.5% [66-90] (33/41) | 63.4% [48-76] (26/41) | 75.6% [61-86] (31/41) | 87.8% [74-95] (36/41) |
| clarification rate / gold in options | 32.7% [21-47] (16/49) / 75.0% [51-90] (12/16) | – | – | – |
| rejection (reject items) | 40.0% [12-77] (2/5) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 51.0% [37-64] (25/49) | – | – | – |
| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | 25.0% [7-59] (2/8) / 50.0% [22-78] (4/8); hijack 0.0% [0-56] (0/3) | top-1 50.0% [22-78] (4/8) | 12.5% [2-47] (1/8) | 12.5% [2-47] (1/8) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 13/7, p=0.263 | 5/6, p=1 | 1/5, p=0.219 |
| McNemar avoided wrong destination, all items | | 27/3, p=8.4e-06 | 19/2, p=2.2e-04 | 14/0, p=1.2e-04 |

#### Lumenet v1 held-out (SEEN in P5 — no longer independent) — GP3  (n=60: 50 navigate, 5 clarify, 5 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 54.0% [40-67] (27/50) | 44.0% [31-58] (22/50) | 58.0% [44-71] (29/50) | 62.0% [48-74] (31/50) |
| wrong destination, navigate items | 26.0% [16-40] (13/50) | 56.0% [42-69] (28/50) | 42.0% [29-56] (21/50) | 38.0% [26-52] (19/50) |
| wrong destination, all items (a list always commits) | 23.3% [14-35] (14/60) | 63.3% [51-74] (38/60) | 51.7% [39-64] (31/60) | 48.3% [36-61] (29/60) |
| within one step (Goalpost) vs hit@3 (lists) | 62.0% [48-74] (31/50) | 50.0% [37-63] (25/50) | 72.0% [58-83] (36/50) | 72.0% [58-83] (36/50) |
| clarification rate / gold in options | 23.3% [14-35] (14/60) / 64.3% [39-84] (9/14) | – | – | – |
| rejection (reject items) | 80.0% [38-96] (4/5) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 60.0% [47-71] (36/60) | – | – | – |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 12/7, p=0.359 | 8/10, p=0.815 | 0/4, p=0.125 |
| McNemar avoided wrong destination, all items | | 28/4, p=1.9e-05 | 23/6, p=0.00232 | 15/0, p=6.1e-05 |

#### Lumenet v1 held-out (SEEN) — GP2 reference  (n=60: 50 navigate, 5 clarify, 5 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 54.0% [40-67] (27/50) | 44.0% [31-58] (22/50) | 58.0% [44-71] (29/50) | 62.0% [48-74] (31/50) |
| wrong destination, navigate items | 24.0% [14-37] (12/50) | 56.0% [42-69] (28/50) | 42.0% [29-56] (21/50) | 38.0% [26-52] (19/50) |
| wrong destination, all items (a list always commits) | 21.7% [13-34] (13/60) | 63.3% [51-74] (38/60) | 51.7% [39-64] (31/60) | 48.3% [36-61] (29/60) |
| within one step (Goalpost) vs hit@3 (lists) | 64.0% [50-76] (32/50) | 50.0% [37-63] (25/50) | 72.0% [58-83] (36/50) | 72.0% [58-83] (36/50) |
| clarification rate / gold in options | 25.0% [16-37] (15/60) / 66.7% [42-85] (10/15) | – | – | – |
| rejection (reject items) | 80.0% [38-96] (4/5) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 60.0% [47-71] (36/60) | – | – | – |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 13/8, p=0.383 | 8/10, p=0.815 | 1/5, p=0.219 |
| McNemar avoided wrong destination, all items | | 30/5, p=2.2e-05 | 24/6, p=0.00143 | 17/1, p=1.4e-04 |

#### Lumenet tuned v2 (development set) — GP3  (n=51: 45 navigate, 3 clarify, 3 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 68.9% [54-80] (31/45) | 48.9% [35-63] (22/45) | 80.0% [66-89] (36/45) | 75.6% [61-86] (34/45) |
| wrong destination, navigate items | 15.6% [8-29] (7/45) | 51.1% [37-65] (23/45) | 20.0% [11-34] (9/45) | 24.4% [14-39] (11/45) |
| wrong destination, all items (a list always commits) | 13.7% [7-26] (7/51) | 56.9% [43-69] (29/51) | 29.4% [19-43] (15/51) | 33.3% [22-47] (17/51) |
| within one step (Goalpost) vs hit@3 (lists) | 82.2% [69-91] (37/45) | 64.4% [50-77] (29/45) | 93.3% [82-98] (42/45) | 91.1% [79-96] (41/45) |
| clarification rate / gold in options | 19.6% [11-32] (10/51) / 90.0% [60-98] (9/10) | – | – | – |
| rejection (reject items) | 100.0% [44-100] (3/3) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 72.5% [59-83] (37/51) | – | – | – |
| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | 57.1% [25-84] (4/7) / 71.4% [36-92] (5/7); hijack 0.0% [0-66] (0/2) | top-1 42.9% [16-75] (3/7) | 28.6% [8-64] (2/7) | 28.6% [8-64] (2/7) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 14/5, p=0.0636 | 8/13, p=0.383 | 2/5, p=0.453 |
| McNemar avoided wrong destination, all items | | 23/1, p=3.0e-06 | 14/6, p=0.115 | 10/0, p=0.00195 |

#### Lumenet tuned v2 — GP2 reference  (n=51: 45 navigate, 3 clarify, 3 reject)

| metric | Goalpost | BM25 visible (a) | BM25+desc (a2) | semantic list (b) |
|---|---|---|---|---|
| committed correct (navigate items; list = top-1) | 62.2% [48-75] (28/45) | 48.9% [35-63] (22/45) | 80.0% [66-89] (36/45) | 75.6% [61-86] (34/45) |
| wrong destination, navigate items | 24.4% [14-39] (11/45) | 51.1% [37-65] (23/45) | 20.0% [11-34] (9/45) | 24.4% [14-39] (11/45) |
| wrong destination, all items (a list always commits) | 21.6% [12-35] (11/51) | 56.9% [43-69] (29/51) | 29.4% [19-43] (15/51) | 33.3% [22-47] (17/51) |
| within one step (Goalpost) vs hit@3 (lists) | 73.3% [59-84] (33/45) | 64.4% [50-77] (29/45) | 93.3% [82-98] (42/45) | 91.1% [79-96] (41/45) |
| clarification rate / gold in options | 17.6% [10-30] (9/51) / 88.9% [56-98] (8/9) | – | – | – |
| rejection (reject items) | 100.0% [44-100] (3/3) | 0 (cannot reject) | 0 | 0 |
| decision correct, all items | 66.7% [53-78] (34/51) | – | – | – |
| saved-state routing: positives navigated / navigated-or-offered; negatives hijacked | 0.0% [0-35] (0/7) / 0.0% [0-35] (0/7); hijack 0.0% [0-66] (0/2) | top-1 42.9% [16-75] (3/7) | 28.6% [8-64] (2/7) | 28.6% [8-64] (2/7) |
| McNemar committed correct (Goalpost-only / list-only, exact p) | | 14/8, p=0.286 | 5/13, p=0.0963 | 0/6, p=0.0312 |
| McNemar avoided wrong destination, all items | | 22/4, p=5.3e-04 | 11/7, p=0.481 | 8/2, p=0.109 |