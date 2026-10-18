# `@memofs/adapter-voyage`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/adapter-voyage"><img src="https://img.shields.io/npm/v/%40memofs%2Fadapter-voyage?label=%40memofs%2Fadapter-voyage&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/adapter-voyage"><img src="https://img.shields.io/npm/dm/%40memofs%2Fadapter-voyage?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Voyage AI embedder and reranker adapter for MemoFS.

## What is this?

**Voyage AI Embedder and Reranker adapter for MemoFS.** Provides first-class integration with Voyage AI's embedding models (voyage-3, voyage-3-large, voyage-3-lite, voyage-code-3) and reranking models (rerank-2, rerank-2-lite) through MemoFS's provider-neutral embedder and reranker contracts.

The adapter talks to Voyage's REST API directly using the built-in `fetch`, so there is no separate `voyageai` SDK dependency.

## Installation

```bash
npm install @memofs/adapter-voyage
```

> Requires **Node.js >= 22**.

You also need a Voyage AI API key from [voyageai.com](https://www.voyageai.com/).

## Quick Start

### Embeddings

```ts
import { createVoyageEmbedder } from "@memofs/adapter-voyage";

const embedder = createVoyageEmbedder({
 apiKey: process.env.VOYAGE_API_KEY!,
 model: "voyage-3-large",
});

// Embed a batch of texts
const result = await embedder.embed([
 "MemoFS provides unified memory runtime for AI agents",
 "Voyage AI offers state-of-the-art embedding models",
]);

console.log(result.embeddings); // number[][]
console.log(result.usage); // { promptTokens, totalTokens }
```

### Reranking

```ts
import { createVoyageReranker } from "@memofs/adapter-voyage";

const reranker = createVoyageReranker({
 apiKey: process.env.VOYAGE_API_KEY!,
 model: "rerank-2",
});

const result = await reranker.rerank({
 query: "memory runtime for AI agents",
 documents: [
 "MemoFS is a memory layer for AI agents",
 "Voyage AI provides embedding models",
 "Upstash Vector is a serverless vector database",
 ],
 topK: 2,
});

console.log(result.results); // RerankResult[] with relevance scores
```

## Configuration

### Embedder Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | **required** | Voyage AI API key |
| `model` | `string` | `"voyage-3-large"` | Embedding model to use |
| `inputType` | `"document" \| "query"` | `"document"` | Input type for optimized embeddings |
| `truncation` | `boolean` | `true` | Truncate inputs exceeding max tokens |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `3` | Maximum retry attempts |
| `batchSize` | `number` | `128` | Maximum texts per batch request |

### Reranker Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | **required** | Voyage AI API key |
| `model` | `string` | `"rerank-2"` | Reranking model to use |
| `topK` | `number` | `10` | Maximum results to return |
| `truncation` | `boolean` | `true` | Truncate inputs exceeding max tokens |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `3` | Maximum retry attempts |

## Supported Models

### Embeddings
- `voyage-3` — General purpose, 1024 dimensions
- `voyage-3-large` — Highest quality, 1024 dimensions 
- `voyage-3-lite` — Fast and cost-effective, 512 dimensions
- `voyage-code-3` — Optimized for code, 1024 dimensions

### Reranking
- `rerank-2` — High-quality reranking
- `rerank-2-lite` — Faster, cost-effective reranking

## Integration with MemoFS Core

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { createVoyageEmbedder } from "@memofs/adapter-voyage";

const store = createNodeFsMemoryStore({ rootDir: "." });

const memo = new MemoFS({
  store,
  projectId: "my-app",
  embedder: createVoyageEmbedder({
    apiKey: process.env.VOYAGE_API_KEY!,
    model: "voyage-3-large",
  }),
});

// The embedder powers hybrid recall; embeddings persist to
// `.memofs/indexes/embeddings.jsonl` via the file-backed recall store.
```

## Testing

The package exports fake implementations for testing:

```ts
import { createFakeVoyageClient } from "@memofs/adapter-voyage/testing";

const fakeClient = createFakeVoyageClient({
 embeddings: [[0.1, 0.2, 0.3]],
 rerankScores: [0.9, 0.7, 0.3],
});
```

## Boundary

This package owns the Voyage AI embedder and reranker adapter implementations. It does not own the MemoFS core contracts, other provider adapters, or the Voyage AI service itself.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
