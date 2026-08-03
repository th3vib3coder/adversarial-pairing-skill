# Cluster 5 — Code Discipline

**Parent index**: [README.md](README.md)
**Previous cluster**: [04 — Wiki Discipline](04-wiki-discipline.md)
**Next cluster**: [06 — State Integrity](06-state-integrity.md)
**Version**: v0.2.0

---

## §5.1 Statement

Every patch MUST cover exactly one intent unit. Foundational API changes MUST land before the
consumers that depend on them — never bundled in the same seq. Certain surfaces (bridge files,
adapter modules, schema definitions in their stable form) MUST be declared no-touch for a defined
scope and verified zero-diff at every HAT 3 closure within that scope. When a seq's scope grows
beyond one intent unit during execution, the seq MUST be split; the split boundary MUST be
determined by ground-truth findings (e.g., grep discovers N call sites instead of expected M;
behavior contract delta requires careful staging) and NOT by subjective complexity judgment
(e.g., "this feels big"). These three rules — anti-bundle-creep, immutable surfaces lock, and
ground-truth-driven splits — are jointly non-negotiable and jointly enforced at HAT 3. A seq that
violates any one of them is not closed.

---

## §5.2 Rationale

Agentic coding sessions accumulate bundle creep silently. An implementer that discovers a
dependency mid-task is under time pressure to close the seq; the path of least resistance is to
include the dependency fix in the same commit. This shortcut doubles the blast radius of any
failure and destroys atomicity: if the foundational change throws, the consumer logic rolls back
with it, leaving debugging surface 2×. The anti-bundle-creep rule forecloses the shortcut
structurally — one intent unit per seq is not a preference but a gate condition, and the reviewer
is specifically charged with detecting bundle violations at HAT 3.

Immutable surface locks address a different failure mode: silent modification of a shared contract
surface during a patch that was never intended to touch it. Without a declared lock and a
mechanical zero-diff check, the surface drifts by accident — an import reorder, a linter
auto-fix, a reformatter pass — and downstream consumers break without warning. The lock shifts the
check from human vigilance to a deterministic diff command that exits non-zero on any touch. The
reviewer can confirm the check output rather than reading the full diff for surface mutations.

Ground-truth-driven splits close the loop between the pre-survey (Cluster 2) and the patch
boundary decision. A helper-aware pre-survey (§2.5.3) may reveal more call sites than expected;
the seq must then split along those architectural-plane boundaries rather than proceed as a wide
patch. Splits justified by complexity judgment (subjective) are structurally indistinguishable from
arbitrary scope decisions; splits justified by ground-truth findings (objective) can be explained
and verified by the reviewer. This distinction is enforceable: the split rationale must cite a
concrete finding in the ledger row.

---

## §5.3 Failure modes

- **Foundational change bundled with consumer**: a seq lands a foundational API change and a
  consumer that uses the new API in the same commit; if the foundational change throws, the
  consumer rolls back with it; root cause disambiguation requires reading the combined diff.
- **"While I'm here" expansion mid-task**: an implementer discovers a tangentially related
  improvement during HAT 2 and includes it without opening a new seq; scope drift is invisible
  until HAT 3; the seq covers multiple intent units without an explicit split rationale.
- **Immutable surface modified silently**: a linter or formatter pass mutates a declared no-touch
  file; the mutation is not caught because no zero-diff check was run; downstream consumers break
  on next pull without a clear ownership trail.
- **Lock declared ad-hoc but not enforced**: the implementer notes verbally that a file is
  "off-limits" but does not run the zero-diff check at HAT 3; the lock exists as intent but not as
  a structural gate; a later seq violates it without detection.
- **Complexity-driven split**: a seq is split because it "feels large" rather than because a
  ground-truth finding mandates it; the resulting sub-seqs have fuzzy boundaries; reviewers cannot
  determine which sub-seq owns which change surface.
- **Split avoided despite ground-truth signal**: a pre-survey finds N extra call sites but the
  implementer proceeds as a single wide patch; bundle creep returns; the seq covers N+1 concern
  surfaces in one commit.
- **Foundational seq merged before it lands**: a consumer seq opens before the foundational seq
  completes CI; ordering dependency collapses; failures in the consumer are incorrectly attributed
  to the consumer logic rather than the missing foundational API.

---

## §5.4 Reference example

In a phased delivery, code patches are bound by three rules: (a) each seq is one intent unit
(anti-bundle-creep); (b) declared immutable surfaces remain unchanged for the scope's duration
(verified by zero-diff check); (c) splits are triggered only by ground-truth findings, never by
aesthetic judgment.

For a concrete instantiation showing multiple ground-truth-driven splits and a sustained
immutable-surface lock across an 18-seq delivery, see
[`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/).

---

## §5.5 Sub-patterns

### §5.5.1 Anti-bundle-creep

**Statement**

Each task/seq covers ONE intent unit. Bundling N intent units in one seq blasts radius N-fold and
breaks atomicity. Foundational API changes land BEFORE consumers that use them — never bundled.
An "intent unit" is the smallest coherent change surface that can be independently reviewed,
tested, and reverted: one new exported function, one schema migration, one behavioral fix. If a
seq's ledger row would require two distinct `what changed` clauses to be accurate, the seq covers
more than one intent unit and MUST be split or reviewed for bundle creep.

**Rationale**

The single-intent-unit rule exists because atomicity is a prerequisite for reliable rollback and
for honest root-cause analysis. A bundled patch that fails a test suite may fail on the foundational
change, on the consumer logic, or on the interaction between them — all three possibilities must be
explored because the patch provides no structural separation. A seq that covers exactly one intent
unit limits the failure surface to one layer: either the change itself is wrong, or the test is
wrong. There is no third possibility. The reviewer's charge at HAT 3 is specifically to verify that
the ledger row's description maps to exactly one intent unit in the diff; a row that reads like two
separate changes is a bundle-creep finding.

**Failure modes**:

- Foundational change + consumer logic bundled in one seq → if foundational throws, consumer logic
  also rolls back → debugging surface 2×; root-cause disambiguation requires reading the combined
  diff rather than isolating each layer independently.
- "While I'm here" expansion mid-task → scope drift, unclear when commit boundary lands; the seq
  accretes changes that were not declared in HAT 1; the reviewer cannot confirm that the actual
  diff matches the stated design choice.

**Abstract example**: a foundational API change (e.g., adding a callback option to a shared
utility) lands in seq A; the consumer that uses the new option lands in seq A+1. Two seqs, two
reviews, two CI runs. If seq A's CI fails, seq A+1 does not open. If seq A+1's CI fails, seq A
remains intact and the rollback surface is limited to the consumer logic alone.

---

### §5.5.2 Immutable surfaces lock pattern

**Statement**

Certain surfaces (e.g., bridge files, adapter modules, schema definitions in their stable form)
are declared no-touch for a defined scope. The declaration MUST be explicit — written in the scope
definition or in the project's CLAUDE.md — and MUST name the specific files covered. Every patch
within the declared scope MUST verify the surface diff equals zero by running:

```
git diff -- <locked-file>
```

at HAT 3. The check MUST exit with an empty result. Any non-empty result is a HAT 3 block
condition regardless of whether the modification appears intentional. If the scope requires a
modification to a locked surface, the implementer MUST first retract the lock declaration (with
reviewer ACCEPT), open a seq explicitly scoped to that surface change, and re-declare the lock
afterward.

**Rationale**

Agentic coding tools — formatters, linters, import organizers — routinely modify files that are
not the stated target of a patch. A bridge file or adapter that defines a shared contract is
particularly vulnerable because it is imported by many consumers; a minor reformatting touch
during an unrelated patch changes the contract without signaling a contract change in the commit
message. The zero-diff check converts "no-touch" from a human-reviewed convention into a
deterministic gate: the check either passes or it does not. The reviewer confirms the check output
(one line: empty or non-empty) rather than reading the full diff for surface mutations. This is
faster and more reliable than visual inspection across a large diff.

**Failure modes**:

- Immutable surface modified silently → contract breaks downstream consumers without warning; the
  mutation may be a no-op reformatting change or a meaningful API shift; both are blocked because
  the lock does not distinguish intent.
- Lock not declared but enforced ad-hoc → unclear what is actually protected; implementers do not
  know which files to avoid; reviewer cannot verify the lock boundary; the protection is
  aspirational rather than structural.

**Abstract example**: a bridge file is declared no-touch for an entire delivery scope. Every seq's
HAT 3 runs `git diff -- <bridge-file>` and records the output (empty) in the ledger row. At the
end of the scope, the audit shows N consecutive empty-diff results for the bridge file — a
verifiable chain of no-touch compliance. When a seq legitimately needs to modify the bridge file,
the implementer retracts the lock, opens a dedicated surface-change seq with reviewer ACCEPT, then
re-declares the lock in the next seq's scope.

---

### §5.5.3 Ground-truth-driven splits

**Statement**

When a seq's scope grows beyond one intent unit during execution, split it. The split MUST be
ground-truth-driven — triggered by an objective finding in the codebase (e.g., a helper-aware
grep finds N call sites instead of expected M; the behavior contract delta requires careful staging
across architectural boundaries) — NOT complexity-driven (e.g., "this feels large" or "this seems
hard"). The split rationale MUST appear in the ledger row of the originating seq, citing the
specific finding that triggered the split (e.g., "grep found N call sites across modules X, Y, Z;
split along module boundaries into seqs A, A+1, A+2"). Complexity-driven splits without a
ground-truth citation are a reviewer block condition.

**Rationale**

Complexity judgment is subjective and varies across implementers and reviewers. A split boundary
derived from subjective complexity produces sub-seqs with fuzzy ownership: what each sub-seq
accomplishes is not independently verifiable from the codebase structure. A ground-truth finding —
an import graph edge, a grep count, a schema ownership boundary — produces a split boundary that
is independently verifiable: the reviewer can re-run the grep and confirm N call sites exist. This
verifiability converts the split from a design opinion into an auditable claim. It also closes the
feedback loop with the pre-survey: if a helper-aware pre-survey surfaces the ground truth at HAT 1,
the split is determined before any code is written; if the finding surfaces mid-HAT 2, the split
triggers a redirect rather than a scope expansion.

**Failure modes**:

- Complexity-driven split → arbitrary boundaries, unclear what each sub-seq accomplishes; reviewer
  cannot confirm that the split boundary corresponds to any structural feature of the codebase;
  the sub-seqs feel like time-slice chunks rather than architecturally coherent units.
- Split avoided despite ground-truth signal → bundle-creep returns; the wide patch covers multiple
  architectural planes in one commit; if any plane fails, all planes roll back; the ground-truth
  finding that should have triggered the split is not recorded in the ledger row.

**Abstract example**: a seq expected to update M call sites in module X runs a helper-aware grep
(§2.5.3) at HAT 1 and finds N call sites distributed across modules X, Y, and Z (where N > M).
The pre-survey finding triggers a split: the originating seq is scoped to module X only (M sites);
a new seq covers module Y; a third covers module Z. The ledger row for the originating seq records:
"ground-truth split — grep found N sites across 3 modules; split along module-boundary into 3
seqs." Each sub-seq is independently reviewable and independently revertable.

---

## Cross-references

- **Spec index**: [README.md](README.md) — glossary definitions for anti-bundle-creep,
  immutable surface lock, ground-truth-driven split, helper-aware pre-survey, seq.
- **Previous cluster**: [04 — Wiki Discipline](04-wiki-discipline.md) — wiki sync accompanies
  every patch; code discipline governs what changes land in the patch that wiki sync accompanies;
  the two clusters are sequentially dependent within each HAT 2 → HAT 3 transition.
- **Next cluster**: [06 — State Integrity](06-state-integrity.md) — state integrity governs
  cross-repo and cross-layer coherence; code discipline's immutable surface lock is a prerequisite
  for state integrity: a surface that drifts silently within a repo cannot be trusted across repos.
- **Reference implementation**: [`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/)
  — concrete examples of ground-truth-driven splits triggered by helper-aware grep findings,
  sustained immutable-surface lock with zero-diff audit trail, and anti-bundle-creep enforcement
  across an 18-seq delivery scope.
