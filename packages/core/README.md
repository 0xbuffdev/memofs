# `@memofs/core`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/core"><img src="https://img.shields.io/npm/v/%40memofs%2Fcore?label=%40memofs%2Fcore&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/core"><img src="https://img.shields.io/npm/dm/%40memofs%2Fcore?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

MemoFS core memory runtime and provider-neutral contracts for AI agents.

## What is this?

**Unified core memory runtime.** Core memory contracts, records, chunks, source references, manifest validation, local protocol helpers, and provider-neutral runtime primitives — the `MemoFS` client, hybrid recall (BM25 + fuzzy + vector channel via file-based and in-memory stores), graph, snapshots, sync, and the provider-neutral `MemoryEmbedder` / `Reranker` / `RecallStore` contracts that adapters (OpenAI, Voyage, Transformers) implement.

**Memory intelligence features:**

- **Code anchoring & drift detection** — bind memories to source files via SHA-256 hash; stale memories are rank-demoted at recall time when the anchored file changes.
- **Memory decay floors** — kind-specific expiry thresholds (30–365 days) transition old memories to `unverified` status for re-verification.
- **Semantic GC** — archive deprecated memories to `.memofs/archive/` cold storage; restore on demand.
- **Session outcomes** — `success` / `failure` / `aborted` outcome enum on `complete()` with a 5-row behavior matrix governing durable memory promotion and workspace cleanup.

## Installation

```bash
npm install @memofs/core
```

> Requires **Node.js >= 22**.

## Quick Start

Create a `MemoFS` client with a filesystem store and read core memory:

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

const memo = new MemoFS({
  // The store root is your workspace; MemoFS creates `.memofs/` inside it.
  store: createNodeFsMemoryStore({ rootDir: "." }),
  projectId: "my-project",
  mode: "local",
});

await memo.bootstrap();

// Read core memory (returns raw markdown text)
const core = await memo.core.read();
console.log(core);
```

## Runtime Boundaries

The root `@memofs/core` entry is Worker-loadable when you provide a Worker-safe
`MemoryStore`. Node filesystem utilities live behind a separate subpath and
must not be imported from a Worker.

- **Root barrel**: `import { MemoFS, createInMemoryGraphStore, createFsRecallStore } from "@memofs/core"`
- **Node filesystem store**: `import { createNodeFsMemoryStore, createNodeMemoFs } from "@memofs/core/node-fs"`
- **Cloud client contracts**: `import { createMemoFsCloudClient } from "@memofs/core/cloud-client"`

For Workers, inject a compatible store such as `RemoteBlobMemoryStore` with
your blob and metadata adapters. The root package does not choose a storage
backend for you.

Provider-specific adapters (OpenAI, Voyage, Transformers) live in separate `@memofs/adapter-*` packages — core defines the contracts, adapters implement them.

For a complete breakdown of configuration options, interfaces, and architecture, see our [Full Documentation](https://docs.memofs.dev/packages/core/).

## Boundary

This package owns the MemoFS core contracts, memory store adapters, and runtime primitives. It does not own private SaaS concerns such as billing, tenancy, hosted dashboards, encrypted BYOK storage, or internal admin tooling. All public API capabilities are consolidated and exported directly from the root namespace of `@memofs/core`.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
