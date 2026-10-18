import { MEMOFS_PATHS, MemoFS } from "@memofs/core";
import {
	createNodeFsMemoryStore,
	createTempMemoFsDir,
} from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { runMemoFsCli } from "../src";

describe("remember and context", () => {
	it("stores a structured agent memory note", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runMemoFsCli({
				argv: [
					"remember",
					"Use VoyageAI for embeddings.",
					"--root",
					temp.rootDir,
					"--kind",
					"decision",
					"--tag",
					"embeddings",
					"--actor",
					"agent:claude-code",
					"--json",
				],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.data.kind).toBe("decision");

			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir: temp.rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir: temp.rootDir,
				autoBootstrap: false,
			});
			const notes = await memo.store.read(MEMOFS_PATHS.memory.notes);
			expect(notes).toContain("Use VoyageAI for embeddings");
		} finally {
			await temp.cleanup();
		}
	});

	it("refuses likely secrets by default", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runMemoFsCli({
				argv: [
					"remember",
					"OPENAI_API_KEY=sk-123456789012345678901234",
					"--root",
					temp.rootDir,
				],
			});
			expect(result.exitCode).toBe(1);
			expect(result.stderr.join("\n")).toContain("possible secret");
		} finally {
			await temp.cleanup();
		}
	});

	it("packs context for agent use", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			await runMemoFsCli({
				argv: [
					"remember",
					"Billing webhooks verify signatures.",
					"--root",
					temp.rootDir,
					"--kind",
					"constraint",
				],
			});
			const result = await runMemoFsCli({
				argv: [
					"context",
					"--root",
					temp.rootDir,
					"--query",
					"billing",
					"--json",
				],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.command).toBe("context");
			expect(typeof parsed.data.text).toBe("string");
			expect(parsed.data.text).toContain("Billing webhooks");
		} finally {
			await temp.cleanup();
		}
		// Three in-process CLI runs against a real filesystem, each doing memory
		// work. Measured at ~5.0-5.5s, so the 5s default is a coin flip and this
		// test failed intermittently in CI under parallel load.
	}, 30_000);
});
