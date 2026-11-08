#!/usr/bin/env node
// RESOLVER6 model trial (Node; heldout_r6 is NEVER read here).
// For one model (CIVIC_MODEL=<key>, default minilm): (1) threshold-free ranked-list quality of rankDestinations
// (MRR, hit@1, hit@3 of the expected/acceptable destinations on navigate fixtures); (2) a tuned-only grid over the
// scale-dependent decision thresholds; (3) pass counts with the best tuned setting on tuned and the already-seen
// heldout_r5/r4/r3 sets (which were looked at during R6 development, so they are not clean held-out data).
// Usage: CIVIC_MODEL=bge-small node tests/model_trial.js [--json out.json]
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'civicsphere-core.js'));
const S = require(path.join(ROOT, 'civicsphere-semantic.js'));
const E = require(path.join(ROOT, 'tools', 'node_embedder.js'));
const check = require(path.join(__dirname, 'fixture_check.js'));
const SEEN = ['tuned', 'heldout_r5', 'heldout_r4', 'heldout_r3'];
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8')).fixtures.filter(f => SEEN.includes(f.set));
(async () => {
  const index = S.decodeIndex(JSON.parse(fs.readFileSync(path.join(ROOT, S.MODEL.indexFile), 'utf8')));
  if (index.stale) throw new Error('stale index for ' + S.MODEL.key);
  const vec = {}; for (const f of fx) vec[f.id] = await E.embedQuery(f.query);
  const out = { model: S.MODEL, ranked: {}, calibration: null, pass: {} };
  // (1) ranked list
  for (const set of SEEN) {
    const nav = fx.filter(f => f.set === set && f.expectedDecision === 'navigate');
    let rr = 0, h1 = 0, h3 = 0;
    for (const f of nav) { const ok = [f.expectedDestinationId, ...(f.acceptableDestinationIds || [])]; const r = C.rankDestinations(vec[f.id], index, { k: null }); const k = r.findIndex(x => ok.includes(x.id)); if (k >= 0) { rr += 1 / (k + 1); if (k === 0) h1++; if (k < 3) h3++; } }
    out.ranked[set] = { n: nav.length, mrr: +(rr / nav.length).toFixed(3), hit1: h1, hit3: h3 };
  }
  // (2) tuned-only grid, ranges relative to this model's similarity scale (median top score on tuned navigate fixtures)
  const tuned = fx.filter(f => f.set === 'tuned');
  const run = (P, set) => fx.filter(f => f.set === set).map(f => { const r = S.resolveSemantic(f.query, vec[f.id], index, P); return !check(f, Object.assign({}, r, { options: r.clarification ? r.clarification.options.map(o => o.id) : [] }), C).length; });
  const tops = tuned.filter(f => f.expectedDecision === 'navigate').map(f => C.rankDestinations(vec[f.id], index, { k: 1 })[0].score).sort((a, b) => a - b);
  const med = tops[Math.floor(tops.length / 2)], lo = tops[0];
  const scale = S.MODEL.key === 'minilm' ? 1 : med / 0.62; // MiniLM tuned median ~0.62
  const r3 = x => Math.round(x * 1000) / 1000;
  const GRID = S.MODEL.key === 'minilm' ? { navigateMin: [0.38], clarifyMin: [0.25], marginMin: [0.02], band: [0.05], lexWeight: [0.08], optionWindow: [0.08], offTopicMin: [0.30], offTopicMargin: [0] } : {
    navigateMin: [0.30, 0.34, 0.38, 0.42, 0.46].map(x => r3(lo - (0.62 - x) * scale * 0.5 > 0 ? x * scale : x)),
    clarifyMin: [0.20, 0.25, 0.30].map(x => r3(x * scale)),
    marginMin: [0.01, 0.02, 0.03].map(x => r3(x * scale)),
    band: [0.03, 0.05].map(x => r3(x * scale)), lexWeight: [0.05, 0.08].map(x => r3(x * scale)),
    optionWindow: [r3(0.08 * scale)], offTopicMin: [0.25, 0.30, 0.35].map(x => r3(x * scale)), offTopicMargin: [-0.02, 0, 0.02].map(x => r3(x * scale)) };
  const keys = Object.keys(GRID), grid = [];
  const rec = (k, P) => { if (k === keys.length) { grid.push({ P: Object.assign({}, P), pass: run(P, 'tuned').filter(Boolean).length }); return; } for (const v of GRID[keys[k]]) { P[keys[k]] = v; rec(k + 1, P); } };
  rec(0, {});
  const best = Math.max(...grid.map(g => g.pass)), plateau = grid.filter(g => g.pass === best);
  const P = {}; for (const k of keys) { const v = plateau.map(g => g.P[k]).sort((a, b) => a - b); P[k] = v[Math.floor((v.length - 1) / 2)]; } // per-parameter median of the plateau
  let chosen = plateau.find(g => keys.every(k => g.P[k] === P[k])) || plateau[0];
  out.calibration = { scale: r3(scale), tunedMedianTop: r3(med), gridSize: grid.length, best, plateau: plateau.length, chosen: chosen.P };
  for (const set of SEEN) { const r = run(chosen.P, set); out.pass[set] = `${r.filter(Boolean).length}/${r.length}`; }
  console.log(JSON.stringify(out, null, 1));
  const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
