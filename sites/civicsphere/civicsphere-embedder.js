/*
 * CivicSphereNav RESOLVER4/6: in-browser sentence embedder (ES module). R6: model settings (pooling, query prefix, index file) come from CivicSemantic.MODEL.
 * Loads the vendored transformers.js + ONNX Runtime WebAssembly engine and the local all-MiniLM-L6-v2 (q8) model,
 * plus the precomputed catalogue index (semantic-index.json). Nothing is fetched from the internet:
 * remote models are disabled and every file comes from this folder.
 * Exposes window.CivicEmbedder = { state, progress, loadMs, error, index, ready, embed(text), onchange(fn) }.
 * state: 'loading' -> 'ready' | 'failed'. The UI falls back to the RESOLVER3 lexical resolver when not ready.
 */
const S = window.CivicSemantic;
const params = new URLSearchParams(location.search);
const E = window.CivicEmbedder = { state: 'loading', progress: 0, stage: 'Starting', loadMs: null, error: null, index: null, model: S && S.MODEL, ready: null, embed: null, _fns: [] };
E.onchange = fn => { E._fns.push(fn); fn(E); };
const emit = () => { for (const fn of E._fns) { try { fn(E); } catch (e) { console.warn('CivicEmbedder listener error', e); } } };
const setP = (p, stage) => { E.progress = Math.max(E.progress, Math.min(100, Math.round(p))); if (stage) E.stage = stage; emit(); };

// Download with progress (bytes) so the UI can show "Preparing… x%".
async function fetchBytes(url, from, to, stage) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${url}: HTTP ${resp.status}`);
  const total = Number(resp.headers.get('Content-Length')) || 0;
  if (!resp.body || !total) { const b = new Uint8Array(await resp.arrayBuffer()); setP(to, stage); return b; }
  const reader = resp.body.getReader(); const chunks = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; setP(from + (to - from) * got / total, stage); }
  const out = new Uint8Array(got); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

E.ready = (async () => {
  const t0 = performance.now();
  if (!S) throw new Error('civicsphere-semantic.js not loaded');
  if (params.get('semantic') === 'off') throw new Error('meaning model disabled (?semantic=off)');
  // 1. Catalogue index (precomputed offline in Node with the same model).
  setP(1, 'Loading catalogue index');
  const json = JSON.parse(new TextDecoder().decode(await fetchBytes('./' + S.MODEL.indexFile, 1, 6, 'Loading catalogue index')));
  const index = S.decodeIndex(json);
  if (index.stale) throw new Error(`semantic-index.json is stale (index ${index.textsHash}, descriptions ${index.expectedHash}); run node tools/build_embeddings.js`);
  if (json.model.id !== S.MODEL.id || json.model.dtype !== S.MODEL.dtype) throw new Error('semantic-index.json was built with a different model');
  // 2. ONNX Runtime WebAssembly binary, prefetched so it does not depend on the server's .wasm MIME type.
  const wasm = await fetchBytes('./vendor/ort-wasm-simd-threaded.jsep.wasm', 6, 50, 'Loading inference engine');
  // 3. transformers.js, local files only.
  setP(50, 'Loading meaning model');
  const T = await import('./vendor/transformers.min.js');
  const env = T.env;
  env.allowRemoteModels = false; env.allowLocalModels = true; env.localModelPath = './models/'; env.useBrowserCache = false;
  // Local ONNX Runtime glue + binary (otherwise ORT would fetch the .mjs glue from a CDN).
  env.backends.onnx.wasm.wasmPaths = { mjs: new URL('./vendor/ort-wasm-simd-threaded.jsep.mjs', location.href).href, wasm: new URL('./vendor/ort-wasm-simd-threaded.jsep.wasm', location.href).href };
  env.backends.onnx.wasm.wasmBinary = wasm;
  env.backends.onnx.wasm.numThreads = 1;     // no SharedArrayBuffer / cross-origin isolation needed; matches the Node harness
  env.backends.onnx.wasm.proxy = false;
  const extractor = await T.pipeline('feature-extraction', S.MODEL.id, {
    dtype: S.MODEL.dtype, device: 'wasm',
    progress_callback: p => { if (p && p.status === 'progress' && /\.onnx$/.test(p.file || '') && p.total) setP(50 + 45 * p.loaded / p.total, 'Loading meaning model'); }
  });
  setP(96, 'Warming up');
  E.embed = async text => Array.from((await extractor((S.MODEL.queryPrefix || '') + String(text), { pooling: S.MODEL.pooling, normalize: S.MODEL.normalize })).data);
  await E.embed('warm up');
  E.index = index; E.loadMs = Math.round(performance.now() - t0); E.state = 'ready'; setP(100, 'Ready');
  return E;
})().catch(err => {
  E.state = 'failed'; E.error = String(err && err.message || err); E.stage = 'Unavailable'; E.embed = null;
  console.warn('CivicSphereNav: meaning model unavailable, using RESOLVER3 keyword matching.', E.error);
  emit();
  return E;
});
