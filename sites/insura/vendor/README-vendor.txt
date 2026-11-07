Vendored runtime (no CDN at runtime; the demo works offline):
  transformers.min.js               @huggingface/transformers 3.8.1 (Apache-2.0, LICENSE-transformers.js.txt); source-map comment removed
  ort-wasm-simd-threaded.jsep.mjs   ONNX Runtime Web 1.22.0-dev.20250409-89f8206ba4 glue (MIT, LICENSE-onnxruntime-web.txt)
  ort-wasm-simd-threaded.jsep.wasm  ONNX Runtime Web WebAssembly engine (same version)
civicsphere-embedder.js prefetches the .wasm (with progress) and points ONNX Runtime at these local files.
