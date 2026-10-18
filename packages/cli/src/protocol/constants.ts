/**
 * CLI protocol constants defining standard files, directory paths, and structures.
 *
 * @module constants
 */

import {
	BOOTSTRAP_FILE_PATHS,
	CANONICAL_MEMOFS_FILES,
	CHUNKS_INDEX_PATH,
	CONVERSATIONS_MEMORY_PATH,
	CORE_MEMORY_PATH,
	GRAPH_EDGES_PATH,
	GRAPH_NODES_PATH,
	MANIFEST_PATH,
	MEMOFS_DIR,
	MEMORY_EVENTS_PATH,
	NOTES_MEMORY_PATH,
	SNAPSHOTS_INDEX_PATH,
} from "@memofs/core";

export { MEMOFS_DIR };

/**
 * Flat CLI path map kept for command ergonomics.
 * The values intentionally come from `@memofs/core`, so the CLI cannot drift from
 * the canonical protocol owned by the core package.
 */
export const MEMOFS_CLI_PATHS = {
	manifest: MANIFEST_PATH,
	coreMemory: CORE_MEMORY_PATH,
	notesMemory: NOTES_MEMORY_PATH,
	memoryEvents: MEMORY_EVENTS_PATH,
	conversations: CONVERSATIONS_MEMORY_PATH,
	chunks: CHUNKS_INDEX_PATH,
	graphNodes: GRAPH_NODES_PATH,
	graphEdges: GRAPH_EDGES_PATH,
	snapshots: SNAPSHOTS_INDEX_PATH,
	snapshotsDir: `${MEMOFS_DIR}/snapshots`,
	tmpDir: `${MEMOFS_DIR}/tmp`,
} as const;

/**
 * Files that must exist in an initialised MemoFS workspace.
 *
 * @remarks
 * This is the bootstrap set, not the full canonical set. Trial ledgers
 * (`trials/*.jsonl`) and `warrants/history.jsonl` are created lazily on first
 * append so `init` output stays unchanged, so requiring them here made
 * `doctor` and `validate` report a freshly-initialised workspace as broken.
 *
 * Use {@link SNAPSHOT_FILES} to capture everything that exists instead.
 *
 * @see BOOTSTRAP_FILE_PATHS in `@memofs/core`
 */
export const REQUIRED_FILES = BOOTSTRAP_FILE_PATHS;

/**
 * Every canonical file, for commands that capture what exists rather than
 * assert what must. `snapshot` uses this so trial ledgers and warrant state
 * are still captured once they have been written.
 *
 * @see CANONICAL_MEMOFS_FILES in `@memofs/core`
 */
export const SNAPSHOT_FILES = CANONICAL_MEMOFS_FILES;

/**
 * Array of paths that must be initialized as directories inside a MemoFS workspace.
 */
export const REQUIRED_DIRS = [
	MEMOFS_DIR,
	`${MEMOFS_DIR}/memory`,
	`${MEMOFS_DIR}/events`,
	`${MEMOFS_DIR}/indexes`,
	`${MEMOFS_DIR}/graph`,
	`${MEMOFS_DIR}/snapshots`,
	`${MEMOFS_DIR}/tmp`,
] as const;

/**
 * Soft advisory line cap for `.memofs/memory/core.md`.
 *
 * Core memory is injected in full by `memofs.context` at the start of every
 * task (the always-loaded equivalent of a `CLAUDE.md`/`AGENTS.md`), so an
 * oversized file bloats every session's context and erodes adherence. The
 * 200-line threshold matches the documented soft limit for always-loaded
 * instruction files (see Claude Code memory docs). This is advisory only —
 * `memofs doctor` emits a warning, not an error — so the workspace stays
 * `ok` while signaling drift. `notes.md` is intentionally exempt: notes are
 * loaded on demand, not always-injected, so the same cap does not apply.
 */
export const CORE_MEMORY_SOFT_LIMIT = 200;

/**
 * Soft advisory note cap for `.memofs/memory/notes.md`.
 *
 * `notes.md` is the append-only audit trail — it is meant to grow — but an
 * unbounded note count signals low write hygiene (near-duplicates,
 * transient scratch that should live in AgentFS sessions, narration that
 * never belonged in memory). Above this cap, `memofs doctor` warns and
 * points at the curation tools: consolidate + archive-deprecated, and
 * higher-signal future writes (the runtime already no-ops near-duplicate
 * durable writes). Advisory only, like the core-memory limit above.
 */
export const NOTES_MEMORY_SOFT_LIMIT = 200;
