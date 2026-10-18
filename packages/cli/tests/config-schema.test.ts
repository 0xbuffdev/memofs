import { existsSync } from "node:fs";
import { mkdir, symlink } from "node:fs/promises";
import path from "node:path";
import { createTempMemoFsDir } from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { resolveSchemaPath } from "../src/config";

/**
 * The packaged schema file in this package — used as the symlink target so
 * tests can simulate a real `node_modules/@memofs/cli` layout without
 * depending on the surrounding repo's `node_modules/` tree.
 */
const PACKAGED_SCHEMA = path.resolve(__dirname, "../schema/config.json");

describe("resolveSchemaPath", () => {
	it("emits the canonical ../node_modules reference when the schema is installed under the root", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const parent = path.join(temp.rootDir, "node_modules", "@memofs");
			await mkdir(parent, { recursive: true });
			await symlink(
				path.resolve(__dirname, ".."),
				path.join(parent, "cli"),
				"dir",
			);
			expect(
				existsSync(
					path.join(
						temp.rootDir,
						"node_modules/@memofs/cli/schema/config.json",
					),
				),
			).toBe(true);

			expect(resolveSchemaPath(temp.rootDir)).toBe(
				"../node_modules/@memofs/cli/schema/config.json",
			);
		} finally {
			await temp.cleanup();
		}
	});

	it("falls back to the hosted schema URL when the schema file is not under the root", async () => {
		const temp = await createTempMemoFsDir();
		try {
			// temp dir has no node_modules/@memofs/cli
			expect(resolveSchemaPath(temp.rootDir)).toBe(
				"https://memofs.dev/schema/config.json",
			);
		} finally {
			await temp.cleanup();
		}
	});

	it("never emits a path that escapes the project root (regression: previously produced ../../../Users/...)", async () => {
		// Simulate running from a temp dir that is NOT inside the repo, with no
		// node_modules present — the previous implementation computed a
		// path.relative() against wherever require.resolve landed, which could
		// climb past the root. The new implementation either returns the
		// canonical ../node_modules/ ref or the hosted URL — never a deeply
		// upwards-climbing relative path like ../../packages/...
		const temp = await createTempMemoFsDir();
		try {
			const result = resolveSchemaPath(temp.rootDir);
			// The valid canonical ref is exactly one level up: ../node_modules/...
			// Anything like ../../ or ../../../ is the old bug.
			expect(result.includes("../../")).toBe(false);
			expect(result.startsWith("/")).toBe(false);
			expect(result.includes("packages/cli")).toBe(false);
		} finally {
			await temp.cleanup();
		}
	});

	it("the packaged schema file used as the symlink target actually exists", () => {
		// Sanity check: if this fails, the symlink-based test above is silently
		// passing for the wrong reason.
		expect(existsSync(PACKAGED_SCHEMA)).toBe(true);
	});
});
