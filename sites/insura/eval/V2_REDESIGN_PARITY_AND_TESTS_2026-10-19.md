> **Name note (26 Oct 2026):** the system described here was renamed from **Goalpost** to **Usher** on 26 Oct 2026. This report is kept as written at the time (formerly Goalpost); file, key and label names in it refer to the pre-rename builds. Results are unchanged by the rename.

# Goalpost demo sites v2 (visual redesign): parity check and test results, 19 Oct 2026

## What changed
Only the page markup, CSS and photos changed. v2 lives in its own folders (work/build/Goalpost_Insura_v2 and Goalpost_Lumenet_v2). The v1 folders were not modified.
- The new generator is tools/gp_sitegen_v2.py. It uses the same DSL parsing, URLs, section ids, group anchors, profile and search docs as gp_sitegen.py (lines 1-70 are copied). Each site gets its own themed templates and CSS.
- Insura has a corporate-consulting look. It uses #5f0f40 plum (brand, dark band, footer), #0f4c5c teal (links, icon badges, alternate dark) and #fb8b24 orange (buttons and accent cards, always with dark text). #e36414 is used for hover and #9a031e crimson only for the claim CTA and the open-claim badge.
- Lumenet has a consumer-telecom look. It uses #000814 and #001d3d navies (top bar, bands, footer), #003566 blue (headings, links, icons) and #ffc300 or #ffd60a yellow (buttons, highlighted cards, price tags, badges, always with navy text).
- The Goalpost widget code is unchanged (goalpost.js is byte-identical). It is re-themed only through its public CSS variables (--gp-accent, --gp-highlight, --gp-link, --gp-text, --gp-muted, --gp-border, --gp-soft, --gp-radius, --gp-font). It is still a pill, command line and route strip (collapsed on mobile), with no chat UI.
- Photos are 15 (Insura) and 18 (Lumenet) StockSnap images under CC0 1.0. The licence was checked on each photo's source page (JSON-LD `license` = CC0 1.0 and the page text "CC0 license. No attribution required.") before download. Each image is stored locally as WebP (960 px wide, quality 76). Totals are about 0.8 MB and 0.65 MB. The images are credited on /credits.html and in vendor/images/credits.json.
- Why StockSnap: from the build box, Unsplash returned HTTP 401, and Pexels and Pixabay returned 403. CC0 is at least as permissive as the Unsplash licence.
- All stats, partners, TV shows, channels, team names, testimonials and prices are fictional and labelled as such. No reference watermark or real brand is used.

## Parity (not a new evaluation)
- goalpost-profile.json, goalpost-index.json, search-docs.json, goalpost/goalpost.js and models/ are byte-identical between v1 and v2 (cmp / diff -r, enforced by tools/gp_rebuild_v2.sh).
- Node decisions: goalpost-eval was run on the v2 folders and compared row by row with the v1 runs (tuned_run3_*, heldout_run1_*). The full rows (conditions a, a2, b and c, including decision, destination, section, reason and options) are identical:
  - Insura tuned: 42/42.
  - Insura held-out: 60/60.
  - Lumenet tuned: 47/47.
  - Lumenet held-out: 60/60.
- Browser decisions on v2 (gp_parity.js, node vs in-page window.goalpost.semanticResult):
  - Insura: 102/102 identical.
  - Lumenet: 107/107 identical.
- No metrics are reported from these runs. The held-out sets (frozen hashes unchanged) were only re-executed to prove the decisions are identical. Results: work/eval_gp/v2_parity/.

## Tests
- gp_site_browser_tests.js (41 checks: 320/375/414 axe, panel inside viewport, route strip collapsed ≤20% of viewport and expands, no horizontal scroll, desktop ask, compare and search, axe on every page at 375, console errors, external requests):
  - Insura: 41/41.
  - Lumenet: 41/41.
- gp_v2_extra_tests.js covered every HTML page (Insura 137, Lumenet 134, including credits/careers/cookies/press). Each site had:
  - 0 axe violations at 1280 and at 320.
  - 0 overflow at 320.
  - 0 broken links or anchors.
  - 0 missing or uncredited images.
  - 0 console errors.
  - 0 external requests.
- Contrast: no orange or yellow text on white anywhere; the accents are backgrounds with dark text. Text over photos sits on dark gradient overlays (checked visually, since axe cannot measure text over images).
- Screenshots: work/eval_gp/v2_screens/ (home and one service page per site at 1280 and 375, home at 320, collapsed route strip at 375).

## Known limits
- StockSnap's free downloads are capped at 960 px wide, so the desktop hero photos are upscaled slightly (softer at 1280 px and above).
- The widget's resume card shows "step 3 of 5" where the saved state says "Step 2 of 5". This is v1 widget behaviour (the next step) and is unchanged.
