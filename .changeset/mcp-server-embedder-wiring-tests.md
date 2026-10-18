---
"@memofs/mcp-server": patch
---

# @memofs/mcp-server — deterministic local-embedder wiring tests

- Added an optional `adapterFactory` to `RuntimeFactoryOptions`, forwarded to the lazy local embedder. It bypasses the dynamic import of the optional `@memofs/adapter-transformers` peer. Production callers omit it, so the adapter stays an optional peer dependency.
- The factory's embedder-wiring tests now inject `adapterFactory` instead of mocking the `@memofs/adapter-transformers` module. The production code resolves that import from inside `@memofs/core`, which is consumed as a built `dist` and therefore sits outside vitest's module graph, so `vi.mock` never intercepted it. CI builds core before testing (`test:run` depends on `^build`), so the real adapter was constructed while the mock recorded zero calls, failing two tests on every run since 2026-09-25.

No behaviour change: the embedder is still constructed lazily and still falls back to lexical recall when the adapter is unavailable.
