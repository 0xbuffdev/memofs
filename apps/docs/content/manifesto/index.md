---
title: "AI Memory Belongs in Files"
---

### Memory should be something you can read, question, correct, and take with you.

MemoFS is a file-first memory runtime for AI agents and the people who use and build them. Its purpose is to preserve useful context across sessions without making a model provider, vector database, or hosted account the owner of that context.

This manifesto describes the direction of the MemoFS rebuild. It is a set of engineering commitments, not a claim that every capability below already ships. Released documentation and conformance evidence must say what actually works.

## Files hold the memory. Indexes help us find it.

An embedding can help retrieve a statement. It cannot replace the statement, explain where it came from, or preserve the correction that made it obsolete.

Accepted memory belongs in readable canonical files with explicit identity, provenance, and history. Search indexes, embeddings, extracted graphs, and rendered views are derived from those files. Rebuilding them must not lose an accepted fact, its source, or its correction history.

The rebuild's default portable store is deliberately small:

```text
.memofs/manifest.json
.memofs/memory/core.md
.memofs/memory/notes/YYYY-MM.md
```

The manifest identifies the store and its format. Monthly Markdown journals contain individually identified records with structured metadata. Core memory is a small curated view backed by those records and the history of its selection. Retained media can add an optional evidence directory.

Months make files easier to inspect and maintain. They do not make search fast by themselves. Incremental indexes do that work, and relevant memory from an older year must remain discoverable.

File-first does not mean every other file is disposable. Credentials, active coordination state, unfinished recovery work, backups, and retained originals have different lifecycles. They should be unobtrusive, inspectable, and managed honestly. Only data proven rebuildable belongs in a disposable cache.

## Corrections add history. They do not erase it.

A record has a stable identity independent of its filename, line number, or embedding. A correction is a new record that explains what it replaces. A retraction removes an assertion from ordinary active use while preserving the evidence that it was once accepted.

The unit of immutability is the record under normal runtime operations. A monthly journal grows as records are committed. Plain files remain editable; MemoFS must detect ordinary external changes and require reconciliation before treating them as trusted state.

Concurrent incompatible corrections are a conflict to inspect, not a reason to silently let the latest timestamp win. A claimed correction must pass authorization and provenance checks before it can displace an existing assertion.

Append-only history is not cryptographic tamper-proofing. Git can help inspect changes and restore earlier versions, but only if that history exists and is retained. A complete replacement of a file cannot prove who wrote it. An audit receipt also cannot undo an external action. Recovery and compensation need their own verified mechanisms.

## A successful write must mean something precise.

Memory is accepted only after its canonical record is durably committed under the storage adapter's declared guarantees. An indexing failure afterward must not turn a committed write into a lost memory or a duplicate on retry.

The rebuild uses one record per durable commit. Imports and replication can make explicit, resumable progress rather than pretend several files change atomically. Results must distinguish committed memory, incomplete bulk work, and derived views that still need rebuilding.

Cooperating writers need cross-process coordination and revision checks. An in-process mutex is not enough for another process or server instance. Advisory locks do not control arbitrary editors, and filesystem durability depends on the actual platform. Unsupported guarantees must produce a clear limitation, not reassuring language.

## Admission matters as much as retrieval.

Memory should contain useful, attributable assertions rather than every intermediate thought. A candidate can be a fact, decision, preference, observation, or an agent's conclusion. Its origin and uncertainty matter more than whether a human or agent typed it.

Candidates and their metadata must be screened before canonical persistence or disclosure to optional providers. Screening needs a versioned policy, bounded diagnostics, and tests for the sensitive material it claims to detect. Structured credential detection and sensitive-prose classification have different failure modes. Neither proves that all secrets, personal information, or manipulation have been found.

Models may propose extraction, classification, and consolidation. They cannot grant themselves authority, bypass screening, or silently turn an uncertain inference into verified evidence. Similar wording is not enough to discard a distinct source or observation.

Transient accepted memory is still memory: it belongs in canonical history even when excluded from default recall. Session scratch and coordination messages are different. They become durable memory only through an explicit accepted write.

## Relevance, freshness, and truth are different questions.

A similarity score estimates whether a record relates to a query. A confidence label describes an assertion's evidence. A source hash detects whether particular bytes have changed. None of these establishes factual truth.

When a record cites a source, retrieval should check that source through an authorized resolver. Changed, missing, and unreadable sources need distinct notices. A source that cannot be checked must not be reported unchanged. Source checks have real access and computation costs; they are not free because the comparison is deterministic.

Age can create a reason to recheck memory. It does not make every statement false on a universal schedule. Verification deadlines and age policies must be explicit. Numerical expiry windows and score penalties belong in versioned, evaluated policies rather than in the manifesto as promises of correctness.

Conflicting assertions, stale evidence, and unverified claims must remain distinguishable. MemoFS should help an agent know what needs checking, not manufacture certainty from a ranking score.

## Retrieval should explain its choices.

Keywords help with exact terms. Embeddings can help with meaning. Entity references can connect observations across time. These signals are useful together, but their raw scores are not interchangeable.

The rebuild uses rank fusion with named algorithms, deterministic base behavior, and explicit optional model capabilities. Retrieval results should identify the records, source state, relevant signals, and revision they represent. A correction's validity is resolved before ranking; a superseded statement cannot win simply because it has a better similarity score.

A small curated core gets a separate context budget. Archival memory is retrieved as needed, with references and progressive disclosure. Mandatory material that does not fit should produce a clear budget outcome instead of silent truncation. Token counts must name their tokenizer or say when they are estimates.

An integration can deliver context at a session boundary or on a turn only if the host supports that mechanism. Tool discovery, an MCP resource, or injected text cannot guarantee that an agent retrieves every needed fact or follows every instruction. Those are limits to test and disclose, not rename as behavioral enforcement.

## Local use must stand on its own.

The base runtime should work without a cloud account, remote model, or mandatory background daemon. Optional model acquisition and network use must be explicit. A local operation must not quietly fall back to uploading memory when a provider fails.

Formats and behavior should be independent of the implementation language. TypeScript is the first reference runtime for the rebuild; future Python, Rust, and Go implementations should be able to read the same files and pass the same conformance cases. A remote API wrapper is useful, but it is not a substitute for an independent local runtime.

Native SDKs, CLI commands, and MCP tools should expose the same core semantics. Their transports, permissions, and supported capabilities differ, and discovery must tell the truth about those differences.

Replication and hosted execution are optional, separate capabilities. Replication must preserve concurrent records and conflicts rather than overwrite a whole month's history. Hosted execution needs access to the content it processes; it must not be advertised as storage the service cannot read. Managed services do not change ownership of the portable memory format.

## Media is evidence for a memory.

A recording is not the same thing as the conclusion drawn from it. Retained originals should be immutable, content-addressed evidence; the memory should remain a small text record citing the relevant time, page, or region.

Binary originals are not usefully reviewed as text diffs. Their identity and integrity come from byte hashes, source attribution, locators, and an accessible original. Transcripts, OCR, captions, and embeddings are derived views. Accepted conclusions must survive deletion of those caches.

Extraction needs bounded, isolated handling and explicit provider permissions. If screening detects a secret in an artifact, rejecting the whole artifact is safer than assuming one edited span removes every disclosure. That rule does not imply an extractor can detect everything.

An original that a memory claims is retained must not disappear through cache cleanup. A discard policy must say that the original is unavailable; a retention window cannot silently break an active evidence reference. Media support should advance in qualified stages rather than imply all formats share one solved extractor.

## Portability includes a way out.

Users should be able to export accepted memory, its history, and retained evidence without depending on a particular index or provider. Migration must account for existing content before removing its old representation. Restoring a snapshot after new writes must preserve those writes or clearly report what cannot be recovered.

Retraction and physical erasure are different operations. Removing a record from active recall does not remove it from Git history, backups, or disconnected replicas. MemoFS must state those limits and provide explicit procedures rather than call a hidden tombstone complete deletion.

## Earn trust through evidence.

The important tests are not only whether a query returns something plausible. They are whether acknowledged writes survive failures, retries avoid duplication, unauthorized corrections are rejected, conflicts remain visible, indexes can be rebuilt, and a clean machine can recover the accepted history from the portable data.

Benchmarks must identify their datasets, machines, algorithms, and limits. Better retrieval is not proof that memory caused better agent behavior. Security screening is not proof against memory poisoning. Readable files are not proof that their contents are true.

MemoFS should make the narrower claim it can support, then improve that claim with tests and experience. The architecture, the implementation, and this manifesto are all open to correction when the evidence demands it.

### Read it. Inspect its sources. Correct it. Keep control of it.
