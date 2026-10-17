<div align="center">

<img src="./assets/images/logo.svg" alt="MemoFS Logo" width="120" />

# MemoFS

Open-source, file-first memory runtime for AI agents.

</div>

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/core"><img src="https://img.shields.io/npm/v/%40memofs%2Fcore?label=%40memofs%2Fcore&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Project status: Beta" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI status" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

---

## What is MemoFS?

**File-first memory runtime for AI agents.** Store, recall, and synchronize memory using plain files on disk — local-first by default, with optional cloud sync.

Most AI memory systems are database-first, vendor-locked, hard to inspect, and hard to version. MemoFS inverts that: your agent's memory lives as Markdown and JSONL under a `.memofs/` directory you can `cat`, `git diff`, and roll back.

```text
.memofs/
├── config.json       # Workspace settings and engine routing
├── manifest.json     # Asset registry tracking and hashes
├── memory/
│   ├── core.md       # Durable, project-wide facts (Markdown)
│   └── notes.md      # Timestamped notes and logs (Markdown)
├── events/
│   └── conversations.jsonl # Chronological interactions for recall
├── graph/
│   ├── nodes.jsonl   # Entities extracted from memory
│   └── edges.jsonl   # Relational connections
├── archive/          # Cold storage for deprecated memories
│   └── <id>.json     # Full-fidelity archived memory records
└── snapshots/
    └── snap_123.json # Versioned restore checkpoints
```

---

## Quick Start

MemoFS serves two primary paths: **users running AI agents day-to-day** and **engineers building custom agents & runtimes**.

### Path A: For Users of AI Agents (Cursor, Claude Code, Codex, Copilot, Cline, etc.)

Initialize MemoFS in any project in under a minute. The CLI creates `.memofs/`, sets up project rules, pre-wires platform lifecycle hooks, and configures the local MCP server:

```bash
npx @memofs/cli init
```

Your agent now automatically inherits durable memory across sessions — zero manual prompting required.

### Path B: For Builders of AI Agents & Runtimes

Embed the runtime directly into your TypeScript or Node.js agent architecture:

```bash
npm install @memofs/core
```

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

// Initialize a Node.js filesystem-backed memory store
const store = createNodeFsMemoryStore({
  rootDir: ".",
});

// Create the unified client
const memo = new MemoFS({
  store,
  projectId: "my-app",
  mode: "local",
});

// Read project-wide core memory (core.md)
const core = await memo.core.read();
console.log(core);

// Record a durable note (notes.md)
await memo.notes.record({
  content: "User prefers TypeScript with ESM modules.",
  kind: "preference",
});

// Recall works offline (lexical BM25 + fuzzy matching) with zero config
const hits = await memo.recall("TypeScript configuration");
```

To upgrade to semantic vector search, plug in an embedder adapter like OpenAI (`@memofs/adapter-openai`) or Voyage AI (`@memofs/adapter-voyage`). For **zero-API-key local vector search**, enable the ONNX embedder (`@memofs/adapter-transformers`) to run embeddings completely in-process.

---

## Architecture

```text
Your App / Agent / MCP client
        │
        ▼
    MemoFS   (local-first runtime)
      ├─ .read() / .write() / .recall()
      ├─ .snapshot.create() / .restore()
      ├─ AgentFS  (lease-locking & virtual paths)
      └─ .sync *  (Cloud sync pushes and pulls)

   read() / write() / recall() — core client methods
        │
        ▼
   .memofs/   (plain files on disk)
     ├─ memory/core.md      ├─ memory/notes.md
     ├─ events/*.jsonl      ├─ graph/{nodes,edges}.jsonl
     └─ snapshots/  manifest.json
        │   git-friendly, inspectable, versionable
        ▼   (optional)
   MemoFS Cloud
```

The runtime resolves configuration from constructor options → env vars → `.memofs/config.json`.
Three runtime modes are supported: **`local`** (filesystem-only, default), **`hybrid`** (local + cloud sync with read/write policies), and **`memory`** (in-memory volatile, ideal for tests).

### Memory Intelligence

- **Project & Source Anchoring** — bind memories to project files, data schemas, byte hashes, and symbol paths; query-time drift detection automatically demotes stale knowledge when assets change.
- **Agent Behavior Enforcement** — deterministic push hooks across 9+ agent tools (Claude Code, Cursor, Copilot, Codex, OpenCode, Cline, etc.) inject active memory context at session start and preserve it across context compactions.
- **Causal Lineage & Action Receipts** — traverse decision provenance (`memofs why <id>`) backed by append-only action receipts with task correlation (`taskRef`).
- **Ephemeral Coordination Stream** — real-time cross-agent pub/sub (`stream.jsonl`) with typed coordination events (`agent.heartbeat`, `resource.intent`, `task.status`, `agent.hint`) filtered out of durable recall.
- **Static Memory Linter** — `memofs lint` CI/CD rule pipeline detecting broken references, contradictory assertions, and broken provenance links.
- **Cognitive Decay & Cold Archive** — kind-specific expiry thresholds transition old memories to `unverified` status before semantic archiving.
- **Session Outcomes & AgentFS** — isolated workspace scratchpads with `success` / `failure` / `aborted` outcome gates governing durable memory promotion and cleanup.

---

## Packages

MemoFS is structured as a monorepo containing 16 published public packages under the `@memofs/` scope. The CLI ships as `@memofs/cli` and installs the `memofs` command.

### Core Engine & Servers

| Package | Purpose |
| --- | --- |
| [`@memofs/core`](packages/core) | Core runtime, virtual AgentFS, graph engine, and hybrid recall router. |
| [`@memofs/cli`](packages/cli) | CLI tool for local and cloud memory workflows (`npx memofs`). |
| [`@memofs/server`](packages/server) | Self-hostable, OSS-deployable memory server for Node and Workers. |
| [`@memofs/mcp-server`](packages/mcp-server) | Model Context Protocol server exposing memory tools to AI agents. |
| [`@memofs/spec`](packages/spec) | Canonical JSON schemas, TypeScript contracts, and schema validators. |
| [`@memofs/connectors`](packages/connectors) | Local ingestion framework plugins (Notion, GitHub). |
| [`@memofs/json-rpc`](packages/json-rpc) | Message schemas and validation for JSON-RPC 2.0. |

### Providers & Adapters

| Package | Purpose |
| --- | --- |
| [`@memofs/adapter-ai-sdk`](packages/adapter-ai-sdk) | Vercel AI SDK integration, runtime bridges, and tool definitions. |
| [`@memofs/adapter-openai`](packages/adapter-openai) | OpenAI embeddings adapter. |
| [`@memofs/adapter-voyage`](packages/adapter-voyage) | Voyage AI embedder and reranker adapter. |
| [`@memofs/adapter-transformers`](packages/adapter-transformers) | ONNX local embedder (Transformers.js) for zero-API-key hybrid recall. |
| [`@memofs/adapter-workers-ai`](packages/adapter-workers-ai) | Cloudflare Workers AI graph extractor adapter. |
| [`@memofs/adapter-r2`](packages/adapter-r2) | Cloudflare R2 Blob storage adapter. |
| [`@memofs/adapter-turso`](packages/adapter-turso) | Turso / libSQL metadata store adapter. |

### Development Tooling

| Package | Purpose |
| --- | --- |
| [`@memofs/testing`](packages/testing) | Shared contract tests, mocks, fakes, and fixtures. |
| [`@memofs/benchmark-kit`](packages/benchmark-kit) | Benchmark workloads and runners. |

---

## Open Source vs. MemoFS Cloud

The **core runtime is open source** (MIT) and fully functional locally. You do not need a cloud account to run MemoFS.

**MemoFS Cloud** is the memory plane for your agents: it keeps every machine, teammate, and agent on the same memory, and gives you a dashboard to see and govern it.

| Feature | Open source (this repo) | MemoFS Cloud |
| --- | --- | --- |
| Local file-first memory | ✅ | ✅ |
| CLI + stdio MCP server | ✅ | ✅ |
| All adapters (OpenAI, Voyage, etc.) | ✅ | ✅ |
| Hosted sync (keep memory in sync) | ✅ client | ✅ hosted |
| Team workspaces & access control | — | ✅ available |
| Memory dashboard (explore, consolidate) | — | ✅ available |
| Hosted managed MCP endpoint | — | ✅ available (Pro+) |
| Managed runtime (memory API over HTTPS) | — | Soon |

[Join the Cloud waitlist →](https://memofs.dev)

---

## Repository Structure

```text
memofs/
├── apps/
│   └── docs/         # React Router & Fumadocs documentation (docs.memofs.dev)
├── packages/         # 16 published @memofs/* packages
├── tooling/          # Private @repo/* workspace build packages
├── benchmarks/       # Workspace benchmarking suite
├── examples/         # Runnable examples
└── package.json
```

---

## Workspace Commands

Run these command tasks from the repository root:

```bash
# Install all dependencies
pnpm install

# Build all packages and applications
pnpm build

# Run TypeScript compilation checks
pnpm typecheck

# Run unit tests across all packages
pnpm test

# Run code style and lint checks (Biome)
pnpm check

# Fix linting and formatting issues automatically
pnpm format-and-lint:fix

# Run local documentation dev server
pnpm docs:dev

# Build documentation locally
pnpm docs:build
```

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for details on formatting, testing, and pull requests.
For roadmap targets, see [`ROADMAP.md`](./ROADMAP.md).

For security reports, refer to [`SECURITY.md`](./SECURITY.md) — **do not** open public issues for security vulnerabilities.

---

## License

MIT. See [`LICENSE`](./LICENSE).
