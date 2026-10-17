---
title: "How MemoFS Retrieves Without a Database"
description: "Vector search alone quietly fails on identifiers, exact tokens, and temporal queries. MemoFS fuses BM25, fuzzy matching, and vector similarity into a single hybrid recall pipeline, with no API keys required. Here is the retrieval architecture, the math, and how task-aware biasing steers results."
category: Engineering
publishedAt: "2026-08-20"
authorName: "Christopher S. Aondona"
authorRole: "Founder & Engine Lead"
authorInitials: "CSA"
authorHandle: "christophersesugh"
authorAvatarUrl: "https://github.com/christophersesugh.png"
featured: true
tags: [recall, retrieval, bm25, hybrid-search, vector-similarity, engineering, task-aware]
---

You ask your agent: *"What database driver did we pick for tenant metadata?"*

Your vector store finds three memories about databases. The top hit is a note about PostgreSQL connection pooling. The second is a paragraph about SQLite benchmarks. The third, the one you actually needed, is a terse decision from two weeks ago: `"Use D1 for tenant metadata (decision rationale: edge latency)."` It ranked third because the embedding for "D1" is semantically distant from "database driver." The model that encoded it had never seen "D1" used that way.

Now try the same query with a keyword index. BM25 finds the D1 decision instantly: `"D1"` is a token, and `"database"` is a token, and they co-occur. But BM25 misses the PostgreSQL pooling note entirely, because it talks about `"connection limits"` and `"pgBouncer"` without ever mentioning the word `"database"`.

Neither signal alone is good enough. Vectors are great at fuzzy semantic matches and quietly terrible at identifiers, rare tokens, and exact phrases. Keywords nail exact lookups and miss paraphrases. Every production retrieval system that bets everything on one signal has a blind spot wide enough to drive wrong decisions through.

MemoFS retrieves through **hybrid recall** (BM25, fuzzy matching, and vector similarity fused and reranked) rather than any single signal in isolation. This post is the full engineering story: the three signals, the fusion math, and how task-aware biasing steers the pipeline before a single candidate is scored.

## Signal 1: BM25 keyword backbone

BM25 is the workhorse of information retrieval. It scores documents by how often query terms appear, adjusted for document length and corpus statistics. MemoFS implements it from scratch in pure TypeScript with no external dependencies.

The scoring formula is textbook Okapi BM25, with one important modification:

$$\text{IDF}(q_i) = \max\left(0,\; \ln\left(1 + \frac{N - \text{DF}(q_i) + 0.5}{\text{DF}(q_i) + 0.5}\right)\right)$$

$$\text{TF\_norm}(q_i, D) = \frac{\text{TF}(q_i, D) \cdot (k_1 + 1)}{\text{TF}(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgLength}}\right)}$$

$$\text{rawScore} = \sum_{q_i \in Q} \text{IDF}(q_i) \cdot \text{TF\_norm}(q_i, D) \;+\; \text{fuzzyBoost} \cdot \text{fuzzyOverlap}(Q, D)$$

The `max(0, ...)` floor on IDF prevents negative contributions on small corpora, a critical detail when your "corpus" is a project's memory store with maybe thirty entries, not a million-document index. The default hyperparameters are `k1 = 1.2` (term-frequency saturation) and `b = 0.75` (length normalization). A `fuzzyBoost` of `0.15` folds in a lightweight fuzzy overlap term, which we'll get to next.

Before scoring, text passes through a tokenizer that lowercases, splits on non-alphanumeric boundaries, and drops a curated set of 94 stop words. The implementation remains simple: the entire BM25 engine takes roughly 200 lines. The real benefit comes from combining it with the other two signals rather than running it in isolation.

One problem: BM25 scores are unbounded. A document matching many rare terms can score arbitrarily high. To merge BM25 with cosine similarity (which lives in `[0, 1]`), MemoFS applies a saturating normalization:

$$\text{saturate}(s) = \begin{cases} 0 & s \le 0 \\ \frac{s}{s + 2} & s > 0 \end{cases}$$

This smooth function maps positive scores into roughly `[0, 1)` while preserving rank order. The constant `2` was tuned to spread typical memory-store scores across the usable range rather than compressing them all near 1.

## Signal 2: Fuzzy matching for partial tokens

BM25 requires exact token matches. But agent memory is full of abbreviations, fragments, and partial identifiers: `"auth"` should match `"authentication"`, `"db"` should match `"database"`, and `"jwt"` should surface memories about `"JSON Web Token"`.

The fuzzy signal handles this with a simple, fast heuristic:

```typescript
function tokenOverlapScore(queryTerms: string[], documentTerms: string[]): number {
  const docSet = new Set(documentTerms);
  let exact = 0;
  let partial = 0;

  for (const term of queryTerms) {
    if (docSet.has(term)) {
      exact += 1;
      continue;
    }
    if (documentTerms.some(
      (docTerm) => docTerm.includes(term) || term.includes(docTerm)
    )) {
      partial += 0.25;
    }
  }
  return (exact + partial) / queryTerms.length;
}
```

Exact token matches score `1.0`, substring containment in either direction scores `0.25`, and the total is normalized by query length into `[0, 1]`. It is intentionally simple, omitting complex edit-distance calculations and phonetic matching. The substring check catches the cases that matter most (abbreviations and fragments) while staying fast enough to run over every candidate on every query.

This score serves double duty: it's folded into BM25 via the `fuzzyBoost` weight, and it's used independently by the `DeterministicFallbackReranker` when no external reranker is configured.

## Signal 3: Vector similarity for semantic reach

When you search for `"how we handle user sessions"` and the memory says `"JWT tokens are used for stateless authentication with 24-hour expiry"`, neither BM25 nor fuzzy matching will find it. The tokens barely overlap. Vector similarity bridges that gap, as both phrases live near each other in embedding space because they describe related concepts.

MemoFS computes standard cosine similarity:

$$\text{CosineSim}(\mathbf{a}, \mathbf{b}) = \frac{\sum_{i=1}^d a_i b_i}{\sqrt{\sum_{i=1}^d a_i^2} \;\cdot\; \sqrt{\sum_{i=1}^d b_i^2}}$$

The default local embedder is `Xenova/all-MiniLM-L6-v2`, a 384-dimension model that runs entirely in-process via Transformers.js (ONNX/WASM on CPU). No API key. No network after the one-time weight download. Batched at 32 inputs with mean pooling and L2 normalization.

If you want higher-quality embeddings, provider adapters exist for OpenAI (`text-embedding-3-small`), Voyage AI (`voyage-code-3`), and Cloudflare Workers AI (`bge-small-en-v1.5`). They're pure enhancements. The pipeline is designed so that if an embedder is missing or fails, retrieval falls back gracefully to lexical-only mode. More on that in the zero-key section below.

Embeddings are persisted to `.memofs/indexes/embeddings.jsonl` (one JSON line per chunk, with the full vector, source metadata, and namespace). On restart, the in-memory store rehydrates from this file instantly, so there's no cold-start embedding cost between sessions.

## Fusion: merging three signals into one score

Three ranked lists (vector candidates, BM25 candidates, fuzzy-boosted candidates) must be merged into one ranked list with a single score per item.

MemoFS retrieves generous candidate pools: top `K × 3` from the vector path and top `K × 2` from the lexical path (where `K` is your requested result count). This intentional over-retrieval ensures that an item ranking poorly on one signal but highly on another isn't cut before fusion.

The base relevance score blends the two primary signals with dynamic weights:

$$\text{baseScore} = w_{\text{vec}} \cdot \text{clamp}_{[0,1]}(\text{vectorScore}) + w_{\text{lex}} \cdot \text{clamp}_{[0,1]}(\text{lexicalScore})$$

The default split is `0.6` vector / `0.4` lexical, biased toward semantic reach while keeping keyword precision in the mix. But the weights adapt dynamically:

| Condition | Vector weight | Lexical weight |
|-----------|--------------|----------------|
| Both signals present | `0.6` | `0.4` |
| No embedder / vector failure | `0.0` | `1.0` |
| No lexical matches | `1.0` | `0.0` |

This means the pipeline never breaks. If your embedder is down, you still get recall. If a query produces no keyword hits (pure semantic query), vectors take over entirely.

If a reranker is available (the default `DeterministicFallbackReranker` or an external provider), it re-evaluates all candidates and the result is blended back in:

$$\text{baseScore}_{\text{new}} = 0.5 \cdot \text{baseScore} + 0.5 \cdot \text{clamp}_{[0,1]}(\text{rerankScore})$$

The final composite score folds in two more signals: recency and confidence:

$$\text{finalScore} = 0.7 \cdot \text{baseScore} + 0.2 \cdot \text{recencyBoost} + 0.1 \cdot \text{confidence}$$

**Recency** uses exponential half-life decay:

$$\text{recencyBoost} = 0.5^{\;\text{ageDays}\;/\;30}$$

A 30-day-old memory gets a recency score of `0.5`. A 60-day-old one gets `0.25`. A memory from yesterday gets `0.977`. This biases toward fresh knowledge without burying older, high-relevance hits; the `0.2` weight keeps recency as a tiebreaker, not a dominator.

**Confidence** is the memory's self-reported confidence at write time, clamped to `[0, 1]` with a default of `0.5`. High-confidence decisions outrank uncertain notes when relevance is otherwise equal.

All scores are rounded to 4 decimal places. The result is a single ranked list where every candidate's position reflects its textual relevance, semantic similarity, freshness, and the system's confidence in it.

## Post-scoring intelligence: drift and decay

The composite score is the retrieval signal. But MemoFS applies two more seams *after* scoring that can demote candidates based on real-world state:

1. **Code-anchor drift.** If a memory is anchored to a source file (via `AnchorRef`), MemoFS checks the file's current SHA-256 hash against the hash stored at write time. If the code has changed or the file was deleted, the memory is flagged `stale` and its score is halved (`score *= 0.5`). This is the system described in detail in [When Your Agent's Memory Lies](https://memofs.dev/articles/when-your-agents-memory-lies).

2. **Cognitive decay.** Each memory kind has an expiry floor (decisions last 365 days, constraints 180, preferences 90, notes 30). If a memory exceeds its floor, it's flagged `unverified` and demoted by 40% (`score *= 0.6`).

These penalties compound. A decision from 400 days ago anchored to a file that's since been rewritten gets `score *= 0.5 * 0.6 = 0.3`, which makes it still visible, but reliably outranked by current, verified knowledge. Amnesia is worse than staleness, so nothing is deleted; everything is demoted proportionally to how much reality has drifted from what the memory claims.

## Task-aware biasing: steering retrieval before scoring

All of the above happens after the query is issued. But an equally important step happens *before* it, at query rewrite time.

When you call `memofs context` (or the `memofs.recall` MCP tool) with a `--task-type`, MemoFS rewrites your query to bias the entire retrieval pipeline toward the kind of knowledge that task needs:

| Task type | Prepended steering phrase | Expanded terms |
|-----------|--------------------------|----------------|
| `coding` | *Constraints, patterns, and recent decisions* | constraint, rule, convention, pattern, standard, style, guideline |
| `debug` | *Recent errors and bug-fix context* | error, bug, fix, exception, crash, failure, stack trace, debug, issue |
| `refactor` | *Architecture decisions and dependency graph* | architecture, refactor, structure, design, pattern, dependency, coupling, interface, module |
| `docs` | *Public API contracts and documentation decisions* | api, documentation, docs, interface, contract, type, schema, readme |

On top of task expansions, a **domain lexicon** cross-expands common abbreviations: `"auth"` expands to `["authentication", "jwt", "oauth", "login"]`, `"db"` to `["database", "postgres", "sqlite", "turso"]`, and so on for `deps`, `ci`, `cd`, `deploy`, `test`, `fmt`, `pkg`, `config`.

Here's what this looks like end-to-end. You type:

```bash
memofs context --query "login failure" --task-type debug
```

Before any scoring runs, the query becomes: `"Recent errors and bug-fix context login failure authentication auth exception crash stack trace debug issue"`. That expanded query hits BM25 (which now matches on `"error"`, `"exception"`, `"auth"` tokens across your memory), hits the vector embedder (which encodes the full expanded phrase), and biases both toward debug-relevant memories. It provides a dramatically different retrieval surface on the same underlying data, without you manually crafting the perfect query.

## Entity-boost: the graph as a parallel index

MemoFS maintains a lightweight entity graph: nodes represent concepts, tools, and decisions, linked by edges like `uses`, `prefers`, `depends_on`, and `supersedes`. During writes, entities are extracted and indexed directly into the BM25 store:

```text
graph:node-id → "PostgreSQL Connection pooling with pgBouncer"
```

At query time, the `resolveEntities` step matches active graph nodes against expanded query terms (exact matches for any length, substring matches on tokens ≥ 3 characters) across `node.label` and `node.aliases`. Matched entities are formatted into a top-priority **Entities** section in the context briefing (budget weight: `2`), and their expanded terms feed back into the recall query, causing graph-indexed documents to score highly in lexical retrieval.

The graph also tracks temporal state. If a node has a `supersedes` edge (e.g., `"OAuth" supersedes "JWT"`), the resolved entity section surfaces this directly: `"currently: uses OAuth; supersedes JWT"`. Retired or deprecated nodes are filtered out of candidates entirely. The retrieval pipeline identifies relevant memories while tracking which items have been superseded.

## The context briefing: fitting recall into a budget

Raw recall results aren't what your agent sees. The `memofs context` command (and `memofs.context` MCP tool) compresses everything into a compact, budget-aware briefing designed to fit inside a context window without blowing your token budget.

The budget system works in two tiers:

**Non-negotiable sections** are allocated first:
- **Directive:** A short instruction block explaining how to use the memory.
- **Core memory:** The full content of `core.md`, serving as your persistent project briefing.

**Negotiable sections** split the remaining space proportionally:

| Section | Weight | What it contains |
|---------|--------|-----------------|
| Entities | `2` | Resolved graph entities with state |
| Recall | `3` | Top hybrid recall results |
| Recent | `1` | Latest conversation/session context |
| Notes | `1` | Long-form notes (omitted in compact mode) |

The hard cap is `8192` bytes (~6 KB of content after overhead). Each section gets a byte budget proportional to its weight:

$$\text{sectionBudget} = \left\lfloor \frac{\text{remainingBytes} \cdot \text{weight}}{\sum \text{weights}} \right\rfloor$$

If a section exceeds its budget, items are incrementally packed until space runs out. Omitted items do not silently disappear; instead, they are condensed into an actionable outline:

```text
[Omitted 4 items to fit context budget:
 ↳ "Auth token validation failure handled with 401..."
 ↳ "Database connection pool timeout set to 5000ms..."
 ↳ and 2 more items...
To view these, run recall with specific search terms]
```

To make budget compression reversible, the initial compact call stores untruncated candidate lists in an in-memory LRU cache (max 8 entries, 10-minute TTL). Section footers contain opaque base64url expansion cursors:

```text
↳ expand (7 more): memofs.context(section="recall", expand="eyJ2IjoxLCJrZXki...")
```

The agent can call `memofs.context` with that cursor to retrieve the full section at a generous 64 KB budget, resolved instantly from cache without re-querying. The initial briefing is ~6 KB. The full context, if your agent needs it, is one tool call away. Budget scales as the store grows instead of degrading with it.

## Zero-key mode: full recall without a single API key

Many retrieval systems require an embedding API key to function at all, which means the first-run experience is: install the tool, discover you need a key, go sign up for an API, paste the key, *then* see if it works. Every step is a dropout point.

MemoFS works out of the box with no keys, no accounts, no network:

**Tier 1 (default):** The MCP server detects no API keys and enables local embeddings automatically. `@memofs/adapter-transformers` lazy-loads `Xenova/all-MiniLM-L6-v2` via ONNX/WASM to run entirely on CPU in-process. You get full hybrid recall (vector + BM25 + deterministic reranker) with zero external dependencies after the one-time model weight download.

**Tier 2 (fallback):** If `@memofs/adapter-transformers` isn't installed or the embedder fails at runtime, the error is caught and logged as a warning. Dynamic weighting switches to `vectorWeight = 0`, `lexicalWeight = 1.0`. All retrieval runs through BM25 + fuzzy matching + markdown section scanning. You lose semantic reach. You keep exact-token recall, fuzzy matching, and entity-boost, which proves remarkably effective for most project memory stores.

Every intelligence component follows this same pattern: the **reranker** falls back to `DeterministicFallbackReranker` (token-overlap scoring, no API), **graph extraction** falls back to `RuleBasedExtractor` (regex parsing, no LLM), and **query rewriting** falls back to the static domain lexicon. Nothing in the pipeline requires a network call to function. External providers make it better; their absence doesn't make it broken.

## Limitations

1. **Small-corpus BM25.** BM25's statistical assumptions (that IDF is meaningful and term frequencies are discriminative) weaken on very small corpora. A project with five memories doesn't have enough data for IDF to differentiate terms well. The `max(0, ...)` IDF floor prevents negative scores, but discrimination is still weak until the store reaches a few dozen entries. Fuzzy and vector signals compensate, but early recall quality is measurably lower than mature recall quality.

2. **Local embedder quality ceiling.** `all-MiniLM-L6-v2` is a capable model for its size, but it's a 22M-parameter model competing against OpenAI's `text-embedding-3-large` at 1.5B+ parameters. For code-heavy memory stores, `voyage-code-3` (which was trained specifically on code) significantly outperforms the local default. The zero-key path is genuine and usable, though it operates under an inherent quality ceiling.

3. **No learned reranking.** The `DeterministicFallbackReranker` is a token-overlap heuristic, not a cross-encoder. It breaks ties and catches obvious misranks, but it can't learn from your specific project's retrieval patterns. A cross-encoder reranker (like Cohere's or a local ColBERT variant) would improve precision. This is planned, not shipped.

## Start retrieving

Five minutes to see hybrid recall in action:

```bash
npm i -g @memofs/cli
memofs init
memofs generate agent claude --project-name "My API"
```

Then open your agent, work for a session, and query your own memory:

```bash
memofs context --query "database decisions" --task-type refactor
```

BM25 will find your exact tokens while vectors find your paraphrases. The entity graph will also surface what superseded what, all without a single API key.

- **Core runtime:** `@memofs/core` · [docs](https://memofs.dev/packages/core/)
- **CLI:** `npx memofs` · [commands](https://memofs.dev/packages/cli/)
- **MCP server:** `npx -y @memofs/mcp-server` · [setup](https://memofs.dev/packages/mcp/)

---

*Have questions? [Open a discussion](https://github.com/0xbuffdev/memofs/discussions). Found a bug? [File an issue](https://github.com/0xbuffdev/memofs/issues).*
