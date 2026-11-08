> **Name note (26 Oct 2026):** the system described here was renamed from **Goalpost** to **Usher** on 26 Oct 2026. This report is kept as written at the time (formerly Goalpost); file, key and label names in it refer to the pre-rename builds. Results are unchanged by the rename.

# Goalpost on two new sites: evaluation results (19 Oct 2026)

Frozen held-out hashes (SHA-256 of the items sorted by id as JSON, sort_keys; recorded before the first run): Insura `b21509de201f7f6e222e8e2b1dea58a9ce3d9ef4aba799189574dc05e7599a28`; Lumenet `5976760145394e0ece8861ba89aeb5924d244a429ea6efbc7cb99f31f64842ab`. (The 'items file SHA-256' lines below are plain file hashes of the JSON files.)

**Status: build-team authored, therefore optimistic.** The same assistant wrote the site content, the descriptions/aliases, the tuned sets and the held-out sets. No participant data exists for these sites. Treat every number as an engineering check on build-team-written queries, not evidence of human-level routing.

Resolver: RESOLVER7_GP engine, **frozen CivicSphere parameters, no per-site tuning, no CivicSphere lexical word lists** (`lexicalProfiles: 0`). Embeddings: Xenova/all-MiniLM-L6-v2 q8, WASM, deterministic (index text hashes: Insura `ac933f4f`, Lumenet `71a2be54`). Baselines: (a) the site's own BM25 search over visible text (title x3, headings x2, k1 1.2, b 0.75, stop-words, light stemmer; the same `assets/site-search.js` visitors get); (a') the same plus hidden descriptions and aliases; (b) semantic ranked list (no decision policy); (c) Goalpost decision.

Definitions (spec 7.3). Page accuracy = gold page (or listed acceptable page) is top-1 for a/a'/b, or Goalpost *committed* to it. Wrong-destination rate = Goalpost navigated to a page that is not gold/acceptable (lead metric). Within one extra step = correct navigation, or a clarification that offers the gold page. Baselines always 'go', so their wrong-destination rate is 100% minus page accuracy. Section accuracy only where a gold section exists (10 items per set). Strict gold only; a lenient line also accepts the twin cover/claim page.


## Insura: Held-out (frozen; first and only run)
items 60 (navigate 50, clarify 5, reject 5); items file SHA-256 `0d15be9e9b19ced9...`

| Condition | Page top-1 | hit@3 | hit@5 | Section |
|---|---|---|---|---|
| (a) site BM25, visible text | 34.0% [22-48] (17/50) | 54.0% [40-67] (27/50) | 58.0% [44-71] (29/50) | 30.0% [11-60] (3/10) |
| (a') BM25 + descriptions/aliases | 50.0% [37-63] (25/50) | 68.0% [54-79] (34/50) | 72.0% [58-83] (36/50) | 30.0% [11-60] (3/10) |
| (b) semantic ranked list | 60.0% [46-72] (30/50) | 82.0% [69-90] (41/50) | 90.0% [79-96] (45/50) | n/a |
| (c) Goalpost committed navigation | 48.0% [35-61] (24/50) | n/a | n/a | 30.0% [11-60] (3/10) |

| Goalpost metric | Value (Wilson 95% CI) |
|---|---|
| Wrong-destination rate (navigate items) **lead** | 24.0% [14-37] (12/50) |
| Wrong-destination rate (all items, incl. navigating on clarify/reject items) | 23.3% [14-35] (14/60) |
| Clarification rate (all items) | 31.7% [21-44] (19/60) |
| Clarifications that offer the gold page | 57.9% [36-77] (11/19) |
| Resolved within one extra step (navigate items) | 60.0% [46-72] (30/50) |
| Rejection accuracy | 60.0% [23-88] (3/5) |
| False rejects on navigate items | 0.0% [0-7] (0/50) |
| Gold-clarify items that were clarified | 100.0% [57-100] (5/5) |
| Correct decision, all items | 53.3% [41-65] (32/60) |

Lenient (twin pages accepted): Goalpost correct 50.0% [37-63] (25/50), wrong 22.0% [13-35] (11/50); semantic top-1 62.0% [48-74] (31/50).


Paired exact McNemar on navigate items, correct page (descriptive, uncorrected): c vs a: only-first 11, only-second 4, p=0.118; c vs a2: only-first 6, only-second 7, p=1.000; c vs b: only-first 1, only-second 7, p=0.070; b vs a2: only-first 9, only-second 4, p=0.267; a2 vs a: only-first 8, only-second 0, p=0.008

By label-word overlap: overlap 0: n=25, BM25 20.0%, BM25+desc 36.0%, semantic 44.0%, Goalpost correct 36.0% / wrong 24.0%; overlap 1: n=21, BM25 42.9%, BM25+desc 61.9%, semantic 71.4%, Goalpost correct 57.1% / wrong 23.8%; overlap 2+: n=4, BM25 75.0%, BM25+desc 75.0%, semantic 100.0%, Goalpost correct 75.0% / wrong 25.0%


## Insura: Tuned set (after profile/content fixes; optimistic by construction)
items 42 (navigate 37, clarify 2, reject 3); items file SHA-256 `97a1f46b5c827fd5...`

| Condition | Page top-1 | hit@3 | hit@5 | Section |
|---|---|---|---|---|
| (a) site BM25, visible text | 45.9% [31-62] (17/37) | 64.9% [49-78] (24/37) | 70.3% [54-83] (26/37) | 42.9% [16-75] (3/7) |
| (a') BM25 + descriptions/aliases | 81.1% [66-91] (30/37) | 97.3% [86-100] (36/37) | 100.0% [91-100] (37/37) | 57.1% [25-84] (4/7) |
| (b) semantic ranked list | 73.0% [57-85] (27/37) | 89.2% [75-96] (33/37) | 94.6% [82-99] (35/37) | n/a |
| (c) Goalpost committed navigation | 67.6% [51-80] (25/37) | n/a | n/a | 28.6% [8-64] (2/7) |

| Goalpost metric | Value (Wilson 95% CI) |
|---|---|
| Wrong-destination rate (navigate items) **lead** | 18.9% [9-34] (7/37) |
| Wrong-destination rate (all items, incl. navigating on clarify/reject items) | 19.0% [10-33] (8/42) |
| Clarification rate (all items) | 16.7% [8-31] (7/42) |
| Clarifications that offer the gold page | 85.7% [49-97] (6/7) |
| Resolved within one extra step (navigate items) | 78.4% [63-89] (29/37) |
| Rejection accuracy | 66.7% [21-94] (2/3) |
| False rejects on navigate items | 0.0% [0-9] (0/37) |
| Gold-clarify items that were clarified | 100.0% [34-100] (2/2) |
| Correct decision, all items | 69.0% [54-81] (29/42) |

Lenient (twin pages accepted): Goalpost correct 75.7% [60-87] (28/37), wrong 10.8% [4-25] (4/37); semantic top-1 81.1% [66-91] (30/37).


Paired exact McNemar on navigate items, correct page (descriptive, uncorrected): c vs a: only-first 10, only-second 2, p=0.039; c vs a2: only-first 2, only-second 7, p=0.180; c vs b: only-first 1, only-second 3, p=0.625; b vs a2: only-first 3, only-second 6, p=0.508; a2 vs a: only-first 13, only-second 0, p=0.000

By label-word overlap: overlap 0: n=25, BM25 40.0%, BM25+desc 76.0%, semantic 68.0%, Goalpost correct 64.0% / wrong 24.0%; overlap 1: n=8, BM25 50.0%, BM25+desc 87.5%, semantic 87.5%, Goalpost correct 62.5% / wrong 12.5%; overlap 2+: n=4, BM25 75.0%, BM25+desc 100.0%, semantic 75.0%, Goalpost correct 100.0% / wrong 0.0%


## Insura: Tuned set, first run before any fixes
items 42 (navigate 37, clarify 2, reject 3); items file SHA-256 `53435b97fe142680...`

| Condition | Page top-1 | hit@3 | hit@5 | Section |
|---|---|---|---|---|
| (a) site BM25, visible text | 45.9% [31-62] (17/37) | 64.9% [49-78] (24/37) | 70.3% [54-83] (26/37) | 42.9% [16-75] (3/7) |
| (a') BM25 + descriptions/aliases | 75.7% [60-87] (28/37) | 94.6% [82-99] (35/37) | 100.0% [91-100] (37/37) | 57.1% [25-84] (4/7) |
| (b) semantic ranked list | 70.3% [54-83] (26/37) | 89.2% [75-96] (33/37) | 91.9% [79-97] (34/37) | n/a |
| (c) Goalpost committed navigation | 51.4% [36-67] (19/37) | n/a | n/a | 14.3% [3-51] (1/7) |

| Goalpost metric | Value (Wilson 95% CI) |
|---|---|
| Wrong-destination rate (navigate items) **lead** | 21.6% [11-37] (8/37) |
| Wrong-destination rate (all items, incl. navigating on clarify/reject items) | 21.4% [12-36] (9/42) |
| Clarification rate (all items) | 28.6% [17-44] (12/42) |
| Clarifications that offer the gold page | 58.3% [32-81] (7/12) |
| Resolved within one extra step (navigate items) | 64.9% [49-78] (24/37) |
| Rejection accuracy | 66.7% [21-94] (2/3) |
| False rejects on navigate items | 0.0% [0-9] (0/37) |
| Gold-clarify items that were clarified | 100.0% [34-100] (2/2) |
| Correct decision, all items | 54.8% [40-69] (23/42) |

Paired exact McNemar on navigate items, correct page (descriptive, uncorrected): c vs a: only-first 6, only-second 4, p=0.754; c vs a2: only-first 2, only-second 11, p=0.022; c vs b: only-first 0, only-second 7, p=0.016; b vs a2: only-first 3, only-second 5, p=0.727; a2 vs a: only-first 11, only-second 0, p=0.001

By label-word overlap: overlap 0: n=25, BM25 40.0%, BM25+desc 68.0%, semantic 64.0%, Goalpost correct 52.0% / wrong 28.0%; overlap 1: n=8, BM25 50.0%, BM25+desc 87.5%, semantic 87.5%, Goalpost correct 50.0% / wrong 0.0%; overlap 2+: n=4, BM25 75.0%, BM25+desc 100.0%, semantic 75.0%, Goalpost correct 50.0% / wrong 25.0%


## Lumenet: Held-out (frozen; first and only run)
items 60 (navigate 50, clarify 5, reject 5); items file SHA-256 `e991979fb3b476ae...`

| Condition | Page top-1 | hit@3 | hit@5 | Section |
|---|---|---|---|---|
| (a) site BM25, visible text | 44.0% [31-58] (22/50) | 50.0% [37-63] (25/50) | 60.0% [46-72] (30/50) | 50.0% [24-76] (5/10) |
| (a') BM25 + descriptions/aliases | 58.0% [44-71] (29/50) | 72.0% [58-83] (36/50) | 76.0% [63-86] (38/50) | 40.0% [17-69] (4/10) |
| (b) semantic ranked list | 62.0% [48-74] (31/50) | 72.0% [58-83] (36/50) | 86.0% [74-93] (43/50) | n/a |
| (c) Goalpost committed navigation | 54.0% [40-67] (27/50) | n/a | n/a | 30.0% [11-60] (3/10) |

| Goalpost metric | Value (Wilson 95% CI) |
|---|---|
| Wrong-destination rate (navigate items) **lead** | 24.0% [14-37] (12/50) |
| Wrong-destination rate (all items, incl. navigating on clarify/reject items) | 21.7% [13-34] (13/60) |
| Clarification rate (all items) | 25.0% [16-37] (15/60) |
| Clarifications that offer the gold page | 66.7% [42-85] (10/15) |
| Resolved within one extra step (navigate items) | 64.0% [50-76] (32/50) |
| Rejection accuracy | 80.0% [38-96] (4/5) |
| False rejects on navigate items | 2.0% [0-10] (1/50) |
| Gold-clarify items that were clarified | 100.0% [57-100] (5/5) |
| Correct decision, all items | 60.0% [47-71] (36/60) |

Lenient (twin pages accepted): Goalpost correct 54.0% [40-67] (27/50), wrong 24.0% [14-37] (12/50); semantic top-1 62.0% [48-74] (31/50).


Paired exact McNemar on navigate items, correct page (descriptive, uncorrected): c vs a: only-first 13, only-second 8, p=0.383; c vs a2: only-first 8, only-second 10, p=0.815; c vs b: only-first 1, only-second 5, p=0.219; b vs a2: only-first 9, only-second 7, p=0.804; a2 vs a: only-first 11, only-second 4, p=0.118

By label-word overlap: overlap 0: n=24, BM25 20.8%, BM25+desc 58.3%, semantic 50.0%, Goalpost correct 41.7% / wrong 37.5%; overlap 1: n=19, BM25 57.9%, BM25+desc 57.9%, semantic 73.7%, Goalpost correct 73.7% / wrong 10.5%; overlap 2+: n=7, BM25 85.7%, BM25+desc 57.1%, semantic 71.4%, Goalpost correct 42.9% / wrong 14.3%


## Lumenet: Tuned set (after profile/content fixes; optimistic by construction)
items 47 (navigate 41, clarify 3, reject 3); items file SHA-256 `d31b6a245ef4c8d2...`

| Condition | Page top-1 | hit@3 | hit@5 | Section |
|---|---|---|---|---|
| (a) site BM25, visible text | 41.5% [28-57] (17/41) | 56.1% [41-70] (23/41) | 68.3% [53-80] (28/41) | n/a |
| (a') BM25 + descriptions/aliases | 82.9% [69-91] (34/41) | 92.7% [81-97] (38/41) | 97.6% [87-100] (40/41) | n/a |
| (b) semantic ranked list | 75.6% [61-86] (31/41) | 90.2% [77-96] (37/41) | 95.1% [84-99] (39/41) | n/a |
| (c) Goalpost committed navigation | 70.7% [56-82] (29/41) | n/a | n/a | n/a |

| Goalpost metric | Value (Wilson 95% CI) |
|---|---|
| Wrong-destination rate (navigate items) **lead** | 19.5% [10-34] (8/41) |
| Wrong-destination rate (all items, incl. navigating on clarify/reject items) | 17.0% [9-30] (8/47) |
| Clarification rate (all items) | 14.9% [7-28] (7/47) |
| Clarifications that offer the gold page | 85.7% [49-97] (6/7) |
| Resolved within one extra step (navigate items) | 78.0% [63-88] (32/41) |
| Rejection accuracy | 100.0% [44-100] (3/3) |
| False rejects on navigate items | 0.0% [0-9] (0/41) |
| Gold-clarify items that were clarified | 100.0% [44-100] (3/3) |
| Correct decision, all items | 74.5% [60-85] (35/47) |

Lenient (twin pages accepted): Goalpost correct 70.7% [56-82] (29/41), wrong 19.5% [10-34] (8/41); semantic top-1 75.6% [61-86] (31/41).


Paired exact McNemar on navigate items, correct page (descriptive, uncorrected): c vs a: only-first 16, only-second 4, p=0.012; c vs a2: only-first 5, only-second 10, p=0.302; c vs b: only-first 1, only-second 3, p=0.625; b vs a2: only-first 5, only-second 8, p=0.581; a2 vs a: only-first 17, only-second 0, p=0.000

By label-word overlap: overlap 0: n=23, BM25 21.7%, BM25+desc 73.9%, semantic 73.9%, Goalpost correct 69.6% / wrong 21.7%; overlap 1: n=11, BM25 45.5%, BM25+desc 90.9%, semantic 72.7%, Goalpost correct 72.7% / wrong 9.1%; overlap 2+: n=7, BM25 100.0%, BM25+desc 100.0%, semantic 85.7%, Goalpost correct 71.4% / wrong 28.6%


## Lumenet: Tuned set, first run before any fixes
items 47 (navigate 41, clarify 3, reject 3); items file SHA-256 `9eeeefbfa83fec30...`

| Condition | Page top-1 | hit@3 | hit@5 | Section |
|---|---|---|---|---|
| (a) site BM25, visible text | 43.9% [30-59] (18/41) | 58.5% [43-72] (24/41) | 70.7% [56-82] (29/41) | n/a |
| (a') BM25 + descriptions/aliases | 78.0% [63-88] (32/41) | 92.7% [81-97] (38/41) | 97.6% [87-100] (40/41) | n/a |
| (b) semantic ranked list | 75.6% [61-86] (31/41) | 90.2% [77-96] (37/41) | 95.1% [84-99] (39/41) | n/a |
| (c) Goalpost committed navigation | 68.3% [53-80] (28/41) | n/a | n/a | n/a |

| Goalpost metric | Value (Wilson 95% CI) |
|---|---|
| Wrong-destination rate (navigate items) **lead** | 17.1% [9-31] (7/41) |
| Wrong-destination rate (all items, incl. navigating on clarify/reject items) | 14.9% [7-28] (7/47) |
| Clarification rate (all items) | 19.1% [10-33] (9/47) |
| Clarifications that offer the gold page | 77.8% [45-94] (7/9) |
| Resolved within one extra step (navigate items) | 78.0% [63-88] (32/41) |
| Rejection accuracy | 100.0% [44-100] (3/3) |
| False rejects on navigate items | 0.0% [0-9] (0/41) |
| Gold-clarify items that were clarified | 100.0% [44-100] (3/3) |
| Correct decision, all items | 72.3% [58-83] (34/47) |

Paired exact McNemar on navigate items, correct page (descriptive, uncorrected): c vs a: only-first 15, only-second 5, p=0.041; c vs a2: only-first 5, only-second 9, p=0.424; c vs b: only-first 0, only-second 3, p=0.250; b vs a2: only-first 6, only-second 7, p=1.000; a2 vs a: only-first 15, only-second 1, p=0.001

By label-word overlap: overlap 0: n=22, BM25 22.7%, BM25+desc 68.2%, semantic 72.7%, Goalpost correct 68.2% / wrong 22.7%; overlap 1: n=12, BM25 50.0%, BM25+desc 83.3%, semantic 75.0%, Goalpost correct 66.7% / wrong 8.3%; overlap 2+: n=7, BM25 100.0%, BM25+desc 100.0%, semantic 85.7%, Goalpost correct 71.4% / wrong 14.3%


## Honest reading
* With frozen CivicSphere parameters and profile-only configuration, Goalpost's committed-navigation accuracy on held-out (Insura 48%, Lumenet 54%) is **below the semantic ranked list's top-1 (60%, 62%)**, and its wrong-destination rate is 24% of navigate items on both sites. The strengthened keyword baseline (BM25 plus descriptions/aliases: 50%, 58%) is not distinguishable from Goalpost's committed accuracy (McNemar p=1.0 and 0.81). Nothing here supports a claim that the decision policy improves on a plain semantic list on these sites.
* Goalpost vs the visible-text keyword search (what visitors have today): 48% vs 34% (Insura) and 54% vs 44% (Lumenet) on page accuracy; not significant (p=0.12, 0.38).
* The decision layer trades accuracy for asking: clarification rate 32% (Insura) and 25% (Lumenet), but only 58% and 67% of clarifications offer the gold page, so within-one-step (60%, 64%) is not higher than semantic hit@3 (82%, 72%).
* The sites contain deliberately near-duplicate pages (cover page vs claim page; slow vs dropping vs Wi-Fi). Many errors are sibling confusions. The lenient line (twin pages accepted) changes little, so strictness of labels is not the main cause.
* Saved-state items (4 per held-out set): Insura 1/4 and Lumenet 0/4 reached the saved item. The frozen rule needs the saved item's owner page to be the top topic candidate, otherwise it falls back to the account page or to a topical page; this is recorded, not tuned. 'I'm moving house' without resume wording reaches the generic Move page by design (saved items are offered only with resume intent). The spec's statement that it routes to the saved move was wrong for the frozen policy.
* Reject accuracy on held-out: Insura 3/5, Lumenet 4/5; Lumenet had 1 false reject on a navigate item. Five reject items per set: very wide intervals.
* n=50 navigate items per held-out set: one item is 2 points; all intervals are wide.

## Limits and caveats
1. Authorship: queries, gold labels, descriptions and aliases all by the build team (the assistant). Held-out items were written from scenario cards after descriptions were frozen and hashed before the first run, but this is not independent. Participant-written queries are the real test.
2. Echo: the tuned sets' card queries appear near-verbatim in aliases/descriptions (echo lint: Jaccard 1.0 for many), so tuned results are inflated by construction and reported only as an engineering check. The lint on the held-out sets flagged only generic stop-word trigrams; 8 items with the closest paraphrases were reworded **before** freezing (never after).
3. Tuned-set fixes (profile/content only): descriptions/aliases on 15 pages, qualifier exceptions, extra resume phrases (see eval/patches and the DSL backup). No parameter changes. One tuned gold label (LUM_T46) was relabelled after run 1 (see above).
4. Held-out was run once; afterwards nothing in descriptions, aliases, qualifiers or intents was edited. Widget/CSS changes after the run do not affect decisions (209/209 node vs browser identical on rerun with the final build).
5. Synthetic fictional sites, English only, MiniLM only, routing accuracy is not task success.
