# Cluster 6 — State Integrity

**Parent index**: [README.md](README.md)
**Previous cluster**: [05 — Code Discipline](05-code-discipline.md)
**Next cluster**: [07 — Plan & Document Discipline](07-plan-and-document-discipline.md)
**Version**: v0.2.0-rc.1

---

## §6.1 Statement

State integrity is non-negotiable across three surfaces: review placeholders, cross-repo commit
ordering, and closure disclosures. A feature ledger row that carries a "pending" placeholder at
commit time is a lie in the audit trail. A consumer repo pushed before its provider CI is green
opens a dependency gap that poisons the audit backbone. A closure that claims "fully done" while
silently deferring work destroys the trust signal that the reviewer's ACCEPT is supposed to provide.
All three failures share the same root cause: the agent (or operator) allowed a state-claim to
diverge from the actual state of the system at the moment the claim was recorded. Adversarial
pairing forecloses all three divergences structurally: placeholder flips require reviewer
`ACCEPT-TO-FLIP` and operator flip authorization, then final HAT 3 `ACCEPT` and operator commit authorization before the
commit; cross-repo ordering MUST follow provider-first; every
closure MUST name residuals explicitly with seq-id and rationale. Violations of any of these rules
are HAT 3 block conditions — not warnings, not advisory findings. Operator authorization may be a
direct GO token or a normalized consumption of valid standing authorization under
[Appendix E](appendices/E-standing-operator-authorization.md); the latter does not require another
conversational prompt.

---

## §6.2 Rationale

The common thread across all three sub-patterns is the gap between claimed state and actual state.
In agentic sessions, this gap is particularly dangerous because the audit trail — ledger rows,
commit messages, closure reports — is often the primary evidence used to diagnose failures,
reconstruct decisions, and plan forward work. A trail that records "R2 inline OK" when the review
had not yet occurred, or that records a provider change as available when CI had not confirmed it,
or that records a seq as "done" when two deferred items were held back silently, is worse than no
audit trail at all: it actively misleads anyone who reads it, including the same agent on the next
HAT cycle.

The corrective is not better vigilance but structural gates. A placeholder that can only flip after
reviewer `ACCEPT-TO-FLIP` and operator flip authorization cannot pre-flip because both pre-conditions
must exist. A consumer commit
that is gated behind provider CI green cannot race the provider because the gate holds it until the
signal arrives. A closure format that requires an explicit residuals field cannot silently omit
deferred work because the field absence is itself a finding. Each gate converts a human-reliability
requirement into a deterministic check — and deterministic checks are what reviewers confirm
rather than what reviewers hope for.

---

## §6.3 Failure modes

- **Pre-flipped placeholder**: implementer flips "R2 inline pending" to "R2 inline OK" before
  reviewer ACCEPT; reviewer's ACCEPT then reviews already-claimed-OK state; the ledger row never
  accurately recorded the pre-ACCEPT condition; audit trail is corrupted from that commit onward.
- **Post-commit flip**: flip happens AFTER the commit is staged or pushed; the pushed commit
  carries "pending" state; a corrective second commit is required; the corrective creates a
  two-commit artifact where one commit's state is inconsistent.
- **Structural R2 state not verified**: the reviewer does not locate the header-defined R2 cell in
  the unique current-seq row; free-text prose can then be mistaken for state and malformed or
  duplicate rows remain undetected.
- **Consumer pushed before provider CI green**: consumer references a provider feature not yet
  confirmed available; CI on consumer repo fails; failure is incorrectly attributed to consumer
  logic before the provider gap is identified.
- **Parallel push race**: both repos pushed simultaneously; CI scheduling determines which lands
  first; dependency direction is lost; failures are non-deterministic and hard to reproduce.
- **Provider CI not awaited**: implementer pushes provider and immediately proceeds to consumer
  without waiting for CI result; provider CI later fails; consumer now references a broken provider
  state.
- **Residuals hidden at closure**: a seq closure claims "done" while one or more deferred items
  are held back without disclosure; next seq inherits undisclosed scope; surprise discovered during
  HAT 1 of the next seq; trust signal from reviewer ACCEPT is retroactively undermined.
- **Residuals listed informally but not committed-to**: deferred items noted in a comment or
  verbal summary rather than in the ledger row; ambiguity about which seq owns the deferred work;
  items may be forgotten across session boundaries.
- **Post-hoc residual discovery during review**: reviewer uncovers an undisclosed deferred item
  at HAT 3; the discovery creates a BLOCK that could have been an explicit disclosure; implementer
  credibility as an honest closure-reporter is damaged.

---

## §6.4 Reference example

In a phased delivery, state integrity is preserved by three rules: (a) review placeholders flip
ONLY after reviewer `ACCEPT-TO-FLIP` and operator flip authorization, before the atomic patch is staged;
final HAT 3 `ACCEPT` and operator commit authorization still precede commit; (b) cross-repo work
commits the provider repo first with CI watch before consumer repo proceeds; (c) every closure
discloses residuals explicitly with seq-id and rationale.

For a concrete instantiation including procedural deviations and recoveries across an 18-seq
delivery, see [`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/).

---

## §6.5 Sub-patterns

### §6.5.1 Pending → OK placeholder integrity

**Statement**

Review state in a feature-ledger row uses a placeholder such as `R2 inline pending`. The reviewer
first inspects the pre-flip working-tree diff plus every authorized untracked file; an empty index
is valid. Provisional `ACCEPT-TO-FLIP` and operator flip authorization then authorize the implementer to
flip the current row to `R2 inline OK`, verify its structural R2 cell, and stage the atomic patch.
The reviewer reruns the six signals on the complete cached patch and may issue final HAT 3
`ACCEPT`; operator commit authorization is the last gate before commit. The pushed commit therefore carries
the corrected state.

**Rationale**

The placeholder exists to represent an honest pre-review state. If it is flipped before reviewer
`ACCEPT-TO-FLIP` and operator flip authorization, the ledger row records a claim that has not been
authorized. If the flip
happens after the commit rather than before it, the pushed commit carries "pending" as its permanent
audit artifact, requiring a corrective commit whose sole purpose is to fix the ledger — a visible
sign of process failure. The structural check closes the loop: read the canonical table header,
locate its `R2 inline` column, require exactly one anchored current-seq row, and verify that cell's
exact state. Free-text mentions in mantras, evidence, residuals, or historical rows are excluded.
The sequence is
therefore: (1) reviewer issues `ACCEPT-TO-FLIP`, (2) operator flip authorization is recorded, (3) implementer
flips and verifies the structural current-row state, (4) implementer stages the atomic patch, (5) reviewer issues final
HAT 3 `ACCEPT`, (6) operator commit authorization is recorded, and (7) implementer commits. Any reordering is a
state-integrity violation.

**Failure modes**:

- Implementer pre-flips before `ACCEPT-TO-FLIP` and operator flip authorization → the ledger records an
  unauthorized state claim and the two-stage review cannot validate the real transition.
- Flip happens AFTER commit → pushed commit carries "pending" state, requiring a corrective second
  commit; the corrective is visible evidence of a state integrity failure in the audit trail.
- Structural current-row state not verified → silent drift between actual state and claimed state;
  a duplicate/malformed row or wrong R2 cell can survive while a free-text grep appears plausible.

**Abstract example**: the current seq owns one canonical feature-ledger row whose R2 cell is
`R2 inline pending`. After reviewer `ACCEPT-TO-FLIP` and operator flip authorization, the implementer
changes only that cell to `R2 inline OK`, confirms the header-defined R2 column and the uniqueness
of the anchored seq row, then stages the patch. Reviewer final HAT 3 `ACCEPT` and operator commit
authorization authorize a commit whose current-seq R2 cell is structurally OK; documentary mentions
and other seq rows do not affect the decision.

---

### §6.5.2 Cross-repo dual-commit ordering (dependent-first)

**Statement**

When a change spans two repos with a dependency direction (provider, consumer), commit the
provider repo FIRST, push, watch CI to green, then proceed with the consumer repo. In the consumer
repo, reviewer `ACCEPT-TO-FLIP` and operator flip authorization authorize the ledger transition and
staging; reviewer final HAT 3 `ACCEPT` and operator commit authorization then authorize commit and push.
This eliminates the window where the consumer references a provider feature not yet available or
not yet verified. See [appendices/D-dual-commit-playbook.md](appendices/D-dual-commit-playbook.md)
for the procedural step list and [README.md](README.md) glossary entry for "cross-repo
dual-commit".

**Rationale**

The dependency direction is a fixed fact of the architecture: the consumer cannot function without
the provider feature it depends on. Pushing the consumer first violates this fact structurally —
for some non-zero window, the consumer's reference exists in the remote while the provider feature
does not, and any CI trigger during that window will fail the consumer for a reason that has nothing
to do with the consumer's own logic. Parallel pushes create a race: whichever repo's CI triggers
first may see the other repo in an inconsistent state. The provider-first rule eliminates both
failure modes by creating a strict ordering that mirrors the architectural dependency. Waiting for
CI green on the provider before opening the consumer's commit window provides the additional
guarantee that the referenced provider state has been mechanically verified, not merely declared.

**Failure modes**:

- Consumer pushed first → CI red on consumer because provider feature is not yet available in the
  remote; failure is incorrectly attributed to consumer logic; debugging begins at the wrong layer.
- Both pushed in parallel → race condition; CI scheduling determines which lands first; dependency
  direction is not reflected in the commit ordering; failures are non-deterministic across runs.
- Provider CI not awaited → consumer references provider state that has not been verified; provider
  CI later fails; consumer is now built on a broken foundation that was not caught before the
  consumer window opened.

**Abstract example**: a plugin allowlist (provider repo) and a runtime emitter (consumer repo)
must both be updated for a new event type. Sequence: (1) implementer commits + pushes provider
allowlist change; (2) implementer watches CI on provider repo — waits for green; (3) reviewer
issues `ACCEPT-TO-FLIP` on the consumer; (4) operator flip authorization is recorded; (5) implementer flips
and stages; (6) reviewer issues final HAT 3 `ACCEPT`; (7) operator commit authorization is recorded; (8)
implementer commits, pushes, and watches consumer CI. Two CI greens, two commits, zero dependency
window.

---

### §6.5.3 Honest residual disclosure

**Statement**

Every closure (HAT 3 row, chunk closure, phase closure) MUST list explicitly any deferred items,
known limitations, or next-seq dependencies. NO closure claims "fully done" if anything is
deferred. Each disclosed residual MUST name: (a) what is deferred, (b) which seq or scope owns
the deferred work, and (c) the rationale for the deferral. See [README.md](README.md) glossary
entry for "honest residual disclosure".

**Rationale**

The reviewer's ACCEPT at HAT 3 is a trust signal: it asserts that the seq is closed honestly. If
the implementer has silently deferred work — failing tests suppressed, scope items held back,
known limitations not recorded — the reviewer's ACCEPT was issued on incomplete evidence. The
damage propagates forward: the next seq inherits undefined scope, the operator's planning is based
on a false "done" state, and the first time the deferred work surfaces (during a later HAT 1
pre-survey or mid-task discovery), it appears as a surprise rather than as a known item. Explicit
residual disclosure converts the surprise into an expectation: the next seq's HAT 1 begins with
a known list of inherited items, the operator's plan accounts for them, and the reviewer can
verify that each disclosed item was either resolved or carried forward with a new disclosure.
Proactive honest closure, even when it means admitting incomplete work, is always preferred over
a clean-looking closure that conceals debt.

**Failure modes**:

- Residuals hidden → next-seq surprises; scope ambiguity; HAT 1 pre-survey discovers items that
  should have been disclosed at the prior closure; the audit trail misrepresents the state of the
  project at that seq boundary.
- Residuals listed informally (verbal, chat message) but not committed to the ledger row → the
  record does not survive session boundaries; ambiguity about which seq owns the deferred work;
  items may be forgotten or duplicated.
- Post-hoc residual discovery during review → reviewer issues BLOCK that could have been a
  disclosure; implementer's credibility as an honest closure-reporter is damaged; the seq must
  be reopened, delaying downstream work.

**Abstract example**: a feature ledger row's tail section names exactly which items are held for
the next seq, with seq-id and rationale. For example: "Deferred to seq A+1: integration test for
edge case X (rationale: requires schema migration landing in seq A+1 before the test can pass).
Deferred to seq A+2: update user-manual wiki page for new option Y (rationale: wiki update
depends on final API shape, confirmed in seq A+1)." The reviewer reads the disclosure at HAT 3
and can confirm that all deferred items have owners — no item is orphaned.

---

## Cross-references

- **Spec index**: [README.md](README.md) — glossary definitions for "R2 inline pending",
  "cross-repo dual-commit", "honest residual disclosure", "ledger row", "seq".
- **Previous cluster**: [05 — Code Discipline](05-code-discipline.md) — code discipline's
  immutable surface lock is a prerequisite for state integrity; a surface that drifts silently
  within a repo cannot be trusted across repos or across review cycles.
- **Next cluster**: [07 — Plan & Document Discipline](07-plan-and-document-discipline.md) —
  plan and document discipline governs scope management and documentation coherence; honest
  residual disclosure (§6.5.3) is the bridge between state integrity and scope planning.
- **Appendix D**: [appendices/D-dual-commit-playbook.md](appendices/D-dual-commit-playbook.md) —
  procedural step list for the cross-repo dual-commit ordering pattern (§6.5.2).
- **Appendix E**: [appendices/E-standing-operator-authorization.md](appendices/E-standing-operator-authorization.md) —
  direct versus standing authorization records and mandatory pause conditions.
- **Reference implementation**: [`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/)
  — concrete examples of placeholder flip ordering, dual-commit sequencing, and residual
  disclosure across an 18-seq delivery.
