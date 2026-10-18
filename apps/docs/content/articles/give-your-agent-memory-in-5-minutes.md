---
title: "Give Your Coding Agent Memory in 5 Minutes"
description: "A step-by-step guide to adding persistent memory to any AI coding agent (Claude Code, Cursor, Codex, Copilot, Gemini CLI, research tools, or your custom agent) using MemoFS. No database, no API keys, no infrastructure."
category: Guide
publishedAt: "2026-08-20"
authorName: "Christopher S. Aondona"
authorRole: "Founder & Engine Lead"
authorInitials: "CSA"
authorHandle: "christophersesugh"
authorAvatarUrl: "https://github.com/christophersesugh.png"
featured: false
tags: [guide, getting-started, cli, mcp, hooks, memory, tutorial]
---

You open your coding agent tomorrow morning and it already knows your stack, your constraints, and the decision you made at 11 PM last night about switching to OAuth. No re-explaining. No "as a reminder, we use Drizzle." It just knows.

That's what this guide gets you. Five minutes, no cloud account, no API keys, no infrastructure.

## What MemoFS does

MemoFS is a file-first memory runtime for AI agents. It stores your project knowledge as plain files in a `.memofs/` directory (including project decisions and architectural facts) and retrieves them with hybrid search (keyword + fuzzy + vector). Every file is inspectable (`cat`), versionable (`git diff`), and portable (copy the folder).

It's not another agent. It's a memory layer that clips onto the agent you already have.

## Prerequisites

- **Node.js 22+**
- **An existing project workspace** (MemoFS doesn't care what you build or research)
- **An AI agent or assistant:** Claude Code, Cursor, Codex, GitHub Copilot, Gemini CLI, opencode, research tools, or your own custom agent

## Step 1: Install and initialize

```bash
cd /root/of/your/project
npm i -g @memofs/cli
memofs init
```

`memofs init` scaffolds the memory store in your project:

```
.memofs/
├── config.json          # Runtime configuration
├── manifest.json        # File registry and project metadata
├── connectors.json      # External connectors (GitHub, Notion)
├── memory/
│   ├── core.md          # Always-on project briefing
│   └── notes.md         # Durable observations and decisions
├── events/
│   ├── memory-events.jsonl   # Append-only audit log
│   └── conversations.jsonl   # Conversation history
├── indexes/
│   ├── chunks.jsonl     # Text chunk index (disposable)
│   └── embeddings.jsonl # Vector embeddings (disposable)
├── graph/
│   ├── nodes.jsonl      # Entity graph nodes
│   └── edges.jsonl      # Entity relationships
├── snapshots/
│   └── snapshots.jsonl  # Versioned checkpoints
└── tmp/                 # Ephemeral working space
```

Everything under `indexes/` is disposable; delete it and MemoFS rebuilds from the canonical files in `memory/`, `events/`, and `graph/`. The files *are* the database.

You'll see:

```text
Initialized .memofs at /your/project (Project ID: your-project-id)
```

## Step 2: Wire up your agent

One command generates everything your agent needs: rules, hooks (if your platform supports them), and MCP server config:

```bash
memofs generate agent claude --project-name "My App"
```

Replace `claude` with your agent. Here's what each platform gets:

### Agents with hooks (fully automatic)

**Claude Code**, **Codex**, and **opencode** support lifecycle hooks: code that runs at session start, on compaction, when subagents spawn, and at session end. For these agents, memory is completely hands-free.

```bash
memofs generate agent claude   # → CLAUDE.md + .claude/settings.json + .mcp.json
memofs generate agent codex    # → AGENTS.md + .codex/hooks.json + .codex/config.toml
memofs generate agent opencode # → AGENTS.md + .opencode/plugins/memofs.js + opencode.json
```

What the hooks do:

| Moment | What happens |
|--------|-------------|
| **Session start** | MemoFS pulls latest from cloud (if configured), then injects your project context (core memory, entity graph, and relevant recall) directly into the model's context. |
| **Compaction** | When the context window compacts, memory is re-injected so your project knowledge survives the summarization. |
| **Subagent start** | Every subagent inherits the same memory. No amnesiac helpers. |
| **Session end** | A compliance summary tells you whether the agent loaded context, consulted memory, and persisted new facts. |

Here's the actual hooks file MemoFS generates for Claude Code (`.claude/settings.json`):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear",
        "hooks": [{
          "type": "command",
          "command": "sh -c '[ -n \"$MEMOFS_API_KEY\" ] && memofs cloud sync pull; memofs context --query \"project context\" --task-type general --mark-session-start'"
        }]
      },
      {
        "matcher": "compact",
        "hooks": [{
          "type": "command",
          "command": "sh -c 'memofs context --query \"project context\" --task-type general'"
        }]
      }
    ],
    "SubagentStart": [{
      "hooks": [{
        "type": "command",
        "command": "sh -c 'memofs context --query \"project context\" --task-type general'"
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "sh -c 'memofs status --hook'"
      }]
    }]
  }
}
```

The compaction-survival hook handles context preservation. Long agent sessions inevitably compact their context to stay under the window, which is precisely when hard-won project knowledge gets summarized into oblivion. MemoFS treats compaction as a re-injection point, so memory outlives the very mechanism that would otherwise destroy it.

### Agents without hooks (MCP tools)

**Cursor**, **Gemini CLI**, and **GitHub Copilot** don't have context-injecting hooks, but they speak MCP. That's all MemoFS needs.

```bash
memofs generate agent cursor  # → .cursor/rules/memofs.mdc + .cursor/mcp.json
memofs generate agent gemini  # → GEMINI.md + .gemini/settings.json
memofs generate agent copilot # → .github/copilot-instructions.md + .vscode/mcp.json
```

This registers the MemoFS MCP server and generates a rules file that instructs the agent to load context at the start of a task, recall before answering questions, and persist decisions as it makes them. It is slightly less automated than hooks (the agent asks for memory instead of having it handed over) but uses the exact same memory and intelligence pipeline underneath.

The MCP config looks like this (varies slightly by platform):

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"]
    }
  }
}
```

### Any MCP client at all

Whether you use Claude Desktop, Zed, or a custom client, anything that speaks MCP over stdio works:

```bash
npx -y @memofs/mcp-server
```

## Step 3: Your first session

Open your agent and give it a task. Let's say you're building an API:

> *"Add a POST /api/users endpoint that creates a user in our D1 database."*

Your agent works through the task, reading your code, writing the route, and making decisions along the way. If hooks are set up (Claude Code, Codex), MemoFS has already injected your project context before you typed a word. If you're on MCP-only (Cursor, Copilot), the agent calls `memofs.context` at the start of the task.

What the agent sees when context loads:

```markdown
### How to use MemoFS context
MemoFS is your long-term memory; treat it as the single source of truth
for project identity, architecture, constraints, and decisions.

- Adhere to memory: follow the constraints, decisions, and preferences below.
- Recall before answering: call memofs.recall instead of re-deriving facts.
- Persist discoveries: call memofs.remember for durable decisions without waiting to be asked.
- Never store secrets, credentials, or environment values.

### Core Memory
# Core Memory

## Identity
- Project: My App

## Stable Facts
- Add stable facts here.

## Constraints
- Add durable constraints here.
```

It's sparse right now because you just initialized; that changes fast.

As the agent works, the rules file instructs it to persist what it learns. When it decides to use Hono for routing, it calls:

```typescript
memofs.remember({
  content: "API routes use Hono framework with D1 bindings for database access.",
  kind: "decision"
})
```

When it discovers a constraint in your codebase, it persists that too:

```typescript
memofs.remember({
  content: "All API routes require Bearer token validation middleware.",
  kind: "constraint",
  anchor: { file: "src/middleware/auth.ts" }
})
```

That anchor binds the memory to the actual file. If someone later modifies `auth.ts`, MemoFS will detect the drift and flag the memory as stale, so your agent knows to re-verify before trusting it.

## Step 4: Your second session: the payoff

Close your agent. Open it again tomorrow. This is the moment that matters.

If you're on Claude Code or Codex, the `SessionStart` hook fires automatically, and your agent's context now includes:

```markdown
### Core Memory
# Core Memory

## Identity
- Project: My App

## Stable Facts
- API routes use Hono framework with D1 bindings for database access.

### Entities
1. HonoRouter (framework): currently used for all API routes
2. D1Database (database): currently primary data store

### Relevant Recall
1. All API routes require Bearer token validation middleware.
   score: 0.94
   [anchor: src/middleware/auth.ts#validateSession]

2. API routes use Hono framework with D1 bindings for database access.
   score: 0.88
```

Your agent already knows. No re-explaining. Ask it to add another endpoint and it uses Hono, connects to D1, and wires up the auth middleware, because it *remembers* that's what your project does.

## Step 5: Inspect your memory

MemoFS is plain files. Inspect them like plain files.

**Read what your agent knows:**

```bash
cat .memofs/memory/core.md
```

**Search your memory files:**

```bash
memofs search "database decisions"
memofs search "auth.*middleware" --regex
```

This scans your memory files (`core.md`, `notes.md`, and conversation logs) for matching text or regular expression patterns.

**Preview task-aware context:** Test what context your agent receives for a specific task:

```bash
memofs context --query "auth" --task-type debug      # surfaces errors, exceptions, stack traces
memofs context --query "auth" --task-type refactor   # surfaces architecture, dependencies, design patterns
```

**Health check your memory store:**

```bash
memofs doctor
```

This validates all 11 canonical files, checks your `core.md` against a 200-line soft limit (to prevent context bloat), audits JSONL files line by line, identifies orphaned events and deprecated graph nodes, and reports issues. Pass `--fix` to auto-repair.

```text
MemoFS doctor passed: workspace memory is healthy.
```

**See what's in the store:**

```bash
memofs inspect
```

```text
MemoFS root: /your/project
.memofs exists: yes
Project: my-app

Files:
- .memofs/manifest.json: 412 bytes
- .memofs/memory/core.md: 256 bytes
- .memofs/memory/notes.md: 180 bytes
- .memofs/events/memory-events.jsonl: 1420 bytes, 8 records
...

Summary:
- events: 8
- conversations: 2
- chunks: 14
- graph nodes: 5
- graph edges: 3
- snapshots: 1
```

## Optional: Sync across machines

Local memory is the foundation. Cloud sync makes it portable.
You need an account at [https://cloud.memofs.dev](https://cloud.memofs.dev) to use cloud sync. Once you have an account, create and set your API key:

```bash
# Set your API key (from cloud.memofs.dev dashboard)
export MEMOFS_API_KEY=mfs_...

# Push your memory to the cloud
memofs cloud sync push
# ✓ Cloud push complete (11 uploaded, cursor: 1)

# On another machine, pull it down
memofs cloud sync pull
# ✓ Cloud pull complete (11 downloaded, 0 removed, cursor: 1)

# Check sync status
memofs cloud sync status
# cursor: 1
# files: 11
# storageBytes: 12450
# lastSyncAt: 2026-08-17T14:15:00.000Z
```

Cloud sync is a **file replica**: it stores byte-for-byte copies of your `.memofs/` files by path and content hash. It never parses, indexes, or embeds what it carries. All intelligence stays local.

Push is always explicit. The hooks only ever *pull*. One session's half-baked decisions can't silently pollute your teammates' memory.

## What you have now

After five minutes, your agent has:

- **Persistent memory:** Project decisions and architectural facts survive restarts across sessions.
- **Hybrid recall:** Keyword, fuzzy, and vector search fused into one ranked result.
- **Code anchoring:** Memories bound to source files, automatically flagged when the code drifts.
- **Session-outcome gating:** Only successful task outcomes promote working notes to durable memory.
- **Inspectable storage:** `cat .memofs/memory/core.md` shows exactly what your agent believes.

No database. No API keys. No infrastructure. Plain files, versioned by Git, portable to any machine.

## What's next

- **[The Memory Runtime for Any AI Agent](https://memofs.dev/articles/the-memory-layer-for-any-ai-agent):** Full architecture explaining why files beat vector databases and the six core memory problems.
- **[When Your Agent's Memory Lies](https://memofs.dev/articles/when-your-agents-memory-lies):** How MemoFS detects code drift and flags stale memories before they mislead your agent.
- **[How MemoFS Retrieves Without a Database](https://memofs.dev/articles/how-memofs-retrieves-without-a-database):** The hybrid recall engine in detail: BM25, fuzzy matching, vector similarity, and task-aware biasing.
- **[Core runtime docs](https://memofs.dev/packages/core/):** `@memofs/core` API reference
- **[CLI reference](https://memofs.dev/packages/cli/):** Every command and flag
- **[MCP server setup](https://memofs.dev/packages/mcp/):** `npx -y @memofs/mcp-server`

---

*Have questions? [Open a discussion](https://github.com/0xbuffdev/memofs/discussions). Found a bug? [File an issue](https://github.com/0xbuffdev/memofs/issues).*
