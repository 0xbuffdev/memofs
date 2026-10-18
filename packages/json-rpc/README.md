# `@memofs/json-rpc`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/json-rpc"><img src="https://img.shields.io/npm/v/%40memofs%2Fjson-rpc?label=%40memofs%2Fjson-rpc&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/json-rpc"><img src="https://img.shields.io/npm/dm/%40memofs%2Fjson-rpc?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Dependency-free JSON-RPC 2.0 protocol primitives shared by MemoFS transports.

## Why a separate package?

Two MemoFS packages speak JSON-RPC over the wire. Before this package, both
shipped near-identical copies of the same ~200 lines of spec types and helpers,
and one was coupled to the other's error classes. That violates the workspace
DRY/SSOT rule and the package-boundaries rule (no transport in core, no
distribution→distribution import). Extracting the spec layer into a neutral,
dependency-free package fixes both:

- One set of types and helpers, consumed everywhere.
- A neutral error type (`JsonRpcProtocolError`) — consumers that own their own
 error hierarchy catch it and re-throw in their own type.

## What's inside

- **Types** — `JsonRpcRequest`, `JsonRpcResponse`, `JsonRpcSuccessResponse`,
 `JsonRpcErrorResponse`, `JsonRpcId`.
- **Constants** — `JSON_RPC_ERRORS` (the five spec codes: `parseError`,
 `invalidRequest`, `methodNotFound`, `invalidParams`, `internalError`).
- **Parsing & validation** — `parseJsonRpcPayload`, `validateJsonRpcRequest`
 (throw `JsonRpcProtocolError` with the correct spec code on any violation).
- **Response helpers** — `success(id, result)`, `failure(id, code, message, data?)`.
- **Utilities** — `isNotification`, `isPlainObject`.

## Install

```sh
npm install @memofs/json-rpc
```

> Requires **Node.js >= 22**.

## Usage

```ts
import {
	failure,
	JSON_RPC_ERRORS,
	JsonRpcProtocolError,
	parseJsonRpcPayload,
	success,
	validateJsonRpcRequest,
} from "@memofs/json-rpc";

// 1. Parse the incoming wire payload (throws JsonRpcProtocolError on bad JSON).
const payload = parseJsonRpcPayload(await request.text());

// 2. Validate the request shape (throws with the right spec code).
const request = validateJsonRpcRequest(payload);

// 3. Dispatch + respond.
return success(request.id, await handle(request.method, request.params));

// On an unknown method:
return failure(
	request.id,
	JSON_RPC_ERRORS.methodNotFound,
	`Method "${request.method}" is not available.`,
);
```

### Mapping the neutral error to your own type

A package with its own error hierarchy re-throws in its own type — the protocol
layer never imports a consumer's classes:

```ts
import { JsonRpcProtocolError, JSON_RPC_ERRORS } from "@memofs/json-rpc";

try {
	validateJsonRpcRequest(payload);
} catch (err) {
	if (err instanceof JsonRpcProtocolError) {
		throw new YourValidationError(err.message, {
			code: err.jsonRpcCode, // the spec code, already mapped
		});
	}
	throw err;
}
```

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
