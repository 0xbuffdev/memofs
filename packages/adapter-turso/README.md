# `@memofs/adapter-turso`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/adapter-turso"><img src="https://img.shields.io/npm/v/%40memofs%2Fadapter-turso?label=%40memofs%2Fadapter-turso&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/adapter-turso"><img src="https://img.shields.io/npm/dm/%40memofs%2Fadapter-turso?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Turso/libSQL metadata adapter for MemoFS remote blob memory stores.

## What is this?

**Turso/libSQL metadata adapter for MemoFS's remote-blob memory store.** It
implements core's provider-neutral `MetadataStore` contract over the cloud's
existing `project_files` table so the MemoFS runtime can track which canonical
`.memofs/` files exist and where their bytes live — running the *same* runtime
on hosted infra as on a local filesystem.

This package owns **metadata storage only**. The matching blob adapter
(`createR2BlobClient`) lives in [`@memofs/adapter-r2`](../adapter-r2). The two
are intentionally decoupled — a clean adapter shape, not a bundled N×M
adapter — so a Node self-hoster can pair this metadata store with any
`BlobClient` (S3, GCS, MinIO) without touching the runtime.

## Installation

```bash
npm install @memofs/adapter-turso
```

> Requires **Node.js >= 22**.

Peer dependency: `@libsql/client` (for the metadata client type). It is an
optional peer — you only need it where you author against the libSQL client.

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

### `createTursoMetadataStore(options)`

Creates a `MetadataStore` backed by a Turso/libSQL `project_files` table,
scoped to one project.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `client` | `Client` | Yes | The raw libSQL client (the cloud passes `db.$client`). |
| `projectId` | `string` | Yes | The project id scoping this manifest. |

Returns a `MetadataStore` with `getEntry`, `upsertEntry`, and `removeEntry` —
the three methods core's `RemoteBlobMemoryStore` calls.

## Reuse, not reinvent

The metadata store reads/writes the **existing** `project_files` table
(`project_id`, `path`, `sha256`, `r2_key`, `size_bytes`, `updated_at` with a
unique `(project_id, path)` index) — the exact layout the cloud file-replica
sync handler manages. One set of files; the runtime is a new reader/writer over
them, not a parallel store.

The adapter issues **raw SQL** (not drizzle) against the libSQL client, so it
stays free of the cloud's drizzle schema and stays portable to Node
self-hosters. It owns no migrations — the `project_files` schema is owned by
the cloud's drizzle layer.

## Boundary

This package owns the Turso/libSQL metadata store implementation. It does not
own the MemoFS core contracts (`BlobClient` / `MetadataStore` /
`RemoteBlobMemoryStore`), the blob adapter, the `project_files` schema/migrations,
other adapters, or the Turso service itself.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development
scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
