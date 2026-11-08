/* R6.2: checks the presentation-layer explanations over every fixture (semantic and lexical results).
   - the resolver result is NOT modified by the explanation layer (deep-equal before/after)
   - interpretation: hedged ("It sounds like"), contexts only when their cue words are in the query, no "undefined"
   - bridge: the phrase is the user's own words (substring of the normalised query) and differs from the official label
   - Why here: at most 2 lines, each short; situation: never on a rejection or when the answer is the saved item itself
   Usage: node tests/run_explain_tests.js [--md out.md] */
const fs = require('fs'), path = require('path'); const B = path.join(__dirname, '..');
const C = require(B + '/civicsphere-core.js'), S = require(B + '/civicsphere-semantic.js'), X = require(B + '/civicsphere-explain.js'), E = require(B + '/tools/node_embedder.js');
const index = S.decodeIndex(JSON.parse(fs.readFileSync(B + '/semantic-index.json', 'utf8')));
const { fixtures } = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8'));
const mdOut = process.argv.includes('--md') ? process.argv[process.argv.indexOf('--md') + 1] : null;
const CUES = { "you've moved house": /\b(moved|relocated|new (house|home|flat|address))\b/, "you're moving house": /\bmoving\b/, "you've lost your job": /\b(job|work|unemployed|redundan)/, "you're finding it hard to pay": /\b(struggl|afford|behind)/, 'you rent your home': /\b(landlord|rent|tenant)/, "you've had a baby": /\bbaby\b/, 'someone has died': /\b(mum|mom|mother|dad|father|husband|wife|partner|son|daughter|brother|sister|gran|nan|grandma|grandmother|grandad|grandfather|grandparent|parent|relative|friend|neighbour|aunt|uncle|child|baby|member|someone) (has |have |had |just )*(died|passed away)\b|\bdeath of (my|our|a|his|her)\b|bereave/ };
(async () => {
  const problems = [], rows = []; let n = 0, withBridge = 0, withSitu = 0;
  for (const f of fixtures) for (const mode of ['semantic', 'lexical']) {
    let r; if (mode === 'semantic') { const v = (await E.embed([f.query]))[0]; r = S.resolveSemantic(f.query, v, index); } else { r = C.resolveGoal(f.query); r.mode = 'lexical'; }
    const before = JSON.stringify(r); n++;
    const it = X.interpret(C, r), br = X.bridge(C, r), why = X.whyHere(C, r), si = X.situation(C, r);
    if (JSON.stringify(r) !== before) problems.push([f.id, mode, 'result mutated']);
    const all = JSON.stringify({ it, br, why, si });
    if (/undefined|NaN|\[object|null\)/.test(all)) problems.push([f.id, mode, 'bad token', all.slice(0, 200)]);
    if (it && r.decision !== 'reject' && !/^(It sounds like|I need a little more detail|That could fit)/.test(it.text)) problems.push([f.id, mode, 'unhedged interpretation', it.text]);
    for (const c of (it && it.contexts) || []) if (!CUES[c] || !CUES[c].test(r.normalised)) problems.push([f.id, mode, 'context without cue', c]);
    if (br) { for (const k of ['page', 'section']) { const b = br[k]; if (!b) continue; if (!(' ' + r.normalised + ' ').includes(' ' + b.phrase + ' ')) problems.push([f.id, mode, 'bridge phrase not user words', b.phrase]); const L = new Set(C.normalise(b.label).split(' ').map(C.stem)); if (!C.normalise(b.phrase).split(' ').some(w => !L.has(C.stem(w)))) problems.push([f.id, mode, 'bridge shown but same words', b.phrase + ' / ' + b.label]); } withBridge++; }
    if (why.length > 2 || why.some(l => l.length > 220)) problems.push([f.id, mode, 'why too long', why]);
    if (si.length) { withSitu++; if (r.decision === 'reject' || si.some(x => x.savedId === r.destinationId)) problems.push([f.id, mode, 'situation misuse']); }
    if (mode === 'semantic') rows.push(`| ${f.id} | ${r.decision}${r.destinationId ? ' → ' + r.destinationId + (r.sectionLabel ? ' · ' + r.sectionLabel : '') : ''} | ${(it && it.text || '').replace(/\|/g, '/')} | ${br ? [br.page && `“${br.page.phrase}” → ${br.page.label}`, br.section && `“${br.section.phrase}” → ${br.section.label}`].filter(Boolean).join('; ') : ''} | ${why.join(' ').replace(/\|/g, '/')} | ${si.length ? 'saved parking app' : ''} |`);
  }
  if (mdOut) fs.writeFileSync(mdOut, `# R6.2 explanations for every fixture (semantic mode)\n\n| fixture | decision | interpretation | terminology bridge | why here | situation |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n`);
  problems.forEach(p => console.log('PROBLEM', JSON.stringify(p)));
  console.log(`SUMMARY explain: ${n} results (165 fixtures x semantic+lexical) | problems ${problems.length} | with bridge ${withBridge} | with situation note ${withSitu}`);
  process.exitCode = problems.length ? 1 : 0;
})();
