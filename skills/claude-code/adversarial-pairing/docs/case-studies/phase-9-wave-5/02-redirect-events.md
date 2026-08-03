# Wave 5 Redirect Events Catalog

Wave 5 produced **5 redirect-class events** during HAT cycles for seq 113-130.
All 5 corresponded to genuine misalignments between spec and ground truth.
Zero false positives were observed — no redirect was triggered by reviewer
error or over-caution.

Each event is documented with: setup (state before the redirect), observation
(what the HAT cycle detected), decision (resolution chosen), and downstream
impact (how later seq were affected).

---

## Redirect #1 — seq 117: File Path Correction

**Type:** Spec error (wrong file path)
**HAT phase caught:** HAT 1 (pre-survey)

### Setup

T5.5-C1B (objective blocked events) required changes to the capability
handshake module. The spec, authored in T5.1 planning, referenced the path:

```
environment/orchestrator/capability-handshake.js
```

This path was plausible because an `orchestrator/` directory exists in the VRE
repo and the capability handshake is an orchestration-adjacent concept.

### Observation

During HAT 1 pre-survey, the implementer ran a file-system scan:

```
find . -name "capability-handshake.js"
```

Result: `./environment/control/capability-handshake.js`

The file lives under `control/`, not `orchestrator/`. The spec path was wrong.

### Decision

- Spec amendment issued LOCAL before any code change
- Amendment note: "path corrected: `orchestrator/` → `control/`; no logic change"
- HAT 1 redirect logged as R1 in ledger row for seq 117
- R1 was closed within the same seq (no carry-forward needed)

### Downstream Impact

- seq 118 onward: all specs referencing capability-handshake use the corrected
  path `environment/control/capability-handshake.js`
- Pre-survey checklist updated: "verify all file paths against `find` output
  before HAT 1 complete"
- Zero additional redirects from path errors in the remaining 13 seq

---

## Redirect #2 — seq 124: Split Decision C.4 → C.4a + C.4b

**Type:** Scope growth (one task must become two)
**HAT phase caught:** HAT 1 (ground-truth analysis)

### Setup

The original T5.5 plan had a single task C.4 covering all reconciliation-related
governance events. C.4 was estimated as a single seq. HAT 1 began with a
ground-truth analysis of all event sites that would need to change.

### Observation

During HAT 1 analysis, the implementer catalogued two distinct categories of
change required by C.4:

1. **Additive changes:** new event fields added to existing event structs; no
   change to function signatures or call contracts.
2. **Contract changes:** the `capability-handshake.js` call signature needed
   a new mandatory parameter (kernel truth hash). This is a breaking contract
   change for all callers.

Mixing these in one seq would make the diff ambiguous: reviewers could not
easily distinguish additive from contract-change lines.

### Decision

- C.4 split into C.4a (additive only) and C.4b (contract change only)
- Two seq allocated: seq 124 (C.4a) and seq 125+ (C.4b)
- Ledger updated: C.4 row SUPERSEDED; C.4a and C.4b rows OPENED
- Split rationale documented inline in C.4a ledger row body

### Downstream Impact

- C.4b itself required two further splits (redirects #3 and #4), making the
  original single C.4 a total of 4 seq (124, 125, 126, 127)
- The split pattern demonstrated the value of HAT 1 ground-truth analysis
  for catching scope underestimation before code is written
- Wave 5 seq count increased by 3 (113-127 instead of 113-124 originally)

---

## Redirect #3 — seq 125: Split Decision C.4b → C.4b1 + C.4b2

**Type:** Architectural-plane separation (contract semantics differ)
**HAT phase caught:** HAT 1 (ground-truth analysis)

### Setup

After redirect #2, C.4b covered all capability-handshake contract changes.
HAT 1 for seq 125 began analyzing the callers of `capability-handshake.js`
to understand what the contract change would require.

### Observation

Two distinct groups of callers emerged:

1. **Hard-contract callers** (e.g., `kernel-bridge.js`): call
   `capability-handshake.js` directly; they must pass the new kernel truth hash
   parameter explicitly. These are in the control plane.
2. **Soft-probe callers** (e.g., agents polling for capability state): call
   `capability-handshake.js` through a wrapper that currently absorbs the
   hash internally. These callers do not know the hash exists.

The two groups require different implementation strategies:
- Hard-contract: update callers to compute and pass hash explicitly
- Soft-probe: update wrapper to expose hash; callers unchanged

Mixing the two in one seq would conflate two different contract migration
patterns in a single diff.

### Decision

- C.4b split into C.4b1 (hard-contract callers) and C.4b2+ (soft-probe callers)
- Architectural-plane split noted in ledger: "control-plane vs. flow-plane"
- seq 125 covers C.4b1 only; seq 126+ covers C.4b2
- Both C.4b1 and C.4b2 parent back to C.4b in the task tree

### Downstream Impact

- C.4b2 itself required a further split after redirect #4 (pre-survey gap)
- The hard/soft contract distinction became a standing concept in the project
  vocabulary (referenced in seq 127 wiki page)

---

## Redirect #4 — seq 126: Pre-Survey Gap (Helper-Wrapped Consumers)

**Type:** Methodology failure (incomplete pre-survey)
**HAT phase caught:** HAT 1 (pre-survey — second pass triggered by reviewer)

### Setup

C.4b2 covered soft-probe callers of `capability-handshake.js`. The HAT 1
pre-survey for seq 126 searched for callers using:

```
grep -r "require.*capability-handshake" .
```

This returned 4 files. The implementer prepared a change plan for those 4 files
and declared HAT 1 complete.

### Observation

The reviewer, during HAT 1 review (before implementation began), asked:

> "Did the pre-survey check for helper-wrapped calls, not just direct requires?"

The implementer ran a second search:

```
grep -r "callCapabilityHandshake\|checkHandshake\|capHandshake" .
```

This returned 3 additional files: `writing.js`, `writing-packs.js`,
`memory/sync.js`. All three were wrapping `capability-handshake.js` behind
a helper function and were not caught by the first search.

### Decision

- redirect #4 logged: pre-survey was incomplete; HAT 1 not complete
- Pre-survey methodology updated: all future pre-surveys must include a
  second pass for helper-wrapper aliases
- C.4b2 scope expanded to include the 3 missed files (control-plane)
- C.4b3 created for the flow-plane portion (writing layer consumers)
- Helper-aware two-pass pre-survey added to HAT protocol notes

### Downstream Impact

- seq 127 (C.4b3) was created specifically to cover the flow-plane consumers
  discovered by the methodology update
- Pre-survey methodology locked in helper-aware form for all subsequent waves
- Wiki concept page `caller-side-kernel-truth-mismatch.md` authored at seq 127
  to document the full discovery chain

---

## Redirect #5 — seq 128: Procedural Deviation (Pre-Flipped R2)

**Type:** Protocol violation (ordering of ledger update relative to reviewer ACCEPT)
**HAT phase caught:** HAT 3 (reviewer review)

### Setup

seq 128 (T5.6-D0-VERDICT-PRECOMMIT) was in HAT 3: the implementer had produced
the code, the reviewer was reviewing the ledger row alongside the diff. The
ledger row included an R2 entry (the reviewer-ACCEPT record).

### Observation

The reviewer noticed that the R2 row status was already set to `OK` — meaning
the implementer had flipped it from PENDING → OK before the reviewer had issued
ACCEPT. This inverts the causal order: the record of reviewer acceptance existed
before the acceptance itself.

The correct protocol order is:
1. Implementer opens R2 row with status PENDING
2. Reviewer reviews
3. Reviewer issues ACCEPT
4. Implementer (or reviewer) flips R2 to OK *after* ACCEPT

The pre-flip is a protocol violation regardless of whether the code itself
was correct.

### Decision

- Reviewer did not ACCEPT the row in its current state
- redirect #5 logged: "R2 pre-flipped; must be PENDING at time of reviewer review"
- Implementer reverted R2 to PENDING, re-submitted for HAT 3
- Reviewer then issued ACCEPT; R2 flipped to OK after ACCEPT
- Carry-forward: a protocol note was added to the ledger row template:
  "R2 must remain PENDING until reviewer ACCEPT is issued"

### Downstream Impact

- seq 129 and 130: both correctly maintained R2 in PENDING state during HAT 3
- The protocol note in the template propagates to all future seq using the
  standard ledger row format
- Pre-flip guard (seq 128 feature itself — the `pending-flip-guard` hook) now
  detects this class of violation automatically in CI

---

## Summary Table

| # | seq | Type | Root cause | Recovery | Carry-forward |
|---|---|---|---|---|---|
| 1 | 117 | File path error | Spec used wrong directory | Path corrected in LOCAL spec amendment | Pre-survey checklist: verify paths with `find` |
| 2 | 124 | Scope split | C.4 mixed additive + contract changes | Split into C.4a (additive) + C.4b (contract) | All future C.4x tasks inherit the split |
| 3 | 125 | Architectural split | C.4b mixed hard-contract + soft-probe semantics | Split into C.4b1 (hard) + C.4b2 (soft) | Hard/soft plane distinction documented |
| 4 | 126 | Pre-survey gap | `grep` missed helper-wrapped consumers | Two-pass helper-aware pre-survey adopted | Methodology locked; wiki page authored at seq 127 |
| 5 | 128 | Procedural deviation | R2 flipped PENDING → OK before reviewer ACCEPT | Reverted; re-submitted; template note added | `pending-flip-guard` hook enforces ordering in CI |
