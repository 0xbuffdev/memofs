# `@memofs/connectors`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/connectors"><img src="https://img.shields.io/npm/v/%40memofs%2Fconnectors?label=%40memofs%2Fconnectors&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/connectors"><img src="https://img.shields.io/npm/dm/%40memofs%2Fconnectors?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Local connector framework for ingesting external sources into MemoFS memory.

## What is this?

**The local connector framework for MemoFS.** Connectors ingest external sources (GitHub, Notion, …) into `.memofs/` through the **local** engine. The cloud only replicates the resulting files — connectors never run server-side. This is the `git`/GitHub-Actions model: the *config* is synced, the *credential* is fetched live, the *work* happens on your machine.

Each source is a plugin implementing the provider-neutral `Connector` interface — the same adapter pattern MemoFS uses for embedders and extractors. Adding a connector later means writing a new adapter, not refactoring the framework.

## Installation

```bash
npm install @memofs/connectors @memofs/core
```

> Requires **Node.js >= 22**.

## Quick Start

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { runConnectors, EnvSecretResolver } from "@memofs/connectors";

// The host owns the MemoFS instance (single-writer per `.memofs/` root).
const store = createNodeFsMemoryStore({ rootDir: "./.memofs" });
const memo = new MemoFS({ store, projectId: "my-app" });

const result = await runConnectors({
  rootDir: "./.memofs",
  memo,
  secretResolver: new EnvSecretResolver({ rootDir: "./.memofs" }),
});

console.log(result.written); // ["conn_...", ...] — newly ingested note ids
console.log(result.skipped); // ["issue:42", ...] — already ingested (dedup)
```

## How it works

```
.memofs/connectors.json ──► runConnectors() ──► .memofs/notes.md (+ derived indexes)
 (config, no tokens)         (local engine)      (source: "connector")
```

1. **Config** lives in `.memofs/connectors.json` — one of MemoFS's 11 canonical sync units. Each connector row carries an opaque `secretRef`, **never** the token.
2. **Secrets** are resolved at run time through an injected `SecretResolver`. The token lives in memory only and is never written to disk. The v1 dev fallback reads `.memofs/secrets.json` (a separate, gitignored, non-synced file); production wires a `CloudSecretResolver` against `GET /v1/projects/:projectId/connectors/:connectorId/secret` when the cloud app ships.
3. **Ingestion** runs locally: each connector fetches its source, normalizes items into `ConnectorRecord`s, and the runner writes them through the local engine with the connector-write discipline (see below).
4. **The resulting files** sync back to the cloud like any other memory file.

### The connector-write discipline

Every connector-emitted note is written with three guarantees:

| Field | Value | Why |
|-------|-------|-----|
| `source` | `"connector"` | Discriminates connector content from human-authored notes inside `notes.md` (no new region). |
| `sourceRefs[0].sourceId` | stable external id (`"issue:42"`) | The dedup key — re-ingest skips already-seen items. |
| `id` | `conn_<sha256(externalId:content)[:16]>` | Content-derived, **no wall-clock**. Re-ingesting identical content reproduces identical bytes → the sync manifest reports "no change" → no phantom conflict, no needless upload. |

## `.memofs/connectors.json`

```json
{
 "connectors": [
 {
 "id": "github-main",
 "type": "github",
 "enabled": true,
 "schedule": "@hourly",
 "sourceMapping": { "repository": "owner/repo", "kinds": ["issues", "prs"] },
 "secretRef": "ss_abc123"
 }
 ]
}
```

The schema (`{ id, type, enabled, schedule, sourceMapping, secretRef }`) is locked. A row carrying a `token`/`secret`/`apiKey` field is rejected — tokens never ride in the file replica.

## Secret resolution

```ts
import { EnvSecretResolver, StaticSecretResolver } from "@memofs/connectors";

// Dev/local fallback: reads `.memofs/secrets.json` (gitignored, NOT synced)
// { "ss_abc123": "ghp_..." }
const resolver = new EnvSecretResolver({ rootDir: "./.memofs" });

// Tests / programmatic
const testResolver = new StaticSecretResolver({ ss_abc123: "test-token" });
```

Implement the `SecretResolver` interface to wire any backend (a cloud fetch, a vault, a password manager).

## Built-in connectors

| Connector | `type` | Source | Status |
|-----------|--------|--------|--------|
| **GitHub** | `"github"` | Issues, PRs, discussions (GraphQL API) | ✅ Shipped |
| **Notion** | `"notion"` | Pages from a database or workspace search (REST API) | ✅ Shipped |

### GitHub

```ts
import { GitHubConnector, createConnectorRegistry } from "@memofs/connectors";

// Default registry already includes GitHub; this is how you'd add a custom one.
const registry = createConnectorRegistry();
registry.register(new MyCustomConnector());

await runConnectors({ rootDir, memo, secretResolver, connectorRegistry: registry });
```

`sourceMapping` for GitHub:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `repository` | `string` | **required** | `"owner/repo"` |
| `kinds` | `string[]` | `["issues", "prs", "discussions"]` | Which node types to ingest |
| `limit` | `number` | `50` | Max items per kind (per-page cost control) |

The token is a fine-grained PAT or OAuth token with read access to the repository. Rate-limit errors are surfaced in `result.errors` (no retry/backoff in v1).

### Notion

Ingests Notion pages from a database (`POST /v1/databases/:id/query`) or a workspace search (`POST /v1/search`) via the Notion v1 REST API.

`sourceMapping` for Notion:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `databaseId` | `string` | — | 32-char hex database id (hyphenated or not). Either this or `searchQuery` is required. |
| `searchQuery` | `string` | — | Free-text workspace search (falls back when no `databaseId`). |
| `limit` | `number` | `50` | Max pages to ingest (cost control). |

The token is a Notion internal integration token (`ntn_…` / `secret_…`) with the target database/page shared to the integration. The `Notion-Version: 2022-06-28` header is set automatically. Rate-limit errors (403/429) are surfaced in `result.errors` (no retry/backoff in v1).

## Writing a connector

```ts
import { type Connector, type ConnectorRecord, type ConnectorIngestContext } from "@memofs/connectors";

class LinearConnector implements Connector {
 readonly type = "linear";
 readonly displayName = "Linear";

 async ingest(ctx: ConnectorIngestContext): Promise<ConnectorRecord[]> {
 const records = await fetchLinearIssues(ctx.token, ctx.config.sourceMapping);
 // The runner handles dedup + the write discipline; the connector just
 // returns normalized records.
 return records.map((issue) => ({
 externalId: `linear:${issue.id}`,
 title: issue.title,
 content: issue.description,
 url: issue.url,
 occurredAt: issue.createdAt,
 metadata: { team: issue.team, status: issue.state },
 }));
 }
}
```

## Boundary

This package owns the connector framework + the built-in connectors. It does **not** own the MemoFS core write path (`@memofs/core`), the MCP server, or the CLI command group. It depends on core for writes and accepts the host's `MemoFS` instance (single-writer contract).

## What's not here yet (v1 deferrals)

- **CLI `memofs connectors {add|remove|list|run}`** — lives in `packages/cli` (the CLI package); wires to this package.
- **Cloud `GET .../connectors/:id/secret` resolver** — ships when the cloud app does.
- **Schedule enforcement** — `schedule` is stored but not acted on; execution happens only while the local runtime is alive (CLI / MCP session / daemon).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
