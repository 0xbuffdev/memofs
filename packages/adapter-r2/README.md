# `@memofs/adapter-r2`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/adapter-r2"><img src="https://img.shields.io/npm/v/%40memofs%2Fadapter-r2?label=%40memofs%2Fadapter-r2&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/adapter-r2"><img src="https://img.shields.io/npm/dm/%40memofs%2Fadapter-r2?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Cloudflare R2 blob adapter for MemoFS remote blob memory stores.

## What is this?

**Cloudflare R2 blob adapter for MemoFS's remote-blob memory store.** It
implements core's provider-neutral `BlobClient` contract over a Cloudflare R2
bucket binding so the MemoFS runtime can read/write its canonical `.memofs/`
files against R2 blobs — running the *same* runtime on hosted infra as on a
local filesystem.

This package owns **blob storage only**. The matching metadata adapter
(`createTursoMetadataStore`) lives in [`@memofs/adapter-turso`](../adapter-turso).
The two are intentionally decoupled — a provider-neutral adapter shape, not a
bundled N×M adapter — so a Node self-hoster can pair this blob client with any
`MetadataStore`, or pair a future `@memofs/adapter-s3` blob client with the
Turso metadata store, without touching the runtime.

## Installation

```bash
npm install @memofs/adapter-r2
```

> Requires **Node.js >= 22**.

Peer dependency: `@cloudflare/workers-types` (for the `R2Bucket` type). It is an
optional peer — you only need it where you author against the binding.

## Quick Start

```ts
import { RemoteBlobMemoryStore } from "@memofs/core";
import { createR2BlobClient } from "@memofs/adapter-r2";
import { createTursoMetadataStore } from "@memofs/adapter-turso";

const store = new RemoteBlobMemoryStore({
 blobClient: createR2BlobClient({ binding: env.BLOBS }),
 metadata: createTursoMetadataStore({ client: db.$client, projectId }),
 rootKey: projectId,
});

// The store implements MemoryStore — pass it to the runtime:
// createHostedRuntime({ store, projectId, ... })
```

## API

### `createR2BlobClient(options)`

Creates a `BlobClient` backed by a Cloudflare R2 bucket binding.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `binding` | `R2Bucket` | Yes | The Cloudflare R2 bucket binding (`env.BLOBS`). |

Returns a `BlobClient` with `get`, `put`, and `delete` — the three methods
core's `RemoteBlobMemoryStore` calls.

### Content addressing

Blobs are written keyed by their sha256 — the key core's
`RemoteBlobMemoryStore` computes. This matches the cloud file replica's
`r2_key === sha256` layout exactly, so the runtime and the sync handler share
the *same* R2 objects rather than a parallel store. Identical content across
paths or projects shares one blob.

## Boundary

This package owns the Cloudflare R2 blob client implementation. It does not own
the MemoFS core contracts (`BlobClient` / `MetadataStore` /
`RemoteBlobMemoryStore`), the metadata adapter, other adapters, or the R2
service itself.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development
scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
