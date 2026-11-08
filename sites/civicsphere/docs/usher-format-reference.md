> **Name note (26 Oct 2026):** Usher was formerly called **Goalpost**; profiles with the old format id `goalpost-profile/0.1` are still accepted.

# Usher reference (usher-profile/0.1, usher-index/0.1, widget API)

Usher is a portable, goal-based navigation layer: a visitor describes their situation or goal (pill: "I’m here because…"; e.g. "my bin wasn’t collected", "I need to replace my identity document"), Usher decides (navigate / ask one question / decline) and walks the visitor along the site's own route (Home › Area › Group › Page › Section), showing every step.
Everything site-specific lives in ONE profile file. The engine, the decision policy and the widget are site-agnostic. All inference runs in the browser (WebAssembly); nothing is sent to a server.

## Files
| File | Role |
|---|---|
| `profiles/<site>.profile.json` | the site's profile (`usher-profile/0.1`), hand-written or exported |
| `usher-index.<site>.json` | compiled index (`usher-index/0.1`): texts + base64 float32 vectors, FNV-1a `textsHash` of the profile's texts |
| `usher/usher.js` | one-file bundle = engine + explain + widget (`<script>` tag) |
| `usher/usher-embedder.js` | ES module loaded beside the bundle (vendored transformers.js + ONNX Runtime WASM + all-MiniLM-L6-v2 q8, all local) |
| `tools/usher-validate.js` | `node tools/usher-validate.js profile.json` |
| `tools/usher-compile.js` | `node tools/usher-compile.js profile.json --out index.json --models ./models [--check]` (deterministic, offline) |
| `tools/usher-build.js` | rebuilds `usher/usher.js` from `usher/src/*` |
| `tools/export-civicsphere.js` | one-off: legacy CivicSphere catalogue -> profile (how the first profile was made) |

## Embedding on a site
```html
<script src="usher/usher.js" data-profile="profiles/site.profile.json" data-index="usher-index.site.json"
        data-models="./models/" data-vendor="./vendor/" data-hotkey="/" data-compare="#versus"></script>
```
`data-compare` (optional) adds a "Compare with site search" link to that URL. `?debug=1` or `data-debug="1"` shows the decision trace. `?semantic=off` forces keyword matching. `?modelwait=ms` changes the model wait (default 30 s, then keyword fallback with a visible notice).

## Profile (top level)
`format` (`"usher-profile/0.1"`), `site`, `taxonomy.areas`, `destinations`, `savedStates`, `resume`, `vocabulary`, `qualifiers`, `offTopic`, `hints.lexicalProfiles`, `ui`.
* **site**: `id, name, shortName, lang, synthetic`, `scope {noun, productName, rejectMessage}`, `persistence` (`session`), `navigation`.
* **site.navigation**: `mode` = `hash` (single-page, default), `path` (multi-page; route state kept in `sessionStorage` so the strip and the walk continue across page loads) or `callback` (host sets `usher.onNavigate(url, ctx)`); `urlTemplates` keys `home, area, group, page, section` with placeholders `{area} {id} {group} {groupLabel} {index} {anchor}` (the validator rejects unknown placeholders); `walk` (optional, per-step walking on/off).
* **taxonomy.areas[]**: `id, label, description, kind` (`service` | `account`), `groups[] {id,label}`.
* **destinations[]**: `id, title, area, group, url, summary, kind, descriptions[], aliases[], parent?, routable? (default true), generated?`, `sections[] {id, label, anchor, body, intents[], descriptions[]?}`.
* **savedStates[]** / **resume**: saved work for logged-in visitors (`id, kind, label, destination` (the saved item's page), `ownerDestination` (the service it belongs to), `reference, savedAt, progress {step,total,stepLabel}`, optional `resumeUrl`); `resume.fallbackDestination`. The host can replace them at run time with `usher.setState(list)`.
* **vocabulary**: `entities[]`, `savedNoun`, `intents` (object of term lists, e.g. generic-action terms), `sectionTemplates`, `explain` (wording for "what I understood", bridge, why-here). Optional; defaults are plain English.
* **qualifiers[]**: words that modify a destination choice (e.g. "fast track").
* **offTopic[]**: 20-60 example off-topic requests (the null class; the validator warns outside that range).
* **hints.lexicalProfiles[]**: OPTIONAL word lists used only to break ties inside a 0.05 score band. A profile without them is valid (the Riverside test site and the planned Lumenet / Insura sites use none).
* **ui**: `pillLabel, subline, placeholder, placeholders[], placeholderPrefix, hotkey, examples[], coachTexts{}`.
  * `pillLabel` (default "I’m here because…", was "I want to…" before R7_GP2 / Usher v3) is the pill text, the panel heading and the accessible name of the dialog and its input.
  * `subline` (default "Describe your situation. We’ll take you there.") is the line under the heading; the input references it with `aria-describedby`.
  * `placeholders[]`: rotating examples, each phrased to complete "I’m here because…" (cover a problem, a goal or situation, a question and a status check). A new example is shown each
    time the panel opens; while it is open and the input is empty the example changes every 3.5 s, once through the list, then stops; typing stops it at once; with
    `prefers-reduced-motion` only the per-open change is used. `placeholderPrefix` (default "e.g. ") is dropped on screens of 480 px or narrower so the example fits.
    Keep each example to about 33 characters so it fits the input at 320 px. `placeholder` is the single-example fallback when `placeholders` is absent.
  * None of the ui keys affect decisions or the compiled index (`usher-compile --check` stays FRESH).

## Decision policy (identical to RESOLVER6)
destination score = 0.7 x best + 0.3 x second-best section similarity; navigate if score >= 0.38 and margin >= 0.02, clarify if >= 0.25 (or ambiguous / generic action / saved state), otherwise decline; off-topic examples form a null class; qualifiers and resume routing as in the paper. These are `params` defaults in the engine.

## Widget API (`window.usher`)
`ready` (promise), `ask(q)`, `resolve(q)` (-> decision), `semanticResult(q)`, `navigate(id, sectionIndex?, source?)`, `takeMeThere(decision, source)`, `open()`, `close()`, `cancel()`, `setState(list)`, `on(event, fn)` (events: `decision, navigate, arrive, walking, dismiss, log, ready`), `onNavigate`, `onResume`, `trace[]`, `lastResult`, `engine`, `explain`, `embedder`, `html`, `showCard/hideCard`. Nothing is stored or sent unless the host's own `log` listener does it.

## Widget CSS ownership (R7_GP2 / Usher v3, 19 Oct 2026)
The widget renders into an open shadow root, so page stylesheets do NOT reach it. Every rule the widget needs is in `usher/src/widget.css` (inlined into
`usher-widget.js` by `tools/usher-build.js`). R7_GP shipped without some rules that had lived in the R6.3 page stylesheet (`.nbbody` padding, `.btn.primary` /
`.btn.secondary`, links, `h3` line-height, the yellow compass needle in the pill, the coach-target pulse and the trace offset under the route strip); they are now in the
widget CSS. Panel: 24 px inner padding on desktop, 16 px on phones; the close button sits in the heading row (44 × 44 px) and never overlaps the input.
Only `--usher-*` custom properties cross the boundary (below).

## Theming
Custom properties on the page (inherited into the shadow root): `--usher-accent, --usher-accent-dark, --usher-accent-tint, --usher-highlight, --usher-highlight-tint, --usher-text, --usher-muted, --usher-link, --usher-border, --usher-soft, --usher-radius, --usher-font`.

## Known limits (0.1)
* Tiny catalogues (a handful of destinations) give more "ask one question" answers because the margin rule is tuned for ~120 destinations.
* The generic-action question wording ("What would you like to apply for?" and similar) is built into the engine.
* The mobile route strip is tall on 320 px screens (about a third of the viewport); a collapsed form is not yet implemented.
* The index must be recompiled whenever profile texts change (`--check` detects a stale index; the widget refuses a stale one and falls back to keyword matching).
