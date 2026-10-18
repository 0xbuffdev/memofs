# `@memofs/adapter-ai-sdk`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/adapter-ai-sdk"><img src="https://img.shields.io/npm/v/%40memofs%2Fadapter-ai-sdk?label=%40memofs%2Fadapter-ai-sdk&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/adapter-ai-sdk"><img src="https://img.shields.io/npm/dm/%40memofs%2Fadapter-ai-sdk?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Vercel AI SDK adapter for MemoFS memory tools, runtime bridging, and context builders.

## What is this?

**Vercel AI SDK adapter for MemoFS.** Bridges a MemoFS memory engine into the
framework-neutral `MemofsMemoryRuntime` contract and exposes a ready-to-use
Vercel AI SDK **memory tool**, prompt context builders, and agent-session
instructions.

This package is the provider implementation of MemoFS's AI-framework runtime
contract — the runtime equivalent of the embedder interface/impl split
(`Embedder` in core; `@memofs/adapter-openai`, `-voyage`, `-transformers` as
provider packages).

## Installation

```bash
npm install @memofs/adapter-ai-sdk
```

> Requires **Node.js >= 22**.

This package has a required peer dependency on the
[Vercel AI SDK](https://sdk.vercel.ai/docs):

```bash
npm install ai
```

## Quick Start

### 1. Build the runtime

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { createAiSdkRuntimeFromMemofs } from "@memofs/adapter-ai-sdk";

const store = createNodeFsMemoryStore({ rootDir: "." });
const memo = new MemoFS({ store, projectId: "demo" });
const runtime = createAiSdkRuntimeFromMemofs(memo);
```

Every `recall` goes through `MemoFS.recall` (the single hybrid engine:
BM25 + fuzzy + embeddings + recency boost + optional reranker), so recall
quality never changes between local, cloud, and hybrid modes.

### 2. Use the memory tool with the Vercel AI SDK

```ts
import { generateText, tool } from "ai";
import { buildRuntimeMemoryToolDefinition } from "@memofs/adapter-ai-sdk";

const memoryTool = buildRuntimeMemoryToolDefinition({
  runtime,
  access: { projectId: "demo", userId: "user_123" },
  allowWrites: true,
  allowCoreUpdates: true,
});

const result = await generateText({
  model: yourModel,
  tools: { memory: tool(memoryTool) },
  prompt: "Remember that the deploy target is Cloudflare Workers.",
});
```

The tool accepts a zod discriminated union of commands: `read_core_memory`,
`update_core_memory`, `remember`, `list_notes`, `search`, and (when supported)
`index`.

### 3. Inject memory into the prompt

```ts
import { buildRuntimeMemoryContext } from "@memofs/adapter-ai-sdk";

const { text } = await buildRuntimeMemoryContext({
  runtime,
  access: { projectId: "demo" },
  query: "deploy target",
  includeCoreMemory: true,
  includeNotes: true,
  includeRecall: true,
});

// Pass `text` as part of your `system` prompt.
```

## API

| Export | Description |
|--------|-------------|
| `createAiSdkRuntimeFromMemofs(memo)` | Bridges a `MemoFS` client into a `MemofsMemoryRuntime`. |
| `buildRuntimeMemoryToolDefinition(options)` | A `{ description, inputSchema, execute }` tool for the Vercel AI SDK. |
| `runRuntimeMemoryTool(options, input)` | Runs a single validated tool command (used by the tool definition; also callable directly). |
| `buildRuntimeMemoryContext(input)` | Builds a prompt-ready memory text (core memory + notes + recall). |
| `buildPrepareCallMemoryText(...)` | Builds memory text for a single model call. |
| `buildAgentSessionInstructions(...)` | Scaffolds instructions for an agent session workspace. |
| `runtimeMemoryToolInputSchema` | The zod discriminated union the tool validates against. |
| `scopePolicy` helpers | `normalizeAccessContext`, `inferWriteScope`, `createScopeMetadata`, `canReadMemoryMetadata`, `createRecallFilters`. |

## Scoping

All reads and writes are scoped through the `access` context
(`project`, `workspace`, `tenant`, `user`, `conversation`,
`participant-shared`), so an agent never crosses a memory boundary it wasn't
given. Writes additionally pass through `inferWriteScope` and the
`allowWrites` / `allowCoreUpdates` / `allowIndexing` / `allowSecrets` flags.

## Boundary

This package owns the **Vercel AI SDK** integration only: the runtime bridge,
the zod memory tool, the prompt/context builders, the agent-session
instructions, and the scope policy. It does **not** own:

- The framework-neutral `MemofsMemoryRuntime` contract (that lives in
  `@memofs/core`).
- The memory engine, stores, recall, or `agentfs/` (also core).
- Other framework adapters (LangChain / OpenAI Agents SDK / Mastra are future
  sibling packages that will implement the same contract).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development
scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
