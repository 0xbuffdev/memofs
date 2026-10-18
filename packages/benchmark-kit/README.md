# `@memofs/benchmark-kit`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/benchmark-kit"><img src="https://img.shields.io/npm/v/%40memofs%2Fbenchmark-kit?label=%40memofs%2Fbenchmark-kit&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Status: Beta" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/benchmark-kit"><img src="https://img.shields.io/npm/dm/%40memofs%2Fbenchmark-kit?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/0xbuffdev/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/0xbuffdev/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Benchmark kit, workloads, and runners for MemoFS.

## What is this?

**Benchmark kit, workloads, and runners for MemoFS.** A standardized framework for measuring the performance of embedders, rerankers, memory stores, and recall stores across different providers and adapters. Suites are plain objects, the runner executes them, statistics and threshold evaluation are named functions, and reporters are pure serialization functions.

## Installation

```bash
npm install @memofs/benchmark-kit
```

> Requires **Node.js >= 22**.

## Quick Start

```ts
import {
  createBenchmarkSuite,
  BenchmarkRunner,
  jsonBenchmarkReport,
  evaluateBenchmarkThresholds,
} from "@memofs/benchmark-kit";
import { createEmbedderWorkloads } from "@memofs/benchmark-kit/workloads";
import { createOpenAIEmbedder } from "@memofs/adapter-openai";

const openai = createOpenAIEmbedder({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "text-embedding-3-large",
});

const suite = createBenchmarkSuite({
  name: "embedder-smoke",
  cases: [
    createEmbedderWorkloads({
      name: "openai-text-embedding-3-large",
      embedder: openai,
      texts: ["memoize a function", "what is a transformer"],
      iterations: 10,
      warmupIterations: 2,
    }),
  ],
});

const runner = new BenchmarkRunner();
const result = await runner.runSuite(suite);

console.log(jsonBenchmarkReport(result));

const verdict = evaluateBenchmarkThresholds(result, { maxMeanMs: 50, maxP95Ms: 80 });
if (!verdict.ok) {
  for (const f of verdict.failures) {
    console.error(`${f.caseName}: ${f.metric} expected ${f.expected}, got ${f.actual}`);
  }
}
```

## Subpath Exports

| Subpath | Contents |
| --- | --- |
| `@memofs/benchmark-kit` | `createBenchmarkSuite`, `BenchmarkRunner`, `jsonBenchmarkReport`, `markdownBenchmarkReport`, `evaluateBenchmarkThresholds`, `mean`, `percentile`, `summarizeIterations`, `SeededRandom`, error types |
| `@memofs/benchmark-kit/workloads` | `createEmbedderWorkloads`, `createRerankWorkloads`, `createRecallWorkloads`, `createMemoryStoreWorkloads`, `defineWorkload`, and the per-operation `createXxxBenchmarkCase` factories |
| `@memofs/benchmark-kit/fakes` | Re-exports the fakes from `@memofs/testing/fakes` for use inside benchmark setup |

## Documentation

For the full API surface, a comparison of suites vs. runners, and a guide to writing custom workloads, please refer to the [Full Documentation](https://docs.memofs.dev/packages/benchmark-kit/).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
