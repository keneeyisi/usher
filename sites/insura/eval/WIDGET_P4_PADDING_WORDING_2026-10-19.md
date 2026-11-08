> **Name note (26 Oct 2026):** the system described here was renamed from **Goalpost** to **Usher** on 26 Oct 2026. This report is kept as written at the time (formerly Goalpost); file, key and label names in it refer to the pre-rename builds. Results are unchanged by the rename.

# Widget update for all three sites (19 Oct 2026): panel padding fix and "I’m here because…" wording
Builds (new copies; R7_GP, Goalpost_Insura_v2, Goalpost_Lumenet_v2 and older builds are untouched):
`CivicSphereNav_IUI2027_RESOLVER7_GP2` (Mac port 8021), `Goalpost_Insura_v3` (8022), `Goalpost_Lumenet_v3` (8023).
Kene approved both changes on 19 Oct 2026.

## 1. Panel padding fix and the shadow-DOM style audit
- Cause: R7_GP moved the widget into an open shadow root. The R6.3 rules for the panel (`.nbbody{padding:16px}`, overridden by `.nbbody{padding:22px 22px 14px}`, plus `.nbbody>label` and `.nbbody>p`) lived in the page stylesheet (`assets/site.css` lines 116-119 and 201). Page CSS cannot reach a shadow root, so the panel had 0 px inner padding and the absolutely positioned close button sat on the input row.
- Audit (`p4_widget/css_audit.py`): every R6.3 rule whose selector uses only widget classes or ids was compared with the widget's own CSS. Before (R7_GP): 11 rules had lost declarations (`css_audit_R7GP_before.txt`). Element rules (`a`, `h3`) were also checked.
  - **Restored in the widget CSS:** `.nbbody` padding; `.btn.primary` and `.btn.secondary`. Without these, "Show me how to find this myself next time", "Continue claim/application", "Do it for me" and "Done" showed as grey browser-default buttons. Also restored: link colour and underline offset, `h3` line-height, the yellow (theme highlight) compass needle in the pill, the coach-target pulse (injected host style; none with reduced motion), and the navtrace offset under the route strip (the R6.3 `body:has(...)` rule becomes a sibling selector inside the shadow root).
  - **Deliberately not restored:** the R6.2 `.nbhead` dark header styles. They were superseded in R6.3, and the class name is now reused for the new heading row.
- New panel layout:
  - 24 px inner padding on desktop and 16 px on phones (≤ 760 px).
  - Heading row: compass, "I’m here because…" (20 px / 18 px), and the close button (44 × 44 px) in the same row. Space is reserved, so it never overlaps the input or the sub-line.
  - Sub-line under the heading.
  - More space for the interpretation, terminology bridge, destination card, "Why here", question heading, option cards (12/16/12/44 px padding, 12 px gap) and the reject notice.
  - Footer separated from the result.
- Other mobile fixes found by the audit:
  - In R7_GP the mic button wrapped onto a row of its own at 320 px. Now the input has its own row, and the mic and "Show my route" share the second row (as in Goalpost v2).
  - The input font is 18 px on phones and 16 px at ≤ 360 px, so every placeholder example fits at 320 px.
- Text fix: the saved-item note no longer doubles the noun ("saved escape of water claim claim" becomes "saved escape of water claim").

## 2. Wording
- **Rationale:** "I’m here because…" invites people to describe their situation (a problem, a life event, a question, or "where is my …?"), not only a task. That matches what the resolver handles well and what the interpretation card restates.
- **Pill, panel heading and accessible name** of the dialog and input: "I’m here because…" (was "I want to…").
- **Sub-line:** "Describe your situation. We’ll take you there." The input points to it with `aria-describedby`.
- **Configurable per site profile** (`ui.pillLabel`, `ui.subline`, `ui.placeholders[]`, `ui.placeholderPrefix`; documented in `docs/goalpost-format-reference.md`).
- **Rotation:**
  - A new example appears each time the panel opens.
  - While the panel is open and the input is empty, the example changes every 3.5 s, goes through the list once, then stops.
  - Typing stops the rotation at once.
  - With reduced motion, only the per-open change is used.
  - The placeholder is never announced to screen readers.
  - "e.g. " is dropped on screens ≤ 480 px.
- **Examples:** each was resolved by the site's own engine to check it lands somewhere sensible (`ph_check.js`, `q_check.js`).

| Site | Problem | Situation | Question | Status check | Goal |
|---|---|---|---|---|---|
| CivicSphere | my bin wasn’t collected → collection services · Missed collections | I’m moving house next month → address change | I might need planning permission → development approval | I’m waiting for my parking permit → residential parking | I need a new passport → identity replacement |
| Insura | my car was stolen overnight → motor theft claim | I’m moving house next month → change property | I’m not sure if I’m covered abroad → travel medical | I want an update on my claim → Track your claim | I’m going skiing in February → winter sports |
| Lumenet | my wifi keeps cutting out → dead spots | I’m moving house next month → choose a move date | I don’t know why my bill went up → asks: bill changed / ways to pay / dispute | I want an update on my fault → my faults (or asks: fault ticket / my faults) | I’m looking for a faster plan → choosing a plan |

- **Engine question text:** the engine already uses `site.shortName` from the profile ("Your goal could match more than one Insura destination…" on Insura; "… CivicSphere destination…" only on CivicSphere). There is no hard-coded "CivicSphere" in any engine, explain or widget string (only in comments). The engine is byte-identical, so the generic phrasing ("Your goal could match…", "Which of these is closest to what you want to do?") is unchanged; changing it would break the full-JSON parity gate.
- **Other wording changes:**
  - Host page tips on Insura and Lumenet ("Use the I’m here because… button… and describe your situation.").
  - The compare page label.
  - CivicSphere's home-page ask box label and placeholder, and its not-found page.
  - READMEs, docs, the export tool, the mini-site profile, and the run_r63_entry test.
  - Legacy R6.x files are untouched; the gate proves they are unchanged.

## 3. Decisions unchanged (parity check only, not a new held-out evaluation)
- **Files:**
  - `goalpost-engine.js`, `goalpost-explain.js`, `goalpost-embedder.js`, `models/` and the compiled indexes are byte-identical to R7_GP and v2.
  - The profiles differ only in their `ui` block. `goalpost-compile --check` reports FRESH for the CivicSphere and mini-site profiles; `gp_rebuild_v3.sh` checks this for Insura and Lumenet.
- **CivicSphere regression gate** (`tests/gate_g1_g7.js`):
  - G1 legacy files untouched.
  - G3 index identical (729 texts, hash c64880bd).
  - G2: 2,186 / 2,186 queries full-JSON identical (tuned 46, held-out r3 16, r4 24, r5 35, r6 44, dummy 21, variants 2,000), plus lexical and ranked lists identical.
  - G4 published results reproduce.
  - G7 frozen sets unchanged.
  - G5 browser parity: 465 / 465 discrete-identical (463 full-JSON identical; 2 differ in the last float digits, the same as R7_GP).
- **Insura and Lumenet** (Node, full rows vs v1 and v2): tuned 42/42 and 47/47; held-out (frozen hashes verified) 60/60 and 60/60. Browser: 102/102 and 107/107.

## 4. Tests
- **New `run_p4_panel.js`:** 96 checks per site, all passing on all three sites (96/96 ×3).
  - Covers: padding, inset, close button in the heading row and not over the input or sub-line, wording, sub-line, no old wording, placeholder from the profile, every placeholder fits the input, rotation / stop on typing / change on re-open / reduced motion, the compare link, and mic and Find on one row (phones).
  - States: empty, question (option card padding and gap, site name in the question), reject, result (card padding), saved-state note in the route strip (button styled), and route strip arrived.
  - Desktop only: the "Show me how" secondary style and the coach primary style.
  - Run at 1280, 414, 375 and 320 px.
  - Also checks axe in every state, overflow, 0 console errors and 0 external requests.
- **Same test on the old builds:** R7_GP 45/96, Insura v2 48/96 (padding 0, close button over the input row, grey default buttons, old wording). Screenshots are in `p4_widget/screens_before/`.
- **CivicSphere R7_GP2:**
  - gate_widget_browser 25/25.
  - run_r63_entry 36/36 (P1 and K2b now assert "I’m here because…" exactly and that "I want to" is absent).
  - run_r62_features 21/21, with 0 axe violations in 9 states.
  - run_ui_checks: 19 pages, 0 axe violations, 320 px reflow OK.
  - run_browser_tests: per-item identical to R7_GP (tuned 46/46, held-out 27/44, 24/35, 19/24, 12/16, scenarios 18/18, Node-browser parity 0 mismatches).
  - core and explain suites unchanged.
- **Insura v3 and Lumenet v3:**
  - gp_site_browser_tests 41/41 each.
  - gp_v2_extra_tests on every page (137 and 134): 0 axe violations at 1280 and 320, 0 overflow, 0 bad links or anchors, all images credited, 0 console errors, 0 external requests.

## 5. Screenshots (all viewed)
`work/eval_gp/p4_widget/screens/<site>_panel_{empty,result,question,reject}_{desktop1280,mobile414,mobile375,mobile320}.png`, plus `strip_walking_*`, `strip_arrived_*`, `strip_arrived_expanded_mobile*` and `coach_desktop1280`. Before-fix shots are in `screens_before/`.

## Known limits
- The "with result" shots are taken inside the 1.5 s interpretation window, before the walk starts. On a 1280 × 800 screen a long question scrolls inside the panel (max-height 78 vh), as in R6.3.
- The engine's generic phrasing ("Your goal could match…") is kept so that decisions and message text stay identical to R6.3.
- The placeholder rotation runs for at most about 14 s, typing hides it, and it is off with reduced motion. This is our reading of WCAG 2.2.2; no automated tool tests it.
