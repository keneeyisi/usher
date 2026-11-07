# CivicSphereNav formative development log
> **Name note (26 Oct 2026):** the system was renamed from **Goalpost** to **Usher**. Entries before 26 Oct are kept as written (formerly Goalpost).


This log records exploratory prototype tests. These are development observations, not formal user-study results.

## Iteration 1: search-like resolver
- Test: “I've just moved into a new house and need to sort out parking. I want to know what I'll have to pay.”
- Observed: multiple plausible destinations were returned.
- Interpretation: resolver behaved too much like conventional search.
- Change: goal/context/information-need interpretation and hierarchy-aware resolution.

## Iteration 2: goal-oriented navigation
- Parking query resolved to Residential Parking → Permit Charges.
- Natural-language variants also resolved to the same service.
- Visible navigation moved through the CivicSphere hierarchy and highlighted the destination section.

## Iteration 3: false-positive discovery
- Test: “I want to make my house bigger at the back. What do I need to do before I start building?”
- Observed before hardening: Residential Parking, 76% confidence.
- Interpretation: confidence score was not sufficient protection against semantic/domain mismatch.
- Change: semantic consistency checks and confidence-aware routing.

## Iteration 4: resolver hardening
- Extension query resolved to Development Approval, >90% confidence.
- Parking query remained Residential Parking → Permit Charges, >90% confidence.
- Interpretation: hardening removed the observed cross-domain false positive without breaking the two validated cases.

## Iteration 5: cross-domain formative tests
- Lost job + financial support: initially blocked as low confidence.
- Renting + landlord responsibilities: initially blocked as low confidence.
- Interpretation: the scoring model was too conservative for legitimate natural-language goals in some domains.
- Change: added stronger goal profiles for financial support and housing repairs/tenancy support, with richer contextual cues.

## Iteration 6: ambiguity test
- Test: “How much tax should I pay?”
- Observed: Household Payment Assistance.
- Interpretation: the query does not specify a tax type. The system should not treat a generic tax query as a fully specified household-tax goal.
- Change: household tax profile now requires contextual evidence before automatic navigation.
- Expected behaviour: clarify when tax type is underspecified; navigate directly when household-tax context is present.

## Current formative regression cases
1. Moved house + parking + cost → Residential Parking → Permit Charges.
2. House extension + approval → Development Approval → Do I need approval?
3. Lost job + financial support → Benefits & Support → Financial Support.
4. Renting + landlord responsibilities → Housing & Property → Housing Repairs.
5. Generic tax query → clarification rather than an unsupported specific tax destination.

## Important methodological note
These tests were used to develop and debug the prototype. They must not be reported as formal participant-study findings. The final evaluation should use a predefined benchmark set, fixed prototype version, and separately recorded success criteria.


## Resolver 2 local-hosting integration finding
- During local testing on 7 October 2026, `python3 -m http.server` returned HTTP 501 for POST requests to `/api/interpret`.
- The interface remained in the `Interpreting goal` state instead of reliably completing the local resolution path.
- The implementation was changed so the deterministic local goal-resolution model is the primary demonstration path. An optional LLM endpoint is now opt-in, has a bounded 1.8-second timeout, and automatically falls back to the local resolver on failure.
- This ensures that the research prototype remains demonstrable without an external API while preserving the hybrid architecture as an optional extension.


### 7 October 2026: Runtime Resolver Hardening
- Local testing exposed a runtime path in which the Benefits & Support financial-support goal profile did not resolve to an actual catalogue destination.
- Generic tax terms such as "pay" and "payment" could also compete with a broader financial-support goal.
- The resolver was revised to use a concrete Financial Support destination, require explicit tax context for household-tax assistance, and wrap resolution in an error boundary so an exception cannot leave the interface indefinitely at "Interpreting goal".
- The five formative regression cases were re-run against the revised local resolver.


## Runtime hardening: instrumentation isolation

The resolver's deterministic path was verified independently against the formative benchmark set. A further runtime-hardening issue was identified in the instrumentation layer: malformed or unavailable localStorage data could throw during event logging and interrupt an otherwise successful navigation. Logging is now non-blocking and cannot interrupt resolution or navigation. The same financial-support goal was re-run with deliberately malformed event storage and resolved successfully to Benefits & Support → Financial Support → How to apply.


## 9 October 2026: Resolver 3 (regression-harness rebuild)
Formative development work. These are developer-run automated tests, not participant results.

**Diagnosis (Resolver 2 STABLE, before any change).** The headless-browser run reproduced the user's 8/10 manual results.
- Test 11 (resume a saved parking application) navigated confidently, at 97%, to Residential Parking → How to apply. No saved-application state or destination existed.
- Failure A (household payments): the Financial Support profile won on generic words alone ("help", "need"), with 0 context cues. Payment Assistance had no context cue for "household payments". Confidence was 0.76, below the 0.90 cut-off.
- Failure B (complaint follow-up): "complained" did not match the word-boundary term "complain", so the complaint profile never entered the goal model. The lexical fallback never navigates.
- Test 7's section was chosen only because "how" was substring-matched in "how much". Test 2's section 1 was "Eligibility", not landlord responsibilities.
- 18 service IDs were duplicated.

**Changes**
- The catalogue, goal profiles and a pure `resolveGoal(q)` were moved into `civicsphere-core.js`, shared by the browser and Node.
- Service IDs are now unique. The catalogue, every destination ID and every section index are validated on page load and before navigation.
- Approved catalogue additions:
  - Formal Complaint → "Not happy with the response?", linking to Complaint Review and Service Appeals.
  - Vehicle Registration → "Fees and charges".
  - My CivicSphere → Activity & Records → In Progress, with a synthetic saved Residential Parking Application. Resuming opens the task at the saved step.
  - Housing Repairs was given real sections, including "What your landlord must fix".
- Resolver:
  - Light stemming, plus contraction and entity normalisation.
  - Explicit intents: resume, follow-up, status, new complaint, payment difficulty, pay, cost, documents, requirements, eligibility, how-to, responsibility.
  - Generic words count only alongside topic or situation evidence.
  - Contradicting evidence is penalised.
  - Sections are chosen from section intents, keywords and discriminative label words.
  - Confidence is based on evidence plus the margin over the runner-up.
  - Clarifications offer up to three options. Low-specificity input asks for detail, and unrelated input is rejected.
- `?debug=1` shows the full scoring breakdown.

**Evaluation.** There are 53 fixtures:
- 37 tuned: tests 1–11, the flagship journeys, and adversarial and near-miss cases.
- 16 held-out paraphrases, written before the resolver was implemented and not used for tuning.

**Results**

| Suite | Tuned | Held-out | Notes |
|---|---|---|---|
| Node harness | 37/37 | 14/16 | |
| Browser harness (real UI) | 37/37 | 14/16 | URL, navigation trace and section highlight checked; 7/7 extra scenarios (resume end to end and after reload, clarification option, account and invalid routes, debug view); 0 console errors; 0 stuck states |

- Held-out failures: the correct page, but no section, for "who can I take this to?" after a rejected complaint and "whose job is it to sort it?" for damp in a rented flat. Both are phrasing gaps in the follow-up and responsibility intents.
- One held-out case ("adding a second storey… where I can park") correctly avoided parking but clarified between the two parking services instead of offering Development Approval. "Storey" is not in the vocabulary.

**Changes to previously reported routes**
- Test 7 now goes to Vehicle Registration → Fees and charges (section 3, previously section 2).
- With the constructed Test 1 wording, the section is "What support is available" (section 0) rather than "How to apply" (section 1). Both are accepted.

**Caveat.** The held-out set was written by the same developer who wrote the vocabulary, so it is not a fully independent test of generalisation. A participant-generated paraphrase set is still needed.

## 9 October 2026: Resolver 4 (meaning-based navigation)
Formative development work. These are developer-run automated tests, not participant results.

**Motivation.** Kene's manual test of RESOLVER3: "I need a new passport" got "Clarification needed" (low specificity: "passport" was not in the
vocabulary), although the intended destination, Document Replacement, is obvious to a person. The goal is smart navigation, not keyword search.

**Approach**
- A sentence-embedding model runs in the browser: all-MiniLM-L6-v2 (ONNX, q8, 23 MB) via transformers.js 3.8.1 and ONNX Runtime Web
  (single-threaded WebAssembly). Library, runtime and model are vendored; no CDN at runtime (the browser harness blocks and counts any
  external request).
- Every routable page (123) has 1–3 natural-language descriptions of the service: everyday goals, situations and synonyms (passport / ID card /
  driving licence → identity document; sofa / fridge → large-item collection; extension / loft / conservatory / extra storey → development
  approval). The 14 core services also have hand-written section descriptions. Catalogue embeddings (745 texts) are precomputed offline in Node
  into semantic-index.json, so the browser embeds only the query.
- Destination score = 0.7 × best + 0.3 × second-best description similarity. Templated section texts of generated pages ("Fees and charges
  (Parking Charges)") restate only the title, so they choose sections but are not destination evidence.
- RESOLVER3 intent features act as structural signals: the profile intent weights (e.g. difficulty +14 for Payment Assistance, −12 for paying
  the bill) × 0.006 adjust destination scores. Resume intent routes to the saved application for that service, or to In Progress. An ambiguous
  "tax" asks which tax. Input with no content words asks for more detail. Sections are chosen by similarity plus intent and keyword bonuses.
- Decision policy kept: navigate on a strong match with a margin, clarify with ≤ 3 options when close or weak, reject unrelated input.
- Fallback: if the model cannot load (or is slower than 30 s), RESOLVER3's lexical resolver answers and a small notice says so.

**Fixtures**
- Kept all RESOLVER3 fixtures. Added T12 "I need a new passport" (tuned, navigate → Document Replacement).
- Added 24 new held-out everyday paraphrases (heldout_r4), two per domain across all 12 service domains. Frozen before any RESOLVER4
  description or code was written: sha256 of json.dumps(fixtures, sort_keys=True) = 16b92fb77733598f9f1b52085e7e8bf6a306e01ad281e690f76d2fe0630b0dc5
  (re-verified unchanged after the evaluation). RESOLVER3's held-out set is kept as heldout_r3.
- Calibration (tests/calibrate.js) reads only the tuned fixtures. Grid over navigateMin, marginMin, clarifyMin, sectionMin and intentScale;
  best 37/38 on a plateau of navigateMin 0.35–0.38, marginMin 0–0.01, clarifyMin 0.20–0.30, sectionMin 0.55, intentScale 0.006. Chosen:
  the conservative end (0.38, 0.01) and the clarifyMin median (0.25). PARAMS were frozen before either held-out set was run.

**Engineering finding (Node embeddings).** transformers.js's Node backend (onnxruntime-node, native CPU) returned non-deterministic vectors
for the q8 model: the same text embedded twice gave cosine as low as 0.0, even single-threaded, and padded batches differed from single
inputs. The first calibration (17–20/38) was an artefact of this. The Node embedder now uses the transformers.js tokenizer with ONNX Runtime
*Web* (the same WebAssembly engine as the browser), one text at a time. Repeated runs are identical, and the browser harness confirms parity:
over all 78 fixture queries the minimum cosine between the Node and browser query vectors is 0.9999996, and decisions, destinations and
sections are identical (0 mismatches).

**Results (frozen PARAMS; Node and browser identical)**

| Set | RESOLVER4 (semantic) | RESOLVER3 (lexical) |
|---|---|---|
| tuned (38) | 37/38 | 37/38 (fails T12 passport) |
| heldout_r4 (24, new) | **17/24** | 2/24 |
| heldout_r3 (16) | 10/16 | 14/16 |

- "I need a new passport" → navigate to Document Replacement (score 0.516, margin 0.173, 84%).
- Browser harness: every fixture through the real UI, with offline enforcement. 12/12 scenarios passed: resume end to end and after reload,
  clarification option, account and invalid routes, catalogue validation, debug view, passport in debug view, loading state then semantic
  answer, model slower than the wait limit (lexical answer with notice, next query semantic), `?semantic=off` fallback, and model file missing
  (404) fallback. 0 console errors, 0 stuck states.
- Model load (headless Chromium, local python3 -m http.server, fresh context, cold): 1.4–1.7 s, median 1.5 s over 5 sequential loads;
  query embedding 16–36 ms. Under the harness's 4 parallel contexts: median 2.1 s, p90 2.8 s, one outlier 18 s (four 46 MB downloads at once
  from the single-threaded Python server); no query got stuck.

**Remaining failures**
- Tuned T04 ("just moved into a new house… sort out parking… what I'll have to pay"): clarifies between Visitor Parking, Residential
  Parking and Parking Charges (top three within 0.005). The intended answer is offered but not navigated to.
- heldout_r4 (7):
  - Five clarifications that offer the right page among the options: N03 gas cut off / nothing to eat (weak, 0.30); N12 faulty kettle
    refund (Trading Standards second to Formal Complaint); N15 dad can't cope at home; N16 exhausted carer (Employment Support first);
    N21 lost driving licence (Document Replacement 0.394 vs Business Records 0.391, because "licence" pulls towards business licensing).
  - Two wrong pages: N02 council tax discount for living alone → Payment Assistance; N18 teenager after school → School Place.
- heldout_r3 (6), regressions against RESOLVER3:
  - H04 residents' permit price and H05 lost ID card needs: close clarifications between sibling services.
  - H07 "who can I take this to?" after a rejected complaint → Challenge a Decision, not Formal Complaint.
  - H10 damp: no section.
  - H13 restaurant: clarifies instead of rejecting, because the generic "local activities" pages are semantically near.
  - H15 complaint about roads: clarifies between road pages.
  RESOLVER3's keyword profiles were hand-tuned around these services, which the semantic resolver does not reuse except for intents.

**Interpretation.** Meaning-based matching generalises much better to new everyday wording (17/24 vs 2/24), at the cost of some precision
between sibling services where RESOLVER3's hand-written keyword profiles were sharper (heldout_r3 10/16 vs 14/16). Most RESOLVER4 misses
are clarifications that include the right page, not wrong navigations (8 of 13 held-out misses offer the intended page; 3 navigate wrongly).
Not done, to keep held-out honest: no description or threshold was changed after the held-out sets were run. A combination (e.g. RESOLVER3
evidence as a tie-breaker between close semantic candidates) is a promising next step but would need a fresh held-out set.

**Caveats**
- The heldout_r4 queries were written by the developer, before the descriptions but by the same person. While writing descriptions the
  developer knew the held-out wording. Some natural service phrases overlap held-out queries (street party, change of name after marriage,
  objecting to building plans, older people's bus pass, dangerous structure, refused claim). Several descriptions were deliberately reworded
  to avoid copying held-out phrasing, but some optimism is likely. A participant-generated paraphrase set is still needed.
- heldout_r3 was seen during RESOLVER3 development, so it is only semi-held-out for RESOLVER3. It was not used for RESOLVER4 tuning.
- Similarity scores and confidence are ranking signals, not calibrated probabilities.

## 9 October 2026: Resolver 5 (semantic + lexical tie-breaker)
Formative development work. These are developer-run automated tests, not participant results.

**Motivation.** RESOLVER4 generalised to new wording far better than RESOLVER3. It lost precision between sibling services
where RESOLVER3's hand-written profiles were sharp, and it missed Test 4. Kene approved a hybrid: semantic similarity stays primary,
and RESOLVER3 evidence only breaks ties between close semantic candidates.

**Fresh held-out set (heldout_r5), written before any RESOLVER5 code**
- 35 new everyday paraphrases covering all 12 service domains plus My CivicSphere, with no wording reused from earlier sets:
  - 29 should navigate. These include six near-miss pairs: monthly instalments vs a copy of last year's bill; a ceiling leak vs a
    kept deposit; a visiting brother's van vs a permit-only street; someone else's dumped mattress vs booking a washing-machine
    collection; a stolen ID card vs a birth record "for his passport application"; and a care assessment vs care charges.
  - 3 should clarify ("I want to appeal", "How much does it cost?", a council letter I don't understand).
  - 3 should be rejected (football, a poem, flights).
- Frozen: sha256(json.dumps(heldout_r5, sort_keys=True)) = 1ae1bbd55334bcd5f40218527c9eb6e0fe938cf7446830c9a90800c6494a852b,
  re-verified unchanged after evaluation. Copy: work/heldout_r5_fixtures_frozen_copy.json.

**Method**
- Tie-breaker: after semantic scoring (unchanged from RESOLVER4), only candidates within `band` of the best score are adjusted.
  Each gets lexWeight × RESOLVER3 evidence in [−1, 1]: the goal-profile score / 30, −0.5 if the profile's exclusion terms fire, or
  word overlap with title/group/sections at half weight. With a single candidate in the band, nothing changes, so a clear semantic
  winner can never be overturned by keywords.
- Sections: RESOLVER3's discriminative label-word hits are added (+0.04 each) to the semantic section score.
- Descriptions, model, index, the decision policy, the loading behaviour and the fallback are unchanged from RESOLVER4.
- Calibration (tuned only): a grid of 600 settings over band, lexWeight, marginMin, navigateMin and sectionLabelBonus gave 38/38 on a
  plateau of 120 settings (band 0.02–0.08, lexWeight 0.03–0.10, marginMin 0.01–0.03, navigateMin 0.35–0.38).
  - Chosen: band 0.05, lexWeight 0.08, marginMin 0.02, navigateMin 0.38, sectionLabelBonus 0.04 (clarifyMin 0.25 kept). Every
    neighbouring setting also gives 38/38. lexWeight 0.05 was preferred on paper but left Test 4 at margin 0.019.
  - PARAMS were frozen before any held-out set was run.

**Results (frozen PARAMS; Node and browser identical, 113/113 decisions)**

| Set | RESOLVER3 | RESOLVER4 | RESOLVER5 |
|---|---|---|---|
| tuned (38) | 37 (fails T12 passport) | 37 (fails T04) | **38** |
| heldout_r5, fresh (35) | 11 | 19 | **20** |
| heldout_r4 (24) | 2 | 17 | 16 |
| heldout_r3 (16) | 14 | 10 | 11 |

- Gate met: every original core test passes (Tests 1–11 including Test 4, flagships and adversarial cases), with no tuned regression.
  - Test 4 now goes to Residential Parking → Permit charges. Residential (profile 38) +0.08 and Visitor (profile 18) +0.048 turn a
    0.0015 semantic lead for Visitor Parking into a 0.031 margin.
- Compared with RESOLVER4 across the three held-out sets (75 fixtures), RESOLVER5 fixed H05 (lost ID card) and R32 (council letter
  → clarify) and broke N10. In N10, "object to neighbour's extension" now goes to Development Approval, because the RESOLVER3
  profile keyword "extension" boosts it inside the band. The net held-out gain is +1 (47/75 vs 46/75), which is within noise.
- Browser harness (real UI, external requests blocked):
  - every fixture passed through the UI;
  - 13/13 scenarios passed, now including Test 4 in the debug view;
  - 0 console errors, 0 stuck states, no external requests;
  - model load median 1.5 s (1.2–2.3 s).

**Remaining failures on the fresh set (15)**
- Six weak or close clarifications that still offer the right page: R05 ceiling leak, R07 loud neighbours, R11 sold motorbike,
  R15 fake bag, R22 pizza boxes, R27 loose railings. Several are the only option offered but score below navigateMin 0.38.
- Six wrong navigations:
  - R01 monthly instalments → Household Charge Payment;
  - R08 brother's van → Temporary Accommodation ("staying with me");
  - R13 empty site proposals → Traffic Reports;
  - R23 dumped mattress → Housing Repairs;
  - R25 stolen wallet/ID card → Identity Support, not Document Replacement;
  - R29 "filled in half of a parking permit form… get back to it" → Residential Parking. The resume intent misses "get back to it",
    a gap in the RESOLVER3 intent phrases.
- R12 garden room: clarifies with unrelated options.
- R30 "I want to appeal": navigates to Benefits Appeals instead of asking which appeal.
- R34 poem about autumn: clarifies (Climate & Nature) instead of rejecting.
- Near-miss pairs: 1 of 6 fully correct (care assessment vs care charges). In each of the other five, one half passed (R02 last
  year's bill, R06 deposit, R09 permit-only street, R24 washing-machine collection, R26 birth record, not identity replacement) and its
  partner failed (R01, R05, R08, R23, R25).
- heldout_r4 and heldout_r3 failures are as in RESOLVER4, minus H05 and plus N10. H04 now reaches Residential Parking but the
  Eligibility section, not Permit charges.

**Interpretation and caveats**
- The tie-breaker achieves what it was designed for on the tuned set (Test 4, sibling disambiguation) at negligible held-out cost.
  It does not materially improve generalisation: 20/35 vs 19/35 on the fresh set is within noise. Most remaining misses are weak
  semantic matches (navigateMin is conservative for unseen wording) or missing description coverage, not ties.
- RESOLVER3 still beats both semantic resolvers on its own held-out set (14/16), which was written alongside its vocabulary.
- All held-out sets were written by the developer, who also wrote the descriptions and RESOLVER3's vocabulary, so results are likely
  optimistic and not independent. A participant-generated paraphrase set is still needed before any claims beyond formative
  development. heldout_r4 has now been seen twice and heldout_r3 three times, so only heldout_r5 is a first-look result, and it has
  now been seen too.
- No description, threshold or rule was changed after the fresh set was run.

## 9 October 2026: Resolver 6 (hardening for the IUI 2027 Demos track)
Built from RESOLVER5 in a new folder; RESOLVER3/4/5 builds and packages are untouched (backup:
backups/work_build_before_R6_20261009_1224.tgz; every edited R6 file was backed up before each change).

**Order of work (evaluation discipline).** (1) A fresh held-out set, heldout_r6 (44 queries: 37 navigate across all domains incl.
3 near-miss pairs and 2 task-state items, 3 underspecified -> clarify, 4 unrelated -> reject), was written and frozen FIRST:
sha256(json.dumps(fixtures, sort_keys=True)) = 14a19904bd32d06308ef059881e54ce9fdd9d9712272a61ff2bda0cb599e20c0, 12:24 Europe/London,
before any R6 description, code or tuning; the same hash was re-verified after evaluation. (2) Descriptions, fixes, model trial and
calibration used only the tuned set and the earlier held-out sets; `SETS=` in run_core_tests.js kept heldout_r6 from being run.
(3) Parameters and code were frozen (hashes in work/r6_frozen_before_heldout_r6.txt, 12:38) and only then was heldout_r6 run once.
The only later change is UI-only (index.html shows the hand-written section descriptions instead of generic filler text on the
hand-built pages); it does not affect resolution (Node and browser results are identical).

**Descriptions (goal 1).** civicsphere-content.js gives all 111 generated services (12 domains) a summary, 1-3 "about" paragraphs
(what the service is for, typical life situations, everyday words) and coherent synthetic sections (replacing "Overview /
Eligibility / Apply" placeholders); the 7 generated copies of hand-built services reuse the hand-built text. The 6 remaining
templated sections of hand-built services and 5 thin hand-built pages got hand-written text. Index: 729 texts (309 page, 404
section, 16 off-topic prototypes); no templated section texts remain. Echo audit (tools/echo_audit.js, output in
work/r6_echo_audit.txt): four R6 sentences shared distinctive wording with heldout_r6 queries and were reworded before the index
was built (annual statement "paid towards", exemptions "full-time", utility "help with energy", course funding "grants to help");
one visitor-parking phrase ("home carer") was removed for the same reason. Remaining overlaps are service names or generic
phrasing ("council charge", "parking permit", "to report a"). One tuned-set fix: the Parking Charges summary was made specific
to public car parks and fines (it had overtaken Residential Parking for T04).

**General fixes (goal 2).** Not per query:
- Resume phrasing: strong cues added to the resume intent ("get back to it", "pick it up again", "where I got to", "filled in
  half", "draft", ...); weaker cues ("halfway through", "go back to", "not completed", ...) count only together with an
  application/form/permit word, so "get back to work" is not resume (tuned T20 checks this).
- Generic action -> clarify: a goal whose only content words are an action family (appeal/challenge/dispute/object/complain,
  pay, apply, book, report, cancel, request) plus empty objects ("a decision", "something") asks which service, offering the
  three closest services. reason = generic_action.
- Off-topic null class: 16 category descriptions (creative writing, cooking, eating out, entertainment, sport, holidays abroad,
  shopping, trivia, school work, world politics, tech support, small talk, jokes, weather/horoscopes, finance products,
  relationships) are embedded like destinations but never navigable; if one is closer than any CivicSphere description
  (and >= 0.30), the goal is rejected (reason = off_topic).
- Keyword boosts: a goal-profile's contradicting terms now always make its lexical evidence a penalty and block the word-overlap
  boost (R5 let word overlap boost a contradicted profile); "object/objection/oppose" were added as contradicting terms for
  Development Approval. Two stricter variants (profile boost only with topic + context evidence; word overlap only with >= 2
  words) were tried and rejected because they lost seen-set items without fixing anything (kept as switches, off).
- Authorship caveat: these weaknesses were chosen from failures on heldout_r5/r4 (R29, R30, R34, N10), and the off-topic categories
  and clarify gate were designed knowing that heldout_r6 contains generic-clarify and off-topic items (the R6 set was written by
  the same team). The categories are broad and none of the heldout_r6 wording was used, but heldout_r6's clarify/reject items are
  therefore not a blind test of these features.
- 8 tuned fixtures were added before calibration to cover the fixes (T13-T20: two resume phrasings, dispute/payment clarify,
  story/trivia reject, commenting on next-door plans, back to work is not resume).

**Ranked-list mode (goal 6).** CivicCore.rankDestinations(queryVector, index, {k, wMax, sectionTextPenalty}) returns the top-k
destinations with scores using the same model/descriptions and the same 0.7/0.3 aggregation, without intents, tie-breaks,
thresholds or rules; tools/rank.js wraps it for Node. The UI is unchanged.

**Model trial (goal 3).** bge-small-en-v1.5 and e5-small-v2 (q8, 34 MB each) were run with the same descriptions; each was
calibrated on the tuned set with a grid scaled to its similarity range. bge-base was not tried (q8 ~110 MB alone; ZIP would exceed
~120 MB). Node/browser parity for both trial models: cosine >= 0.9999997.

| | MiniLM-L6 (kept) | bge-small-en-v1.5 | e5-small-v2 |
|---|---|---|---|
| ONNX size / est. ZIP | 23.0 MB / ~23 MB | 34.0 MB / ~31 MB | 34.0 MB / ~31 MB |
| cold load, python http.server (5 sequential runs) | 1.11-1.17 s | 1.26-1.36 s | 1.21-1.32 s |
| ranked list tuned MRR (hit@1 of 36) | 0.884 (30) | 0.948 (33) | 0.907 (30) |
| ranked list heldout_r5 / r4 / r3 MRR | 0.817 / 0.887 / 0.800 | 0.891 / 0.883 / 0.860 | 0.835 / 0.909 / 0.905 |
| full resolver: tuned / r5 / r4 / r3 | 46 / 24 / 19 / 12 | 46 / 24 / 17 / 13 | 44 / 21 / 11 / 14 |

Decision: keep all-MiniLM-L6-v2. bge-small ranks better, but end-to-end it does not improve the tuned set (both 46/46) and it
hurts heldout_r4 (19 -> 17) plus the resume/off-topic cases, because the resolver's constants were designed on MiniLM's scale.
Details: work/r6_eval/model_trial_summary.md.

**Calibration.** tests/calibrate.js on the 46 tuned fixtures (grid of 2,592 settings incl. the off-topic thresholds): best 46/46,
450 settings on the plateau; every R5 value and offTopicMin 0.30 / offTopicMargin 0 lie on it, so PARAMS were kept.

**Results (Node; browser identical, 0 decision mismatches).** Earlier resolvers run from their own builds on the same fixtures file.

| Set | R3 (lexical) | R4 | R5 | R6 |
|---|---|---|---|---|
| tuned (46; 38 before R6) | 40 | 42 | 42 | **46** |
| heldout_r6 (44, fresh) | 12 | 24 | 23 | **27** |
|   navigate (37) | 6 | 19 | 18 | 21 |
|   clarify (3) | 3 | 1 | 1 | 3 |
|   reject (4) | 3 | 4 | 4 | 3 |
| heldout_r5 (35) | 11 | 19 | 20 | 24 |
| heldout_r4 (24) | 2 | 17 | 16 | 19 |
| heldout_r3 (16) | 14 | 10 | 11 | 12 |
| R6 lexical fallback | | | | tuned 42, r6 13, r5 12, r4 2, r3 14 |

R6 vs R5 on heldout_r6: fixed S27 hall hire, S28 cracked bin, S29 abandoned car, S32 moving records, S37 status of a sent
application, S38 and S40 (generic clarify); broke S19 food stall at a festival (now clarifies between event permits and business
licence), S31 misspelt marriage record (clarifies between personal details and record corrections) and S42 (a foreign election:
the off-topic prototype did not beat "Civic Processes", so it clarifies instead of rejecting). Near-miss pairs fully right: 1 of 3
(S12/S13) for every resolver.

Remaining heldout_r6 failures (17): S01 student exemption -> payment page; S06 support stopped -> payment information (expected
appeals/reviews); S07, S14, S19, S31 close-alternative clarifications; S08, S11, S20, S23, S25, S33, S35 weak-match clarifications
(in 10 of these 11 clarifications an expected service is among the offered options; S33, a passport damaged in a flood, is the
exception); S16 refused porch -> environmental report (expected planning appeals); S34
dismissive phone call -> record requests (expected complaint); S36 resume ("halfway through ... laptop died") routed to In
Progress rather than the saved parking application (resume intent detected, but the parking topic was not the top non-resume
candidate); S42 clarify instead of reject.

Remaining weaknesses on the earlier sets: N10 (objecting to a neighbour's extension) no longer gets a keyword boost but the model
itself ranks "Planning Applications" fourth; council-charge sub-pages (R01, R02, N02) still lose to the main payment page.

**Browser gate.** Every fixture through the real UI plus 18 scenarios (5 flagship journeys: parking cost, passport, resume
application -> Continue -> task reopened at the saved step, generic "I want to appeal" -> clarification -> option opens, poem ->
rejection; resume/reload, clarification, routes, debug, loading, timeout, fallback): 0 console errors, 0 stuck states, 0 external
requests, parity min cosine 0.9999996. All 150 pages render without placeholder section text.

**Caveats.** All held-out sets were written by the developer/assistant team, not by users; heldout_r5/r4 failures were studied
during R6 development, so only heldout_r6 is a fresh measure, and even it was written knowing the weakness categories. 44 items
give a coarse estimate (one item = 2.3 points). These are formative development results, not user-study evidence.

## R6.1 / RESOLVER6_UI: visual redesign (9 October 2026)

**Why.** Pilot feedback: the CivicSphere site looked too abstract for testers to treat it as a real public-service website. Goal:
a credible, original local-authority site without borrowing any GOV.UK assets or close visual cloning, with the resolver untouched.

**Constraint.** Presentation, layout and synthetic page content only. civicsphere-core/-content/-descriptions/-semantic/-embedder.js,
semantic-index.json, models/, vendor/, tests/fixtures.json and tests/run_browser_tests.js are byte-identical to RESOLVER6 (checked
with cmp / diff -r). The UI logic (resolve, navigateTo, trace, renderDecision, model status, tasks, saved-application resume) was
moved verbatim from the RESOLVER6 index.html into civicsphere-ui.js; only page templates and frame behaviour are new.

**Design decisions.**
- Identity: "CivicSphere City Council" (the catalogue already says CivicSphere; "City Council" adds realism; fictional). Original SVG
  crest (shield, sphere with meridians, harbour waves, star), deliberately not heraldic-royal. Palette: deep teal #0e4f53 header,
  marigold #f0b13b accent, warm white page; Source Sans 3 (SIL OFL 1.1, vendored WOFF2). This avoids the GOV.UK signature (black
  header, crown, GDS Transport, #ffdd00 focus) while keeping familiar public-service patterns (breadcrumbs, phase banner,
  "Start now", contents list, at-a-glance facts, footer links).
- Content realism through civicsphere-site.js (display only, never read by the resolver): hand-written fees, processing times,
  eligibility and document lists for the flagship services (e.g. residents' permit £48/12 months, identity replacement £42/£85),
  deterministic generic facts for the rest; telephone numbers in Ofcom's drama range (01632 960xxx), .example email addresses, a
  non-existent "CS" postcode area, a fictional test account (Alex Morgan).
- Assistant: "Ask CivicSphere" in the header, a pill and the home ask bar; docked panel on desktop (page content gets right padding
  so the destination is not hidden), bottom sheet on mobile (closes on arrival so the highlighted section is visible). The
  destination section keeps a marigold tint, bar and "CivicSphereNav brought you here" label after the pulse ends. Debug mode kept.
- Accessibility: skip link, landmarks (header incl. phase banner, nav, main, footer, aside), one h1 per page, labelled controls,
  dual-ring focus (dark outline + marigold halo; inverted on dark surfaces), Escape closes the panel, reduced-motion respected.

**Checks.**
- axe-core 4.14.0 (vendored in tests/vendor, test-only), WCAG 2.0/2.1/2.2 A+AA + best-practice rules, 19 page states (15 desktop
  incl. assistant with result and ?debug=1, 4 mobile 390 px incl. menu open and assistant sheet). First run: 1 serious rule
  (label-content-name-mismatch on the crest link) and moderate region/heading-order findings; after fixes: 0 violations of any impact.
- Reflow: 170 routes at 320 px wide, no horizontal scrolling (after fixing a grid min-content overflow and wrapping text tables).
- Resolver identity: Node semantic and lexical suites produce identical per-fixture output to RESOLVER6 (165/165 rows, .txt
  reports identical); browser: identical decisions, destinations, sections, options, confidences and top-3 scores on all 165
  fixtures; official browser harness (tests/run_browser_tests.js, unchanged): tuned 46/46, heldout_r6 27/44, heldout_r5 24/35,
  heldout_r4 19/24, heldout_r3 12/16, scenarios 18/18 (all 5 flagship journeys), 0 console errors, 0 stuck, 0 external requests,
  Node-browser parity min cosine 0.9999996, 0 decision mismatches; per-fixture output (decision, destination, section, options,
  confidence, candidates, hash, trace, page title) identical to RESOLVER6 on all 165 fixtures.
- Box contention note: during this work other jobs on the shared machine pushed load to 20-50 with ~50-60% CPU steal; the 4-worker
  browser harness then timed out on model/page loads (unchanged RESOLVER6 was equally slow). Those partial runs were discarded and
  the harness was rerun when the machine was quieter.

## R6.2 / RESOLVER6_2: interaction features (9 October 2026)

**Why.** Kene approved six interaction features for the demo: make the system's understanding visible before it acts, bridge the
user's words to the site's vocabulary, make the route the main event, commit to one answer with a short reason, show awareness of
the user's saved work, and let people compare against conventional site search.

**Constraint.** Presentation layer only, built from the result resolveGoal / resolveSemantic already returns. The resolver files,
the index, the model and the test fixtures are byte-identical to RESOLVER6 / RESOLVER6_UI (cmp, diff -r). The navigation sequence
(hashes, window.__civicTrace strings, #nbresult dataset flags) is unchanged so the official harness runs unmodified.

**Design decisions.**
- civicsphere-explain.js is a pure module of templates (no randomness, no model): interpret, bridge, whyHere, situation,
  clarifyQuestion. tests/run_explain_tests.js checks every fixture in both modes.
- Honesty rules for the interpretation: always hedged; life-situation clauses ("you've moved house", "you rent your home") only
  when explicit cue words occur; bereavement needs a named person (the first version read "my laptop died" as a bereavement, caught
  by the fixture check); the goal clause uses only explicit intent phrases. The resolver also counts weak cues as intent evidence
  ("charge" in "council charge", "application", "get a", "cost"), and an early version turned those into claims such as "you want to
  know what charge appeals costs"; those cues are now ignored by the interpretation (not by the resolver), which then says "need
  help with ...". Under-claiming is preferred to over-claiming.
- Terminology bridge: the quoted phrase is verbatim from the user's (normalised) question, a window of up to four words that starts
  and ends on content words, chosen by overlap with the matched page text; shown only when it contains a word the label lacks.
  Section level uses the intent phrase that picked the section. Resolver annotations such as "(+context)" are stripped.
- Pacing: interpretation shown for 1.5 s, then 600 ms per route step (same as before); total remains well inside the harness's
  9 s completion window. prefers-reduced-motion removes animation and smooth scrolling but keeps the step pacing so screen-reader
  announcements stay in order. A Stop button cancels before or during the walk.
- "Find it yourself next time" replays the same path as real menu links (highlight + focus), never auto-clicking unless asked.
- Situation note appears after arrival (or with a clarification) so its Continue button never competes with the walk.
- Comparison baseline: civicsphere-search.js is a port of eval/harness/lib/bm25.js (same stop list, tokenizer, k1 1.2, b 0.75,
  title x3, headings x2). work/r62_eval/bm25_port_parity.js: 0 ranking differences against the evaluation module on all 165
  fixture queries with identical inputs. In the app it indexes the visible text of the 123 routable pages (summary, about,
  at-a-glance facts, fees rows and section text), which is a stronger baseline than titles alone. It is honest about the
  vocabulary gap: "I need a new passport" returns unrelated pages because "passport" appears nowhere in the visible text; we did
  not add synonym lists to either system.
- Note for the evaluation: eval/harness/lib/build.js extracts sectionText from index.html; since R6.1 that function lives in
  civicsphere-ui.js. The eval folder was not modified.

**Checks.**
- Resolver identity: civicsphere-core/-content/-descriptions/-semantic/-embedder.js, semantic-index.json, models/, vendor/,
  tests/fixtures.json, run_browser_tests.js, run_core_tests.js, fixture_check.js and tools/node_embedder.js byte-identical to
  RESOLVER6_UI (cmp, diff -r); only civicsphere-ui.js, index.html and assets/site.css changed, plus new files.
- Node suites: semantic tuned 46/46, heldout_r6 27/44, heldout_r5 24/35, heldout_r4 19/24, heldout_r3 12/16; lexical 42/46,
  13/44, 12/35, 2/24, 14/16. Both .txt reports identical to RESOLVER6 and JSON identical apart from the date.
- Official browser harness (unchanged), build run: all 165 fixtures identical to RESOLVER6 in decision, destination, section,
  section id, options, confidence, top candidates, hash, trace and page title; scenarios 18/18 (all five flagship journeys);
  0 console errors; Node-browser parity min cosine 0.9999996, 0 decision mismatches. One timing check failed on the busy shared
  machine (R10 resolved identically but took over 6 s to show its answer, marked "stuck"; load average ~20 from another agent's
  browser jobs). An earlier run crashed on a page-load timeout under the same load and was discarded. The confirming run on the
  fresh unzip of the release zip is recorded in work/verify_results_r62/from_unzip (outside the package).
- Explanation checks (tests/run_explain_tests.js): 330 results, 0 problems.
- Feature suite (tests/run_r62_features.js): 21/21 checks (passport, parking cost, resume, situation on non-resume parking,
  clarification incl. keyboard, rejection, Stop, compare mode on 3 queries, Take me there, reduced motion, debug, mobile 390 px,
  BM25 site search). axe-core 4.14.0 (WCAG 2.0/2.1/2.2 A+AA + best practice) on 9 states (answer + Why here + situation, coach step,
  clarification, rejection, compare, debug, mobile answer sheet, mobile compare, search page): 0 violations. 0 console errors,
  0 external requests. Fixed along the way: a skip-link rule on the compare toggle (now a button), the scrollable debug box
  (focusable region), a duplicate search landmark, and the compare-pane Continue button not being wired.

## R6.3 (18 Oct 2026): non-chatbot entry point and route strip
- Trigger: the owner noticed the R6.2 floating bottom-right assistant button and docked panel looked like every other website chatbot, which reviewers would compare the system against.
- Change (interface only): bottom-centre "I want to…" pill; "/" or click opens one centred command-line dialog (modal, focus trap, Esc, click-outside closes; no history, bubbles, avatar or greeting); "What I understood" card, then one route or one question; after the route starts the dialog closes and a sticky "Your route" strip (numbered steps, current step highlighted, Stop, Dismiss, no input) stays at the top of the page. The header button that sat beside the site search was removed.
- Resolver untouched: civicsphere-core.js, -semantic.js, -embedder.js, -descriptions.js, semantic-index.json and models/ are byte-identical to RESOLVER6_2 (cmp and checksums in the handover). Node and browser suites give the same counts as R6_2 (tuned 46/46; held-out r6 27/44, r5 24/35, r4 19/24, r3 12/16).
- Tests: tests/run_r63_entry.js (36 checks incl. axe), run_r62_features.js (21/21; the saved-application note is now read from the strip), run_browser_tests.js (scenarios 18/18, 0 console errors, 0 parity mismatches), run_ui_checks.js (no axe violations).
- Not yet done: no user study of whether the new entry point is perceived as less chatbot-like; that is an assumption from design, not a finding.

## 19 Oct 2026 · RESOLVER7_GP (Goalpost reference build)
Decisions (Kene, 19 Oct 2026 02:02 Europe/London): broadband site = Lumenet, insurer = Insura, both multi-page static sites and profile-only (NO CivicSphere lexical word lists); 60 held-out items per new site; open-source release deferred until after submission; crawler only if cheap; build folder RESOLVER7_GP is new (earlier builds and original/ untouched).
- What changed: navigation layer extracted into goalpost/ (engine, explain, widget, embedder module) + profile (goalpost-profile/0.1) + compile tool (goalpost-index/0.1). CivicSphere is now a profile (tools/export-civicsphere.js produced profiles/civicsphere.profile.json: 13 areas, 150 destinations / 123 routable, 497 sections, 1 saved state). civicsphere-host.js replaces civicsphere-ui.js in index.html (page renderers kept; all navigation-layer code removed). Legacy resolver files, semantic-index.json and models/ are byte-identical to R6.3 (G1) and civicsphere-ui.js / -explain.js / -embedder.js are kept unloaded as the gate's reference.
- Gate (tests/gate_g1_g7.js, Node): G1 legacy files untouched PASS; G3 compiled index equals the R6.3 index (729 texts, hash c64880bd, vectors byte-identical, recompile identical) PASS; G2 decisions full-JSON identical on 2,186 queries (tuned 46, heldout r3 16 / r4 24 / r5 35 / r6 44 = 119, dummy 21, seeded variants 2,000, seed 20261019) PASS, plus lexical-fallback and ranked-list identity and explain-text identity (G2b/G2c) PASS; G4 published results reproduce (46/46; 27/44; 24/35; 19/24; 12/16) PASS; G7 frozen held-out sets unchanged (r4, r5, r6 hashes; r3 has no recorded per-set hash that can be reproduced: the value in heldout_frozen_sha256.txt does not match the per-set method, fixtures.json file hash unchanged) PASS.
- G5 (tests/gate_g5_browser.js): widget in Chromium vs legacy resolver on Node embeddings, 465 queries (165 fixtures + 300 seeded variants): discrete decisions identical 465/465; full JSON byte-identical 463/465, remaining 2 differ only in the last float digits (browser vs Node WASM, the same ~1e-7 embedding noise already seen in R6.3 parity); tolerance 1e-4 PASS.
- G6: R6.3 UI suites unchanged and re-run against the new host: run_r63_entry 36/36, run_r62_features 21/21, run_ui_checks axe 19 pages no violations / 320 px reflow OK / 0 console errors, run_browser_tests tuned 46/46, held-out 27/44, 24/35, 19/24, 12/16, scenarios 18/18, parity mismatches 0. NO assertion in any suite was edited. Test-side change (logged): tests/pw_shadow_shim.js, a preload (node -r) that makes document.getElementById/querySelector(All)/activeElement also look inside the widget's open shadow root; it is needed because the assistant now lives in a shadow DOM. Host-side compatibility bridges: window.navigateTo / window.CivicEmbedder / window.__civicLastResult / body.walking.
- Widget tests (tests/gate_widget_browser.js, 25 checks): 320/375/414 px (panel inside viewport, no horizontal overflow, strip visible, axe on panel and on strip), keyboard (/, Enter, Esc returns focus to the pill), reduced motion, off-topic rejection, 0 console errors, 0 external requests; plus the second site tests/mini-site (Riverside Library, 6 pages, path mode, no CivicSphere code): route walks across real page loads, strip persists across loads, section deep link, off-topic rejected, axe clean.
- Behavioural notes: the widget's trace/strip/panel markup moved into the shadow root with the same ids/classes; the host's "start task" card reuses the widget card (goalpost.showCard). The "panel_opened" log event of the first draft was removed so the event stream matches R6.3. Validator now rejects unknown URL-template placeholders (found when the mini site used {sectionId}; the supported ones are {id} {index} {anchor}).
- Limits found: tiny catalogues (3 destinations) give "ask one question" for short queries (margin rule tuned for ~120); generic-action question wording is built into the engine; mobile strip is ~35% of a 320 px viewport (collapse not implemented); two of the first-draft UI details were reworked after testing (coach target class, trace card).
- Not claimed: no user study; nothing here shows Goalpost works on real third-party sites beyond the 6-page mini site; Lumenet and Insura are not built yet (phase 2).
- Policy notes: spec/policy_notes_2026-10-19.md (ACM generative-AI policy, IUI/SIGCHI video and caption rules, items that could not be verified).

## 19 Oct 2026 · RESOLVER7_GP2 (widget padding fix + "I’m here because…" wording; Kene approved 19 Oct 2026, 13:22 Europe/London)
- New copy of RESOLVER7_GP (R7_GP untouched; backup backups/phase4_before_widget_fix_20261019 on the build box). The same widget change was applied to Goalpost_Insura_v3 / Goalpost_Lumenet_v3.
- Bug: the panel had 0 px inner padding and the close button overlapped the input row, because R6.3's .nbbody rules lived in assets/site.css and cannot reach the shadow DOM. An audit of every R6.3 widget-class rule against goalpost/src/widget.css found 11 lost rules. Restored: padding (24/16 px), .btn.primary/.secondary, links, h3, pill needle, coach pulse, trace offset. Also added: a heading row with a 44 px close button, the sub-line, spacing for cards, and on phones the mic and Find on one row with smaller input text.
- Wording: ui.pillLabel "I’m here because…", ui.subline "Describe your situation. We’ll take you there.", ui.placeholders (5 rotating examples: problem, situation, question, status, goal). Rules are in docs/goalpost-format-reference.md.
- Decisions: engine/explain/embedder/models/index byte-identical; the profile differs only in ui (compile --check FRESH). Gate G1-G7 PASS: 2,186/2,186 full-JSON identical. G5 465/465 discrete.
- Tests (tests/results_2026-10-19_GP2):
  - Suites: widget 25/25, r63 36/36 (wording asserts updated, not weakened), r62 21/21, ui_checks 19 pages 0 axe, run_browser_tests per-item identical to R7_GP.
  - New tests/run_p4_panel.js: 96/96 (configs tests/p4_configs). The same test on R7_GP scores 45/96.
  - Report: tests/results_2026-10-19_GP2/WIDGET_P4_PADDING_WORDING_2026-10-19.md.

## 24 Oct 2026 · RESOLVER7_GP3 (Phase 5 decision policy)
Goal set by Kene (24 Oct 2026, 16:27 Europe/London): make Goalpost's decision policy clearly beat the semantic ranked list and BM25+descriptions on Insura and Lumenet,
honestly, with generic profile-driven rules only. Developed only on the tuned sets of all three sites; v1 held-out sets now labelled "seen"; fresh frozen held-out
sets of 60 per new site written, hash-frozen and run once (16:46 BST). R7_GP2 kept as the frozen reference.
Rules added: S (saved-state routing: navigate within 0.03 of top, offer one question within 0.06, guards for third-party/general queries and queries naming a sibling)
and T (twins: role-differing mutual nearest neighbours, pair sim >= 0.65, band 0.10; event cues or one question naming both). PARAMS unchanged; the margin raise
tried in development was not adopted.
CivicSphere impact: see README header (G2 fails by design; S36 fixed; variants 9 better / 7 worse on parking-permit saved state).
Outcome on fresh held-out (Insura / Lumenet): committed correct 25/50 and 30/50 vs semantic list top-1 30 and 34 and BM25+desc 30 and 29 (not significant);
wrong-destination 9/60 and 10/60 vs 30/60 and 26/60 for the semantic list (p<1e-4). GP3 vs GP2: modest, non-significant gains. It does NOT clearly beat the lists
on committed-correct. Known failure modes (not fixed after freeze): saved-state hijacks on seen v1 items, twin miscommits, status queries hitting the qualifier step.

## 26 Oct 2026 · RESOLVER7_USHER (rename only: Goalpost -> Usher)
- Kene decided to rename the system completely from "Goalpost" to "Usher" ("best reflects the concept"). Copy of RESOLVER7_GP3; names, files, format ids, globals, CSS
  variables and visible strings changed (see README.txt). The engine accepts the old goalpost-profile/0.1 id. Decision policy unchanged (ENGINE_VERSION RESOLVER7_GP3).
- Verified: regression gate output identical to GP3 and engine results identical to GP3 on all 2,186 gate queries; results in tests/results_2026-10-26_USHER/.
