---
title: "MemoFS Is Now on the Official MCP Registry"
description: "The MemoFS MCP server is listed on the official Model Context Protocol Registry. One command to install, works with any MCP-capable agent."
category: Announcement
publishedAt: "2026-08-17"
authorName: "Christopher S. Aondona"
authorRole: "Founder & Engine Lead"
authorInitials: "CSA"
authorHandle: "christophersesugh"
authorAvatarUrl: "https://github.com/christophersesugh.png"
featured: false
tags: [announcement, mcp, registry, mcp-server]
---

`@memofs/mcp-server` is now listed on the [official Model Context Protocol Registry](https://registry.modelcontextprotocol.io).

This means any MCP-capable agent (including Claude Desktop, Cursor, GitHub Copilot, Gemini CLI, Zed, or your own custom client) can discover and install MemoFS memory from the registry. One command:

```bash
npx -y @memofs/mcp-server
```

## What the listing includes

The registry entry supports two transport modes:

**Local (stdio):** The default mode. Runs entirely on your machine in-process, requiring no API keys. Memory lives in `.memofs/` as plain files in your project workspace.

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

**Remote (Streamable HTTP):** Designed for hosted setups on Pro and Teams plans. One URL plus a bearer API key gives any agent access to shared project memory without a local checkout:

```text
https://cloud.memofs.dev/api/v1/projects/{projectId}/mcp
```

Both transports expose the same four memory tools (`context`, `recall`, `remember`, `consolidate`), six AgentFS session tools, and memory files as MCP resources.

## What this means for you

If you're already using MemoFS, nothing changes; your existing setup keeps working. The registry listing adds discoverability: tools that browse the MCP registry can now find and install MemoFS directly.

If you haven't tried MemoFS yet, the fastest path is still:

```bash
npm i -g @memofs/cli
memofs init
memofs generate agent claude --project-name "My App"
```

That wires up hooks, rules, and the MCP server in one step. Read the [getting-started guide](https://memofs.dev/articles/give-your-agent-memory-in-5-minutes) for the full walkthrough.

## Links

- **Registry listing:** [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io)
- **MCP server docs:** [memofs.dev/packages/mcp](https://memofs.dev/packages/mcp/)
- **GitHub:** [github.com/0xbuffdev/memofs](https://github.com/0xbuffdev/memofs)
