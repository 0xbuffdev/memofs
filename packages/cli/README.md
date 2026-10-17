# `@memofs/cli`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/cli"><img src="https://img.shields.io/npm/v/@memofs/cli?label=@memofs/cli&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/cli"><img src="https://img.shields.io/npm/dm/@memofs/cli?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

MemoFS command-line interface for local and hybrid memory workflows.

## What is this?

The `@memofs/cli` package gives you a command-line tool (`memofs`) for managing local and hybrid memory. You can use it to initialize a memory workspace, store durable decisions, search past memory, sync with MemoFS Cloud, and manage agent sessions and connectors.

## Installation

```bash
npm install -D @memofs/cli
```

> Requires **Node.js >= 22**.

Or use directly without installing:

```bash
npx memofs --help
```

## Quick Start

Initialize memory in your project and store a durable decision:

```bash
# Initialize a memory workspace in the current directory
npx memofs init

# Store a durable decision
npx memofs remember "Use VoyageAI for embeddings" --kind decision

# Get context for a task
npx memofs context --query "current task" --json

# Inspect the current memory state
npx memofs inspect

# Backfill code anchors onto existing notes (drift detection)
npx memofs migrate anchors

# Archive deprecated memories to cold storage
npx memofs consolidate --archive-deprecated

# Restore an archived memory
npx memofs restore <id>
```

## Configuration and Usage

The CLI supports Local (default) and Hybrid runtime modes.

You can configure defaults using a `.memofs/config.json` file. For a complete list of commands, global flags, and cloud integration features, refer to the [Full Documentation](https://docs.memofs.dev/packages/cli/).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
