/**
 * Tests for the `.memofs/connectors.json` JSON schema — the editor
 * autocomplete/validation contract that `memofs connectors add`/`remove`
 * stamp into the file via `$schema`.
 *
 * Mirrors `config-schema.test.ts`: the resolution tests simulate a real
 * `node_modules/@memofs/cli` layout via symlink without depending on the
 * surrounding repo's `node_modules/` tree; the stamping tests exercise the
 * command functions against a temp store.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, symlink } from "node:fs/promises";
import path from "node:path";
import { MemoFS } from "@memofs/core";
import {
	createNodeFsMemoryStore,
	createTempMemoFsDir,
} from "@memofs/core/node-fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	runConnectorsAddCommand,
	runConnectorsRemoveCommand,
} from "../src/commands/connectors";
import { resolveConnectorsSchemaPath } from "../src/config";
import { createBufferedOutput } from "../src/output/output";

/**
 * The packaged schema file in this package — used as the symlink target so
 * tests can simulate a real `node_modules/@memofs/cli` layout.
 */
const PACKAGED_SCHEMA = path.resolve(__dirname, "../schema/connectors.json");

const HOSTED_SCHEMA = path.resolve(
	__dirname,
	"../../../apps/docs/public/schema/connectors.json",
);

describe("resolveConnectorsSchemaPath", () => {
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
						"node_modules/@memofs/cli/schema/connectors.json",
					),
				),
			).toBe(true);

			expect(resolveConnectorsSchemaPath(temp.rootDir)).toBe(
				"../node_modules/@memofs/cli/schema/connectors.json",
			);
		} finally {
			await temp.cleanup();
		}
	});

	it("falls back to the hosted schema URL when the schema file is not under the root", async () => {
		const temp = await createTempMemoFsDir();
		try {
			// temp dir has no node_modules/@memofs/cli
			expect(resolveConnectorsSchemaPath(temp.rootDir)).toBe(
				"https://memofs.dev/schema/connectors.json",
			);
		} finally {
			await temp.cleanup();
		}
	});
});

describe("connectors.json $schema stamping", () => {
	let temp: { rootDir: string; cleanup: () => Promise<void> };
	let memo: MemoFS;

	beforeEach(async () => {
		temp = await createTempMemoFsDir();
		memo = new MemoFS({
			store: createNodeFsMemoryStore({
				rootDir: temp.rootDir,
				createRoot: true,
				missingFileBehavior: "empty",
			}),
			rootDir: temp.rootDir,
			mode: "local",
		});
	});

	afterEach(async () => {
		// Release the advisory lock via the store (same pattern as
		// connectors.test.ts).
		const store = memo.store as { dispose?: () => Promise<void> };
		await store.dispose?.();
		await temp.cleanup();
	});

	async function readConnectorsJson(): Promise<Record<string, unknown>> {
		const raw = await readFile(
			path.join(temp.rootDir, ".memofs", "connectors.json"),
			"utf8",
		);
		return JSON.parse(raw) as Record<string, unknown>;
	}

	it("add stamps $schema and keeps it on remove (self-healing rewrite)", async () => {
		const addResult = await runConnectorsAddCommand({
			memo,
			output: createBufferedOutput(),
			type: "github",
			secretRef: "ss_abc",
			id: "github-main",
		});
		expect(addResult).toBe(0);

		// Temp root has no node_modules/@memofs/cli → hosted fallback URL.
		const afterAdd = await readConnectorsJson();
		expect(afterAdd.$schema).toBe("https://memofs.dev/schema/connectors.json");
		expect(afterAdd.connectors).toEqual([
			{
				id: "github-main",
				type: "github",
				enabled: true,
				secretRef: "ss_abc",
			},
		]);

		const removeResult = await runConnectorsRemoveCommand({
			memo,
			output: createBufferedOutput(),
			id: "github-main",
		});
		expect(removeResult).toBe(0);

		const afterRemove = await readConnectorsJson();
		expect(afterRemove.$schema).toBe(
			"https://memofs.dev/schema/connectors.json",
		);
		expect(afterRemove.connectors).toEqual([]);
	});
});

describe("packaged connectors schema contents", () => {
	it("declares the validated connector row shape with no additional properties", async () => {
		const schema = JSON.parse(
			await readFile(PACKAGED_SCHEMA, "utf8"),
		) as Record<string, unknown>;

		expect(schema.$id).toBe("https://memofs.dev/schema/connectors.json");
		expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");

		const properties = schema.properties as Record<string, unknown>;
		expect(Object.keys(properties)).toEqual(["$schema", "connectors"]);
		expect(schema.required).toEqual(["connectors"]);
		expect(schema.additionalProperties).toBe(false);

		const connectors = properties.connectors as Record<string, unknown>;
		const row = connectors.items as Record<string, unknown>;
		expect(row.required).toEqual(["id", "type", "secretRef"]);
		expect(row.additionalProperties).toBe(false);
		const rowProps = row.properties as Record<string, unknown>;
		expect(Object.keys(rowProps)).toEqual([
			"id",
			"type",
			"enabled",
			"schedule",
			"sourceMapping",
			"secretRef",
		]);
	});

	it("hosted docs copy matches the packaged schema except for the $id domain", async () => {
		const packaged = JSON.parse(
			await readFile(PACKAGED_SCHEMA, "utf8"),
		) as Record<string, unknown>;
		const hosted = JSON.parse(await readFile(HOSTED_SCHEMA, "utf8")) as Record<
			string,
			unknown
		>;

		expect(hosted.$id).toBe("https://memofs.dev/schema/connectors.json");
		expect({ ...packaged, $id: hosted.$id }).toEqual(hosted);
	});
});
