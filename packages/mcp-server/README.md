# `@memofs/mcp-server`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/mcp-server"><img src="https://img.shields.io/npm/v/%40memofs%2Fmcp-server?label=%40memofs%2Fmcp-server&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/mcp-server"><img src="https://img.shields.io/npm/dm/%40memofs%2Fmcp-server?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Model Context Protocol server for MemoFS agent integrations.

## What is this?

The `@memofs/mcp-server` package allows AI coding agents (like Claude Desktop, Cursor, Zed, and OpenCode) to securely read, search, and update project memory using the Model Context Protocol (MCP). It wraps the core runtime and exposes 10 model-facing tools (4 memory verbs + 6 AgentFS session tools) and 9 resources for memory, graph, and session access.

**Key capabilities:**

- **Code anchoring** — `memofs.remember` accepts an optional `anchor` parameter to bind memories to source files; `memofs.recall` surfaces `stale` flags when anchored files change.
- **Memory decay detection** — recall results carry `unverified` flags when memories exceed their kind-specific decay floors.
- **Session outcomes** — `memofs_agent_session_complete` accepts `outcome`, `ephemeral`, and `reason` parameters controlling a 5-row behavior matrix for durable memory promotion and workspace cleanup.

## Installation

Most MCP clients invoke the server on demand via `npx` — no install required:

```bash
npx -y @memofs/mcp-server --help
```

If you want to install the server as a dev dependency instead:

```bash
npm install -D @memofs/mcp-server
```

> Requires **Node.js >= 22**.

Or use directly via `npx` in your client's configuration:

```bash
npx -y @memofs/mcp-server --help
```

## Quick Start

You can configure your MCP client (e.g., Claude Desktop, Cursor, or any MCP client) to start the server via stdio.

### MCP clients config

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": [
        "-y",
        "@memofs/mcp-server",
        "--runtime",
        "local",
        "--root",
        "/absolute/path/to/project"
      ]
    }
  }
}
```

## Configuration and Usage

The server supports two runtime modes (`local`, `hybrid`), cloud sync via `--cloud-url` and `--api-key`, and a strict `--read-only` flag to block mutating tools when used with untrusted clients.

For comprehensive setup instructions across all major AI tools, the full list of exposed tools and resources, and runtime mode options, please refer to the [Full Documentation](https://docs.memofs.dev/packages/mcp/).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
