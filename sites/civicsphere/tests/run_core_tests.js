#!/usr/bin/env node
// Regression harness (no browser). Default: RESOLVER6 semantic resolver with the same model as the browser.
// SETS=tuned,heldout_r5 (env) restricts the run, e.g. while tuning so that the newest held-out set stays unseen.
// Usage: node tests/run_core_tests.js [--lexical] [--verbose] [--json out.json]
//   --lexical  runs the RESOLVER3 lexical resolver (the browser fallback when the model cannot load)
// Exit code 1 if the catalogue/index is invalid or a TUNED fixture fails that is not in the documented known-failure list
// (a regression gate). Held-out sets are reported separately and never gate.
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'civicsphere-core.js'));
const S = require(path.join(ROOT, 'civicsphere-semantic.js'));
const checkFixture = require(path.join(__dirname, 'fixture_check.js'));
const { fixtures } = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8'));
const argv = process.argv.slice(2), lexical = argv.includes('--lexical'), verbose = argv.includes('--verbose');
const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const ALL_SETS = ['tuned', 'heldout_r6', 'heldout_r5', 'heldout_r4', 'heldout_r3'];
const SETS = process.env.SETS ? process.env.SETS.split(',') : ALL_SETS; // e.g. SETS=tuned,heldout_r5 while tuning (keeps heldout_r6 unseen)
// Documented tuned failures at release (see RESEARCH_DEVELOPMENT_LOG.md, 9 Oct 2026). The RESOLVER3 lexical fallback (used only when the
// meaning model cannot load) has no generic-action clarify, off-topic null class or meaning-based planning/employment matching,
// so it fails the RESOLVER6 tuned additions T15/T19/T20 by design.
const KNOWN_TUNED_FAILURES = lexical ? ['T12_new_passport', 'T15_generic_dispute', 'T19_comment_next_door_plans', 'T20_back_to_work_not_resume'] : [];

async function resolver() {
  if (lexical) return async q => C.resolveGoal(q);
  const E = require(path.join(ROOT, 'tools', 'node_embedder.js'));
  const index = S.decodeIndex(JSON.parse(fs.readFileSync(path.join(ROOT, S.MODEL.indexFile), 'utf8')));
  if (index.stale) throw new Error('semantic-index.json is stale: run node tools/build_embeddings.js');
  return async q => S.resolveSemantic(q, await E.embedQuery(q), index);
}
(async () => {
  const val = C.validateCatalogue();
  console.log(`CivicSphereNav ${C.VERSION} | mode ${lexical ? 'lexical (RESOLVER3 fallback)' : 'semantic (' + S.MODEL.id + ')'} | catalogue ${val.ok ? 'VALID' : 'INVALID'} ${JSON.stringify(val.counts)}`);
  if (!val.ok) console.log(val.errors.join('\n'));
  const resolve = await resolver();
  const rows = [];
  for (const f of fixtures.filter(f => SETS.includes(f.set))) {
    let r = {}, problems;
    try { r = await resolve(f.query); problems = checkFixture(f, Object.assign({}, r, { options: r.clarification ? r.clarification.options.map(o => o.id) : [] }), C); }
    catch (e) { problems = ['runtime error: ' + (e && e.stack || e)]; }
    rows.push({ id: f.id, set: f.set, query: f.query, pass: !problems.length, problems, decision: r.decision, destinationId: r.destinationId, sectionId: r.sectionId, sectionIndex: r.sectionIndex, confidence: r.confidence, reason: r.reason,
      options: r.clarification ? r.clarification.options.map(o => o.id) : [], top: (r.candidates || []).slice(0, 3).map(c => `${c.id}:${c.score}`) });
  }
  const summary = { version: C.VERSION, mode: lexical ? 'lexical' : 'semantic', catalogueValid: val.ok, sets: {}, rows };
  for (const set of SETS) {
    const rs = rows.filter(x => x.set === set); summary.sets[set] = { pass: rs.filter(x => x.pass).length, total: rs.length };
    console.log(`\n== ${set.toUpperCase()}: ${summary.sets[set].pass}/${rs.length} pass`);
    for (const x of rs) {
      const outcome = x.decision === 'navigate' ? `${x.destinationId}${x.sectionId ? '#' + x.sectionId : ''} (${Math.round((x.confidence || 0) * 100)}%)` : `${x.decision}:${x.reason}${x.options.length ? ' [' + x.options.join(', ') + ']' : ''}`;
      if (verbose || !x.pass || set !== 'tuned') console.log(`${x.pass ? 'PASS' : 'FAIL'}  ${x.id.padEnd(38)} ${outcome}${x.pass ? '' : '  <-- ' + x.problems.join('; ')}${verbose ? '  top=' + x.top.join(' ') : ''}`);
    }
  }
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(summary, null, 2));
  console.log('\nSUMMARY ' + SETS.map(s => `${s} ${summary.sets[s].pass}/${summary.sets[s].total}`).join(' | ') + ` | catalogue ${val.ok ? 'valid' : 'INVALID'}`);
  const regressions = rows.filter(x => x.set === 'tuned' && !x.pass && !KNOWN_TUNED_FAILURES.includes(x.id)).map(x => x.id);
  console.log(`known tuned failures: ${KNOWN_TUNED_FAILURES.join(', ') || 'none'} | regressions: ${regressions.join(', ') || 'none'}`);
  process.exit(!val.ok || regressions.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
