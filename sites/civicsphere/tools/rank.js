#!/usr/bin/env node
// RESOLVER6 ranked-list mode (semantic-search baseline): top-k destinations with scores for each query, using the same model,
// descriptions and destination scoring rule as the resolver (CivicCore.rankDestinations). No thresholds, intents or clarify logic.
// Usage: node tools/rank.js [-k 10] [--json] "query one" ["query two" ...]     (or pipe one query per line on stdin)
// In the browser: CivicCore.rankDestinations(await CivicEmbedder.embed(q), CivicEmbedder.index, { k: 10 })
const path = require('path'), fs = require('fs');
const C = require(path.join(__dirname, '..', 'civicsphere-core.js'));
const S = require(path.join(__dirname, '..', 'civicsphere-semantic.js'));
const E = require('./node_embedder.js');
const a = process.argv.slice(2); const json = a.includes('--json'); const ki = a.indexOf('-k'); const k = ki >= 0 ? Number(a[ki + 1]) : 10;
let qs = a.filter((x, i) => x !== '--json' && !(ki >= 0 && (i === ki || i === ki + 1)));
(async () => {
  if (!qs.length) qs = fs.readFileSync(0, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  const index = S.decodeIndex(JSON.parse(fs.readFileSync(path.join(__dirname, '..', S.MODEL.indexFile), 'utf8')));
  if (index.stale) throw new Error('semantic-index.json is stale: run node tools/build_embeddings.js');
  const out = [];
  for (const q of qs) out.push({ query: q, model: S.MODEL.id, ranked: C.rankDestinations(await E.embedQuery(q), index, { k }) });
  if (json) console.log(JSON.stringify(out, null, 2));
  else for (const o of out) { console.log(o.query); for (const r of o.ranked) console.log(`  ${String(r.rank).padStart(2)}. ${r.score.toFixed(4)}  ${r.id}  (${r.path})`); }
})().catch(e => { console.error(e); process.exit(1); });
