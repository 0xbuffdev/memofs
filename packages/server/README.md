# `@memofs/server`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/server"><img src="https://img.shields.io/npm/v/%40memofs%2Fserver?label=%40memofs%2Fserver&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/server"><img src="https://img.shields.io/npm/dm/%40memofs%2Fserver?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Self-hostable MemoFS runtime server for Node and Cloudflare Workers deployments.

## What is this?

**The OSS-deployable hosted-memory server for MemoFS.** Runs the *same* memory
engine MemoFS Cloud runs, over a memory store you bring, with **no provider
hardcoding**. MemoFS Cloud runs this package as its runtime worker; you can run
the identical code on your own infra as a single Node process — the only
difference is which adapters you inject.

Bring your own blob store, metadata store, embedder, reranker, extractor, and LLM
client. No vendor lock-in. No MemoFS Cloud dependency.

## Installation

```bash
npm install @memofs/server
```

> Requires **Node.js >= 22**.

## Quick Start

```ts
import { createHostedRuntime } from "@memofs/server";
import { InMemoryMemoryStore } from "@memofs/core";

const runtime = createHostedRuntime({
  // The only required slot: the memory store (your file replica).
  store: new InMemoryMemoryStore(),
  projectId: "my-project",

  // Optional intelligence slots — each runs its deterministic default
  // when omitted (lexical recall, rule-based extraction, no LLM tier).
  // Inject a provider adapter to upgrade a slot.
  embedder: yourEmbedder,
  reranker: yourReranker,
  extractor: yourExtractor,
  llmClient: yourLlmClient,
});

await runtime.writeMemory({ content: "self-hosted runtime runs the engine" });
const hits = await runtime.recall("self-hosted");
```

## The one required slot: `store`

A memory runtime needs files to read and write. That is the `store` — your
memory store (the file replica). MemoFS Cloud builds it from Cloudflare R2 +
Turso; you build it from whatever you run (S3 + Postgres, GCS + D1, or anything
else that implements `MemoryStore`). There is no default to fall back on.

## Deterministic defaults, adapter-enhanced

Every intelligence slot is optional. When you omit one, the runtime runs its
**deterministic default**:

| Slot | Omitted default | Upgrade |
|---|---|---|
| `embedder` | Lexical-only recall (BM25 + fuzzy) | Inject for hybrid (vector) recall |
| `reranker` | Lexical token-overlap reranker | Inject for semantic reranking |
| `extractor` | Rule-based graph extractor | Inject for frontier extraction |
| `llmClient` | No LLM tier (regex/deterministic strategist) | Inject for LLM-enhanced intelligence |

The same runtime works zero-config or fully enhanced. Inject only what you need.

## Boundary

This package assembles a `MemoFS` instance from adapters you provide. It never
reads environment variables, never imports an adapter package, and never hardcodes
a provider. The store and provider choices belong to you (or to the cloud, when
it consumes this same factory).

## The HTTP runtime API (JSON-RPC over HTTP)

The same engine is reachable over HTTP — the two-Worker boundary. An
OSS self-hoster deploys it as a **Node single process**; MemoFS Cloud deploys it
as the **runtime Worker** behind a Service Binding. Both run identical code.

### Deploy targets

```bash
# Node single process (Fly / Railway / VPS) — the bin boots a node:http server.
PORT=8787 node dist/bin/memofs-server.mjs
curl http://127.0.0.1:8787/health # {"ok":true,...}
```

```ts
// Cloudflare Worker — the runtime Worker entry.
import { createRuntimeFetchHandler } from "@memofs/server/worker";

export default {
 fetch: createRuntimeFetchHandler({
 createRuntime: (env) => buildRuntimeFromBindings(env),
 requireAuth: false, // behind a private Service Binding
 }),
};
```

See [`examples/server/`](https://github.com/0xbuffdev/memofs/tree/main/examples/server)
for the full self-host deploy guide (the canonical R2-compatible + Turso + OpenAI
bundle, auth, and the Worker topology).

### The method surface

`POST /` takes a JSON-RPC 2.0 body. **Reads are live today; mutating methods are
gated** (see below).

| Method | What it does | Status |
|---|---|---|
| `health` | Liveness probe | Live |
| `recall` / `context` | Semantic recall / task briefing | Live |
| `memory.readCore` / `readNotes` / `readConversations` | Read memory docs | Live |
| `memory.listRecent` / `validate` | Recent events / integrity | Live |
| `graph.listNodes` / `listEdges` / `neighbors` / `path` | Graph reads | Live |
| `snapshots.list` | List snapshots | Live |
| `memory.write` / `recordNote` / `updateCore` / `appendConversation` | **Mutating** | **Gated (`503`)** |
| `graph.upsertNodes` / `upsertEdges` | **Mutating** | **Gated (`503`)** |
| `consolidate` / `snapshots.create` / `snapshots.restore` | **Mutating** | **Gated (`503`)** |

### The write-gate (important)

Every mutating method returns **`503`** until the concurrency layer ships.
This is deliberate: concurrent writes to the same project would silently lose
data under last-writer-wins, so **no write surface is reachable before the
serialization layer that makes writes safe exists**. The gate is "method
rejects," never "method present unsafely."

Reads work fully today. To write memory programmatically before the gate lifts,
use the `MemoFS` client directly in-process.

## Status

- **Reads are live** — `recall`, `context`, `memory.readCore`, `memory.readNotes`,
  `memory.readConversations`, `memory.listRecent`, `memory.validate`, `graph.*`
  reads, and `snapshots.list` all work today.
- **Writes are gated** — every mutating method returns `503` until the
  concurrency layer lands. This prevents silent data loss from concurrent
  last-writer-wins writes. To write memory programmatically, use the `MemoFS`
  client directly in-process.

For a complete list of all available methods, refer to the [Full Documentation](https://docs.memofs.dev/packages/server/).

## License

[MIT](./LICENSE)
