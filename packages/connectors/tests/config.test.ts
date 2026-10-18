import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONNECTORS_PATH } from "@memofs/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ConnectorsFile } from "../src/index";
import {
	ConnectorConfigError,
	EMPTY_CONNECTORS_FILE,
	readConnectorsFile,
	selectConnectors,
	validateConnectorsFile,
} from "../src/index";

/** Write a `.memofs/connectors.json` with the given JSON string under rootDir. */
async function writeConnectorsFile(
	rootDir: string,
	json: string,
): Promise<void> {
	const dir = join(rootDir, ".memofs");
	await mkdir(dir, { recursive: true });
	await writeFile(join(rootDir, CONNECTORS_PATH), json, "utf8");
}

describe("readConnectorsFile", () => {
	let rootDir: string;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "memofs-cfg-"));
	});

	afterEach(async () => {
		await rm(rootDir, { recursive: true, force: true });
	});

	it("returns an empty connector set when the file is missing", async () => {
		const file = await readConnectorsFile(rootDir);
		expect(file.connectors).toEqual([]);
	});

	it("reads a well-formed connectors file", async () => {
		await writeConnectorsFile(
			rootDir,
			JSON.stringify({
				connectors: [
					{
						id: "github-main",
						type: "github",
						enabled: true,
						schedule: "@hourly",
						sourceMapping: { repository: "owner/repo" },
						secretRef: "ss_abc123",
					},
				],
			}),
		);
		const file = await readConnectorsFile(rootDir);
		expect(file.connectors).toHaveLength(1);
		expect(file.connectors[0]?.id).toBe("github-main");
		expect(file.connectors[0]?.secretRef).toBe("ss_abc123");
	});

	it("throws ConnectorConfigError on malformed JSON", async () => {
		await writeConnectorsFile(rootDir, "{ not json");
		await expect(readConnectorsFile(rootDir)).rejects.toBeInstanceOf(
			ConnectorConfigError,
		);
	});

	it("rejects a connector row carrying a leaked `token` field", async () => {
		await writeConnectorsFile(
			rootDir,
			JSON.stringify({
				connectors: [
					{
						id: "leaky",
						type: "github",
						secretRef: "ss_x",
						token: "ghp_should_not_be_here",
					},
				],
			}),
		);
		await expect(readConnectorsFile(rootDir)).rejects.toThrow(/token/);
	});

	it("rejects a connector row carrying a leaked `apiKey` field", async () => {
		await writeConnectorsFile(
			rootDir,
			JSON.stringify({
				connectors: [
					{ id: "leaky", type: "github", secretRef: "ss_x", apiKey: "xxx" },
				],
			}),
		);
		await expect(readConnectorsFile(rootDir)).rejects.toThrow(/apiKey/);
	});

	it("rejects a row missing required `secretRef`", async () => {
		await writeConnectorsFile(
			rootDir,
			JSON.stringify({ connectors: [{ id: "x", type: "github" }] }),
		);
		await expect(readConnectorsFile(rootDir)).rejects.toThrow(/secretRef/);
	});

	it("rejects a row with an empty `secretRef`", async () => {
		await writeConnectorsFile(
			rootDir,
			JSON.stringify({
				connectors: [{ id: "x", type: "github", secretRef: "" }],
			}),
		);
		await expect(readConnectorsFile(rootDir)).rejects.toThrow(/secretRef/);
	});

	it("defaults `enabled` to true when omitted", async () => {
		await writeConnectorsFile(
			rootDir,
			JSON.stringify({
				connectors: [{ id: "x", type: "github", secretRef: "ss_a" }],
			}),
		);
		const file = await readConnectorsFile(rootDir);
		expect(file.connectors[0]?.enabled).toBe(true);
	});
});

describe("validateConnectorsFile", () => {
	it("rejects a non-object top-level value", () => {
		expect(() => validateConnectorsFile("nope")).toThrow(ConnectorConfigError);
		expect(() => validateConnectorsFile(null)).toThrow(ConnectorConfigError);
		expect(() => validateConnectorsFile([])).toThrow(ConnectorConfigError);
	});

	it("rejects a missing `connectors` array", () => {
		expect(() => validateConnectorsFile({})).toThrow(/array/);
	});

	it("accepts an empty connectors array", () => {
		const file = validateConnectorsFile({ connectors: [] });
		expect(file.connectors).toEqual([]);
	});

	it("tolerates a top-level $schema key (editor autocomplete reference)", () => {
		const file = validateConnectorsFile({
			$schema: "https://memofs.dev/schema/connectors.json",
			connectors: [
				{ id: "x", type: "github", enabled: true, secretRef: "ss_a" },
			],
		});
		expect(file.connectors).toHaveLength(1);
		expect(file.connectors[0]?.id).toBe("x");
	});

	it("rejects a non-object row", () => {
		expect(() => validateConnectorsFile({ connectors: ["nope"] })).toThrow(
			/object/i,
		);
	});

	it("preserves schedule and sourceMapping when present", () => {
		const file = validateConnectorsFile({
			connectors: [
				{
					id: "x",
					type: "github",
					enabled: false,
					schedule: "@daily",
					sourceMapping: { repository: "a/b" },
					secretRef: "ss_a",
				},
			],
		});
		expect(file.connectors[0]?.schedule).toBe("@daily");
		expect(file.connectors[0]?.sourceMapping).toEqual({ repository: "a/b" });
		expect(file.connectors[0]?.enabled).toBe(false);
	});

	it("rejects raw tokens or custom password/token fields", () => {
		expect(() =>
			validateConnectorsFile({
				connectors: [
					{
						id: "x",
						type: "github",
						secretRef: "ss_a",
						description: "ghp_123456789012345678901234567890123456",
					},
				],
			}),
		).toThrow(/contains a value that matches a raw token pattern/i);

		expect(() =>
			validateConnectorsFile({
				connectors: [
					{
						id: "x",
						type: "notion",
						secretRef: "ss_a",
						githubToken: "some-harmless-value",
					},
				],
			}),
		).toThrow(/contains a forbidden key/i);
	});

	it("EMPTY_CONNECTORS_FILE is frozen and empty", () => {
		expect(EMPTY_CONNECTORS_FILE.connectors).toEqual([]);
		expect(Object.isFrozen(EMPTY_CONNECTORS_FILE)).toBe(true);
	});
});

describe("selectConnectors", () => {
	const file: ConnectorsFile = {
		connectors: [
			{ id: "a", type: "github", enabled: true, secretRef: "ss_a" },
			{ id: "b", type: "notion", enabled: false, secretRef: "ss_b" },
			{ id: "c", type: "github", enabled: true, secretRef: "ss_c" },
		],
	};

	it("selects enabled connectors by default", () => {
		const selected = selectConnectors(file);
		expect(selected.map((c) => c.id)).toEqual(["a", "c"]);
	});

	it("filters by type", () => {
		const selected = selectConnectors(file, { type: "github" });
		expect(selected.map((c) => c.id)).toEqual(["a", "c"]);
	});

	it("filters by disabled", () => {
		const selected = selectConnectors(file, { enabled: false });
		expect(selected.map((c) => c.id)).toEqual(["b"]);
	});

	it("combines enabled + type filters", () => {
		const selected = selectConnectors(file, { type: "notion" });
		expect(selected).toEqual([]);
	});
});
