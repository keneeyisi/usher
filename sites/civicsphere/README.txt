CivicSphere (Usher demo site) v6.1 (30 Oct 2026). Port on Kene's Mac: 8033 (launchd com.civicsphere.usher61; v6 on 8030, 8027 and all other services left unchanged).
v6.1 = v6 with UI, label, wording and accessibility changes ONLY. Engine (usher-engine.js, RESOLVER7_USHER2, sha256 8355fac1...), thresholds, policy, model and index are unchanged.
Changes: visible name is "Usher"; template explanations (usher-explain.js) no longer claim a word match at low confidence (below margin 0.10 they say "The closest match I found on this site is ...")
and saved-item status cues say "check the progress of your X"; 320 px route-strip steps list is keyboard-focusable (axe scrollable-region-focusable fixed); compare page shows keyword search,
a semantic list on the same model (with a "Close call" note when its top two are within 0.03) and Usher side by side; CivicSphere cookie banner remembers the choice and is hidden with ?demo=1.
Decision check (box, 30 Oct 2026): decisions identical to v6 on Insura 297/297, Lumenet 303/303 and the CivicSphere 2,186-query gate; only explanation text differs, by design.
Known limitations kept on purpose (fixing them would mean tuning on the frozen test sets): "what time does Tesco close" -> opening times; "replace a cracked laptop screen" -> phone protection;
holiday cut short by a hospital stay -> medical expenses; one Lumenet question offers a weak third option. Saved state is simulated. No participant study yet.
Tests: work/eval_gp/v61/tests/ (suite exits equal the v6 baseline; axe 0 violations at 320/375 px on checked pages of all three sites, which is not a WCAG conformance claim).
--- v6 README follows ---
CivicSphereNav / Usher · IUI 2027 Demos prototype · USHER_v6 (P7, 29 Oct 2026). Port on Kene's Mac: 8030 (launchd com.civicsphere.usher6; the 8027 service is left unchanged).
v6 = the 8027 build (RESOLVER7_USHER) with the engine file replaced by the frozen P7 engine (usher-engine.js sha256 8355fac1..., ENGINE_VERSION RESOLVER7_USHER2), so all three demo
sites run the same engine code. All new P7 policy flags are OFF in this site's profile; the model (all-MiniLM-L6-v2, 23 MB), index, profile and thresholds are unchanged.
Check (box, 29 Oct 2026): on all 2,186 gate queries the full result JSON (version field excluded), ranked lists and explanations are identical to the 8027 build; lexical fallback
identical. Gate and browser results: tests/results_2026-10-29_USHER2/ (same pass/fail pattern as tests/results_2026-10-26_USHER/).
Run: python3 -m http.server 8030 in this folder, open http://localhost:8030/index.html .
--- Notes below are from RESOLVER7_USHER (8027) and earlier ---
CivicSphereNav / Usher · IUI 2027 Demos prototype · RESOLVER7_USHER (26 Oct 2026). Port on Kene's Mac: 8027 (launchd com.civicsphere.usher).
RENAME ONLY: the system formerly called Goalpost is now called Usher (Kene's decision, 26 Oct 2026). This build is a copy of RESOLVER7_GP3 (port 8024) with names changed;
the decision policy is unchanged (ENGINE_VERSION is still RESOLVER7_GP3 on purpose, so results stay traceable to the frozen Phase 5 engine).
  Renamed: goalpost/ -> usher/ (usher.js, usher-engine.js, usher-explain.js, usher-embedder.js, usher-widget.js, src/), goalpost-index.civicsphere.json -> usher-index.civicsphere.json,
  tools/goalpost-*.js -> tools/usher-*.js, tools/gp_bundle.js -> tools/usher_bundle.js, docs/goalpost-format-reference.md -> docs/usher-format-reference.md,
  profile/index format ids goalpost-profile/0.1 -> usher-profile/0.1 and goalpost-index/0.1 -> usher-index/0.1 (the engine and validator still ACCEPT goalpost-profile/0.1),
  window.goalpost -> window.usher, window.Goalpost -> window.Usher, host alias window.GP -> window.USH, #goalpost-root -> #usher-root, CSS variables --gp-* -> --usher-*,
  data-gp-* -> data-usher-*, classes gp-tip/gp-walking/gp-open -> usher-*, keyframes gpPulse/gpCoachPulse -> usherPulse/usherCoachPulse, session keys goalpost.route/.coach -> usher.*.
  Kept on purpose: build/version labels R7_GP, GP2, GP3 and engine trace text "GP3 rule ..." (they name real earlier builds/policy; changing them would alter result JSON);
  this site's own productName "CivicSphereNav" (profile, unchanged); history files (tests/results_*, tests/gate_*_results.json, RESEARCH_DEVELOPMENT_LOG.md entries before 26 Oct,
  docs/GOALPOST_P5_POLICY_RESULTS_2026-10-24.md, which now carries a 'formerly Goalpost' note).
  Verification (box, 26 Oct 2026): tests/results_2026-10-26_USHER/ (regression gate identical to GP3, decisions identical to GP3 on all 2,186 gate queries).
Run: python3 -m http.server 8027 in this folder, open http://localhost:8027/index.html .
--- Notes below were written before the rename (formerly Goalpost); names in them are as they were then ---
CivicSphereNav / Goalpost · IUI 2027 Demos prototype · RESOLVER7_GP3 (R7_GP3, 24 Oct 2026): R7_GP2 + Phase 5 decision policy. Port on Kene's Mac: 8024.
  R7_GP2 (port 8021) stays the FROZEN reference. GP3 changes ONLY goalpost/goalpost-engine.js (ENGINE_VERSION RESOLVER7_GP3, sha256 3beea34a8e8040445d844487ba443a01a6022968c87fdacb77bc7f13098a293f),
  goalpost/goalpost-explain.js (one added "why here" line for saved-state routes) and the rebuilt bundle goalpost/goalpost.js (tools/gp_bundle.js). Profile, index, models,
  widget and every legacy file are unchanged from GP2.
  Rule S (saved-state routing; thresholds savedNavWindow 0.03 / savedOfferWindow 0.06 / savedIntentWindow 0.12, third-party/general and names-sibling guards) and
  Rule T (near-duplicate twins via profile "role"; inactive on CivicSphere because its profile declares no roles). Details and honest results:
  docs/GOALPOST_P5_POLICY_RESULTS_2026-10-24.md.
  Regression gate (tests/results_2026-10-24_GP3/): G1, G2b (2,186/2,186), G3, G7 PASS. G2 FAILS BY DESIGN because decisions changed on purpose: full-JSON 2,151/2,186,
  discrete 2,162/2,186 identical to R6. G4: r6 set 28/44 (GP2 27/44); tuned 46/46, r3 12/16, r4 19/24, r5 24/35 unchanged. Fixtures: only S36 changed (wrong -> right).
  Seeded variants: 17 destinations changed, all to the saved parking-permit application: 9 wrong->right, 7 right->wrong (generic "saved applications" phrasings), 1 dummy.
--- R7_GP2 notes ---
CivicSphereNav / Goalpost · IUI 2027 Demos prototype · RESOLVER7_GP2 (R7_GP2, 19 Oct 2026): R7_GP + two approved widget changes. Port on Kene's Mac: 8021.
  1. Panel padding fix: the command-line panel (.nbpanel) had no inner padding in R7_GP because R6.3's .nbbody{padding:22px 22px 14px} and related rules lived in the
     page stylesheet (assets/site.css), which cannot reach the widget's shadow DOM. The widget now owns them (goalpost/src/widget.css): 24 px padding on desktop, 16 px on
     phones, the close button in the heading row (44 × 44, never over the input), spacing for the interpretation, question and option cards. The same audit found other
     R6.3 page rules lost in the move and restored them in the widget: .btn.primary / .btn.secondary ("Show me how…", "Continue …", "Do it for me", "Done" were unstyled),
     links, h3 line-height, the yellow compass needle in the pill, the coach-target pulse, the trace offset under the route strip; on phones the mic and "Show my route"
     now share one row under the input (the mic used to wrap onto its own row at 320 px). "saved escape of water claim claim"-style doubled nouns are avoided.
  2. Wording: pill, panel heading and dialog name "I’m here because…" (was "I want to…"); line under it "Describe your situation. We’ll take you there."; rotating
     placeholder examples from profiles/civicsphere.profile.json ui.placeholders ("my bin wasn’t collected", "I’m moving house next month", "I might need planning
     permission", "I’m waiting for my parking permit", "I need a new passport"). See docs/goalpost-format-reference.md (ui keys, rotation rules).
  Decisions unchanged: goalpost-engine.js, goalpost-explain.js, goalpost-embedder.js, models/, the compiled index and every legacy file are byte-identical to R7_GP;
  the profile differs only in its "ui" block (index --check FRESH). Gate G1-G7: 2,186/2,186 full-JSON identical. Tests: tests/results_2026-10-19_GP2/ (+ the new
  panel/wording suite run_p4_panel.js). Run: python3 -m http.server 8021 in this folder, open http://localhost:8021/index.html .
  Engine question text already uses the profile's site.shortName ("Your goal could match more than one CivicSphere destination" on this site, "… Insura destination"
  on Insura); there is no hard-coded "CivicSphere" in the engine, explain or widget code (checked).
Everything below is the R7_GP README; where it says "I want to…", read "I’m here because…".

CivicSphereNav / Goalpost · IUI 2027 Demos prototype · RESOLVER7_GP (R7_GP, 19 Oct 2026): the Goalpost reference build

R7_GP = Goalpost, a portable goal-based navigation layer, with CivicSphereNav as its first demo site. The navigation layer was moved out of the
CivicSphere page code into a site-agnostic engine + widget driven by ONE profile (profiles/civicsphere.profile.json, format goalpost-profile/0.1);
the compile tool (tools/goalpost-compile.js) turns a profile into the semantic index (goalpost-index.civicsphere.json). Decisions are unchanged:
full-JSON identical to RESOLVER6_3 on all 2,186 regression queries (46 tuned, 119 held-out, 21 dummy, 2,000 seeded variants), and the compiled
index is byte-identical in texts and vectors to the R6.3 semantic-index.json (gate G1-G7, tests/gate_g1_g7.js).
  * goalpost/goalpost.js (bundle) = goalpost-engine.js + goalpost-explain.js + widget; goalpost-embedder.js is the ES-module model loader.
  * civicsphere-host.js = the synthetic council website only (pages, task workspaces, BM25 baseline, compare page). The old civicsphere-ui.js,
    civicsphere-explain.js and civicsphere-embedder.js stay in the folder UNCHANGED (and are not loaded) so the gate can prove equivalence against them.
  * docs/goalpost-format-reference.md documents the profile format, the widget API, theming and known limits.
  * Run: python3 -m http.server 8016 in this folder, open http://localhost:8016/index.html . Tests: see RESEARCH_DEVELOPMENT_LOG.md (19 Oct 2026).
  * tests/mini-site is a 6-page second site (Riverside Library, path-mode profile, no CivicSphere code) used to test portability.
Everything below is the R6.3 README, still accurate for the CivicSphere pages and behaviour.

CivicSphereNav · IUI 2027 Demos prototype · RESOLVER6_3 (R6.3, 18 Oct 2026): RESOLVER6_2 + a goal command line entry point and a route strip

R6.3 / RESOLVER6_3: interface change only; the resolver (civicsphere-core/-content/-descriptions/-semantic/-embedder.js),
semantic-index.json and models/ are byte-identical to RESOLVER6_2 (checksums in RESEARCH_DEVELOPMENT_LOG.md), so every decision is unchanged.
Why: the R6.2 floating bottom-right assistant button and docked panel looked like every other website help widget. Changed:
  - Entry: a small pill fixed at bottom-centre of every page, "I want to…" (compass icon, "/" key hint). No speech bubble, no avatar.
    Click it, or press "/" (when not typing in a field), to dim the page and open ONE wide centred input line (a command line, not a chat
    window): no history, no bubbles, no greeting. Enter resolves; Esc, the close button or a click outside closes. The dialog is modal,
    traps Tab focus, restores focus to the pill, and is labelled for screen readers. Below the line: "What I understood" (interpretation
    card, terminology bridge), then ONE committed route or ONE targeted question with 2-3 options. "Compare with site search" is kept.
  - Route strip: when the route starts (after the 1.5 s interpretation, Stop still works) the dialog closes and a slim sticky "Your route"
    strip stays at the top of the page: numbered steps, current step highlighted and advancing with the animated route, a Stop control while
    walking, a Dismiss control, and after arrival "Show me how to find this myself next time" and the saved-application note.
    It has no input box and no message styling.
  - Removed the old assistant header button (it sat beside the site search) and the old assistant label everywhere; the home page button now
    reads "Show my route".
  - Tests: node tests/run_r63_entry.js http://localhost:8008/ [outDir] (pill, "/", Esc, focus trap, dialog wording, route strip, reduced
    motion, mobile, axe-core). run_r62_features.js reads the saved-application note from the strip. Port for this build: 8015 on the Mac.

(R6.2 notes follow; where they describe the docked assistant panel, R6.3 above supersedes them.)

CivicSphereNav · IUI 2027 Demos prototype · RESOLVER6_2 (R6.2): RESOLVER6 resolver + R6.1 redesign + six interaction features

R6.2 / RESOLVER6_2: presentation layer only. The resolver (civicsphere-core/-content/-descriptions/-semantic/-embedder.js),
semantic-index.json, models/, vendor/, tests/fixtures.json and tests/run_browser_tests.js are byte-identical to RESOLVER6 /
RESOLVER6_UI, and every decision, score and option is identical (Node and browser suites, see RESEARCH_DEVELOPMENT_LOG.md).
Everything new is built from the result resolveGoal / resolveSemantic already returns. Changed: civicsphere-ui.js, index.html,
assets/site.css. New: civicsphere-explain.js (window.CivicExplain, pure templates), civicsphere-search.js (window.CivicSearch, BM25).
  1. Interpretation before moving: a deterministic, template-based restatement ("It sounds like you've moved house and want to
     know what a residents' parking permit costs.") shown for 1.5 s before the walk starts (a Stop button cancels). Honesty rules:
     always hedged ("It sounds like"); life-situation clauses only when explicit cue words are in the question (a person must be
     named for a bereavement: "my laptop died" is not one); goals only from explicit intent phrases (weak cues such as "charge" in
     "council charge" are ignored, so the sentence falls back to "need help with ..."); nothing is inferred beyond the result.
  2. Terminology bridge: 'You said "new passport": on this site that's called Document Replacement (in Identity & Records).'
     The quoted phrase is always the user's own words (verbatim from the normalised question) and is shown only if it contains
     a word the official label does not. Page level: the user phrase with the most overlap with the matched page text; section
     level: the intent phrase that selected the section ("have to pay" -> Permit charges).
  3. The route as the main event: an animated walk Home -> topic -> group -> service -> section (600 ms per step) with a route
     strip in the panel, the floating trace card and the page breadcrumb lighting up; prefers-reduced-motion removes animation
     and smooth scrolling. After arrival "Show me how to find this myself next time" replays the path as menu clicks: each link
     is highlighted and focused in turn, with "Do it for me", "Next" and "Stop" (Escape also stops).
  4. One committed answer plus "Why here" (1-2 lines: the closest matching page text, and why this section / how clear the match
     was, from the scores). A clarification is ONE question (the resolver's own targeted clarification message, unchanged) with its
     2-3 options styled as answers; a rejection says so and offers example questions.
  5. Situation awareness: whenever the saved residents' parking application is relevant (destination, clarification option or
     top-3 candidate) the answer adds "You have a saved residents' parking permit application (ref CS-RP-20261008-0427). Continue
     from step 3 of 4, Permit?" with a Continue button. It never changes the decision.
  6. Comparison mode: open with ?compare=1 or the "Compare with site search" link under the assistant (route #versus/<question>).
     Left: a conventional keyword site search (BM25 over the visible text of every routable page: title x3, headings x2, summary,
     facts and section text; ranked results with marked terms and snippets; a port of eval/harness/lib/bm25.js with identical
     ranking on the evaluation's inputs). Right: CivicSphereNav's interpretation, bridge, one answer, animated route, Why here.
     The site search box (#search/<q>) now uses the same BM25 ranking. Honest baseline note: BM25 cannot match words that never
     appear on the site (e.g. "passport"); a production search might add synonym lists, which this baseline deliberately does not.
  Accessibility: one polite aria-live announcer (#announcer) for "Understanding", "Taking you to ...", each step and arrival; the
  visual trace is aria-hidden to avoid double announcements; all controls are buttons/links reachable by keyboard.
  Tests (serve the folder on 8008 first):
    node tests/run_explain_tests.js [--md out.md]     explanation honesty checks over all 165 fixtures x 2 modes (no browser)
    node tests/run_r62_features.js http://localhost:8008/ [outDir]   21 feature checks, axe on 9 states, review screenshots
    node tests/run_browser_tests.js http://localhost:8008/   unchanged official harness

--- R6.1 / RESOLVER6_UI notes ---
CivicSphereNav · IUI 2027 Demos prototype · RESOLVER6_UI (R6.1): RESOLVER6 resolver + "CivicSphere City Council" visual redesign

R6.1 / RESOLVER6_UI: presentation only. Resolver logic, descriptions, the embedding index, the model, thresholds and every
decision are byte-for-byte RESOLVER6 (civicsphere-core/-content/-descriptions/-semantic/-embedder.js, semantic-index.json,
models/, vendor/, tests/fixtures.json and tests/run_browser_tests.js are identical to the RESOLVER6 build). What changed:
  - An original fictional identity: "CivicSphere City Council", an original SVG crest (assets/crest.svg: shield, sphere with
    meridians, harbour waves, star), a teal/marigold palette and Source Sans 3 (SIL OFL 1.1, vendored in assets/fonts/).
    No GOV.UK assets: no crown, no GDS Transport, no GOV.UK Frontend CSS; the stylesheet (assets/site.css) is written from scratch.
  - Header with crest, site search, "My account" (nothing sits next to the site search); primary navigation (collapses to a Menu button on mobile);
    a "Beta: this is a research prototype" phase banner; a non-functional cookie banner; a proper footer (contact, accessibility
    statement, privacy, cookies, feedback).
  - Pages: homepage (ask bar, most-requested tasks, services grid by domain, contact panel); domain and group landing pages;
    service pages with breadcrumbs, an at-a-glance box (cost, how long it takes, who to contact), "Start now" where relevant,
    a Contents list, the RESOLVER6 sections (ids #sec-<i> unchanged) enriched with fees tables, "You'll need" and "You can apply if"
    lists and processing times, a contact box, related links and "Last updated"; information pages (#info/accessibility,
    privacy, cookies, contact, feedback).
  - My account dashboard (#domain/my-civicsphere): In progress (the saved residential parking application, progress bar and
    Continue), Recent activity, Saved applications, Coming up.
  - "I want to…" goal command line (R6.3, replaces the R6.2 docked panel; see the R6.3 section above) with the navigation trace shown at the top of the page and a
    persistent highlight on the destination section ("CivicSphereNav brought you here"); ?debug=1 still opens the debug panel.
  - Synthetic display content lives in civicsphere-site.js (window.CivicSite): fees, processing times, document lists, opening
    hours, team contacts and the test account. It is never read by the resolver. Telephone numbers use Ofcom's drama range
    (01632 960xxx), email addresses use the reserved .example domain and the "CS" postcode area does not exist.
  - Accessibility: skip link, landmarks, one h1 per page, labelled controls, dual-ring focus indicator, keyboard operable
    (Escape closes the assistant), WCAG 2.2 AA colour contrast, reflow down to 320 px, prefers-reduced-motion respected.
    tests/run_ui_checks.js runs the vendored axe-core 4.14.0 (tests/vendor/, MPL-2.0, test-only, never loaded by the app) on key
    pages and takes the review screenshots:  node tests/run_ui_checks.js http://localhost:8008/ [outDir]

--- RESOLVER6 notes (unchanged resolver) ---
CivicSphereNav · IUI 2027 Demos prototype · RESOLVER6 (meaning-based navigation, hardened)

Natural-language navigation layer over CivicSphere, a synthetic public-service website. A small sentence-embedding model runs in
the browser and compares what a goal MEANS with natural-language descriptions of every CivicSphere page and section; RESOLVER3's
keyword/intent evidence only breaks ties between semantically close candidates. Resolution is deterministic (same input, same
model files -> same decision), runs entirely in the browser, needs no backend and works offline.
New in RESOLVER6:
  - Synthetic, original descriptions for EVERY page and section (civicsphere-content.js: 111 generated services across 12 domains,
    each with a summary, what it is for, typical situations/everyday words, and coherent sections replacing placeholders).
  - General fixes: wider "resume" phrasing (e.g. "pick it up again", "where I got to"; weaker cues such as "halfway through" only
    with an application/form word), a generic-action clarify ("I want to appeal" -> which appeal?), an off-topic null class
    (poems, recipes, sport, holidays abroad, ... are rejected), and contradicting profile terms block keyword boosts.
  - Ranked-list mode for evaluation: CivicCore.rankDestinations(queryVector, index, {k}) (no UI change).
  - Model trial (bge-small-en-v1.5, e5-small-v2): all-MiniLM-L6-v2 kept (see the development log).

Run locally (from this folder):
  python3 -m http.server 8008
  open http://localhost:8008
  Debug view (semantic candidates, similarities, section scores): http://localhost:8008/?debug=1
  Force the keyword fallback (for demos/tests):                    http://localhost:8008/?semantic=off
Opening index.html directly from disk (file://) is not supported for the model; it falls back to keyword matching.

Meaning model (all files are local; nothing is fetched from the internet):
  models/Xenova/all-MiniLM-L6-v2/   all-MiniLM-L6-v2, ONNX, quantised q8 (23 MB), Apache-2.0. 384-d, mean pooled, L2-normalised.
  vendor/transformers.min.js        transformers.js 3.8.1 (Apache-2.0)
  vendor/ort-wasm-simd-threaded.jsep.{mjs,wasm}  ONNX Runtime Web 1.22.0-dev (MIT), single-threaded WebAssembly
  semantic-index.json               precomputed embeddings of 729 texts (309 page, 404 section, 16 off-topic prototypes), built in Node
The browser only embeds the query. Cold load from python http.server in headless Chromium: about 1.1-1.2 s (sequential runs);
the panel shows "Preparing… x%" meanwhile and the UI stays usable. A query asked during loading waits for the model (at most
30 s, ?modelwait=ms to change); if the model is slower or cannot load, the RESOLVER3 keyword resolver answers and a notice says so.

Ranked-list mode (semantic-search baseline; same model, descriptions and destination scoring rule, no thresholds/intents/rules):
  Browser: CivicCore.rankDestinations(await CivicEmbedder.embed(q), CivicEmbedder.index, { k: 10 })
  Node:    node tools/rank.js -k 10 [--json] "I need a new passport"
  Returns [{rank, id, title, score, bestText, bestSection, path}], score = 0.7 x best + 0.3 x second-best description cosine.

Files:
  index.html                  R6.1: static page frame (skip link, cookie banner, header, phase banner, footer, assistant panel)
  civicsphere-ui.js           R6.1: pages, hash router, visible navigation, task assistance, model status, fallback (logic ported
                              unchanged from the RESOLVER6 index.html; only page templates are new)
  civicsphere-site.js         R6.1: synthetic display content (fees, times, documents, contacts, account). window.CivicSite
  assets/                     R6.1: site.css, crest.svg, fonts/ (Source Sans 3, OFL-SourceSans3.txt, SHA256SUMS.txt)
  tests/run_ui_checks.js      R6.1: axe-core checks + review screenshots (tests/vendor/axe.min.js, axe-core-LICENSE.txt)
  civicsphere-content.js      R6: synthetic content for the generated services (summary, about, sections). window.CivicContent
  civicsphere-core.js         Catalogue (150 services, 497 sections), validation, intents, RESOLVER3 lexical resolver (fallback),
                              rankDestinations (ranked-list mode). window.CivicCore
  civicsphere-descriptions.js Descriptions for the hand-built services, section descriptions, off-topic prototypes. window.CivicDescriptions
  civicsphere-semantic.js     Pure resolver resolveSemantic(query, queryVector, index) + model registry. window.CivicSemantic
  civicsphere-embedder.js     ES module: loads the vendored runtime + model + index, exposes window.CivicEmbedder
  tools/build_embeddings.js   Rebuild semantic-index.json after editing descriptions:  node tools/build_embeddings.js
  tools/node_embedder.js      Node embedder (same model file, tokenizer and ONNX Runtime WebAssembly engine as the browser)
  tools/rank.js               Ranked-list CLI (see above)
  tools/echo_audit.js         Word n-gram overlap between held-out queries and all descriptions (wording-echo check)
  tests/fixtures.json         165 labelled fixtures: 46 tuned, 44 heldout_r6 (fresh, frozen by SHA-256 before any RESOLVER6 work),
                              35 heldout_r5, 24 heldout_r4, 16 heldout_r3 (earlier held-out sets; looked at during later development)
  tests/calibrate.js          Threshold grid search on the TUNED fixtures only
  tests/model_trial.js        Model comparison on tuned + earlier sets (never reads heldout_r6): CIVIC_MODEL=bge-small node tests/model_trial.js
  tests/run_core_tests.js     Node harness: node tests/run_core_tests.js [--lexical] [--verbose] [--json out.json]  (SETS=tuned,... to restrict)
  tests/run_browser_tests.js  Real-UI harness (Playwright + Chromium), server running: node tests/run_browser_tests.js http://localhost:8008/
                              Every fixture through the UI, five flagship demo journeys (screenshots/flagship/), loading/timeout/
                              fallback scenarios, offline check (external requests blocked and counted), Node-vs-browser parity.
  package.json                Dev tooling only: npm install, then npm test / npm run test:browser / npm run build-index / npm run rank
  RESEARCH_DEVELOPMENT_LOG.md Formative development log (RESOLVER6 entry: 9 October 2026)

How a goal is resolved (resolveSemantic):
  1. Similarity: cosine between the query and every description; destination score = 0.7 x best + 0.3 x second-best.
  2. Intent consistency (RESOLVER3 intents), then the tie-breaker: candidates within 0.05 of the best get up to ±0.08 from RESOLVER3
     evidence; a profile's contradicting terms (R6) turn it into a penalty and block word-overlap boosts.
  3. Rules: no content words -> ask for detail; ambiguous "tax" -> ask which tax; best score < 0.25, or an off-topic prototype closer
     than any CivicSphere description (R6) -> not a CivicSphere goal; action-only goal (R6) -> ask which service (up to 3 options);
     resume intent -> the saved application for that service if one exists, otherwise My CivicSphere -> In Progress.
  4. Navigate if score >= 0.38 and margin >= 0.02 over the runner-up; otherwise clarify with up to 3 options.
  5. Section: section similarity + intent/keyword bonuses + RESOLVER3 discriminative label words.
  Thresholds were calibrated on the tuned fixtures only (tests/calibrate.js) and frozen before heldout_r6 was run.

Results (9 October 2026, Node and browser identical; details and authorship caveats in the development log):
                     RESOLVER3   RESOLVER4   RESOLVER5   RESOLVER6
  tuned (46)           40          42          42          46     (R3-R5 predate the 8 R6 tuned additions)
  heldout_r6 (44)      12          24          23          27     <- fresh set, frozen before RESOLVER6
  heldout_r5 (35)      11          19          20          24     (failures studied during R6 development)
  heldout_r4 (24)       2          17          16          19     (failures studied during R6 development)
  heldout_r3 (16)      14          10          11          12
All held-out sets were written by the same developer/assistant team that built the resolver, so they are not independent user data.

Synthetic account area: My CivicSphere → Activity & Records → In Progress holds one saved, unsubmitted Residential Parking
Application (synthetic test state only). "Continue application" reopens the task at the saved step (#task/parking/2/resumed).

An optional interpretation endpoint can still be enabled with window.CIVICSPHERE_LLM_ENDPOINT (1.8 s timeout, validated,
local resolver always the fallback). It is off by default and not used in any reported result.

Important:
- CivicSphere is a synthetic public-service environment; all service content is synthetic and original.
- The confidence value is an internal ranking signal (similarity + margin), not a calibrated probability.
- The final authoritative action (submit, pay, sign) remains human-controlled.
- RESEARCH_DEVELOPMENT_LOG.md records formative development tests and must not be presented as formal user-study evidence.
