#!/usr/bin/env node
// Regression gate for RESOLVER7_GP (Usher on the CivicSphere profile must equal RESOLVER6). Node part: G1, G2, G3, G4, G7 (+ lexical and ranked-list equivalence, explain equivalence).
// G5 (Node/browser parity) and G6 (UI suites) run in the browser harness (tests/gate_g5_browser.js and the UI suites). Usage: NODE_PATH=<work>/node_modules node tests/gate_g1_g7.js [--json out.json]
const path = require('path'), fs = require('fs'), crypto = require('crypto'), cp = require('child_process');
const ROOT = path.join(__dirname, '..'), T = __dirname;
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const EXP = JSON.parse(fs.readFileSync(path.join(T, 'gate_expected.json'), 'utf8'));
const G = require(path.join(ROOT, 'usher', 'usher-engine.js'));
const LC = require(path.join(ROOT, 'civicsphere-core.js')), LS = require(path.join(ROOT, 'civicsphere-semantic.js')), LX = require(path.join(ROOT, 'civicsphere-explain.js'));
const check = require(path.join(T, 'fixture_check.js'));
const profile = JSON.parse(fs.readFileSync(path.join(ROOT, 'profiles', 'civicsphere.profile.json'), 'utf8'));
const engine = G.createEngine(profile);
const results = {}; const log = (id, pass, detail) => { results[id] = { pass: !!pass, detail }; console.log((pass ? 'PASS ' : 'FAIL ') + id.padEnd(34) + ' ' + JSON.stringify(detail).slice(0, 400)); };
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(kk => [kk, x[kk]])) : x);
const strip = r => { const c = JSON.parse(JSON.stringify(r)); delete c.version; return c; };
const discrete = r => ({ decision: r.decision, destinationId: r.destinationId, sectionIndex: r.sectionIndex, sectionId: r.sectionId, reason: r.reason, options: r.clarification ? r.clarification.options.map(o => o.id + '#' + o.sectionIndex) : [] });
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

(async () => {
  // ---- G1: legacy files untouched ----
  { const bad = []; for (const [f, h] of Object.entries(EXP.legacySha256)) if (sha(path.join(ROOT, f)) !== h) bad.push(f);
    const files = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else files.push(p); } })(path.join(ROOT, 'models'));
    const tree = crypto.createHash('sha256').update(files.map(f => sha(f) + '  ' + path.relative(ROOT, f)).sort((a, b) => a.split('  ')[1] < b.split('  ')[1] ? -1 : 1).join('\n') + '\n').digest('hex');
    // same recipe as when recorded: sha256 of the sorted "sha  path" listing produced by `find models -type f | xargs sha256sum | sort -k2`
    const listing = cp.execSync('find models -type f | xargs sha256sum | sort -k2', { cwd: ROOT }).toString(); const tree2 = crypto.createHash('sha256').update(listing).digest('hex');
    log('G1_legacy_files_untouched', !bad.length && tree2 === EXP.modelsTreeSha256, { changed: bad, files: Object.keys(EXP.legacySha256).length, modelsTree: tree2 === EXP.modelsTreeSha256 }); }

  // ---- queries ----
  const { fixtures } = JSON.parse(fs.readFileSync(path.join(T, 'fixtures.json'), 'utf8'));
  const dummy = JSON.parse(fs.readFileSync(path.join(T, 'dummy_queries.json'), 'utf8'));
  const rnd = mulberry32(20261019), pick = a => a[Math.floor(rnd() * a.length)];
  const pool = []; for (const d of profile.destinations) if (d.routable !== false) { for (const t of d.descriptions || []) pool.push(t); for (const t of d.aliases || []) pool.push(t); for (const x of d.sections) { if (x.body) pool.push(x.body); for (const t of x.descriptions || []) pool.push(t); } }
  const variants = [];
  while (variants.length < 2000) {
    const toks = pick(pool).split(/\s+/).filter(Boolean); if (toks.length < 2) continue; let w = toks.slice(); const mode = Math.floor(rnd() * 3);
    if (mode === 0) { const n = 1 + Math.floor(rnd() * Math.min(2, w.length - 1)); for (let i = 0; i < n; i++) w.splice(Math.floor(rnd() * w.length), 1); }
    else if (mode === 1) { for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; } }
    else { const n = 1 + Math.floor(rnd() * Math.min(2, w.length - 1)); for (let i = 0; i < n; i++) w.splice(Math.floor(rnd() * w.length), 1); for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; } }
    variants.push(w.join(' '));
  }
  const queries = [...fixtures.map(f => ({ q: f.query, src: f.set })), ...dummy.map(q => ({ q, src: 'dummy' })), ...variants.map(q => ({ q, src: 'variant' }))];
  const E = require(path.join(ROOT, 'tools', 'usher-embedder-node.js'))(path.join(ROOT, 'models'));
  const oldIndex = LS.decodeIndex(JSON.parse(fs.readFileSync(path.join(ROOT, 'semantic-index.json'), 'utf8')));
  const newJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'usher-index.civicsphere.json'), 'utf8')); const newIndex = engine.decodeIndex(newJson);

  // ---- G3: index equivalence ----
  { const oldJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'semantic-index.json'), 'utf8')); const m1 = Object.assign({}, oldJson.model), m2 = Object.assign({}, newJson.model); delete m1.indexFile; delete m2.indexFile;
    const tmp = path.join(require('os').tmpdir(), 'usher_recompile_' + process.pid + '.json');
    cp.execSync(`node tools/usher-compile.js profiles/civicsphere.profile.json --out ${tmp}`, { cwd: ROOT, stdio: 'pipe', env: process.env }); const re = JSON.parse(fs.readFileSync(tmp, 'utf8')); fs.unlinkSync(tmp);
    const ok = canon(oldJson.texts) === canon(newJson.texts) && oldJson.textsHash === newJson.textsHash && newJson.textsHash === EXP.textsHash && newJson.count === EXP.textCount && oldJson.vectors === newJson.vectors && canon(m1) === canon(m2) && oldJson.dim === newJson.dim && re.vectors === newJson.vectors && canon(re.texts) === canon(newJson.texts) && !newIndex.stale;
    log('G3_index_equivalence', ok, { texts: newJson.count, hash: newJson.textsHash, textsEqual: canon(oldJson.texts) === canon(newJson.texts), vectorsByteIdentical: oldJson.vectors === newJson.vectors, recompileIdentical: re.vectors === newJson.vectors, fresh: !newIndex.stale, formatField: oldJson.format + ' -> ' + newJson.format }); }

  // ---- G2: decision equivalence ----
  const t0 = Date.now(); const stats = {}; let full = 0, disc = 0, lexEq = 0, rankEq = 0, n = 0; const diffs = []; const store = []; const explDiffs = [];
  for (const { q, src } of queries) {
    const v = await E.embedQuery(q);
    const o = LS.resolveSemantic(q, v, oldIndex), nw = engine.resolveSemantic(q, v, newIndex);
    n++; stats[src] = stats[src] || { n: 0, same: 0 }; stats[src].n++;
    const same = canon(strip(o)) === canon(strip(nw)); const dsame = canon(discrete(o)) === canon(discrete(nw));
    if (same) { full++; stats[src].same++; } else if (diffs.length < 8) diffs.push({ q, src, old: discrete(o), nw: discrete(nw), rawEqualExceptDiscrete: dsame });
    if (dsame) disc++;
    const lo = LC.resolveGoal(q), ln = engine.resolveGoal(q); if (canon(strip(lo)) === canon(strip(ln))) lexEq++;
    const ro = LC.rankDestinations(v, oldIndex, { k: 10 }), rn = engine.rankDestinations(v, newIndex, { k: 10 }); if (canon(ro) === canon(rn)) rankEq++;
    // explanation layer: same text from the same result
    if (src !== 'variant' || n % 10 === 0) { const eo = [LX.interpret(LC, o), LX.bridge(LC, o), LX.whyHere(LC, o), LX.situation(LC, o)]; store.push({ q, nw, eo }); }
    store.length > 400 && store.shift();
  }
  const ok2 = full === n && disc === n;
  log('G2_decision_equivalence', ok2, { queries: n, fullJsonIdentical: full, discreteIdentical: disc, perSet: stats, lexicalFallbackIdentical: lexEq + '/' + n, rankedListIdentical: rankEq + '/' + n, ms: Date.now() - t0, firstDiffs: diffs });
  log('G2b_lexical_and_ranked', lexEq === n && rankEq === n, { lexEq, rankEq, n });
  writeStore = store; // used by explain gate in tests/gate_explain.js via the saved file
  fs.writeFileSync(path.join(T, '.gate_explain_cache.json'), JSON.stringify(store));

  // ---- G4: published results reproduce (through the Usher engine) ----
  { const rows = {}; for (const f of fixtures) { const v = await E.embedQuery(f.query); const r = engine.resolveSemantic(f.query, v, newIndex);
      const probs = check(f, Object.assign({}, r, { options: r.clarification ? r.clarification.options.map(o => o.id) : [] }), engine); rows[f.set] = rows[f.set] || [0, 0]; rows[f.set][1]++; if (!probs.length) rows[f.set][0]++; }
    const ok = Object.entries(EXP.published).every(([s, [p, t]]) => rows[s] && rows[s][0] === p && rows[s][1] === t);
    log('G4_published_results_reproduce', ok, { got: rows, expected: EXP.published }); }

  // ---- G7: frozen sets stay frozen ----
  { const out = {}; let ok = true;
    for (const s of ['heldout_r4', 'heldout_r5', 'heldout_r6']) { const sub = fixtures.filter(f => f.set === s); const h = cp.execSync(`python3 -c "import json,hashlib,sys;d=json.load(sys.stdin);print(hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest())"`, { input: JSON.stringify(sub) }).toString().trim(); out[s] = h === EXP.heldoutFrozenSha256[s]; if (!out[s]) ok = false; }
    for (const s of ['heldout_r4', 'heldout_r5', 'heldout_r6']) { let copy = JSON.parse(fs.readFileSync(path.join(T, `${s}_fixtures_frozen_copy.json`), 'utf8')); if (copy && !Array.isArray(copy) && copy.fixtures) copy = copy.fixtures.filter(f => f.set === s); const sub = fixtures.filter(f => f.set === s); out[s + '_equals_frozen_copy'] = canon(copy) === canon(sub); if (!out[s + '_equals_frozen_copy']) ok = false; }
    out.fixturesJsonSha256 = sha(path.join(T, 'fixtures.json')) === EXP.fixturesJsonSha256; if (!out.fixturesJsonSha256) ok = false;
    out.note_r3 = 'heldout_r3: no per-set frozen hash on record; fixtures.json file hash unchanged (covers r3)';
    log('G7_frozen_sets_unchanged', ok, out); }

  const failed = Object.entries(results).filter(([, v]) => !v.pass).map(([k]) => k);
  console.log(`\nGATE (Node part) ${failed.length ? 'FAILED: ' + failed.join(', ') : 'PASSED'}  (G5 browser parity and G6 UI suites run separately)`);
  const jo = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null; if (jo) fs.writeFileSync(jo, JSON.stringify({ when: new Date().toISOString(), results }, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
