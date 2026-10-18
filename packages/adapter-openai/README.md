# `@memofs/adapter-openai`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/adapter-openai"><img src="https://img.shields.io/npm/v/%40memofs%2Fadapter-openai?label=%40memofs%2Fadapter-openai&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/adapter-openai"><img src="https://img.shields.io/npm/dm/%40memofs%2Fadapter-openai?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

OpenAI embeddings adapter for MemoFS.

## What is this?

**OpenAI Embedder adapter for MemoFS.** Provides first-class integration with OpenAI's embedding models (text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002) through MemoFS's provider-neutral embedder contract.

## Installation

```bash
npm install @memofs/adapter-openai
```

> Requires **Node.js >= 22**.

You also need an OpenAI API key from [platform.openai.com](https://platform.openai.com/).

## Quick Start

```ts
import { createOpenAIEmbedder } from "@memofs/adapter-openai";

const embedder = createOpenAIEmbedder({
 apiKey: process.env.OPENAI_API_KEY!,
 model: "text-embedding-3-large",
});

// Embed a batch of texts
const result = await embedder.embed([
 "MemoFS provides unified memory runtime for AI agents",
 "OpenAI offers state-of-the-art embedding models",
]);

console.log(result.embeddings); // number[][]
console.log(result.usage); // { promptTokens, totalTokens }
```

## Configuration

### Embedder Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | **required** | OpenAI API key |
| `model` | `string` | `"text-embedding-3-large"` | Embedding model to use |
| `dimensions` | `number` | model default | Output dimensions (for text-embedding-3 models) |
| `encodingFormat` | `"float" \| "base64"` | `"float"` | Output format for embeddings |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `3` | Maximum retry attempts |
| `batchSize` | `number` | `100` | Maximum texts per batch request |
| `organization` | `string` | — | OpenAI organization ID (optional) |

## Supported Models

| Model | Dimensions | Max Tokens | Use Case |
|-------|------------|------------|----------|
| `text-embedding-3-large` | 3072 (configurable) | 8191 | Highest quality |
| `text-embedding-3-small` | 1536 (configurable) | 8191 | Balanced quality/speed |
| `text-embedding-ada-002` | 1536 | 8191 | Legacy, cost-effective |

## Integration with MemoFS Core

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { createOpenAIEmbedder } from "@memofs/adapter-openai";

const store = createNodeFsMemoryStore({ rootDir: "." });

const memo = new MemoFS({
  store,
  projectId: "my-app",
  embedder: createOpenAIEmbedder({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-large",
    dimensions: 1536, // Optional: reduce dimensions for speed
  }),
});

// The embedder powers hybrid recall; embeddings persist to
// `.memofs/indexes/embeddings.jsonl` via the file-backed recall store.
```

## Advanced: Custom Client

```ts
import { OpenAI } from "openai";
import { createOpenAIEmbedder } from "@memofs/adapter-openai";

const customClient = new OpenAI({
 apiKey: process.env.OPENAI_API_KEY!,
 baseURL: "https://custom-proxy.example.com/v1", // For proxies, Azure, etc.
 defaultHeaders: { "x-custom-header": "value" },
});

const embedder = createOpenAIEmbedder({
 client: customClient,
 model: "text-embedding-3-large",
});
```

## Testing

The package exports fake implementations for testing:

```ts
import { createFakeOpenAIClient } from "@memofs/adapter-openai/testing";

const fakeClient = createFakeOpenAIClient({
 embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
 usage: { promptTokens: 10, totalTokens: 10 },
});
```

## Boundary

This package owns the OpenAI embedder adapter implementation. It does not own the MemoFS core contracts, other provider adapters, or the OpenAI service itself.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
