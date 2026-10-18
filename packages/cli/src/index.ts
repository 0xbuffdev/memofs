/**
 * Main entry point exporting the public API for the MemoFS CLI library.
 *
 * @module index
 */

export type { CliMemoFSOptions } from "./cli/memofs";
export { createMemoFSFromCli } from "./cli/memofs";
export type { MemoFsConfigFile } from "./config";
export { resolveSchemaPath, writeDefaultCliConfig } from "./config";
export type { CliErrorCode } from "./errors/cli-errors";
export {
	CliError,
	CliFsError,
	CliJsonlError,
	CliProtocolError,
	CliUsageError,
	CliValidationError,
} from "./errors/cli-errors";
export type {
	BufferedOutputOptions,
	CliOutput,
	JsonEnvelope,
} from "./output/output";
export {
	createBufferedOutput,
	printHumanOrJson,
	printJsonEnvelope,
	printJsonError,
} from "./output/output";
export {
	MEMOFS_CLI_PATHS,
	MEMOFS_DIR,
	REQUIRED_DIRS,
	REQUIRED_FILES,
	SNAPSHOT_FILES,
} from "./protocol/constants";
export type { JsonlParseOptions, JsonlRecord } from "./protocol/jsonl";
export { parseJsonl, stringifyJsonl } from "./protocol/jsonl";
export type { MemoFsCliManifest } from "./protocol/manifest";
export {
	createDefaultManifest,
	parseManifest,
	validateManifest,
} from "./protocol/manifest";
export type { MemoFsInspection } from "./protocol/summary";
export { inspectMemoFs } from "./protocol/summary";
export type { RunMemoFSCliInput, RunMemoFSCliResult } from "./runner";
export { runMemoFsCli } from "./runner";
export { createSafeIdFromLabel, validateSnapshotLabel } from "./utils/labels";
export { redactSecretPreview, scanForSecrets } from "./utils/secrets";
