// Node embedder for Usher (same model file, tokenizer and ONNX Runtime WebAssembly engine as the browser; see the R6 notes in tools/node_embedder.js
// for why the WASM engine is used instead of onnxruntime-node). Requires '@huggingface/transformers' (3.8.1, tokenizer only) and 'onnxruntime-web'.
// Usage: const E = require('./usher-embedder-node.js')(modelsDir, modelKey); await E.embedQuery(text); await E.embedPassages([...]).
const path = require('path'), fs = require('fs');
const G = require(path.join(__dirname, '..', 'usher', 'usher-engine.js'));
module.exports = function (modelsDir, modelKey) {
  const MODEL = G.pickModel(modelKey); let state = null;
  async function load() {
    if (state) return state;
    const ort = require('onnxruntime-web'); ort.env.wasm.numThreads = 1;
    const { AutoTokenizer, env } = require('@huggingface/transformers');
    env.allowRemoteModels = false; env.allowLocalModels = true; env.localModelPath = modelsDir + path.sep;
    const tokenizer = await AutoTokenizer.from_pretrained(MODEL.id);
    const session = await ort.InferenceSession.create(fs.readFileSync(path.join(modelsDir, MODEL.id, 'onnx', 'model_quantized.onnx')), { executionProviders: ['wasm'] });
    return (state = { ort, tokenizer, session });
  }
  async function embedOne(text) {
    const { ort, tokenizer, session } = await load();
    const enc = tokenizer(text), feeds = {};
    for (const n of session.inputNames) { const t = enc[n] || (n === 'token_type_ids' ? { data: new BigInt64Array(enc.input_ids.data.length), dims: enc.input_ids.dims } : null); feeds[n] = new ort.Tensor('int64', t.data, t.dims); }
    const out = (await session.run(feeds))[session.outputNames[0]];
    const [, L, D] = out.dims, mask = enc.attention_mask.data, v = new Float32Array(D);
    if (MODEL.pooling === 'cls') { for (let k = 0; k < D; k++) v[k] = out.data[k]; }
    else { let count = 0; for (let i = 0; i < L; i++) { const w = Number(mask[i]); if (!w) continue; count += w; for (let k = 0; k < D; k++) v[k] += out.data[i * D + k] * w; } for (let k = 0; k < D; k++) v[k] /= count; }
    let n = 0; for (let k = 0; k < D; k++) n += v[k] * v[k]; n = Math.sqrt(n);
    return Array.from(v, x => x / n);
  }
  return { MODEL, load, embedOne, embedQuery: q => embedOne((MODEL.queryPrefix || '') + q), embedPassages: async texts => { const o = []; for (const t of texts) o.push(await embedOne((MODEL.passagePrefix || '') + t)); return o; } };
};
