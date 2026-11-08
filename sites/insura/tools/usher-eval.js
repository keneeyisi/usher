#!/usr/bin/env node
// Generic Usher evaluation harness (spec 7.2/7.3). usage: NODE_PATH=... node tools/usher-eval.js <siteDir> <items.json> --out <prefix> [--label tuned|heldout]
// Conditions: (a) site search BM25 over visible text (the site's own assets/site-search.js); (a') BM25 + hidden descriptions/aliases; (b) semantic ranked list (no policy); (c) Usher decision (frozen CivicSphere params).
const fs = require('fs'), path = require('path');
const site = path.resolve(process.argv[2]), itemsFile = process.argv[3]; const oi = process.argv.indexOf('--out'); const outPrefix = oi > 0 ? process.argv[oi + 1] : null;
const T = path.join(site, 'tools'), SS = require(path.join(site, 'assets', 'site-search.js'));
const { wilson, mcnemar } = require(path.join(__dirname, '..', 'eval', 'harness', 'lib', 'stats.js'));
const G = require(path.join(site, 'usher', 'usher-engine.js'));
const profile = JSON.parse(fs.readFileSync(path.join(site, 'usher-profile.json'), 'utf8')), engine = G.createEngine(profile);
const index = engine.decodeIndex(JSON.parse(fs.readFileSync(path.join(site, 'usher-index.json'), 'utf8')));
const E = require(path.join(T, 'usher-embedder-node.js'))(path.join(site, 'models'));
const docs = JSON.parse(fs.readFileSync(path.join(site, 'search-docs.json'), 'utf8'));
const extra = {}; for (const d of profile.destinations) extra[d.id] = [...(d.descriptions || []), ...(d.aliases || [])];
const bmA = SS.build(docs), bmB = SS.build(docs, { extra });
const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8')).items;
const byId = Object.fromEntries(profile.destinations.map(d => [d.id, d]));
const pct = (k, n) => n ? (100 * k / n).toFixed(1) + '%' : 'n/a'; const ci = (k, n) => { if (!n) return 'n/a'; const [l, h] = wilson(k, n); return `${(100 * k / n).toFixed(1)}% [${(100 * l).toFixed(0)}-${(100 * h).toFixed(0)}] (${k}/${n})`; };
(async () => {
  const rows = [];
  for (const it of items) {
    const ok = id => id === it.expectedDestinationId || (it.acceptableDestinationIds || []).includes(id);
    const a = bmA.search(it.query, 10), b2 = bmB.search(it.query, 10), v = await E.embedQuery(it.query), rk = engine.rankDestinations(v, index, { k: 10 }), r = engine.resolveSemantic(it.query, v, index);
    const okL = id => ok(id) || (it.twinDestinationIds || []).includes(id); const hitL = (list) => list.slice(0, 1).some(x => okL(x.id));
    const hit = (list, k) => list.slice(0, k).some(x => ok(x.id));
    const overlapToks = (() => { const g = byId[it.expectedDestinationId]; if (!g) return null; const q = new Set(SS.tokenize(it.query)); const lab = new Set(SS.tokenize(g.title + ' ' + (it.expectedSectionId ? (g.sections.find(s => s.id === it.expectedSectionId) || {}).label || '' : ''))); let n = 0; for (const t of lab) if (q.has(t)) n++; return n; })();
    const row = { id: it.id, query: it.query, gold: it.expectedDecision, goldDest: it.expectedDestinationId || null, goldSection: it.expectedSectionId || null, overlap: overlapToks,
      a: { top: a[0] && a[0].id, h1: hit(a, 1), h3: hit(a, 3), h5: hit(a, 5), sec: a[0] && it.expectedSectionId ? a[0].sectionAnchor === it.expectedSectionId : null },
      a2: { top: b2[0] && b2[0].id, h1: hit(b2, 1), h3: hit(b2, 3), h5: hit(b2, 5), sec: b2[0] && it.expectedSectionId ? b2[0].sectionAnchor === it.expectedSectionId : null },
      b: { top: rk[0] && rk[0].id, h1: hit(rk, 1), h3: hit(rk, 3), h5: hit(rk, 5) },
      c: { decision: r.decision, dest: r.destinationId, section: r.sectionId, reason: r.reason, options: r.clarification ? r.clarification.options.map(o => o.id) : [] } };
    const c = row.c;
    if (it.expectedDecision === 'navigate') { row.c.correctNav = c.decision === 'navigate' && ok(c.dest); row.c.wrongNav = c.decision === 'navigate' && !ok(c.dest); row.c.clarified = c.decision === 'clarify'; row.c.offersGold = c.decision === 'clarify' && c.options.some(ok); row.c.rejected = c.decision === 'reject';
      row.c.sec = it.expectedSectionId ? (row.c.correctNav && (c.section === it.expectedSectionId || (it.acceptableSectionIds || []).includes(c.section))) : null; row.c.within1 = row.c.correctNav || row.c.offersGold; }
    else if (it.expectedDecision === 'clarify') { row.c.correct = c.decision === 'clarify'; row.c.offersGold = c.decision === 'clarify' && c.options.some(o => (it.expectedOptionIds || []).includes(o)); row.c.wrongNav = c.decision === 'navigate'; }
    else { row.c.correct = c.decision === 'reject'; row.c.wrongNav = c.decision === 'navigate'; }
    row.lenient = { a: hitL(a), a2: hitL(b2), b: hitL(rk), cCorrect: c.decision === 'navigate' && okL(c.dest), cWrong: c.decision === 'navigate' && !okL(c.dest) };
    rows.push(row);
  }
  const nav = rows.filter(r => r.gold === 'navigate'), cla = rows.filter(r => r.gold === 'clarify'), rej = rows.filter(r => r.gold === 'reject'); const N = rows.length, nn = nav.length; const sum = (l, f) => l.filter(f).length;
  const S = { n: N, nNavigate: nn, nClarify: cla.length, nReject: rej.length };
  for (const k of ['a', 'a2', 'b']) S[k] = { page: ci(sum(nav, r => r[k].h1), nn), hit3: ci(sum(nav, r => r[k].h3), nn), hit5: ci(sum(nav, r => r[k].h5), nn) };
  for (const k of ['a', 'a2']) { const w = nav.filter(r => r.goldSection); S[k].section = ci(sum(w, r => r[k].sec), w.length); }
  const w = nav.filter(r => r.goldSection); const goldAll = rows.filter(r => r.gold !== 'navigate' || true);
  S.c = { pageAccuracyNavItems: ci(sum(nav, r => r.c.correctNav), nn), section: ci(sum(w, r => r.c.sec), w.length),
    wrongDestinationAllItems: ci(sum(rows, r => r.c.wrongNav), N), wrongDestinationNavItems: ci(sum(nav, r => r.c.wrongNav), nn),
    clarificationRateAll: ci(sum(rows, r => r.c.decision === 'clarify'), N), clarifiedOnNavItems: ci(sum(nav, r => r.c.clarified), nn),
    clarificationsOfferingGold: ci(sum(rows.filter(r => r.c.decision === 'clarify'), r => r.c.offersGold), sum(rows, r => r.c.decision === 'clarify')),
    within1stepNavItems: ci(sum(nav, r => r.c.within1), nn), rejectionAccuracy: ci(sum(rej, r => r.c.correct), rej.length), falseRejectOnNavItems: ci(sum(nav, r => r.c.rejected), nn),
    clarifyItemsClarified: ci(sum(cla, r => r.c.correct), cla.length), decisionCorrectAll: ci(sum(rows, r => r.gold === 'navigate' ? r.c.correctNav : r.c.correct), N) };
  S.lenientTwinPages = { note: 'twin cover/claim pages also accepted (item field twinDestinationIds); strict numbers above are the headline', a: ci(sum(nav, r => r.lenient.a), nn), a2: ci(sum(nav, r => r.lenient.a2), nn), b: ci(sum(nav, r => r.lenient.b), nn), usherCorrectNav: ci(sum(nav, r => r.lenient.cCorrect), nn), usherWrongNav: ci(sum(nav, r => r.lenient.cWrong), nn) };
  // paired McNemar on navigate-gold items: correct page (a, a2 top-1; b top-1; c committed correct navigation)
  const vec = { a: nav.map(r => r.a.h1), a2: nav.map(r => r.a2.h1), b: nav.map(r => r.b.h1), c: nav.map(r => r.c.correctNav) };
  S.mcnemar = {}; for (const [x, y] of [['c', 'a'], ['c', 'a2'], ['c', 'b'], ['b', 'a2'], ['a2', 'a']]) S.mcnemar[`${x}_vs_${y}`] = mcnemar(vec[x], vec[y]);
  S.within1stepVsBaseline = { usherWithin1: pct(sum(nav, r => r.c.within1), nn), baselineA_hit3: pct(sum(nav, r => r.a.h3), nn), baselineA2_hit3: pct(sum(nav, r => r.a2.h3), nn), semantic_hit3: pct(sum(nav, r => r.b.h3), nn) };
  const strata = { '0': [], '1': [], '2+': [] }; for (const r of nav) strata[r.overlap >= 2 ? '2+' : String(r.overlap)].push(r);
  S.byLabelOverlap = {}; for (const [k, l] of Object.entries(strata)) S.byLabelOverlap[k] = { n: l.length, a: pct(sum(l, r => r.a.h1), l.length), a2: pct(sum(l, r => r.a2.h1), l.length), b: pct(sum(l, r => r.b.h1), l.length), usherCorrectNav: pct(sum(l, r => r.c.correctNav), l.length), usherWrongNav: pct(sum(l, r => r.c.wrongNav), l.length) };
  const out = { site: profile.site.id, itemsFile: path.basename(itemsFile), itemsSha256: require('crypto').createHash('sha256').update(fs.readFileSync(itemsFile)).digest('hex'), indexTextsHash: JSON.parse(fs.readFileSync(path.join(site, 'usher-index.json'), 'utf8')).textsHash, summary: S, rows };
  if (outPrefix) { fs.writeFileSync(outPrefix + '.json', JSON.stringify(out, null, 1)); }
  console.log(JSON.stringify(S, null, 1));
  if (process.argv.includes('--failures')) for (const r of rows) { const bad = r.gold === 'navigate' ? !r.c.correctNav : !r.c.correct; if (bad) console.log('FAIL', r.id, JSON.stringify(r.query), '| gold', r.gold, r.goldDest || '', '| got', r.c.decision, r.c.dest || r.c.options.join(','), r.c.reason, '| a:', r.a.top, 'b:', r.b.top); }
})();
