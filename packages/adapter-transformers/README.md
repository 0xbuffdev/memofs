# `@memofs/adapter-transformers`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/adapter-transformers"><img src="https://img.shields.io/npm/v/%40memofs%2Fadapter-transformers?label=%40memofs%2Fadapter-transformers&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/adapter-transformers"><img src="https://img.shields.io/npm/dm/%40memofs%2Fadapter-transformers?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Local Transformers.js ONNX embedder adapter for MemoFS with no API key or cloud dependency.

## What is this?

**Zero-config local embedder adapter for MemoFS.** Runs a small
sentence-embedding model **in process** via [Transformers.js](https://huggingface.co/docs/transformers.js)
(ONNX runtime) — **no API key, no cloud, and no network after the first model
download.**

This is what powers MemoFS's *zero-API-key hybrid recall*: install it (or let
the runtime lazy-load it) and `recall()` gains a semantic vector path on top of
the default lexical (BM25 + fuzzy) path, with nothing leaving your machine.

## Installation

```bash
npm install @memofs/adapter-transformers @memofs/core
```

> Requires **Node.js >= 22**.

This pulls in `@huggingface/transformers` and ships an ONNX-compatible embedder
that implements MemoFS's provider-neutral `MemoryEmbedder` contract.

## Quick Start

### Standalone

```ts
import { createTransformersEmbedder } from "@memofs/adapter-transformers";

const embedder = createTransformersEmbedder(); // defaults to Xenova/bge-small-en-v1.5

// Embed a batch of texts (mean-pooled + L2-normalized vectors)
const { embeddings } = await embedder.embedTexts({
  texts: ["MemoFS gives agents durable memory.", "bge-small is a small model."],
});

console.log(embeddings[0].embedding.length); // 384
console.log(embeddings[0].model);            // "Xenova/bge-small-en-v1.5"
```

The first call downloads the ONNX weights once into a shared user-level cache
(`$XDG_CACHE_HOME/memofs/models`, or `~/.cache/memofs/models`); subsequent
calls are fully offline and every project on the machine shares the download.

### With MemoFS core

Plug the adapter straight into `MemoFS` for hybrid recall with your own embedder:

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { createTransformersEmbedder } from "@memofs/adapter-transformers";

const store = createNodeFsMemoryStore({ rootDir: "." });

const memo = new MemoFS({
  store,
  projectId: "my-app",
  embedder: createTransformersEmbedder(),
  recall: { engine: "auto" }, // upgrades to hybrid since an embedder is present
});

await memo.notes.record({ content: "User prefers TypeScript and strict mode." });
const hits = await memo.recall("coding language preference"); // semantic match
```

### Zero-config (no code)

You usually do **not** need to touch this package directly. The MemoFS runtime
can lazy-load it for you — just enable local embeddings:

```bash
export MEMOFS_LOCAL_EMBEDDINGS=true
export MEMOFS_RECALL_ENGINE=auto
```

or in `.memofs/config.json`:

```json
{
  "$schema": "./node_modules/@memofs/cli/schema/config.json",
  "runtime": "local",
  "recall": { "engine": "auto", "localEmbeddings": true }
}
```

The runtime imports `@memofs/adapter-transformers` only when the first
embedding is actually requested, so boot stays fast. If the adapter is missing or
fails to load, MemoFS falls back to lexical (BM25 + fuzzy) recall — memory stays
discoverable and writes are never broken.

## Configuration

### Embedder options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | `string` | `"Xenova/bge-small-en-v1.5"` | Hugging Face model id (or local path under `cacheDir`) supported by Transformers.js. |
| `cacheDir` | `string` | `resolveModelCacheDir()` | Directory used to cache downloaded ONNX weights. Defaults to a shared user-level cache so weights download once per machine instead of once per working directory. |
| `device` | `"cpu" \| "gpu" \| "wasm"` | `"cpu"` | Inference device. Use `"gpu"` or `"wasm"` when the runtime supports it. |
| `dtype` | `"fp32" \| "fp16" \| "q8" \| "int8"` | `"q8"` | ONNX runtime data type. `"q8"` (quantized) is ~4x smaller to download and faster on CPU with negligible retrieval-quality loss; `"fp32"` is the most conservative choice. |
| `batchSize` | `number` | `32` | Maximum texts per inference batch. Larger batches trade memory for throughput. |
| `retries` | `number` | `2` | Maximum retry attempts when the initial model download/load fails with a transient network error. Set to `0` to disable. |
| `onProgress` | `(info) => void` | — | Callback for model download/load progress. Use it to show a one-time "warming up" notice. |

### Default model

`Xenova/bge-small-en-v1.5` is a 384-dimensional sentence-embedding model: small,
fast, and strong on retrieval — it outperforms the earlier all-MiniLM generation
on retrieval benchmarks at the same vector size. Its quantized (`q8`) weights
download once (~32 MB) and all later calls are fully offline.

Instruction-tuned model families (bge, e5, nomic) expect different text prefixes
on the query side vs the document side. The adapter applies them automatically:
`embedTexts` prefixes documents (e.g. `passage: ` for e5) and the optional
`embedQuery` method prefixes queries (e.g. bge's `Represent this sentence for
searching relevant passages: `), so MemoFS's hybrid recall queries hit the model
the way it was trained. Symmetric models (all-MiniLM, gte) get no prefixes.

To use a different Transformers.js model, pass its id:

```ts
createTransformersEmbedder({ model: "Xenova/all-MiniLM-L12-v2" });
```

### Model cache

Weights are cached in one shared, user-level directory, resolved by the
exported `resolveModelCacheDir()`:

- `$XDG_CACHE_HOME/memofs/models` when `XDG_CACHE_HOME` is set to a non-empty value
- `~/.cache/memofs/models` otherwise

MemoFS runs from several working directories over the lifetime of a machine
(`memofs init` from a project root, an MCP server launched by an IDE, test
runners), and Transformers.js's default cache is relative to the process
working directory — without an explicit shared path, each directory would
re-download the same weights. The shared cache means one download per machine,
and the model that `memofs init` predownloads is the exact one an MCP server
finds on connect. Pass an explicit `cacheDir` to override the location.

## When to use this vs. a provider adapter

| Need | Use |
|------|-----|
| Offline / private / zero-cost semantic recall | **This package** (local ONNX) |
| Highest-quality embeddings, can call an API | [`@memofs/adapter-openai`](../adapter-openai) or [`@memofs/adapter-voyage`](../adapter-voyage) |
| Persistent local vector recall | pair any embedder with `createFsRecallStore` from `@memofs/core` |

The local embedder pairs with MemoFS's built-in filesystem recall store
(`createFsRecallStore`, backed by `.memofs/indexes/embeddings.jsonl`) for a
fully local vector memory. For large shared indices, prefer a provider embedder
plus a managed vector store.

## Testing

The embedder accepts an injectable `pipelineFactory` (an internal type), so tests
never need to download weights or run real inference. Use the bundled fake
factory from the public `./testing` subpath:

```ts
import { createFakePipelineFactory } from "@memofs/adapter-transformers/testing";
import { createTransformersEmbedder } from "@memofs/adapter-transformers";

const embedder = createTransformersEmbedder({
  pipelineFactory: createFakePipelineFactory({ dimensions: 384 }),
});

const { embeddings } = await embedder.embedTexts({ texts: ["hello"] });
console.log(embeddings[0].embedding.length); // 384
```

The fake produces deterministic, hash-derived vectors — identical strings yield
identical vectors, token-overlapping strings are partially similar — enough to
exercise recall merging without the real model.

## Boundary

This package owns the Transformers.js local embedder adapter. It does **not** own
the MemoFS core `MemoryEmbedder` contract, other provider adapters, or the
Transformers.js runtime itself.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development
scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
