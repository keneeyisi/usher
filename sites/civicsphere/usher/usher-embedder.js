/*
 * Usher embedder (ES module): loads the vendored transformers.js + ONNX Runtime WebAssembly engine, the local sentence-embedding model and the compiled
 * semantic index for ONE site. Nothing is fetched from the internet: remote models are disabled and every file comes from the site's own folders.
 * run(E, { engine, index, models, vendor, params }) fills the shared state object E: state 'loading' -> 'ready' | 'failed' (the widget then uses keyword matching).
 * Port of civicsphere-embedder.js (RESOLVER6); behaviour unchanged, paths and index come from options.
 */
async function fetchBytes(E, url, from, to, stage) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${url}: HTTP ${resp.status}`);
  const total = Number(resp.headers.get('Content-Length')) || 0;
  if (!resp.body || !total) { const b = new Uint8Array(await resp.arrayBuffer()); setP(E, to, stage); return b; }
  const reader = resp.body.getReader(); const chunks = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; setP(E, from + (to - from) * got / total, stage); }
  const out = new Uint8Array(got); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
const setP = (E, p, stage) => { E.progress = Math.max(E.progress, Math.min(100, Math.round(p))); if (stage) E.stage = stage; E.emit(); };
export async function run(E, opts) {
  const t0 = performance.now(), C = opts.engine, MODEL = C.MODEL, params = opts.params || new URLSearchParams();
  const vendor = opts.vendor.replace(/\/?$/, '/usher-demonstrator/sites/civicsphere/'), models = opts.models.replace(/\/?$/, '/usher-demonstrator/sites/civicsphere/');
  try {
    if (params.get('semantic') === 'off') throw new Error('meaning model disabled (?semantic=off)');
    setP(E, 1, 'Loading catalogue index');
    const json = JSON.parse(new TextDecoder().decode(await fetchBytes(E, opts.index, 1, 6, 'Loading catalogue index')));
    const index = C.decodeIndex(json);
    if (index.stale) throw new Error(`the index is stale (index ${index.textsHash}, profile ${index.expectedHash}); run tools/usher-compile.js`);
    if (json.model.id !== MODEL.id || json.model.dtype !== MODEL.dtype) throw new Error('the index was built with a different model');
    const wasm = await fetchBytes(E, vendor + 'ort-wasm-simd-threaded.jsep.wasm', 6, 50, 'Loading inference engine');
    setP(E, 50, 'Loading meaning model');
    const T = await import(new URL(vendor + 'transformers.min.js', location.href).href);
    const env = T.env;
    env.allowRemoteModels = false; env.allowLocalModels = true; env.localModelPath = models; env.useBrowserCache = false;
    env.backends.onnx.wasm.wasmPaths = { mjs: new URL(vendor + 'ort-wasm-simd-threaded.jsep.mjs', location.href).href, wasm: new URL(vendor + 'ort-wasm-simd-threaded.jsep.wasm', location.href).href };
    env.backends.onnx.wasm.wasmBinary = wasm;
    env.backends.onnx.wasm.numThreads = 1;      // no SharedArrayBuffer / cross-origin isolation needed
    env.backends.onnx.wasm.proxy = false;
    const extractor = await T.pipeline('feature-extraction', MODEL.id, { dtype: MODEL.dtype, device: 'wasm',
      progress_callback: p => { if (p && p.status === 'progress' && /\.onnx$/.test(p.file || '') && p.total) setP(E, 50 + 45 * p.loaded / p.total, 'Loading meaning model'); } });
    setP(E, 96, 'Warming up');
    E.embed = async text => Array.from((await extractor((MODEL.queryPrefix || '') + String(text), { pooling: MODEL.pooling, normalize: MODEL.normalize })).data);
    await E.embed('warm up');
    E.index = index; E.loadMs = Math.round(performance.now() - t0); E.state = 'ready'; setP(E, 100, 'Ready');
  } catch (err) {
    E.state = 'failed'; E.error = String(err && err.message || err); E.stage = 'Unavailable'; E.embed = null;
    console.warn('Usher: meaning model unavailable, using keyword matching.', E.error); E.emit();
  }
  return E;
}
