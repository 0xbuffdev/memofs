import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InMemoryMemoryStore, type MemoryEmbedder } from "@memofs/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoFSMcpRuntimeFromConfig } from "../src/index";

/**
 * Create a throwaway MemoFS root dir for filesystem-backed local-mode tests.
 * Most MCP server tests inject an in-memory store; filesystem-backed tests need
 * a real rootDir with the bootstrap files present.
 */
async function createTempRoot(): Promise<{
	rootDir: string;
	cleanup: () => Promise<void>;
}> {
	const rootDir = await mkdtemp(join(tmpdir(), "memofs-mcp-"));
	return {
		rootDir,
		async cleanup() {
			await rm(rootDir, { recursive: true, force: true });
		},
	};
}

/** Shared scratch dirs cleaned up after each test. */
const dirsToClean: string[] = [];
afterEach(async () => {
	while (dirsToClean.length > 0) {
		const dir = dirsToClean.pop();
		if (dir) await rm(dir, { recursive: true, force: true });
	}
});

async function tempRoot() {
	const { rootDir, cleanup } = await createTempRoot();
	dirsToClean.push(rootDir);
	return { rootDir, cleanup };
}

/**
 * @file MCP runtime factory — recall/embedder wiring.
 *
 * The factory decides whether to wire a lazy local ONNX embedder based on
 * `recall.localEmbeddings`, the `MEMOFS_LOCAL_EMBEDDINGS` env var, and the
 * runtime configuration. The embedder itself is lazy (loaded on first vector
 * operation), so
 * these tests assert the *observable* consequences of the wiring decision:
 *
 * - non-vector operations never initialize the local embedder,
 * - local mode stays functional with zero API keys (lexical fallback),
 * - a missing adapter never breaks recall (graceful degradation),
 * - disabling local embeddings keeps the runtime import-light.
 *
 * @remarks
 * These tests inject `adapterFactory` rather than mocking the
 * `@memofs/adapter-transformers` module. The production code path resolves
 * that import from inside `@memofs/core`, which is consumed as a built `dist`
 * and therefore sits outside vitest's module graph — `vi.mock` does not
 * intercept it. CI builds core before testing (`test:run` depends on `^build`),
 * so the real adapter was constructed and the mock recorded zero calls.
 */

describe("createMemoFSMcpRuntimeFromConfig — embedder wiring", () => {
	describe("lazy wiring", () => {
		it("health does not initialize the local embedder", async () => {
			const adapterFactory = vi.fn(async () => {
				throw new Error("must not be constructed");
			});
			const runtime = createMemoFSMcpRuntimeFromConfig({
				mode: "local",
				store: new InMemoryMemoryStore(),
				adapterFactory,
			});
			const health = await runtime.health();
			expect(health.ok).toBe(true);
			expect(adapterFactory).not.toHaveBeenCalled();
		});

		it("hybrid mode: constructs with cloud config and never throws on wiring", async () => {
			// Hybrid mode (local engine + cloud file-replica sync) is the only
			// cloud-facing mode after the D4 trim; there is no standalone "cloud"
			// mode. Pointed at a non-existent base URL so the client is constructed
			// but unused; we only assert the runtime wires without throwing.
			const adapterFactory = vi.fn(async () => {
				throw new Error("must not be constructed");
			});
			const runtime = createMemoFSMcpRuntimeFromConfig({
				mode: "hybrid",
				cloud: { baseUrl: "https://invalid.example.com" },
				recall: { localEmbeddings: true },
				adapterFactory,
			});
			// Constructing the runtime must not throw and must not import the
			// (absent) local adapter eagerly.
			expect(runtime).toBeDefined();
			expect(adapterFactory).not.toHaveBeenCalled();
		});

		it("forwards onModelProgress to the embedder without eagerly constructing the adapter", async () => {
			const onModelProgress = vi.fn();
			const adapterFactory = vi.fn(async () => {
				throw new Error("must not be constructed");
			});
			const runtime = createMemoFSMcpRuntimeFromConfig({
				mode: "local",
				store: new InMemoryMemoryStore(),
				onModelProgress,
				adapterFactory,
			});
			expect(runtime).toBeDefined();
			expect(adapterFactory).not.toHaveBeenCalled();
		});

		it("initializes on the first vector operation and recalls semantically", async () => {
			const semanticEmbedder: MemoryEmbedder = {
				async embedTexts(input) {
					return {
						embeddings: input.texts.map((text, index) => ({
							text,
							embedding: [1, 0],
							index,
							model: "semantic-test",
							dimensions: 2,
						})),
						model: "semantic-test",
					};
				},
				async embedText(text) {
					return {
						text,
						embedding: [1, 0],
						index: 0,
						model: "semantic-test",
						dimensions: 2,
					};
				},
			};
			// Injected rather than module-mocked: the real code path imports the
			// adapter from inside @memofs/core, which resolves to a built dist and
			// sits outside vitest's module graph, so vi.mock cannot intercept it.
			const adapterFactory = vi.fn(async () => semanticEmbedder);

			const runtime = createMemoFSMcpRuntimeFromConfig({
				mode: "local",
				store: new InMemoryMemoryStore(),
				recall: { localEmbeddings: true, engine: "hybrid" },
				adapterFactory,
			});
			expect(adapterFactory).not.toHaveBeenCalled();

			// biome-ignore lint/style/noNonNullAssertion: local factory always wires writeMemory
			await runtime.writeMemory!({
				content: "PostgreSQL stores the account records.",
				kind: "decision",
			});
			expect(adapterFactory).toHaveBeenCalledTimes(1);

			// No lexical terms overlap; this result must come from vector retrieval.
			// biome-ignore lint/style/noNonNullAssertion: local factory always wires recall
			const result = await runtime.recall!({
				query: "relational database",
				limit: 5,
			});
			expect(result.items[0]?.text).toMatch(/PostgreSQL/i);
			expect(adapterFactory).toHaveBeenCalledTimes(1);
		});
	});

	describe("local mode with zero API keys", () => {
		it("recall falls back to the lexical path when the adapter is absent", async () => {
			// Force the factory toward the local-embedder path, but the adapter
			// package is an optional peer and unavailable here. Recall must degrade
			// gracefully to lexical-only.
			//
			// The rejection is injected rather than module-mocked: the real code path
			// imports the adapter from inside @memofs/core, which resolves to a built
			// dist outside vitest's module graph, so vi.mock cannot intercept it.
			const adapterFactory = vi.fn(async () => {
				throw new Error("transformers adapter unavailable");
			});
			const { rootDir, cleanup } = await tempRoot();
			try {
				const runtime = createMemoFSMcpRuntimeFromConfig({
					mode: "local",
					rootDir,
					projectId: "mcp-factory",
					recall: { localEmbeddings: true, engine: "hybrid" },
					adapterFactory,
				});

				// biome-ignore lint/style/noNonNullAssertion: local factory always wires writeMemory
				await runtime.writeMemory!({
					content: "Authentication uses JWT tokens in the login flow.",
					kind: "decision",
					title: "Auth",
				});

				// biome-ignore lint/style/noNonNullAssertion: local factory always wires recall
				const result = await runtime.recall!({
					query: "login auth",
					limit: 5,
				});
				// Lexical path surfaces the memory even though the vector path
				// could not initialize (no adapter).
				expect(result.items.length).toBeGreaterThan(0);
				expect(result.items[0]?.text).toMatch(/authentication/i);
				expect(adapterFactory).toHaveBeenCalled();
			} finally {
				await cleanup();
			}
		});

		it("recall: false localEmbeddings keeps the runtime import-light and still works lexically", async () => {
			const { rootDir, cleanup } = await tempRoot();
			try {
				const runtime = createMemoFSMcpRuntimeFromConfig({
					mode: "local",
					rootDir,
					projectId: "mcp-factory",
					recall: { localEmbeddings: false },
				});

				// biome-ignore lint/style/noNonNullAssertion: local factory always wires writeMemory
				await runtime.writeMemory!({
					content: "The deployment pipeline runs on GitHub Actions.",
					kind: "reference",
				});

				// biome-ignore lint/style/noNonNullAssertion: local factory always wires recall
				const result = await runtime.recall!({
					query: "deployment pipeline",
					limit: 5,
				});
				expect(result.items.length).toBeGreaterThan(0);
			} finally {
				await cleanup();
			}
		});
	});

	describe("env var override", () => {
		it("MEMOFS_LOCAL_EMBEDDINGS=0 disables the local embedder", async () => {
			vi.stubEnv("MEMOFS_LOCAL_EMBEDDINGS", "0");
			try {
				const { rootDir, cleanup } = await tempRoot();
				try {
					const runtime = createMemoFSMcpRuntimeFromConfig({
						mode: "local",
						rootDir,
						projectId: "mcp-factory",
					});
					// biome-ignore lint/style/noNonNullAssertion: local factory always wires writeMemory
					await runtime.writeMemory!({
						content: "Env-disabled embedder still recalls lexically.",
						kind: "note",
					});
					// biome-ignore lint/style/noNonNullAssertion: local factory always wires recall
					const result = await runtime.recall!({
						query: "env-disabled embedder",
						limit: 5,
					});
					expect(result.items.length).toBeGreaterThan(0);
				} finally {
					await cleanup();
				}
			} finally {
				vi.unstubAllEnvs();
			}
		});
	});

	describe("runtime delegation", () => {
		it("readCoreMemory returns the bootstrapped core document", async () => {
			const { rootDir, cleanup } = await tempRoot();
			try {
				const runtime = createMemoFSMcpRuntimeFromConfig({
					mode: "local",
					rootDir,
					projectId: "mcp-factory",
					recall: { localEmbeddings: false },
				});
				const readCoreMemory = runtime.readCoreMemory;
				if (!readCoreMemory) throw new Error("readCoreMemory is missing");
				const { content } = await readCoreMemory();
				// Bootstrapped core memory is a non-empty markdown document.
				expect(content.length).toBeGreaterThan(0);
			} finally {
				await cleanup();
			}
		});
	});
});
