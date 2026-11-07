#!/usr/bin/env node
// usher compile: profile (usher-profile/0.1) -> semantic index (usher-index/0.1).
//   node tools/usher-compile.js <profile.json> [--out index.json] [--models ./models] [--check]
//   --check  only verifies that an existing index matches the profile (no model needed): exit 1 if stale.
// Runs validation first (errors stop the build, warnings are printed). Offline, deterministic: same profile + same model files -> same bytes.
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const G = require(path.join(__dirname, '..', 'usher', 'usher-engine.js'));
const args = process.argv.slice(2); const opt = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
const profilePath = args.find(a => a.endsWith('.json') && a !== opt('--out') && a !== opt('--models'));
if (!profilePath) { console.error('usage: usher-compile.js <profile.json> [--out index.json] [--models dir] [--check]'); process.exit(2); }
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const v = G.validateProfile(profile);
for (const w of v.warnings) console.log('WARN  ' + w);
if (!v.ok) { for (const e of v.errors) console.log('ERROR ' + e); console.error(`profile invalid: ${v.errors.length} error(s)`); process.exit(1); }
const engine = G.createEngine(profile);
const texts = engine.buildTexts(), hash = engine.textsHash(texts);
const out = path.resolve(opt('--out', path.join(path.dirname(profilePath), `usher-index.${profile.site.id}.json`)));
if (args.includes('--check')) {
  const j = JSON.parse(fs.readFileSync(out, 'utf8')); const ok = j.textsHash === hash && j.count === texts.length;
  console.log(`${ok ? 'FRESH' : 'STALE'}: index ${j.textsHash} (${j.count} texts), profile ${hash} (${texts.length} texts)`); process.exit(ok ? 0 : 1);
}
(async () => {
  const t0 = Date.now(), modelsDir = path.resolve(opt('--models', path.join(__dirname, '..', 'models')));
  const E = require('./usher-embedder-node.js')(modelsDir, opt('--model'));
  const vecs = await E.embedPassages(texts.map(t => t[2]));
  const flat = new Float32Array(texts.length * E.MODEL.dim); vecs.forEach((x, i) => flat.set(x, i * E.MODEL.dim));
  const model = Object.assign({}, E.MODEL, { indexFile: path.basename(out) });
  const json = { format: G.INDEX_FORMAT, site: profile.site.id, model, dim: E.MODEL.dim, count: texts.length, textsHash: hash, texts, vectors: Buffer.from(flat.buffer).toString('base64') };
  fs.writeFileSync(out, JSON.stringify(json));
  const sha = crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
  console.log(`${E.MODEL.id} ${E.MODEL.dtype}: ${texts.length} texts in ${Date.now() - t0} ms -> ${out} (${(fs.statSync(out).size / 1e6).toFixed(2)} MB), hash ${hash}, sha256 ${sha}`);
})().catch(e => { console.error(e); process.exit(1); });
