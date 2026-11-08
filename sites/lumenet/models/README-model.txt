Xenova/bge-small-en-v1.5 (ONNX, quantised q8, onnx/model_quantized.onnx): https://huggingface.co/Xenova/bge-small-en-v1.5
Derived from BAAI/bge-small-en-v1.5, licensed MIT. Vendored locally so the demo runs offline.
384-dimensional sentence embeddings, CLS pooling, L2-normalised; queries get the prefix "Represent this sentence for searching relevant passages: ".
v6 (29 Oct 2026) switched from Xenova/all-MiniLM-L6-v2 (22.97 MB) to this model; selected on the development pool only (see eval/p7/).
The profile key "embeddingModel": "bge-small" tells the widget which model to load. Node tools: set USHER_MODEL=bge-small (or pass --model bge-small).
