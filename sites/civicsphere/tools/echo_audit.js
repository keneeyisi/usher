#!/usr/bin/env node
// Echo audit: shared word n-grams between held-out queries and the catalogue descriptions (to check descriptions do not copy held-out wording).
// Usage: node tools/echo_audit.js [--json out.json]
const path = require('path'), fs = require('fs');
const S = require(path.join(__dirname, '..', 'civicsphere-semantic.js'));
const STOP = new Set('a an the i me my we our us you your to of and or for in on at with about is are am be been was were it this that do does did can could would should will what how who where when why which there here have has had not no but so if just get got want need know like some any help please from by as up out its into than then them they he she his her him one very im ive dont cant its theres whats'.split(' '));
const words = t => t.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
const grams = (w, n) => { const o = new Set(); for (let i = 0; i + n <= w.length; i++) { const g = w.slice(i, i + n); if (g.some(x => !STOP.has(x))) o.add(g.join(' ')); } return o; };
const texts = S.buildTexts().map(t => ({ id: t[0], words: words(t[2].replace(/^[^:]*:\s*/, '')) }));
const T3 = new Map(), T2 = new Map();
for (const t of texts) { for (const g of grams(t.words, 3)) T3.set(g, t.id); for (const g of grams(t.words, 2)) { const a = g.split(' '); if (!STOP.has(a[0]) && !STOP.has(a[1])) T2.set(g, t.id); } }
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tests', 'fixtures.json'), 'utf8')).fixtures.filter(f => f.set.startsWith('heldout'));
const out = [];
for (const f of fx) { const w = words(f.query); const tri = [...grams(w, 3)].filter(g => T3.has(g)); const bi = [...grams(w, 2)].filter(g => T2.has(g)); if (tri.length || bi.length) out.push({ set: f.set, id: f.id, trigrams: tri.map(g => `${g} [${T3.get(g)}]`), contentBigrams: bi.map(g => `${g} [${T2.get(g)}]`) }); }
for (const set of [...new Set(fx.map(f => f.set))]) { const rs = out.filter(o => o.set === set); console.log(`${set}: ${rs.filter(r => r.trigrams.length).length} queries share a word trigram, ${rs.filter(r => r.contentBigrams.length).length} share a content bigram (of ${fx.filter(f => f.set === set).length})`); for (const r of rs) console.log('   ', r.id, r.trigrams.length ? 'TRI ' + r.trigrams.join('; ') : '', r.contentBigrams.length ? 'BI ' + r.contentBigrams.join('; ') : ''); }
const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 2));
