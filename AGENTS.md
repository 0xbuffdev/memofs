# MemoFS

File-first memory runtime for AI agents. Memory lives as Markdown and JSONL under `.memofs/`, so it can be `cat`-ed, `git diff`-ed, and rolled back. Overview, package list, and quick start: `README.md`.

## Positioning

MemoFS is for **AI agents in general**, not only coding agents. Balance framing 50/50 between **users of AI agents** (running agents day-to-day via MCP or lifecycle hooks) and **builders of AI agents** (building agents and frameworks on `@memofs/core` or `@memofs/server`).

## Package Scopes

- `@memofs/*` — published public packages, `packages/*`.
- `@repo/*` — private tooling and build config, `tooling/*`. A published `@memofs/*` package must never import a `@repo/*` package.
- `@memofs/core` entrypoints: the default export is universal/edge (no Node built-ins), with `node-fs` and `cloud-client` as explicit subpaths.

## Commands

Run from the repo root.

| Task | Command |
|------|---------|
| Done gate — checks, typecheck, test, build, lint, docs | `pnpm validate:workspace` |
| Test one package | `pnpm --filter @memofs/core test:run` |
| Test one file | `pnpm --filter @memofs/core test:run tests/agentfs/contract.test.ts` |
| Typecheck one package | `pnpm --filter @memofs/core typecheck` |
| Lint and format | `pnpm format-and-lint` |
| Fix lint and format | `pnpm format-and-lint:fix` |
| Release preflight | `pnpm release:preflight` |

## External References

| Need | File |
|------|------|
| Overview, architecture, packages, quick start | `README.md` |
| Setup, commit style, PR checklist, package and dependency rules | `CONTRIBUTING.md` |
| Security policy and vulnerability reporting | `SECURITY.md` |
| Code of conduct | `CODE_OF_CONDUCT.md` |
| Documentation site | `apps/docs` |
| CI | `.github/workflows/ci.yml` |
| Issue tracker | GitHub Issues |

## Workspace Rules

Each file owns its topic. Read it before writing code rather than relying on memory.

**Repo shape** — [monorepo-structure](./.agents/rules/monorepo-structure.md) · [package-naming](./.agents/rules/package-naming.md) · [package-boundaries](./.agents/rules/package-boundaries.md) · [package-build-rules](./.agents/rules/package-build-rules.md) · [adding-new-package](./.agents/rules/adding-new-package.md)

**Code** — [typescript-rules](./.agents/rules/typescript-rules.md) · [code-style](./.agents/rules/code-style.md) · [changelog-and-comment-hygiene](./.agents/rules/changelog-and-comment-hygiene.md)

**Process** — [core-concepts](./.agents/rules/core-concepts.md) · [development-commands](./.agents/rules/development-commands.md) · [git-conventions](./.agents/rules/git-conventions.md) · [testing](./.agents/rules/testing.md) · [testing-requirements](./.agents/rules/testing-requirements.md) · [technology-stack](./.agents/rules/technology-stack.md)

## Skill Discovery

- Before improvising a workflow you have handled before, check whether a skill covers it: load `find-skills`, or run `npx skills find <query>`.
- Install a vetted match with `npx skills add <owner/repo@skill> -g -y`; prefer 1K+ installs from known owners. If nothing fits, do the work directly.
