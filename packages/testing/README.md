# `@memofs/testing`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/testing"><img src="https://img.shields.io/npm/v/%40memofs%2Ftesting?label=%40memofs%2Ftesting&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/testing"><img src="https://img.shields.io/npm/dm/%40memofs%2Ftesting?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Shared contract tests, fixtures, fakes, and assertion helpers for MemoFS packages.

## What is this?

**Shared contract tests, fixtures, fakes, and assertion helpers for MemoFS packages.** Adapter authors depend on this package to run the contract suites shipped from core against their own implementations of the embedder, reranker, recall store, memory store, extractor, LLM client, blob client, and metadata store contracts.

## Installation

```bash
npm install -D @memofs/testing vitest
```

`vitest` is a peer dependency.

> Requires **Node.js >= 22**.

`vitest` is a peer dependency. Adapter authors should also install `@memofs/core` for the `Minimal*` types used in the contract options.

## Quick Start

```ts
// packages/my-adapter/src/embedder/my-embedder.test.ts
import { describe } from "vitest";
import { defineEmbedderContractTests } from "@memofs/testing/contracts";
import { createMyEmbedder } from "./my-embedder";

describe("My Embedder Contract", () => {
  defineEmbedderContractTests(() => createMyEmbedder({ apiKey: "test" }));
});
```

## Subpath Exports

| Subpath | Contents |
| --- | --- |
| `@memofs/testing` | Assertion helpers: `expectVector`, `expectSortedDescending`, `expectFiniteNumber`, `expectNoMutation`, `cloneForMutationCheck` |
| `@memofs/testing/contracts` | `defineEmbedderContractTests`, `defineRerankerContractTests`, `defineRecallStoreContractTests`, `defineMemoryStoreContractTests`, `defineExtractorContractTests`, `defineLlmClientContractTests`, `defineBlobClientContractTests`, `defineMetadataStoreContractTests`, and the `*ContractOptions` types |
| `@memofs/testing/fakes` | `createFakeEmbedder`, `createFakeReranker`, `createFakeRecallStore`, `createFakeMemoryStore` and their class types |
| `@memofs/testing/fixtures` | `embeddingFixtures`, `rerankFixtures`, `recallFixtures`, `memoryFixtures`, `consolidationFixtures` |
| `@memofs/testing/vitest` | `createVitestConfig(overrides?)` — a base vitest config factory |

## Documentation

For the full contract surface, the options each contract accepts, and the fakes' option shapes, please refer to the [Full Documentation](https://docs.memofs.dev/packages/testing/).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
