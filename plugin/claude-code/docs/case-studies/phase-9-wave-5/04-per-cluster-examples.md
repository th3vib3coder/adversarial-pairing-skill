# Per-Cluster Examples — Phase 9 Wave 5

One concrete Phase 9 Wave 5 example for each of the 7 clusters. Each example
grounds the abstract cluster description in an observable event from seq 113-130.

---

## Cluster 1 — Roles & Cycles

**Example:** seq 124 HAT 1/2/3 trail (standard cycle execution)

### Context

seq 124 (T5.5-C4A-RECONCILIATION) was the first seq after the C.4 split
(redirect #2). It is a clean example of a standard three-phase HAT cycle because
it has a split decision at HAT 1, a well-scoped implementation at HAT 2, and
a clean reviewer ACCEPT at HAT 3.

### HAT 1 — Ground Truth

The implementer opened the ledger row for seq 124 with status OPEN. HAT 1
pre-survey covered:
- All event struct files in `vibe-science/events/`
- All callers of the reconciliation event emitter
- All spec paragraphs in T5.5-C4 task definition

Ground-truth finding: C.4 scope requires split (additive vs. contract).
HAT 1 decision: split C.4 → C.4a (this seq) + C.4b (next seq). Ledger row
SUPERSEDED for C.4; two new rows OPENED for C.4a and C.4b.

### HAT 2 — Implementation

With C.4a scope locked (additive only; 15 save targets), the Codex implementer
produced:
- New fields added to `ReconciliationEvent` struct
- New fields added to `ReconciliationSummaryEvent` struct
- Updated serialization helpers
- Updated unit tests (4 new test cases)
- Ledger row updated: save targets listed, status → IN_PROGRESS

### HAT 3 — Reviewer Accept

Claude reviewer checked:
1. Diff confined to declared 15 save targets: YES
2. No contract changes (only additive fields): YES
3. All new fields have corresponding test coverage: YES
4. Ledger R2 row in PENDING state: YES
5. CI check (pre-check; not yet merged): PASS

Reviewer issued ACCEPT. Implementer flipped R2 → OK. seq 124 closed DONE.

### Cluster 1 Signal

The seq 124 trail shows the three-role sequence operating correctly:
operator (approved the split decision), implementer (scoped to C.4a, produced
clean diff), reviewer (verified against all five criteria before ACCEPT). Role
boundaries did not blur at any point.

---

## Cluster 2 — Verification Discipline

**Example:** seq 126 pre-survey gap discovery + seq 127 helper-aware consolidation

### Context

The seq 126-127 pair is the strongest example of verification discipline in
Wave 5 because the verification step (HAT 1 pre-survey) both caught a genuine
gap and evolved the methodology as a result.

### The Gap (seq 126)

HAT 1 for seq 126 (C.4b2-CONTROL-PLANE-SOFT-PROBE) used a single-pass pre-survey:

```bash
grep -r "require.*capability-handshake" .
```

Four files found. The implementer declared pre-survey complete.

The reviewer, during HAT 1 review, applied the verification question:
> "Is this the complete set of callers, or could wrappers exist?"

The reviewer's question triggered a second search:

```bash
grep -r "callCapabilityHandshake\|checkHandshake\|capHandshake" .
```

Three additional files found (`writing.js`, `writing-packs.js`, `memory/sync.js`).
HAT 1 was not complete. Redirect #4 logged.

### The Consolidation (seq 127)

seq 127 did not merely add the three missed files. It also locked the
methodology so the gap cannot recur:

1. Two-pass pre-survey added to HAT protocol notes
2. Wiki concept page `caller-side-kernel-truth-mismatch.md` authored to explain
   *why* helper wrappers exist and *which* modules are known to use them
3. Mantra M43 added: "Pre-survey must include a helper-wrapper alias pass"

### Cluster 2 Signal

The seq 126-127 pair demonstrates that verification discipline is not only
about catching issues — it is about improving the verification method when a
gap is found. The reviewer's single question at HAT 1 review prevented at
minimum 3 missed sites from reaching production and generated a permanent
methodology improvement.

---

## Cluster 3 — Ledger Discipline

**Example:** seq 124 row save targets coherence (15 paths PUSHED + LOCAL)

### Context

seq 124 (C.4a-RECONCILIATION) had the largest save target set in Wave 5: 15
paths. This makes it the best example for ledger discipline because the
discipline is most visible under load — when there are many paths to enumerate
accurately.

### Save Target Enumeration

The seq 124 ledger row listed 15 save targets before HAT 2 began:

**PUSHED (13 paths):**
```
vibe-science/events/reconciliation-event.js
vibe-science/events/reconciliation-summary-event.js
vibe-science/events/__tests__/reconciliation-event.test.js
vibe-science/events/__tests__/reconciliation-summary-event.test.js
vibe-science/serializers/event-serializer.js
vibe-science/serializers/__tests__/event-serializer.test.js
vibe-science/types/event-types.d.ts
vibe-science/CHANGELOG.md
vibe-research-environment/consumers/reconciliation-consumer.js
vibe-research-environment/consumers/__tests__/reconciliation-consumer.test.js
vibe-research-environment/ledger/event-schema.json
vibe-research-environment/ledger/__tests__/event-schema.test.js
vibe-research-environment/CHANGELOG.md
```

**LOCAL (2 paths):**
```
docs/ledger/LOCAL-seq-124-c4a-notes.md
docs/spec/amendments/LOCAL-c4-split-rationale.md
```

### Discipline Evidence

After HAT 2, the reviewer verified the diff against the 15 declared paths.
Result: every changed file was on the list; no undeclared file was modified.
The two LOCAL files were present in the working tree (not committed) as expected.

Body length: every line in the seq 124 ledger row was under 120 characters.
No line was truncated or abbreviated — the full paths were spelled out.

### Cluster 3 Signal

Enumerating 15 save targets explicitly before implementation (not after)
makes the reviewer's verification task mechanical: check diff paths against
the list. No judgment required. The discipline inverts the default
(discover scope by reading diffs) into a confirmed-before-started model.

---

## Cluster 4 — Wiki Discipline

**Example:** seq 127 Tier C concept page extension (`caller-side-kernel-truth-mismatch.md`)

### Context

After the helper-aware pre-survey consolidation at seq 126-127, the project
needed a place to record the underlying concept: that callers of a module
can exist at multiple levels of indirection, and the correct model for
understanding a module's consumers must account for wrapper layers.

### Wiki Page Authored

At seq 127, the implementer authored a new Tier C concept page:

```
docs/wiki/tier-c/caller-side-kernel-truth-mismatch.md
```

**Page structure:**
- Title: "Caller-Side Kernel Truth Mismatch"
- Definition: what a kernel truth mismatch is (caller's cached model of module
  behavior diverges from module's actual contract)
- Why helper wrappers cause invisible mismatches (they absorb the contract
  update silently)
- Detection methodology: two-pass pre-survey (direct requires + alias grep)
- Known modules with helper wrappers (as of seq 127): capability-handshake,
  event-bus, ledger-write
- Related mantras: M43, M45
- Related redirects: redirect #3 (seq 125), redirect #4 (seq 126)

### Cognitive Reflection Aspect

The wiki page was not written to satisfy a task requirement. It was authored
because the pre-survey gap at seq 126 revealed that the team's mental model
of "finding callers" was incomplete. Writing the concept page forced an
explicit articulation of the gap and its general form.

This is the cognitive-reflection pattern: redirect → explicit concept page →
permanent methodology update. The page is the artifact of reflection, not
just a record of what happened.

### Cluster 4 Signal

The seq 127 wiki extension demonstrates that wiki discipline is not just
documentation maintenance. It is the mechanism by which a one-time mistake
becomes a permanent part of the team's shared model. The Tier C page is
consulted by any implementer touching wrapper-heavy modules in future waves.

---

## Cluster 5 — Code Discipline

**Example:** Round 94 F4 lock — `kernel-bridge.js` diff = 0 across all 18 seq

### Context

`kernel-bridge.js` is a high-sensitivity module in vibe-science. It is the
sole entry point for capability negotiation between the plugin and the VRE
kernel. In Round 93 (before Wave 5), this module was placed under an F4
immutable-surface lock: no modifications permitted without explicit operator
approval and a new lock record.

### Observation Across Wave 5

During HAT 1 pre-survey for every seq in Wave 5 that touched capability-related
modules (seq 117, 124, 125, 126, 127), the pre-survey explicitly noted:

> "kernel-bridge.js is F4-locked. No modification proposed. Pre-survey
> confirmed: diff for kernel-bridge.js = 0."

At Wave 5 closure, the cumulative diff for `kernel-bridge.js` across seq 113-130
was confirmed to be zero lines changed. The module was untouched despite 18 seq
and 5 redirect events in adjacent code.

### How the Lock Was Respected

The capability-handshake split (seq 125-127) specifically worked around the
kernel-bridge surface:
- C.4b1 (hard-contract): callers updated to pass hash to `capability-handshake.js`
  directly — kernel-bridge.js was NOT in the call chain for these callers
- C.4b2/b3 (soft-probe): wrapper updated to absorb hash — kernel-bridge.js
  interface unchanged from wrapper's perspective

The architectural split that preserved the F4 lock was a direct consequence
of having the lock declared before implementation began.

### Cluster 5 Signal

An immutable surface lock is only meaningful if it is respected under pressure.
The 5 redirects in Wave 5 created pressure to find alternative implementation
paths. The F4 lock on `kernel-bridge.js` held because:
1. The lock was visible in the pre-survey checklist
2. Reviewer verified "diff = 0" at every relevant HAT 3
3. The architectural split at seq 125 was partly motivated by preserving the lock

---

## Cluster 6 — State Integrity

**Example:** seq 129 dual-repo dual-commit (plugin first, VRE second)

### Context

seq 129 (T5.6-D1-CLAIM-EDGE-R2-BINDING) required commits to both vibe-science
(plugin) and vibe-research-environment (VRE). The plugin defines the claim-edge
schema; the VRE consumes it. This makes seq 129 the canonical example of
cross-repo ordering discipline.

### The Ordering Rule

At seq 129, the dual-commit ordering rule was formally locked:

> **Plugin first, VRE second.**
>
> Rationale: the plugin is the source of truth for claim edges. The VRE binding
> is derived from the plugin schema. If VRE is committed first, there is a
> window where VRE references a schema that does not yet exist in the plugin.
> This window is zero-length only if plugin commits first.

### Execution at seq 129

HAT 2 produced two diffs:
1. `vibe-science` diff: new `claim-edge-schema.js`, new `r2-binding.js`,
   updated tests
2. `vibe-research-environment` diff: new `r2-binding-consumer.js`, updated
   integration tests

HAT 3 (reviewer) verified:
- Schema in plugin diff matches consumer expectations in VRE diff: YES
- Plugin diff does not reference VRE consumer (no circular dependency): YES
- R2 rows in PENDING state: YES

Commit order executed:
1. `vibe-science` commit pushed first (SHA: `claim-edge-r2-plugin`)
2. `vibe-research-environment` commit pushed second (SHA: `claim-edge-r2-vre`)
3. CI ran on both; both green

### Cluster 6 Signal

State integrity in a two-repo system is not a CI concern alone. It requires
explicit ordering rules at commit time. seq 129 locked the rule, and the CI
results confirm there was no transient broken state between the two commits.

---

## Cluster 7 — Plan & Document Discipline

**Example:** seq 124 row body length management + spec amendment LOCAL pattern

### Context

seq 124 had the largest ledger row in Wave 5 (15 save targets, a split
decision record, a redirect log entry, and a full HAT 1/2/3 trail). It is
the best example for document discipline because the discipline is most
necessary when the row is densest.

### Body Length Management

The seq 124 ledger row body contained approximately 800 words across the HAT
1/2/3 trail, save targets, and redirect record. Every line was kept under
120 characters. Key techniques observed:

- Long file paths broken at directory boundaries, not mid-name
- Split rationale written as a numbered list (compact) not prose (verbose)
- Save target list in two blocks (PUSHED / LOCAL) with blank line separator
- Redirect record cross-referenced by ID (R2) rather than repeated inline

The reviewer noted in HAT 3: "row body is dense but navigable — length
management is working."

### Spec Amendment LOCAL Pattern

When redirect #2 (split decision) was resolved, the spec for C.4 needed
updating. The update was issued as a LOCAL spec amendment before any code
change:

```
docs/spec/amendments/LOCAL-c4-split-rationale.md
```

This file was NOT committed. It lived in the working tree as an untracked LOCAL
file throughout seq 124. Its purpose was to give the implementer a ground-truth
record of the split decision that was stable during HAT 2 (implementation),
without adding a premature commit to the spec repo.

At Wave 5 closure, the LOCAL amendment was superseded by the permanent spec
update included in the Wave 5 closure commit. At that point the LOCAL file
was deleted (working tree clean confirmed at seq 130).

### Cluster 7 Signal

Document discipline is not about writing more — it is about writing the right
things in the right place at the right time. The LOCAL amendment pattern is
a plan-discipline tool: it gives the implementer a stable reference during
implementation without polluting the commit history with draft amendments that
may change during HAT cycles. The body length management is a readability tool:
it ensures the ledger row remains a usable artifact, not a wall of text.
