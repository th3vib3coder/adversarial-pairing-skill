# Feature Ledger

Per-patch rows. Add one row per feature shipped.
Append-only: never rewrite or batch rows from prior patches.

## Mantras (VERBATIM in N=3 save targets)

- No implementer self-certification.
- No commit carries an unresolved review marker.

## Columns

| seq | patch | feature | tests | R2 inline | confounder | wiki-lint | registry-check | tier-C | residual disclosure | save targets | mantra | status |
|-----|-------|---------|-------|-----------|------------|-----------|----------------|--------|---------------------|--------------|--------|--------|
| 001 | bootstrap-governance | Add a no-clobber governance scaffold for auditable recovery sequences. | 127-file baseline manifest matched `eeb4b0c7…8fe3`; repeated bootstrap changed 0 of 142 files; 4/4 tool syntax checks; max 218 lines; full suite 79 total, 78 pass, 0 fail, 1 expected skip; HEAD unchanged and staging empty. | R2 inline OK | N/A — additive scaffold only; pre-existing file hashes and a second no-op bootstrap isolate this change. | `issueCount: 0` | N/A — 6 provisional `scanner-mode: stub` registries match generated content but are explicitly not coverage proof. | noop — self-application of the existing method; no new concept. | CI is absent from the published baseline and is owned by Seq 002. The commit guard still treats a documentary free-text mention of its unresolved-state sentinel as live state; structural parsing and regression coverage are owned by Seq 003. | PUSHED: `CLAUDE.md`, `feature-ledger.md`, `status-ledger.md`, `wiki/CLAUDE.md`, `wiki/log.md`, `wiki/entities/registry-cli-verbs.md`, `wiki/entities/registry-db-writers.md`, `wiki/entities/registry-exported-symbols.md`, `wiki/entities/registry-gate-triggers.md`, `wiki/entities/registry-protocol-invariants.md`, `wiki/entities/registry-schema-graph.md`, `wiki/tools/audit-entity-exports.mjs`, `wiki/tools/build-registries.mjs`, `wiki/tools/sync-mirror.mjs`, `wiki/tools/wiki-lint.mjs`; LOCAL: none. | N=3 targets declared; exact strings recorded above. | HAT 3 pending |
