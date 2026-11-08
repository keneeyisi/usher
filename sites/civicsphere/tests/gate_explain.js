#!/usr/bin/env node
// G2c: the explanation layer (interpret, bridge, whyHere, situation) of Usher equals the RESOLVER6.2 one on the same results.
// Needs tests/.gate_explain_cache.json written by gate_g1_g7.js (results of the gate queries + the legacy explanation output).
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const G = require(path.join(ROOT, 'usher', 'usher-engine.js')), GX = require(path.join(ROOT, 'usher', 'usher-explain.js'));
const profile = JSON.parse(fs.readFileSync(path.join(ROOT, 'profiles', 'civicsphere.profile.json'), 'utf8'));
const engine = G.createEngine(profile), X = GX.createExplain(profile);
const store = JSON.parse(fs.readFileSync(path.join(__dirname, '.gate_explain_cache.json'), 'utf8'));
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(kk => [kk, x[kk]])) : x);
let same = 0; const bad = [];
for (const { q, nw, eo } of store) {
  const en = [X.interpret(engine, nw), X.bridge(engine, nw), X.whyHere(engine, nw), X.situation(engine, nw).map(o => { const c = Object.assign({}, o); delete c.label; return c; })];
  if (canon(en) === canon(eo)) same++; else if (bad.length < 3) bad.push({ q, old: eo, now: en });
}
console.log(`${same === store.length ? 'PASS' : 'FAIL'} G2c_explain_equivalence  ${same}/${store.length} identical`);
if (bad.length) console.log(JSON.stringify(bad, null, 1).slice(0, 2000));
process.exit(same === store.length ? 0 : 1);
