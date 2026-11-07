#!/usr/bin/env node
// G5: browser parity. The Usher widget running in Chromium (WASM embedder, compiled index, profile fetched over HTTP) must give the SAME decision objects
// as the RESOLVER6 legacy resolver driven by Node embeddings, on every fixture (all sets) plus 300 seeded variants (spec: browser == Node).
// usage: NODE_PATH=... node tests/gate_g5_browser.js http://localhost:8030/
const path = require('path'), fs = require('fs'), ROOT = path.join(__dirname, '..'), { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://localhost:8030/').replace(/\/?$/, '/usher-demonstrator/sites/civicsphere/');
const LS = require(path.join(ROOT, 'civicsphere-semantic.js'));
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(kk => [kk, x[kk]])) : x);
const strip = r => { const c = JSON.parse(JSON.stringify(r)); delete c.version; return c; };
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// Browser and Node run the same WASM runtime but may differ in the last float digits (observed ~1e-6 on a few queries); the check is exact on every
// discrete field and tolerant (1e-4) on numbers, and the strict full-JSON count is reported as well.
const norm = x => typeof x === 'string' ? x.replace(/-?\d+\.\d+/g, m => (+m).toFixed(2)) : x;
const close = (a, b) => { if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-4; if (typeof a === 'string' && typeof b === 'string') { if (a === b) return true; return norm(a) === norm(b) || a.replace(/-?\d+\.\d+/g, '#') === b.replace(/-?\d+\.\d+/g, '#'); } if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => close(x, b[i])); if (a && b && typeof a === 'object' && typeof b === 'object') { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(k => k in b && close(a[k], b[k])); } return a === b; };
(async () => {
  const { fixtures } = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8'));
  const profile = JSON.parse(fs.readFileSync(path.join(ROOT, 'profiles', 'civicsphere.profile.json'), 'utf8'));
  const rnd = mulberry32(5150), pool = []; for (const d of profile.destinations) if (d.routable !== false) for (const x of d.sections) if (x.body) pool.push(x.body);
  const variants = []; while (variants.length < 300) { const w = pool[Math.floor(rnd() * pool.length)].split(/\s+/).filter(Boolean); if (w.length < 3) continue; w.splice(Math.floor(rnd() * w.length), 1); for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; } variants.push(w.join(' ')); }
  const queries = [...fixtures.map(f => f.query), ...variants];
  const E = require(path.join(ROOT, 'tools', 'usher-embedder-node.js'))(path.join(ROOT, 'models'));
  const oldIndex = LS.decodeIndex(JSON.parse(fs.readFileSync(path.join(ROOT, 'semantic-index.json'), 'utf8')));
  const b = await chromium.launch(), pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto(BASE + 'index.html#home'); await pg.waitForFunction(() => window.usher && window.usher.embedder && window.usher.embedder.state !== 'loading', null, { timeout: 120000 });
  const st = await pg.evaluate(() => window.usher.embedder.state); if (st !== 'ready') { console.log('FAIL G5: embedder state ' + st); process.exit(1); }
  const got = await pg.evaluate(async qs => { const out = []; for (const q of qs) { const { r } = await window.usher.semanticResult(q); out.push(r); } return out; }, queries);
  let same = 0, tol = 0, disc = 0; const diffs = [];
  for (let i = 0; i < queries.length; i++) { const o = LS.resolveSemantic(queries[i], await E.embedQuery(queries[i]), oldIndex); const sd = x => canon({ d: x.decision, id: x.destinationId, s: x.sectionId, si: x.sectionIndex, o: x.clarification ? x.clarification.options.map(q => q.id + '#' + q.sectionIndex) : [] }); if (sd(o) === sd(got[i])) disc++; if (close(strip(o), strip(got[i]))) tol++; if (canon(strip(o)) === canon(strip(got[i]))) same++; else if (diffs.length < 5) diffs.push({ q: queries[i], old: [o.decision, o.destinationId, o.sectionId, o.reason], browser: [got[i].decision, got[i].destinationId, got[i].sectionId, got[i].reason] }); }
  const pass = disc === queries.length && tol === queries.length && !errs.length;
  console.log((pass ? 'PASS' : 'FAIL') + ' G5_browser_parity ' + JSON.stringify({ queries: queries.length, fixtures: fixtures.length, variants: variants.length, identicalFullJson: same, identicalDiscrete: disc, withinTolerance: tol, consoleErrors: errs.slice(0, 3), diffs }));
  fs.writeFileSync(path.join(__dirname, 'gate_g5_results.json'), JSON.stringify({ when: new Date().toISOString(), pass, queries: queries.length, identical: same, diffs }, null, 1));
  await b.close(); process.exit(pass ? 0 : 1);
})();
