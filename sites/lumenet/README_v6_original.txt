Usher demo site: Lumenet v6 (P7, 29 Oct 2026; fictional research prototype). Port on Kene's Mac: 8032 (launchd com.civicsphere.usherlumenet6; the v5 service on its old port is left unchanged).
v6 = v5 pages + the frozen P7 engine (ENGINE_VERSION RESOLVER7_USHER2, usher-engine.js sha256 8355fac1..., copied unchanged from eval_gp/p7/engine/) + the configuration
selected on development data only and then run once on the frozen test sets (eval_gp/p7/frozen_run/): params clarifyMin 0.58, navigateMin 0.62, marginMin 0.04, offTopicMargin -0.02;
policy extraStatusCues, savedGuards, qualifierGuard on; savedContextRoute off; twinPickMin 0.30; clarifyTopK 3; savedContextMaxDf 0; savedIntentWindow 0.12; savedNavWindow -1.
Model: bge-small-en-v1.5 (Xenova ONNX q8, 34.0 MB, CLS pooling, query instruction) replaces all-MiniLM-L6-v2 in models/; usher-profile.json has "embeddingModel":"bge-small"
and the build-time enrichment (each page's own summary and aliases added as index texts). usher-index.json recompiled: 1,234 texts, 2,661,232 bytes (sha256 87b474e9...).
Widget: one-line change createEngine(P, { model: P.embeddingModel }) so the browser loads the profile's model; usher.js rebundled. Pages, photos and UI otherwise unchanged.
Check: the built files reproduce all 262 frozen-set decisions (destinations, options, reason strings). Results: eval_gp/p7/official/ and posthoc/paper_numbers.json on the box.
Tests (box, 29 Oct 2026): eval_gp/p7/tests/ (axe 0 violations on all pages at 375 px; the v5 panel fixtures that changed behaviour on purpose were replaced by documented v6 fixtures).
Run: python3 -m http.server 8032 in this folder, open http://localhost:8032/ .
--- Notes below are from v5 and earlier ---
Usher demo site: Lumenet v5 (rename only, 26 Oct 2026; fictional research prototype). Port on Kene's Mac: 8029 (launchd com.civicsphere.usherlumenet5).
RENAME ONLY: the system formerly called Goalpost is now called Usher (Kene's decision, 26 Oct 2026). v5 = Goalpost_Lumenet_v4 (port 8026) with names changed; pages, photos,
profile content, index vectors and decision policy unchanged (ENGINE_VERSION still RESOLVER7_GP3).
  Renamed: goalpost/ -> usher/ (usher.js, usher-engine/-explain/-embedder/-widget.js), goalpost-profile.json -> usher-profile.json, goalpost-index.json -> usher-index.json,
  tools/goalpost-*.js -> tools/usher-*.js, tools/gp_* -> tools/usher_*, site-src/gp_sitegen*.py -> site-src/usher_sitegen*.py, format ids -> usher-profile/0.1 and usher-index/0.1
  (goalpost-profile/0.1 still accepted), window.goalpost/Goalpost -> window.usher/Usher, #goalpost-root -> #usher-root, --gp-* -> --usher-*, data-gp-* -> data-usher-*,
  gp-tip/gp-walking/gp-open -> usher-*; visible text "ask Goalpost", "research prototype for Goalpost", reject message etc. now say Usher.
  Kept: eval/ is the archived evaluation as run (formerly Goalpost; frozen sets, run JSON keys like goalpostCorrectNav and scripts unchanged; .md reports have a note).
  Use the box tools (tools/usher-eval-v2.js) to re-run on this build. Decision-level check vs v4 on tuned + frozen sets: work/eval_gp/usher_rename/ on the build box.
--- Notes below were written before the rename (formerly Goalpost); names in them are as they were then ---
Goalpost demo site: Lumenet v4 (decision policy update, 24 Oct 2026; fictional research prototype). Port on Kene's Mac: 8026.
v4 = v3 pages/widget unchanged + GP3 decision engine. Profile and index unchanged from v3.
--- P5 decision policy (RESOLVER7_GP3 engine, 24 Oct 2026) ---
Goalpost demo built on the GP3 engine (ENGINE_VERSION RESOLVER7_GP3, goalpost-engine.js sha256 3beea34a8e8040445d844487ba443a01a6022968c87fdacb77bc7f13098a293f, identical on all three sites).
Two generic, profile-driven rules added to the decision policy (no site word lists, no per-query rules):
  Rule S (saved-state routing): if one of the signed-in user's saved items (profile account savedStates) is within savedNavWindow 0.03 of the top score and the query is
    not about a third party / general information and does not name a sibling destination, go straight to it (S1/S2); within savedOfferWindow 0.06 ask ONE question
    "Is this about your {label}? If not, choose the closest option." with the saved item first (S3). savedIntentWindow 0.12 bounds intent-only matches.
  Rule T (near-duplicate twins): destinations whose area/destination "role" differs (task vs information, e.g. claim vs cover) and that are mutual nearest neighbours
    (pair similarity >= 0.65, within twinBand 0.10) are twins; event cues in the query pick the task twin, otherwise ONE question naming both twins.
goalpost-explain.js adds one "why here" line for saved-state routes. PARAMS unchanged.
Results (honest; fresh frozen held-out set of 60, run once): eval/GOALPOST_P5_POLICY_RESULTS_2026-10-24.md and eval/p5/. Goalpost does NOT clearly beat the semantic
list or BM25+descriptions on committed-correct (differences not significant); it strongly reduces wrong-destination (p<1e-4). Tests: eval/p5/ and the build box
work/eval_gp/p5/tests/. Bundle rebuilt with tools/gp_bundle.js (this build has no goalpost/src).
--- v3 notes ---
(v3 header) Goalpost demo site: Lumenet v3 (widget update, 19 Oct 2026; fictional research prototype). Port on Kene's Mac: 8023.
v3 = v2 design + two approved widget changes: (1) the command-line panel padding fix (the panel's inner padding and related rules had lived in the R6.3 page
stylesheet and never reached the widget's shadow DOM; now owned by goalpost/goalpost-widget.js: 24 px desktop / 16 px phones, close button in the heading row,
spacing for interpretation, question and option cards, primary/secondary button styles restored); (2) wording: pill and panel heading "I’m here because…",
line under it "Describe your situation. We’ll take you there.", rotating placeholder examples from goalpost-profile.json ui.placeholders.
Decisions are unchanged: goalpost-index.json, search-docs.json, models/ and goalpost-engine/-explain/-embedder.js are byte-identical to v2 (and v1); the profile differs
from v2 only in its "ui" block. Rebuild: tools/gp_sitegen_v3.py (wrapper on the build box: tools/gp_rebuild_v3.sh, which checks all of this).
--- v2 notes ---
Goalpost demo site: Lumenet v2 (visual redesign, 19 Oct 2026; fictional research prototype).
v2 changes ONLY the page markup, CSS and photos. goalpost-profile.json, goalpost-index.json, search-docs.json, goalpost/ and models/ are byte-identical to v1 (Goalpost_Lumenet), so Goalpost decisions are identical.
Rebuild v2: tools/gp_sitegen_v2.py <content_dir> <out_dir> <tpl_dir> <image_dir> (wrapper on the build box: tools/gp_rebuild_v2.sh). Do NOT recompile the index for v2.
Photos: vendor/images/*.webp, all StockSnap CC0 1.0 (licence checked on each source page 19 Oct 2026); credits at /credits.html and vendor/images/credits.json.
--- v1 notes ---
Goalpost demo site: Lumenet (fictional; research prototype built 19 Oct 2026).
Run offline:  cd <this folder> && python3 -m http.server <port>   then open http://localhost:<port>/
Content source: site-src/ (DSL + meta.json + gp_sitegen.py). Rebuild: tools/gp_sitegen.py (see header), then
  node tools/goalpost-validate.js goalpost-profile.json && node tools/goalpost-compile.js goalpost-profile.json --out goalpost-index.json --models models/
Evaluation: eval/GOALPOST_NEWSITES_RESULTS_2026-10-19.md (build-team authored; optimistic). Tools: tools/goalpost-eval.js, tools/gp_site_browser_tests.js.
Brand, products, prices and contact details are invented. Font: Source Sans 3 (SIL OFL). No external requests.
