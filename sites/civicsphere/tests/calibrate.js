#!/usr/bin/env node
// Threshold calibration on the TUNED fixtures only (held-out sets are never read here).
// RESOLVER5/6: grid over the hybrid tie-breaker, the off-topic null class (R6) (band, lexWeight, sectionLabelBonus) and the decision thresholds.
// Usage: node tests/calibrate.js
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'civicsphere-core.js'));
const S = require(path.join(ROOT, 'civicsphere-semantic.js'));
const E = require(path.join(ROOT, 'tools', 'node_embedder.js'));
const check = require(path.join(__dirname, 'fixture_check.js'));
const tuned = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8')).fixtures.filter(f => f.set === 'tuned');
const GRID = { band: [0, 0.03, 0.05, 0.08], lexWeight: [0.03, 0.05, 0.08, 0.10], marginMin: [0.01, 0.02, 0.03], navigateMin: [0.35, 0.38, 0.42], sectionLabelBonus: [0, 0.04],
  offTopicMin: [0.25, 0.30, 0.35], offTopicMargin: [-0.03, 0, 0.03] }; // RESOLVER6 adds the off-topic null-class thresholds
(async () => {
  const index = S.decodeIndex(JSON.parse(fs.readFileSync(path.join(ROOT, S.MODEL.indexFile), 'utf8')));
  const vecs = []; for (const f of tuned) vecs.push(await E.embedQuery(f.query));
  const run = P => tuned.map((f, i) => { const r = S.resolveSemantic(f.query, vecs[i], index, P); return { f, r, ok: !check(f, Object.assign({}, r, { options: r.clarification ? r.clarification.options.map(o => o.id) : [] }), C).length }; });
  const keys = Object.keys(GRID); const grid = [];
  const rec = (k, P) => { if (k === keys.length) { grid.push({ P: Object.assign({}, P), pass: run(P).filter(x => x.ok).length }); return; } for (const v of GRID[keys[k]]) { P[keys[k]] = v; rec(k + 1, P); } };
  rec(0, {});
  const best = Math.max(...grid.map(g => g.pass)), plateau = grid.filter(g => g.pass === best);
  console.log(`tuned fixtures: ${tuned.length}; best pass ${best}; ${plateau.length}/${grid.length} settings on the plateau`);
  for (const k of keys) { const v = [...new Set(plateau.map(g => g.P[k]))].sort((a, b) => a - b); console.log(k.padEnd(18), 'plateau values', v.join(','), '| median', v[Math.floor((v.length - 1) / 2)]); }
  // Robustness: share of plateau settings for each value.
  for (const k of keys) console.log('  share', k, GRID[k].map(v => `${v}:${plateau.filter(g => g.P[k] === v).length}`).join(' '));
  const cur = run({}); console.log(`\ncurrent PARAMS: ${cur.filter(x => x.ok).length}/${tuned.length}`);
  for (const x of cur.filter(x => !x.ok)) console.log('  FAIL', x.f.id, x.r.decision, x.r.destinationId || '', x.r.sectionId || '', x.r.reason, 'top=' + x.r.candidates.slice(0, 3).map(c => c.id + ':' + c.score).join(' '));
})();
