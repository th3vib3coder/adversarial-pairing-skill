---
name: adversarial-pairing
description: Use when starting a coding session under phased delivery (Wave/Phase/HAT cycles), when receiving an HAT 3 closure report for review, when performing cross-repo dual-commit, or when bootstrapping a new project that requires wiki + ledger discipline. Trigger terms include "HAT 1", "HAT 2", "HAT 3", "adversarial review", "dual-commit", "ledger row", "save targets", "wiki sync", "Day 1 bootstrap".
---

# Adversarial Pairing Methodology

## Overview

Adversarial pairing is a two-agent delivery discipline that eliminates self-certification — the
structural failure mode in which a single agent both writes code and declares its own work
correct. Every session requires two distinct agent instances: an **implementer** that authors
changes and an **adversarial reviewer** that challenges, accepts, or blocks them. These roles
are non-fungible for the duration of the session; neither agent may cross into the other's
territory.

Work proceeds through three mandatory HAT gate points (HAT 1, HAT 2, HAT 3). HAT 1 is the
planning gate: the implementer issues a STOP report covering pre-survey evidence, a RED test
plan, and proposed change scope; the reviewer issues ACCEPT or REDIRECT; the operator issues
GO. HAT 2 is the implementation gate: code and tests are complete, CI is green, and the
implementer summarizes the delta. HAT 3 is the closure gate: the reviewer performs a final
adversarial pass against the six closure signals, issues a formal ACCEPT, and the operator
confirms. No seq is closed until HAT 3 ACCEPT is on record, the ledger row is finalized, and
CI is green on the pushed commit.

In parallel with the HAT cycle, every seq drives two persistent artifacts: the **ledger** (a
per-row audit trail of completed work with confounder fields and tier-C reflection) and the
**wiki** (cluster registries, role registries, and cross-repo dependency tables). The
`/lint-wiki` check and `build-registries --check` must both pass before HAT 3 closure. For
patches that span two repos, the cross-repo dual-commit protocol applies: provider first,
consumer second, with the pending→OK ledger flip done before the consumer commit lands.

This skill is configured for the **Codex platform** (`~/.codex/skills/adversarial-pairing/SKILL.md`).
Plugin slash commands are not available on Codex; all gate procedures are executed via manual
templates (spec appendices A-D) and the `tools/bootstrap.sh` shell script.

## When to use

- Starting a new feature or seq under phased (Wave/Phase/HAT) delivery
- Reviewing an HAT 3 closure report received from an implementer agent
- Performing cross-repo dual-commit operations (provider + consumer repos)
- Bootstrapping a new project on Day 1 (wiki scaffold, ledger init, role declaration)

## Role declaration (mandatory at session start)

Every session MUST open with an explicit role declaration before any code is touched.

**Implementer role** — authors all code changes, pre-survey evidence, RED test plans, and
STOP reports. Never issues its own ACCEPT token. Triggers HAT boundaries; waits for reviewer
ACCEPT and operator GO before proceeding.

**Reviewer role** — distinct agent instance. Challenges STOP reports, inspects diffs,
verifies the six closure signals, and issues ACCEPT or REDIRECT/BLOCK decisions. Never
authors code. Holds the sole authority to issue HAT 3 ACCEPT.

**Operator role (gate-keeper)** — human or orchestrator. Authorizes GO at HAT 1 and HAT 3.
Formal GO must appear in the ledger; an informal chat message does not constitute a gate
record. The operator may also issue REDIRECT to send a cycle back to HAT 1 or HAT 2.

## The 7-cluster discipline

The methodology is organized into seven clusters, each with its own spec file. Load the
relevant cluster before work in that domain begins.

| # | Cluster | One-liner |
|---|---------|-----------|
| 1 | Roles & Cycles (`docs/spec/01-roles-and-cycles.md`) | Role declaration, HAT gate lifecycle, pre-flight CI verification |
| 2 | Verification Discipline (`docs/spec/02-verification-discipline.md`) | RED→GREEN test protocol, call-site enumeration, pre-survey requirements |
| 3 | Ledger Discipline (`docs/spec/03-ledger-discipline.md`) | Per-seq row format, confounder fields, tier-C reflection, flip timing |
| 4 | Wiki Discipline (`docs/spec/04-wiki-discipline.md`) | Registry sync, lint-wiki, build-registries, tier-C page protocol |
| 5 | Code Discipline (`docs/spec/05-code-discipline.md`) | Immutable surface rules, bundle-creep prevention, rollback hygiene |
| 6 | State Integrity (`docs/spec/06-state-integrity.md`) | Pending→OK flip ordering, inline ACCEPT placement, audit trail |
| 7 | Plan & Document Discipline (`docs/spec/07-plan-and-document-discipline.md`) | Seq scoping, plan format, document-update sequencing |

## Quick reference (inline)

### Six closure signals checklist

All six must be green before HAT 3 ACCEPT is issued. Work through them in order.

| # | Signal | Pass condition |
|---|--------|----------------|
| 1 | Tests pass | `pytest --tb=short` exits 0; no FAILED |
| 2 | R2 inline OK | `git diff HEAD~1 HEAD \| grep ACCEPT` ≥ 1; no HOLD remaining |
| 3 | Confounder N/A or harness OK | `confounder: N/A` in ledger row, or harness exits 0 |
| 4 | `/lint-wiki` issueCount = 0 | `python scripts/lint_wiki.py` reports issueCount: 0 |
| 5 | `build-registries --check` exit 0 | `python scripts/build_registries.py --check` exits 0 |
| 6 | Tier-C reflection logged | `grep -E "tier-C: (yes\|noop)" docs/ledger/current.md` ≥ 1 |

Full run-card: `docs/spec/appendices/B-six-closure-signals.md` in the source repo (`th3vib3coder/adversarial-pairing`).

---

### Pre-flight CI verification

Run at the start of HAT 1, before any code changes.

**Bootstrap mode** (new project, no CI history):

```bash
# Confirm test runner is wired and exits cleanly on an empty suite
pytest --collect-only   # must list collected items without error
pytest --tb=short       # baseline must be 0 FAILED
```

**Steady-state mode** (existing repo):

```bash
pytest --tb=short       # must exit 0 — red baseline blocks HAT 2 entry
git status              # working tree must be clean before HAT 1 STOP
```

A red baseline at pre-flight means existing failures are present; the implementer must
surface them in the STOP report and get operator GO before proceeding.

---

### HAT 1 lifecycle

Three required stages — each stage has a named artifact:

1. **STOP** — implementer issues STOP report: pre-survey evidence (grep classes 1-5),
   proposed change scope, RED test plan, and confounder hypothesis. No code written yet.
2. **Reviewer ACCEPT / REDIRECT** — reviewer challenges the STOP for completeness and
   soundness. REDIRECT sends the implementer back to widen the survey or narrow scope.
   ACCEPT unlocks stage 3.
3. **Operator GO** — operator reviews the ACCEPT and authorizes HAT 2 entry. GO is logged
   in the ledger. Without a recorded GO, HAT 2 work is unauthorized.

---

### Cross-repo dual-commit order

**Provider FIRST. Consumer SECOND.**

```
1. Complete HAT 3 on the provider repo (all 6 closure signals green).
2. Flip ledger row: pending → OK in the provider ledger BEFORE the provider commit.
3. Push provider. Wait for provider CI green.
4. Begin consumer HAT 1. Reference the provider commit SHA in the STOP report.
5. Complete HAT 3 on the consumer repo.
6. Flip consumer ledger row: pending → OK BEFORE the consumer commit.
7. Push consumer. Watch consumer CI.
```

The pending→OK flip MUST precede the commit in both repos. Committing with a pending row
is a state integrity violation (Cluster 6). Full playbook:
`docs/spec/appendices/D-dual-commit-playbook.md` in the source repo (`th3vib3coder/adversarial-pairing`).

---

### Helper-aware pre-survey grep classes

Run all five classes before any HAT 1 STOP asserting "no duplicate logic" or "complete
caller enumeration." Union the hits; classify each before writing the evidence block.

| # | Class | What it catches |
|---|-------|-----------------|
| 1 | Direct importers | `from .*<module>` / `require.*<module>` — literal import paths |
| 2 | Bracket dispatch | `<obj>[...]()` — dynamic method routing invisible to import search |
| 3 | Helper conventions | `safe*`, `withFallback`, `tryRead*` — thin wrappers that absorb errors |
| 4 | Instanceof checks | `instanceof <ErrorClass>` — guard clauses on specific error types |
| 5 | Catch/swallow patterns | `} catch (.*) {` with `-A 3` — silent catch bodies |

Full pattern library and decision tree:
`docs/spec/appendices/C-pre-survey-grep-patterns.md` in the source repo (`th3vib3coder/adversarial-pairing`).

## Anti-patterns (red flags)

The following patterns indicate a discipline violation. Stop and remediate before proceeding.

- **Pre-flipping pending → OK before reviewer ACCEPT** — the ledger row must not be marked
  OK until the reviewer has issued HAT 3 ACCEPT. Premature flip breaks the audit trail
  (Cluster 6, State Integrity).

- **Per-day batched ledger rows** — each seq gets exactly one ledger row, written at HAT 3
  closure. Batching multiple seqs into one row, or writing rows daily instead of per-seq,
  makes the audit trail unverifiable (Cluster 3).

- **Touching declared immutable surfaces** — surfaces marked immutable in the plan (e.g.,
  published API contracts, frozen schema fields) must not be modified within the seq without
  a formal scope-change request at HAT 1 REDIRECT (Cluster 5).

- **Bundle-creep** — bundling multiple intent units (features, bug fixes, refactors) into a
  single seq. Each seq must carry a single, coherent intent. Bundle-creep makes reviewer
  challenge structurally impossible (Cluster 7).

- **Pre-survey gap** — a STOP report that relies on importer-only (Class 1) or
  literal-only grep evidence, missing bracket-dispatch (Class 2) and helper-wrapped
  consumers (Classes 3-5). Incomplete surveys generate false "no other callers" claims
  (Cluster 2).

- **Bootstrap auto-commit** — on Day 1 bootstrap, the implementer must not auto-commit the
  scaffold before the reviewer has inspected it. The bootstrap commit is the first HAT 3
  gate, not a pre-gate shortcut (Appendix A).

## Tooling (Codex-specific)

Plugin enforcement is **NOT available on Codex**. Codex has no equivalent of Claude Code
hooks or slash commands. All gate procedures must be executed manually using the spec
appendices as operational templates.

### Manual procedure templates

| Appendix | Purpose | Replaces |
|----------|---------|---------|
| Appendix A (`docs/spec/appendices/A-day-1-bootstrap-checklist.md`) | Day 1 bootstrap checklist | `/init-pairing` slash command |
| Appendix B (`docs/spec/appendices/B-six-closure-signals.md`) | Six closure signals run-card | `/adversarial-review` slash command |
| Appendix C (`docs/spec/appendices/C-pre-survey-grep-patterns.md`) | Pre-survey grep pattern library | `/hat-1-stop` pre-survey slot |
| Appendix D (`docs/spec/appendices/D-dual-commit-playbook.md`) | Dual-commit playbook | `/dual-commit` slash command |

### Day 1 bootstrap

On Codex, use `tools/bootstrap.sh` in place of the `/init-pairing` slash command:

```bash
# From the adversarial-pairing repo root:
tools/bootstrap.sh <target-project-root>
```

The script scaffolds the wiki structure, initializes the ledger file, and writes role
declaration stubs into the target project. It stops before committing — the operator must
review the scaffold and issue GO before the bootstrap commit is created. Do not skip the
operator GO; an uncommitted scaffold is not a closed HAT 3.

See `tools/bootstrap.sh --help` for flag reference and Appendix A
(`docs/spec/appendices/A-day-1-bootstrap-checklist.md` in the source repo)
for the full checklist that the script operationalizes.

### Tool calls on Codex

Codex sessions use standard shell tooling in place of Claude Code's named tools.

| Action | Codex equivalent |
|--------|-----------------|
| Search codebase | `grep -r` / shell search |
| Read file | shell `cat` / read |
| Edit file | shell `sed` / text editor |
| Run scripts | shell execution |

## Reference

Paths below are relative to the source repo root; resolve them in the `th3vib3coder/adversarial-pairing` repository.

| Resource | Path |
|----------|------|
| Full spec (all 7 clusters) | `docs/spec/` |
| Appendix A — Day 1 bootstrap checklist | `docs/spec/appendices/A-day-1-bootstrap-checklist.md` |
| Appendix B — Six closure signals | `docs/spec/appendices/B-six-closure-signals.md` |
| Appendix C — Pre-survey grep patterns | `docs/spec/appendices/C-pre-survey-grep-patterns.md` |
| Appendix D — Dual-commit playbook | `docs/spec/appendices/D-dual-commit-playbook.md` |
| Case study (Phase 9, Wave 5) | `docs/case-studies/phase-9-wave-5/` |
| Bootstrap script | `tools/bootstrap.sh` |
