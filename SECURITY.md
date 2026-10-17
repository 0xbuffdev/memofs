# Security Policy

MemoFS takes security seriously.

This document explains how to report vulnerabilities and what security practices apply to the public MemoFS repository, starting with the MemoFS package family.

---

## Scope

This policy applies to the public MemoFS repository and the published MemoFS package surfaces — the runtime (`@memofs/core`), the CLI (`@memofs/cli`, `memofs` bin), and the other published `@memofs/*` packages (adapters, connectors, server, mcp-server, json-rpc).

This policy also covers:

* CLI behavior
* connector safety
* MCP server behavior
* cloud client behavior
* telemetry redaction
* package configuration safety

---

## Out of scope

The public OSS repository does not include private MemoFS Cloud backend implementation.

Private MemoFS Cloud systems include:

* tenant routing
* billing
* usage enforcement
* encrypted BYOK storage
* hosted dashboard internals
* hosted database infrastructure
* internal admin tooling

If you believe you found a vulnerability in MemoFS Cloud itself, report it using the contact method below and clearly state that it affects MemoFS Cloud.

---

## Supported versions

Until the first stable release, security fixes will target the latest published prerelease or the main branch.

After stable releases begin, supported versions will be documented here.

Current policy:

| Version            |   Supported |
| ------------------ | ----------: |
| `main`             |         Yes |
| latest npm release |         Yes |
| older prereleases  | Best effort |

---

## Reporting a vulnerability

Please do **not** report security vulnerabilities through public GitHub issues.

Use GitHub private vulnerability reporting or GitHub Security Advisories when available.

You may also report security concerns by emailing:

```txt
security@memofs.dev
```

If the email is not active, use GitHub private vulnerability reporting or contact a maintainer privately through GitHub.

Include as much detail as possible:

* affected package
* affected version or commit
* runtime environment
* reproduction steps
* proof of concept if safe to share
* expected impact
* whether the issue is actively exploitable
* any suggested fix

Please avoid sharing exploit details publicly until the issue has been reviewed and fixed.

---

## What to expect

After a report is received, maintainers will try to:

1. Acknowledge receipt.
2. Confirm whether the issue is valid.
3. Determine severity.
4. Prepare a fix.
5. Release patched versions if needed.
6. Publish a security advisory when appropriate.

Response times may vary, especially before the project has dedicated security staff.

---

## Security-sensitive areas

MemoFS has several areas where security matters deeply.

### Filesystem access

Filesystem memory stores and future connectors must protect against:

* path traversal
* absolute path escape
* unsafe symlinks
* symlink loops
* root directory escape
* hidden file leaks
* unreadable file failures
* binary file mishandling
* extremely large files
* race conditions during scan/read

Expected behavior:

* never read outside the configured root unless explicitly allowed
* skip unsafe symlinks by default
* validate paths before reading or writing
* fail safely on permission errors

---

### Connectors

Connector packages must protect against:

* unsafe source paths
* unsafe URLs
* unbounded crawling
* oversized payloads
* malformed documents
* unsupported file types
* sensitive metadata exposure
* partial sync failure
* duplicate document IDs
* checkpoint corruption
* provider rate limits
* cancellation and timeout issues

Future network connectors must also consider:

* SSRF
* OAuth token handling
* API pagination safety
* provider-specific permission boundaries
* retry storms
* accidental private data ingestion

---

### Provider adapters

Provider adapters must protect against:

* accidental key logging
* unsafe error serialization
* retries without limits
* rate-limit mishandling
* invalid provider responses
* oversized inputs
* unexpected response shapes
* environment-specific runtime issues

Adapters should receive credentials through explicit config.

Avoid hidden environment variable reads in reusable package internals.

---

## Secrets policy

Never commit:

* API keys
* tokens
* passwords
* session secrets
* private keys
* database URLs
* OAuth client secrets
* production `.env` files
* customer data
* private MemoFS Cloud credentials

Use `.env.example` files for documented examples.

---

## Dependency security

Before adding dependencies, consider:

* maintenance status
* license
* transitive dependency size
* known vulnerabilities
* runtime compatibility
* supply-chain risk
* whether the dependency is truly needed

Keep runtime dependencies minimal.

---

## Supply chain

Package publishing should use secure release workflows.

Recommended practices:

* use changesets
* require CI before release
* restrict npm publish permissions
* use provenance where possible
* avoid publishing from local machines where possible
* review generated package contents before publishing
* do not include test fixtures containing secrets

Before publishing a package, verify:

```bash
pnpm build
pnpm test
pnpm typecheck
pnpm format-and-lint
```

Then inspect the package contents:

```bash
pnpm pack --dry-run
```

---

## Responsible disclosure

Please give maintainers reasonable time to investigate and fix reported issues before public disclosure.

Do not use vulnerabilities to:

* access private data
* disrupt services
* exfiltrate secrets
* modify data without permission
* attack users or infrastructure

Research should be limited to safe proof-of-concept behavior.

---

## Safe harbor

Security research conducted in good faith, without data theft, service disruption, privacy invasion, or persistence, is appreciated.

If you are unsure whether your testing is acceptable, contact maintainers first.

---

## Public advisories

When appropriate, MemoFS may publish:

* GitHub Security Advisories
* patched npm releases
* migration guidance
* severity notes
* affected version ranges

---

## Contact

Security reports: [security@memofs.dev](mailto:security@memofs.dev)

General issues: [MemoFS](https://github.com/0xbuffdev/memofs/issues)