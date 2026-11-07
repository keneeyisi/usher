> **Name note (26 Oct 2026):** the system described here was renamed from **Goalpost** to **Usher** on 26 Oct 2026. This report is kept as written at the time (formerly Goalpost); file, key and label names in it refer to the pre-rename builds. Results are unchanged by the rename.


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