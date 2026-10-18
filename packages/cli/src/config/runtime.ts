/**
 * CLI config file writer for `.memofs/config.json`.
 *
 * Configuration resolution (environment variables, CLI flags, and config file
 * merging) is handled by MemoFS's internal `resolveMemoFsConfig`. This module
 * only provides `writeDefaultCliConfig`, which is used by the
 * `memofs config init` and `memofs init` commands.
 *
 * The JSON schemas are shipped with the CLI package at `schema/config.json`
 * and `schema/connectors.json` (exposed via the
 * `@memofs/cli/schema/config.json` and `@memofs/cli/schema/connectors.json`
 * package exports).
 *
 * `resolveSchemaPath` and `resolveConnectorsSchemaPath` emit the canonical
 * relative schema references (for example,
 * `../node_modules/@memofs/cli/schema/config.json`) when those files exist
 * under the project root. Otherwise, they fall back to the hosted schema
 * URLs. This avoids the non-portable paths that can result from resolving
 * the package's physical installation location inside workspace-based
 * installs.
 *
 * @module runtime
 */

import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { MemoFsConfigFile } from "@memofs/core";

export type { MemoFsConfigFile };

/**
 * Hosted fallback used when the packaged schema file cannot be located on
 * disk (for example, when package metadata has been stripped by a bundler).
 * Matches the schema's own `$id`.
 */
const FALLBACK_SCHEMA_URL = "https://memofs.dev/schema/config.json";

/**
 * Filesystem location to check for the schema, relative to the project root.
 * We look for:
 *
 * `<rootDir>/node_modules/@memofs/cli/schema/config.json`
 */
const FS_SCHEMA_PATH = "node_modules/@memofs/cli/schema/config.json";

/**
 * Hosted fallback for `.memofs/connectors.json` — same convention as
 * {@link FALLBACK_SCHEMA_URL}.
 */
const CONNECTORS_FALLBACK_SCHEMA_URL =
	"https://memofs.dev/schema/connectors.json";

/**
 * Filesystem location to check for the connectors schema, relative to the
 * project root: `<rootDir>/node_modules/@memofs/cli/schema/connectors.json`.
 */
const CONNECTORS_FS_SCHEMA_PATH =
	"node_modules/@memofs/cli/schema/connectors.json";

/**
 * Canonical relative `$schema` reference written into `.memofs/config.json`.
 * Since `config.json` lives inside `.memofs/`, the correct relative path is:
 *
 * `../node_modules/@memofs/cli/schema/config.json`
 *
 * ## Strategy
 *
 * Prefer a deterministic, portable reference instead of computing one from
 * the package's resolved installation path.
 *
 * 1. **Canonical `node_modules` reference (preferred).**
 *    If
 *    `<rootDir>/node_modules/@memofs/cli/schema/config.json`
 *    exists, return
 *    `../node_modules/@memofs/cli/schema/config.json`.
 *
 *    This reference is stable across npm, pnpm, and Yarn installations.
 *    Even if `node_modules/@memofs/cli` is a symlink, editors resolve the
 *    relative path correctly because it is anchored to the project's own
 *    `node_modules` directory.
 *
 * 2. **Hosted fallback URL.**
 *    If the schema file does not exist under the project root (for example,
 *    when the CLI is installed globally, bundled without `node_modules`, or
 *    the schema file has been stripped), return the hosted schema URL so that
 *    editors can still provide JSON schema validation.
 *
 * ### Why not `require.resolve`?
 *
 * The previous implementation resolved the package using `require.resolve()`
 * and then generated a relative path from `.memofs/` using `path.relative()`.
 * In workspace installs, `require.resolve()` may follow a symlink into the
 * package's source directory (for example,
 * `packages/cli/schema/config.json`), which can live outside the consumer's
 * project. As a result, the generated `$schema` value could become something
 * like:
 *
 * - `../../packages/cli/schema/config.json`
 * - `../../../Users/alice/dev/memofs/packages/cli/schema/config.json`
 *
 * These paths are machine-specific and cannot be committed or shared
 * reliably. Checking for the canonical file under the project's own
 * `node_modules` directory avoids that problem entirely.
 *
 * @param rootDir - Project root directory containing `.memofs/`.
 * @returns A portable `../node_modules/...` `$schema` reference, or the
 * hosted schema URL when the schema file is not present under the project
 * root.
 */
function packagedSchemaRef(
	rootDir: string,
	fsSchemaPath: string,
	fallbackUrl: string,
): string {
	const fsPath = path.resolve(rootDir, fsSchemaPath);
	return existsSync(fsPath) ? `../${fsSchemaPath}` : fallbackUrl;
}

export function resolveSchemaPath(rootDir: string): string {
	return packagedSchemaRef(rootDir, FS_SCHEMA_PATH, FALLBACK_SCHEMA_URL);
}

/**
 * Resolve the canonical `$schema` reference for `.memofs/connectors.json`.
 *
 * Uses the same strategy as {@link resolveSchemaPath}: the portable
 * `../node_modules/@memofs/cli/schema/connectors.json` reference when the
 * packaged schema exists under the project root, otherwise the hosted schema
 * URL. Written by `memofs connectors add`/`remove` so editors get validation
 * and autocomplete for the connectors file.
 *
 * @param rootDir - Project root directory containing `.memofs/`.
 * @returns A portable `../node_modules/...` `$schema` reference, or the
 * hosted schema URL when the schema file is not present under the project
 * root.
 */
export function resolveConnectorsSchemaPath(rootDir: string): string {
	return packagedSchemaRef(
		rootDir,
		CONNECTORS_FS_SCHEMA_PATH,
		CONNECTORS_FALLBACK_SCHEMA_URL,
	);
}

/**
 * Creates or overwrites the local workspace configuration file
 * (`.memofs/config.json`) with the provided defaults.
 *
 * @param input - Configuration write instructions.
 * @returns Status object describing the output path and whether the file was
 * created or overwritten.
 */
export async function writeDefaultCliConfig(input: {
	cwd: string;
	root?: string;
	config?: MemoFsConfigFile;
	force?: boolean;
}): Promise<{ path: string; created: boolean; overwritten: boolean }> {
	const root = path.resolve(input.cwd, input.root ?? ".");
	const configPath = path.join(root, ".memofs", "config.json");

	await fs.mkdir(path.dirname(configPath), { recursive: true });

	const exists = await fileExists(configPath);

	if (exists && !input.force) {
		return {
			path: configPath,
			created: false,
			overwritten: false,
		};
	}

	const config = input.config ?? {
		$schema: resolveSchemaPath(root),
		runtime: "local" as const,
		root: ".",
		// Hybrid recall with local embeddings — matches the MCP runtime's
		// default and the init-time model predownload.
		recall: { engine: "auto" as const, localEmbeddings: true },
	};

	await fs.writeFile(
		configPath,
		`${JSON.stringify(config, null, 2)}\n`,
		"utf8",
	);

	return {
		path: configPath,
		created: !exists,
		overwritten: exists,
	};
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.stat(filePath);
		return true;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return false;
		}
		throw error;
	}
}
