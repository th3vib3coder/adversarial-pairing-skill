# Cluster 1 — Roles & Cycles

**Parent index**: [README.md](README.md)
**Next cluster**: [02 — Verification Discipline](02-verification-discipline.md)
**Version**: v0.1.0

---

## §1.1 Statement

Every agentic two-agent session MUST begin with an explicit role declaration: one agent instance
takes the **implementer** role; a distinct agent instance takes the **reviewer** role. These roles
are non-fungible for the duration of the session — the implementer never self-reviews, and the
reviewer never authors code. Work proceeds through three mandatory gate points, HAT 1, HAT 2, and
HAT 3, each with defined entry conditions, artifacts, and exit criteria. A HAT boundary is not a
soft checkpoint; it is a hard gate at which the operator authorizes the next phase and the reviewer
issues a formal ACCEPT or BLOCK decision. No seq is considered closed until HAT 3 ACCEPT is
recorded, the ledger row is finalized, and CI is confirmed green on the pushed commit.

---

## §1.2 Rationale

The failure mode that adversarial pairing targets is **self-certification**: an implementer agent
that both writes code and declares its own work correct. Self-certification is not a character
flaw — it is a structural property of single-agent sessions. Any single agent operating under
task pressure will rationalize partial verification, defer ledger entries, and compress closure
gates. The HAT cycle exists to make that rationalization structurally impossible: the reviewer
holds the ACCEPT token, and ACCEPT cannot be issued by the same instance that holds the
implementer role.

HAT gates also provide natural reentry surfaces. When a seq is interrupted — by a redirect, a
CI failure, or an operator pause — the gate state (HAT 1 / HAT 2 / HAT 3 pending) is the
resume point. Without named gates, resumption after interruption requires reconstructing context
from scratch; with gates, the question is simply "which HAT boundary are we at?" Pre-flight CI
verification (§1.5.3) and post-push CI watch (§1.5.4) bracket each seq and ensure that the
test baseline is clean before work begins and clean after it lands. Together, the role split and
the HAT cycle form the minimum harness that makes agentic delivery auditable.

---

## §1.3 Failure modes

- **Role bleed**: implementer and reviewer are the same agent instance, or roles are declared but
  not enforced — implementer issues its own ACCEPT at HAT 3 and proceeds to commit without
  external challenge.
- **HAT collapse**: the session skips HAT 1 entirely (no STOP report, no pre-survey, no RED plan)
  and jumps directly to code changes; or HAT 1 and HAT 2 are merged into a single pass with no
  operator GO gate between them.
- **Premature closure**: HAT 3 closure artifacts (ledger row, wiki sync, save targets) are
  declared complete before reviewer ACCEPT; commit happens before ACCEPT is recorded.
- **Missing pre-flight**: implementer starts HAT 2 on a red baseline — existing CI failures mask
  regression from the current patch, making test results uninterpretable.
- **Abandoned CI watch**: implementer pushes and moves immediately to the next seq without waiting
  for CI to complete; a CI failure is discovered two seq later and cannot be attributed cleanly.
- **Implicit role assumption**: neither agent explicitly declares its role at session start; when a
  reviewer challenge is needed, neither instance has the authority to issue it.
- **Gate drift under time pressure**: operator approves HAT boundaries informally (e.g., chat
  message without a formal GO) and the gate record is missing from the ledger; audit trail breaks.

---

## §1.4 Reference example

In a phased delivery, each seq follows the pattern: HAT 1 STOP → reviewer ACCEPT/REDIRECT → operator GO → HAT 2 GREEN → HAT 3
closure → reviewer ACCEPT → operator GO commit/push → CI watch → seq closed. The implementer and
reviewer roles are held by distinct agent instances; the operator gates each transition.

For a concrete instantiation of this pattern across an 18-seq delivery, see
[`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/).

---

## §1.5 Sub-patterns

### §1.5.1 Adversarial pairing (role declaration)

**Statement**

At the opening of every session, each participating agent MUST issue an explicit role declaration
in the session transcript. The declaration names the role (`implementer` or `reviewer`), the agent
instance identifier, and the session or Wave scope. A session that proceeds without role
declarations is non-compliant; any ACCEPT issued by an undeclared reviewer is invalid and does not
satisfy the HAT 3 gate.

**Rationale**

Role declarations serve two functions. First, they create an unambiguous audit record: anyone
reading the session transcript can identify which agent was responsible for code authorship and
which was responsible for adversarial challenge. Second, they prevent role drift under pressure:
once an agent has declared itself the implementer, issuing a self-review ACCEPT requires an
explicit transcript act that is visible to the operator and reviewable after the fact. Implicit
role assignment — where roles are inferred from which agent happens to speak first — provides
none of these properties.

The "adversarial" qualifier is intentional: the reviewer's job is not to help the implementer
reach closure faster, but to find every way the closure claim could be wrong. A reviewer that is
cooperative rather than adversarial is functionally equivalent to no reviewer.

**Abstract example**

Session opens. Agent A declares: "Role: IMPLEMENTER. Scope: seq N. I will produce HAT 1 STOP,
execute HAT 2 TDD, and produce HAT 3 closure artifacts." Agent B declares: "Role: REVIEWER. I
will issue ACCEPT or BLOCK at HAT 1 design review and HAT 3 closure. I will not author code."
Operator acknowledges both declarations. The session is now compliant for role tracking.

---

### §1.5.2 HAT 1/2/3 protocol

**Statement**

Each seq executes exactly three HAT phases in order:

- **HAT 1 — STOP**: The implementer produces a STOP report containing: (a) pre-flight CI
  verification result (branch status, last CI outcome, working tree state, immutable surfaces
  clean), (b) pre-survey grep results (scope of impact, affected call sites, helper-mediated
  dependencies), (c) design choice rationale (options considered, option selected, tradeoffs), and
  (d) a RED test plan (tests that will fail before implementation begins). HAT 1 lifecycle:
  STOP report submitted by implementer → reviewer adversarial review (tactical + strategic) →
  reviewer ACCEPT or REDIRECT → if ACCEPT, operator GO triggers HAT 2; if REDIRECT, implementer
  revises and re-submits HAT 1. No code is touched before operator GO.
- **HAT 2 — GREEN**: The implementer executes RED-first TDD: writes failing tests first, then
  writes the minimum implementation to make them pass, then runs the full test suite. HAT 2 ends
  when target tests are green and no pre-existing tests regressed. The implementer does not declare
  HAT 2 complete; the test suite result is the gate.
- **HAT 3 — Closure**: The implementer produces closure artifacts: full verification pass (tests,
  validate, lint, sync), feature ledger row appended (status PUSHED or LOCAL, mantras VERBATIM),
  wiki sync completed (Tier A/B/C), save targets coherent. HAT 3 ends when the reviewer issues
  ACCEPT. ACCEPT authorizes the operator to issue GO for commit and push. Commit happens after GO,
  not before ACCEPT.

**Rationale**

The three-phase structure separates concerns that collapse in unstructured sessions. HAT 1
isolates design from implementation: the implementer must commit to a plan before touching code,
and the reviewer can challenge the plan without being distracted by implementation details. HAT 2
isolates implementation from closure: test results are the objective gate, not the implementer's
judgment. HAT 3 isolates closure verification from commit authorization: the ledger row and wiki
sync are complete before any push, ensuring that the record always reflects actual state.

The ordering is non-negotiable. Attempting HAT 2 before operator GO on HAT 1 means the design
may change mid-implementation (wasted work, inconsistent artifacts). Attempting HAT 3 before HAT 2
is complete means closure artifacts describe a non-green state. Committing before reviewer ACCEPT
means the ACCEPT is decorative rather than a real gate.

**Abstract example**

Implementer produces HAT 1 STOP: pre-flight confirms branch HEAD matches remote, CI is green,
working tree is clean, immutable surfaces untouched. Pre-survey finds 3 direct callers and 1
helper-mediated caller. Design choice: option B (additive, avoids mutation of public API).
RED plan: 2 new unit tests that will fail on current main. Reviewer reviews HAT 1 — no objections.
Operator: GO. Implementer writes failing tests, then implementation. Tests green, no regressions.
Implementer produces HAT 3 STOP: verification clean, ledger row appended (PUSHED, mantras present),
wiki Tier A rebuilt, Tier B entity page created, Tier C: noop (no new architectural concept).
Reviewer issues ACCEPT. Operator: GO for commit/push. Implementer commits, pushes, watches CI.

---

### §1.5.3 Pre-flight CI verification

**Statement**

Pre-flight verification before HAT 1 has TWO modes. In **Bootstrap mode** (Day 1 only, no remote/CI configured yet), pre-flight MUST validate working tree expected + immutable surfaces clean. In **Steady-state mode** (post-bootstrap, default thereafter), pre-flight MUST additionally enforce remote HEAD aligned + last CI green. Bootstrap mode is a one-time state transitioned out of by the first task that configures remote + first CI run.

**Mode elaboration:**

- **Bootstrap mode**: applies on Day 1 of a new project, before any remote or CI exists. Validates
  working tree expected + immutable surfaces clean (which always apply). Skips remote HEAD aligned
  + last CI green checks (infrastructure does not yet exist).
- **Steady-state mode**: applies after the bootstrap transition. Enforces FULL pre-flight: remote
  HEAD aligned + last CI green + working tree expected + immutable surfaces clean. The pre-flight
  result MUST be recorded verbatim in the HAT 1 STOP report. A steady-state pre-flight that cannot
  confirm all four conditions is a BLOCK — the seq does not start until the baseline is resolved or
  the deviation is explicitly documented with operator acknowledgment.

**Transition**: the first task after bootstrap is "configure remote + first CI run". This task
flips the repo from bootstrap mode to steady-state mode. Subsequent pre-flight invocations always
run steady-state mode.

**Day 1 bootstrap stops BEFORE `git commit`.** The bootstrap procedure outputs
`READY: bootstrap structure complete; operator GO required for first commit`. NO autonomous git
commit during bootstrap.

**Rationale**

A red or ambiguous baseline is the single most common cause of uninterpretable HAT 2 results. If
CI is already failing before the patch, passing tests in HAT 2 do not confirm that the patch is
correct — they only confirm that whatever was already failing is still failing at the same rate.
Worse, a new regression introduced by the current patch may be masked by existing failures,
making the CI signal useless for attributing causality.

Working tree state matters for similar reasons: uncommitted changes from a prior session will be
included in the current patch's test run, making it impossible to assert cleanly that the current
seq's changes — and only those changes — produced the observed test results. Pre-flight is cheap;
debugging a contaminated baseline after the fact is expensive.

**Abstract example**

Implementer runs pre-flight: `git fetch && git status` confirms HEAD matches remote, no local
commits. CI dashboard: last run on branch is SUCCESS (3 minutes ago). Working tree: clean (no
modified files). Immutable surfaces: `exported-symbols.md` registry matches codebase (tool exit 0).
Pre-flight result recorded in HAT 1 STOP: "Pre-flight: PASS (HEAD aligned, CI green, tree clean,
immutable surfaces clean)." Seq proceeds. Compare with a BLOCK scenario: CI shows FAILURE from a
prior seq's push that was not triaged before this session started — implementer must resolve or
document the existing failure before HAT 1 is complete.

---

### §1.5.4 Post-push CI watch

**Statement**

After every commit/push authorized by the operator at HAT 3 closure, the implementer MUST remain
on CI watch until the triggered CI run completes and reports a definitive outcome (SUCCESS or
FAILURE). "Definitive" means the run has finished — a run in progress does not satisfy the gate.
A SUCCESS result closes the seq. A FAILURE result opens an immediate triage: the implementer
identifies the failing job, determines whether the failure is attributable to the current push or
is pre-existing, and either produces a hotfix seq (goes through full HAT 1/2/3 for the fix) or
documents the pre-existing nature with evidence in the ledger row. The next seq does not begin
until CI watch for the current seq is resolved.

**Rationale**

The gap between commit-time test results (local, synchronous) and CI results (remote, asynchronous)
is a well-known failure surface. Local tests may pass while CI fails due to environment
differences, parallel job ordering, platform-specific behavior, or resource limits that do not
manifest locally. An implementer that pushes and immediately starts the next seq treats CI as a
formality rather than a gate; failures discovered two seq later require archaeological attribution.

Post-push CI watch closes this gap by making the CI result a synchronous gate for seq closure.
The implementer is responsible for the outcome — not just for the push act. This changes the
accountability model: a CI failure is the implementer's problem until it is triaged and closed,
regardless of when in the session it surfaces.

**Abstract example**

Implementer pushes after HAT 3 ACCEPT and operator GO. Opens CI dashboard, monitors the triggered
run. Run completes in 4 minutes: SUCCESS across all jobs. Implementer records in ledger row: "CI
watch: SUCCESS (run #42, 4 min, all jobs green). Seq closed." Next seq begins. Compare with a
failure path: CI run completes with 1 failing job (integration test timing out). Implementer
attributes to current push (new async behavior changes timing assumptions). Opens hotfix seq:
HAT 1 STOP documents the CI failure as the pre-flight condition, design choice is a targeted
timeout increase, HAT 2/3 cycle completes, push, CI watch confirms green. Hotfix seq closes the
failure; original seq ledger row is annotated with cross-reference to hotfix seq.

---

## Cross-references

- **Spec index**: [README.md](README.md) — glossary definitions for HAT 1/2/3, implementer,
  reviewer, pre-flight CI verification, post-push CI watch, seq, ledger row, save target.
- **Next cluster**: [02 — Verification Discipline](02-verification-discipline.md) — helper-aware
  pre-survey, 2-level review, shape pin source accuracy. Pre-survey content from HAT 1 STOP
  (§1.5.2) feeds directly into Cluster 2 discipline.
- **Reference implementation**: [`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/)
  — concrete instantiation of the 18-seq delivery pattern with HAT cycle records, redirect events,
  and CI watch outcomes.
