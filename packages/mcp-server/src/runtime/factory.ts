/**
 * MCP Server runtime factory — thin adapter over the unified MemoFS client.
 *
 * Creates a `new MemoFS(config)` instance and wraps it as a `MemoFSMcpRuntime`
 * for the MCP protocol server to consume.
 *
 * @module factory
 */

import {
	createLazyLocalEmbedder,
	type MemoFS,
	type MemoFsConfig,
	type MemoryEmbedder,
	type MemoryStore,
} from "@memofs/core";
import { createNodeMemoFs } from "@memofs/core/node-fs";
import type { MemoFSMcpRuntime, MemoFSRuntimeMode } from "../types";

/**
 * Options for creating an MCP runtime from MemoFS configuration.
 */
export interface RuntimeFactoryOptions {
	mode?: MemoFSRuntimeMode;
	rootDir?: string;
	projectId?: string;
	workspaceId?: string;
	/** Inject a custom store (e.g. `InMemoryMemoryStore` for tests). When omitted, a `NodeFsMemoryStore` is created from `rootDir`. */
	store?: MemoryStore;
	cloudClient?: MemoFsConfig["cloudClient"];
	cloud?: {
		baseUrl?: string;
		apiKey?: string;
		workspaceId?: string;
		projectId?: string;
		timeoutMs?: number;
		userAgent?: string;
		requireApiKey?: boolean;
		retry?: NonNullable<NonNullable<MemoFsConfig["cloud"]>["retry"]>;
	};
	/**
	 * Recall engine configuration. When `recall.localEmbeddings` is true (the
	 * default for the MCP runtime), a local ONNX embedder is lazy-loaded so
	 * hybrid (vector + lexical) recall works with zero API keys. Set
	 * `localEmbeddings: false` to keep the runtime import-light (lexical-only).
	 */
	recall?: MemoFsConfig["recall"];
	/**
	 * Optional progress callback invoked during local embedding model
	 * download/load. Forwarded to the Transformers.js adapter. Use this to
	 * surface a "warming up" notice to users on first run.
	 */
	onModelProgress?: (info: {
		progress: number;
		status: string;
		file?: string;
	}) => void;
	/**
	 * When true, kicks off background prewarming of local embedding weights
	 * immediately upon runtime creation instead of waiting for the first vector operation.
	 */
	prewarm?: boolean;
	/**
	 * Injected adapter factory for tests. When provided, it replaces the dynamic
	 * import of `@memofs/adapter-transformers`, so a test can exercise lazy
	 * embedder wiring without depending on the mock intercepting an import that
	 * happens inside `@memofs/core`.
	 *
	 * Production callers must omit this: the real path is what makes the adapter
	 * an optional peer dependency.
	 */
	adapterFactory?: (options: {
		model: string;
		cacheDir?: string;
		onProgress?: (info: {
			progress: number;
			status: string;
			file?: string;
		}) => void;
	}) => Promise<MemoryEmbedder>;
}

/**
 * Creates a MemoFSMcpRuntime by constructing a MemoFS client and delegating
 * all runtime methods to it.
 *
 * @param options - Factory configuration options.
 * @returns The MemoFSMcpRuntime adapter.
 */
export function createMemoFSMcpRuntimeFromConfig(
	options: RuntimeFactoryOptions = {},
): MemoFSMcpRuntime {
	const localEmbeddings =
		options.recall?.localEmbeddings ??
		(process.env.MEMOFS_LOCAL_EMBEDDINGS !== "0" &&
			process.env.MEMOFS_LOCAL_EMBEDDINGS?.toLowerCase() !== "false");
	const embeddingModel =
		options.recall?.embeddingModel ??
		(typeof process.env.MEMOFS_EMBEDDING_MODEL === "string" &&
		process.env.MEMOFS_EMBEDDING_MODEL.length > 0
			? process.env.MEMOFS_EMBEDDING_MODEL
			: undefined);

	// Local ONNX embedder is lazy: constructing it is synchronous and cheap.
	// The heavy runtime is imported on first recall.
	const useLocalEmbedder = localEmbeddings;
	const embedder = useLocalEmbedder
		? createLazyLocalEmbedder({
				...(embeddingModel === undefined ? {} : { model: embeddingModel }),
				...(options.onModelProgress === undefined
					? {}
					: { onProgress: options.onModelProgress }),
				...(options.adapterFactory === undefined
					? {}
					: { adapterFactory: options.adapterFactory }),
			})
		: undefined;

	const memo = createNodeMemoFs({
		...(options.rootDir !== undefined ? { rootDir: options.rootDir } : {}),
		...(options.mode !== undefined ? { mode: options.mode } : {}),
		...(options.projectId !== undefined
			? { projectId: options.projectId }
			: {}),
		...(options.workspaceId !== undefined
			? { workspaceId: options.workspaceId }
			: {}),
		...(options.store !== undefined ? { store: options.store } : {}),
		...(options.cloudClient !== undefined
			? { cloudClient: options.cloudClient }
			: {}),
		...(embedder !== undefined ? { embedder } : {}),
		...(options.recall !== undefined ? { recall: options.recall } : {}),
		...(options.cloud !== undefined ? { cloud: options.cloud } : {}),
	});

	if (options.prewarm && embedder?.prewarm) {
		embedder.prewarm().catch(() => {
			// Swallowed — retry happens lazily on first recall.
		});
	}

	return createMemoFSMcpRuntimeFromMemoFS(memo);
}

/**
 * Wraps a MemoFS instance as a MemoFSMcpRuntime adapter.
 *
 * @param memo - The MemoFS client instance.
 * @returns The MemoFSMcpRuntime adapter.
 */
export function createMemoFSMcpRuntimeFromMemoFS(
	memo: MemoFS,
): MemoFSMcpRuntime {
	return {
		async health(signal) {
			return memo.health(signal);
		},

		async context(input, signal) {
			return memo.context(input, signal);
		},

		async recall(input, _signal) {
			return memo.recall(input.query, {
				...(input.limit === undefined ? {} : { limit: input.limit }),
				...(input.workspaceId === undefined
					? {}
					: { workspaceId: input.workspaceId }),
				...(input.projectId === undefined
					? {}
					: { projectId: input.projectId }),
			});
		},

		async writeMemory(input, signal) {
			return memo.writeMemory(input, signal);
		},

		async readCoreMemory(_input, signal) {
			return { content: await memo.core.read(signal) };
		},

		async readNotesMemory(_input, signal) {
			return { content: await memo.notes.read(signal) };
		},

		async updateCoreMemory(input, signal) {
			await memo.core.update(input.content, signal);
			return { content: await memo.core.read(signal) };
		},

		async listRecentMemories(input, signal) {
			return memo.listRecentMemories(input, signal);
		},

		async validate(input, signal) {
			return memo.validate(input, signal);
		},

		async createSnapshot(input, signal) {
			return memo.snapshots.create(input, signal);
		},

		async startAgentSession(input, signal) {
			return memo.agentfs.startSession(input, signal);
		},

		async readAgentSessionFile(input, signal) {
			return memo.agentfs.readFile(input, signal);
		},

		async writeAgentSessionFile(input, signal) {
			return memo.agentfs.writeFile(input, signal);
		},

		async appendAgentSessionFile(input, signal) {
			return memo.agentfs.appendFile(input, signal);
		},

		async extractAgentSession(input, signal) {
			return memo.agentfs.extract(input, signal);
		},

		async completeAgentSession(input, signal) {
			return memo.agentfs.complete(input, signal);
		},

		async syncPush(input, signal) {
			return memo.sync.push(input, signal);
		},

		async syncPull(input, signal) {
			return memo.sync.pull(input, signal);
		},

		async syncStatus(input, signal) {
			return memo.sync.status(input, signal);
		},

		async upsertGraphNodes(input, signal) {
			return memo.graph.upsertNodes(input, signal);
		},

		async upsertGraphEdges(input, signal) {
			return memo.graph.upsertEdges(input, signal);
		},

		async graphNeighbors(input, signal) {
			return memo.graph.neighbors(input, signal);
		},

		async graphPath(input, signal) {
			return memo.graph.path(input, signal);
		},

		async listGraphNodes(input, signal) {
			return memo.graph.listNodes(input, signal);
		},

		async listGraphEdges(input, signal) {
			return memo.graph.listEdges(input, signal);
		},

		async consolidateMemory(input, signal) {
			return memo.consolidate(input, signal);
		},

		async readiness(signal) {
			if (memo.cloud) return memo.cloud.readiness(signal);
			return { ok: true };
		},
	};
}
