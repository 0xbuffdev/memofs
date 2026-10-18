# Contributing to MemoFS

Thank you for your interest in contributing to MemoFS.

This repository hosts MemoFS open-source work. MemoFS is the first product family: an open-source memory runtime for AI apps and agents. The project is designed to be useful to external developers, not only MemoFS Cloud.

This guide explains how to contribute code, docs, tests, and package improvements.

---

## Project goals

MemoFS aims to provide:

- file-first memory infrastructure
- provider-neutral memory contracts
- vector recall capabilities
- reranking capabilities
- graph memory
- connector ingestion
- MCP support
- cloud client contracts
- observability hooks
- evaluation and benchmark utilities

The public OSS repo should remain:

- open-source friendly
- BYOK-friendly
- cloud-optional
- provider-neutral where possible
- testable with fake clients
- easy to understand
- safe to use in production

---

## Code of Conduct

All contributors must follow the project Code of Conduct.

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

---

## Security issues

Do not open public issues for security vulnerabilities.

See [SECURITY.md](./SECURITY.md)

---

## Repository setup

### Requirements

Use:

```txt
Node.js >= 22
pnpm >= 9
```

Enable Corepack:

```bash
corepack enable
corepack prepare pnpm@9 --activate
```

Clone the repo:

```bash
git clone https://github.com/0xbuffdev/memofs.git
cd memofs
```

Install dependencies:

```bash
pnpm install
```

Build everything:

```bash
pnpm build
```

Run tests:

```bash
pnpm test
```

Run type checks:

```bash
pnpm typecheck
```

Run formatting and lint checks:

```bash
pnpm format-and-lint
```

---

## Recommended development flow

Create a branch:

```bash
git checkout -b fix/short-description
```

Make your changes.

Run checks:

```bash
pnpm build
pnpm test
pnpm typecheck
pnpm format-and-lint
pnpm lint:package
pnpm validate:workspace
```

Commit:

```bash
git add .
git commit -m "fix: short description"

# or

git commit -m "fix(memofs-cli): short description"
```

Push:

```bash
git push origin fix/short-description
```

Open a pull request.

---

## Branch naming

Use short, descriptive branch names.

Examples:

```txt
fix/graph-edge-validation
feat/connectors-jsonl-parser
docs/mcp-stdio-guide
test/recall-empty-results
chore/update-tsconfig
```

---

## Commit style

Use clear commit messages.

Recommended format:

```txt
type(scope): description
```

Examples:

```txt
feat(graph): add weighted path traversal
fix(connectors): reject unsafe symlink targets
docs(mcp): document stdio setup
test(recall): cover empty vector results
chore(repo): update turbo tasks
```

Common types:

```txt
feat
fix
docs
test
refactor
perf
chore
ci
build
```

---

## Pull request checklist

Before opening a pull request, verify:

* [ ] The change has a clear purpose.
* [ ] The package boundary is respected.
* [ ] Tests were added or updated.
* [ ] Edge cases were considered.
* [ ] Public APIs are documented.
* [ ] TypeScript passes.
* [ ] Build passes.
* [ ] Formatting/lint checks pass.
* [ ] A changeset was added if a package changed.
* [ ] No secrets, tokens, credentials, or private cloud logic were committed.

---

## Package boundary rules

MemoFS is a monorepo of focused packages under the `@memofs/` scope, each owning
one concern. The runtime lives in `@memofs/core`; provider integrations live in
optional `@memofs/adapter-*` packages; the CLI (`@memofs/cli`, published with the
`memofs` bin), `@memofs/mcp-server`, `@memofs/server`, and `@memofs/connectors`
each wrap the core for a specific interface. See the zone table in
[`.agents/rules/package-boundaries.md`](./.agents/rules/package-boundaries.md).

Within `@memofs/core`, code is organized by feature area (such as `fs`, `recall`,
`agentfs`, `ai-runtime`, etc.). These are internal modules re-exported from the
package root — they are not separate package entrypoints, so import them from
`@memofs/core`, not from deep paths.

Packages in this OSS repo must not contain private MemoFS Cloud logic such as:

* tenant routing
* subscription enforcement
* billing state
* usage gates
* encrypted BYOK storage
* internal admin tooling
* private dashboard composition
* production cloud database ownership

---

## Adding a new package or feature
- **Core runtime features**: Add new core capabilities as internal modules under `packages/core/src/<feature>/` and re-export them from the package root [index.ts](./packages/core/src/index.ts). Keep `@memofs/core` provider-neutral — do not introduce public subpath imports for internal modules.

- **Provider or interface packages**: Provider-specific integrations (embedders, rerankers, blob/metadata stores) belong in their own `@memofs/adapter-*` package, and interface layers (CLI, MCP, server, connectors) in their respective packages. They import `@memofs/core` and must not add core memory logic. See [`.agents/rules/package-boundaries.md`](./.agents/rules/package-boundaries.md).

- **New workspace packages**: New workspace packages should live beside `packages/core/` under `packages/<package-name>/` and conform to the following directory structure:

```txt
packages/package-name/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── errors.ts
│   └── internal/
├── tests/
├── docs/
│   ├── ARCHITECTURE.md
│   └── EDGE_CASES.md
├── README.md
├── package.json
├── tsconfig.json
└── tsdown.config.ts
```

The package should include:

* a clear README
* TypeScript types
* tests
* edge-case tests
* no unnecessary dependencies
* a small public API
* stable package exports
* clear errors

---

## Public API rule

Each package's public API is exported from its own:

```txt
src/index.ts
```

Avoid deep imports. Consumers import from the package root — for the runtime
that's `@memofs/core`, not an internal subpath.

If something is public, export it intentionally.

If something is internal, keep it internal.

---

## Edge-case expectations

Production packages should handle:

* invalid input
* empty input
* duplicate IDs
* malformed JSON
* invalid metadata
* circular values
* prototype-pollution keys
* unsafe paths
* unsafe URLs
* timeout/cancellation where applicable
* retries where applicable
* large payloads
* partial failures
* provider failures
* rate limits
* missing optional config
* deterministic behavior in tests

Do not only test the happy path.

---

## TypeScript expectations

Use strict TypeScript.

Prefer explicit types for public APIs.

Avoid:

```ts
any
```

unless there is a clear reason.

Prefer:

```ts
unknown
```

at package boundaries, then validate.

Public functions should make invalid states difficult to represent.

---

## Testing expectations

Every package should have tests for:

* normal behavior
* invalid input
* boundary conditions
* error behavior
* edge cases
* provider/client failures where applicable

Run all tests:

```bash
pnpm test
```

Run tests for a single package:

```bash
pnpm --filter @memofs/core test
```

---

## Documentation expectations

Each package should explain:

* what it does
* what it does not do
* installation
* basic usage
* advanced usage if relevant
* edge cases
* package boundaries
* production notes

Avoid vague package docs.

A developer should be able to understand why the package exists and how to use it.

## Changesets

If your change affects a package that will be published, add a changeset:

```bash
pnpm changeset
```

Choose the correct bump:

```txt
patch  -> bug fixes and small improvements
minor  -> new features that do not break existing users
major  -> breaking changes
```

Examples:

```txt
patch:
Fix JSONL parser recovery behavior.

minor:
Add weighted path traversal to graph memory.

major:
Rename public recall adapter interface.
```

When changesets are versioned (`pnpm version-packages`), each affected package's
`CHANGELOG.md` is updated by Changesets.

---

## Dependency rules

Keep dependencies minimal.

Before adding a dependency, ask:

* Is it necessary?
* Is it maintained?
* Is it safe?
* Is it small?
* Does it work in the runtime targets?
* Can this be implemented simply without a dependency?
* Will it cause problems for users bundling the package?

Avoid dependencies for tiny utilities.

---

## Runtime compatibility

Packages should clearly state their intended runtime.

Possible targets:

```txt
Node.js
Browser
Cloudflare Workers
Bun
Deno
Edge runtimes
```

Do not accidentally introduce Node-only APIs into packages that should work in edge or browser environments.

---

## Environment variables

Do not read environment variables deep inside generic packages unless the package is explicitly an adapter that needs provider config.

Prefer this:

```ts
createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
});
```

Avoid this inside the adapter:

```ts
const apiKey = process.env.OPENAI_API_KEY;
```

This keeps packages testable and runtime-flexible.

---

## Security rules

Never commit:

* API keys
* tokens
* credentials
* `.env` files
* production database URLs
* private certificates
* session secrets
* customer data
* private MemoFS Cloud internals

Use `.env.example` for documented configuration.

---

## Documentation site

The public docs app lives in:

```txt
apps/docs
```

Run it locally:

```bash
pnpm docs:dev
```

---

## Issue guidelines

When opening an issue, include:

* package name
* version
* runtime
* reproduction steps
* expected behavior
* actual behavior
* logs or stack traces if relevant
* minimal reproduction if possible

Good title:

```txt
memofs: fs JSONL parser skips valid line after malformed object
```

Bad title:

```txt
Bug
```

---

## Feature request guidelines

For feature requests, include:

* problem statement
* use case
* proposed API if relevant
* alternatives considered
* package affected
* whether it should be OSS or cloud-only

---

## Pull request review criteria

Maintainers will review:

* package boundary
* correctness
* API design
* tests
* docs
* edge cases
* security
* maintainability
* performance impact
* dependency impact

A smaller focused PR is easier to review than a large mixed PR.

---

## Release philosophy

MemoFS should release stable, well-tested packages.

Do not rush a package into public release if:

* API boundaries are unclear
* tests are weak
* docs are missing
* edge cases are not handled
* package responsibility is too broad

It is acceptable for a package to exist in the repo before public release.

---

## Getting help

Use GitHub issues or discussions for:

* bugs
* feature requests
* design questions
* package usage questions
* documentation improvements

For security issues, follow [SECURITY.md](./SECURITY.md).

---

## Thank you

Every useful issue, test, doc fix, example, and bug report helps make MemoFS better.
