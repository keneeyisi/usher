// Node embedder (model chosen by civicsphere-semantic.js MODEL; CIVIC_MODEL=<key> to try another): same model file (models/, q8 ONNX), same tokenizer, and the same ONNX Runtime *WebAssembly* engine
// version as the browser (onnxruntime-web 1.22.0-dev.20250409, which transformers.js 3.8.1 bundles), with the same
// mean pooling + L2 normalisation as the transformers.js 'feature-extraction' pipeline.
//
// Why not transformers.js's own Node backend (onnxruntime-node)? In testing (9 Oct 2026) the native CPU runtime returned
// NON-deterministic vectors for this quantised model (the same text re-embedded gave cosine as low as 0.0), even
// single-threaded. The WASM engine is exactly repeatable and is the same engine the browser runs.
//
// Requires npm packages '@huggingface/transformers' (3.8.1, tokenizer only) and 'onnxruntime-web' (1.22.0-dev.20250409-89f8206ba4).
// Set NODE_PATH if they are installed outside this folder.
const path = require('path'), fs = require('fs');
const S = require(path.join(__dirname, '..', 'civicsphere-semantic.js'));
const MODELS = path.join(__dirname, '..', 'models');
let state = null;
async function load() {
  if (state) return state;
  const ort = require('onnxruntime-web');
  ort.env.wasm.numThreads = 1;             // browser also runs single-threaded
  const { AutoTokenizer, env } = require('@huggingface/transformers');
  env.allowRemoteModels = false; env.allowLocalModels = true; env.localModelPath = MODELS + path.sep;
  const tokenizer = await AutoTokenizer.from_pretrained(S.MODEL.id);
  const session = await ort.InferenceSession.create(fs.readFileSync(path.join(MODELS, S.MODEL.id, 'onnx', 'model_quantized.onnx')), { executionProviders: ['wasm'] });
  state = { ort, tokenizer, session };
  return state;
}
async function embedOne(text) {
  const { ort, tokenizer, session } = await load();
  const enc = tokenizer(text);
  const feeds = {};
  for (const n of session.inputNames) {
    const t = enc[n] || (n === 'token_type_ids' ? { data: new BigInt64Array(enc.input_ids.data.length), dims: enc.input_ids.dims } : null);
    feeds[n] = new ort.Tensor('int64', t.data, t.dims);
  }
  const out = (await session.run(feeds))[session.outputNames[0]];
  const [, L, D] = out.dims, mask = enc.attention_mask.data, v = new Float32Array(D);
  if (S.MODEL.pooling === 'cls') { for (let k = 0; k < D; k++) v[k] = out.data[k]; } // first ([CLS]) token, as transformers.js pooling 'cls'
  else {
    let count = 0;
    for (let i = 0; i < L; i++) { const w = Number(mask[i]); if (!w) continue; count += w; for (let k = 0; k < D; k++) v[k] += out.data[i * D + k] * w; }
    for (let k = 0; k < D; k++) v[k] /= count;
  }
  let n = 0; for (let k = 0; k < D; k++) n += v[k] * v[k]; n = Math.sqrt(n);
  return Array.from(v, x => x / n);
}
// One text per call, the same way the browser embeds a query (no padding effects).
async function embed(texts) { const out = []; for (const t of texts) out.push(await embedOne(t)); return out; }
// Queries and catalogue passages get the model's instruction prefixes (empty for all-MiniLM-L6-v2).
const embedQuery = async q => embedOne((S.MODEL.queryPrefix || '') + q);
const embedPassages = async texts => embed(texts.map(t => (S.MODEL.passagePrefix || '') + t));
module.exports = { load, embed, embedOne, embedQuery, embedPassages };
