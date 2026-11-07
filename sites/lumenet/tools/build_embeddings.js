#!/usr/bin/env node
// Offline: embed every destination/section description into semantic-index.json (run after editing descriptions).
// Usage: node tools/build_embeddings.js   (CIVIC_MODEL=<key> builds semantic-index.<key>.json for a non-default model)
const path = require('path'), fs = require('fs');
const S = require(path.join(__dirname, '..', 'civicsphere-semantic.js'));
const E = require('./node_embedder.js');
(async () => {
  const t0 = Date.now();
  const texts = S.buildTexts();
  const vecs = await E.embedPassages(texts.map(t => t[2]));
  const flat = new Float32Array(texts.length * S.MODEL.dim);
  vecs.forEach((v, i) => flat.set(v, i * S.MODEL.dim));
  const out = { format: 'civicsphere-semantic-index/1', model: S.MODEL, dim: S.MODEL.dim, count: texts.length, textsHash: S.textsHash(texts),
    texts, vectors: Buffer.from(flat.buffer).toString('base64') };
  const file = path.join(__dirname, '..', S.MODEL.indexFile);
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(`${S.MODEL.id}: embedded ${texts.length} texts in ${Date.now() - t0} ms -> ${S.MODEL.indexFile} (${(fs.statSync(file).size / 1e6).toFixed(2)} MB), hash ${out.textsHash}`);
})().catch(e => { console.error(e); process.exit(1); });
