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
plan, and proposed change scope; the reviewer issues ACCEPT or REDIRECT; the operator authorizes
the transition directly or through a valid standing authorization. HAT 2 is the implementation gate: code and tests are complete, CI is green, and the
implementer summarizes the delta. HAT 3 has two distinct review surfaces: the reviewer first
inspects the pre-flip working-tree diff plus every authorized untracked file (an empty index is
valid) and may issue `ACCEPT-TO-FLIP`; after direct or standing flip authorization, the R2-cell transition, and
complete staging, the reviewer inspects the cached patch and may issue final ACCEPT. No seq is
closed until direct or standing commit authorization, final HAT 3 ACCEPT, and green CI on the pushed commit.

In parallel with the HAT cycle, every seq drives two persistent artifacts: the **ledger** (a
per-row audit trail of completed work with confounder fields and tier-C reflection) and the
**wiki** (cluster registries, role registries, and cross-repo dependency tables). The wiki
frontmatter check must pass before HAT 3 closure. Registry coverage must come from a real
project scanner; where none exists, the current seq must record reviewer-approved N/A rather
than treating the bundled placeholder `--check` as coverage evidence. For patches that span two
repos, the cross-repo dual-commit protocol applies: provider first,
consumer second, with the pending→OK ledger flip done before the consumer commit lands.

This skill is configured for the **Codex platform** (`~/.codex/skills/adversarial-pairing/SKILL.md`).
Plugin slash commands are not available on Codex; all gate procedures are executed via manual
templates (spec appendices A-E) and the `tools/bootstrap.sh` shell script.

## When to use

- Starting a new feature or seq under phased (Wave/Phase/HAT) delivery
- Reviewing an HAT 3 closure report received from an implementer agent
- Performing cross-repo dual-commit operations (provider + consumer repos)
- Bootstrapping a new project on Day 1 (wiki scaffold, ledger init, role declaration)

## Role declaration (mandatory at session start)

Every session MUST open with an explicit role declaration before any code is touched.

**Implementer role** — authors all code changes, pre-survey evidence, RED test plans, and
STOP reports. Never issues its own ACCEPT token. Triggers HAT boundaries; waits for reviewer
ACCEPT and valid operator authorization before proceeding.

**Reviewer role** — distinct agent instance. Challenges STOP reports, inspects diffs,
verifies the six closure signals, and issues ACCEPT or REDIRECT/BLOCK decisions. Never
authors code. Holds the sole authority to issue HAT 3 ACCEPT.

**Operator role (gate-keeper)** — human or orchestrator. Uses direct GO tokens or grants one
explicit, bounded standing authorization. Every direct decision or standing-authorization
consumption must appear in the status ledger. Standing authorization removes repeated prompts,
not the distinct reviewer or objective gates. The operator may revoke it or issue REDIRECT.

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
| 1 | Tests pass | Project-native targeted RED-to-GREEN evidence plus full-suite exit 0 |
| 2 | R2 inline OK | Header-defined R2 cell in the one staged current-seq row is exactly `R2 inline OK` |
| 3 | Confounder N/A or harness OK | Current-seq N/A rationale approved, or project harness exits 0 |
| 4 | Wiki frontmatter lint | Trusted bundled linter exits 0 with `issueCount: 0` |
| 5 | Registry consistency | Real scanner exits 0, or reviewer-approved current-seq N/A; bundled stub is insufficient |
| 6 | Tier-C reflection logged | Current-seq `yes, p.<N>` or reasoned `noop` is present |

Full run-card: `docs/spec/appendices/B-six-closure-signals.md`, bundled with this skill.

---

### Pre-flight CI verification

Run at the start of HAT 1, before any code changes.

First discover the repository's canonical test commands from its package manifest, build
files, contributor documentation, or CI workflow. Record the exact commands in the STOP
report; never substitute a language-specific runner merely because it is available.

**Bootstrap mode** (new project, no CI history): run the project-native discovery or
collection command when the runner supports one, then run the project-native baseline/full
suite. Both commands must exit cleanly; an empty suite is acceptable only when the project is
intentionally new and that fact is recorded.

**Steady-state mode** (existing repo): run the same project-native full-suite command used by
the repository's CI, then run `git status`. A red baseline blocks HAT 2 entry, and the working
tree state must be disclosed before HAT 1 STOP.

A red baseline at pre-flight means existing failures are present; the implementer must
surface them in the STOP report. Proceed only after direct operator approval or when the
attributable repair is expressly inside a valid standing authorization.

---

### HAT 1 lifecycle

Three required stages — each stage has a named artifact:

1. **STOP** — implementer issues STOP report: pre-survey evidence (grep classes 1-5),
   proposed change scope, RED test plan, and confounder hypothesis. No code written yet.
2. **Reviewer ACCEPT / REDIRECT** — reviewer challenges the STOP for completeness and
   soundness. REDIRECT sends the implementer back to widen the survey or narrow scope.
   ACCEPT unlocks stage 3.
3. **Operator authorization** — use a direct GO or record consumption of a valid standing
   authorization. Without one of those records, HAT 2 work is unauthorized.

### Standing operator authorization

Use this mode only after an explicit operator grant names the objective, repository/branch,
seq range, allowed transitions and external effects, expiry, and exclusions. Record the source
once and each gate consumption separately. While it remains in scope, continue after reviewer
ACCEPT without asking the operator to repeat `GO`, `GO-TO-FLIP`, or `GO-COMMIT`.

Standing authorization never replaces reviewer decisions, RED/GREEN evidence, final cached-patch
review, or CI watch. It does not imply merge/tag/release, destructive actions, force-push,
credentials, or scope expansion. Pause on ambiguity, expiry, revocation, reviewer BLOCK, or any
out-of-scope recovery. Full contract: `docs/spec/appendices/E-standing-operator-authorization.md`.

---

### Cross-repo dual-commit order

**Provider FIRST. Consumer SECOND.**

```
1. Reviewer inspects the pre-flip working tree plus authorized untracked files and records `ACCEPT-TO-FLIP`.
2. Record direct or standing flip authorization; implementer flips the current R2 cell and stages the atomic patch.
3. Reviewer verifies the cached patch and six signals; record direct or standing commit authorization for provider.
4. Commit, push, and wait for provider CI GREEN.
5. Complete the consumer's own HAT cycle using provider SHA/CI as evidence.
6. Repeat working-tree review, ACCEPT-TO-FLIP, flip authorization, flip/stage, cached review, and commit authorization.
7. Commit and push consumer; watch consumer CI GREEN.
```

The pending→OK flip MUST precede the commit in both repos. Committing with a pending row
is a state integrity violation (Cluster 6). Full playbook:
`docs/spec/appendices/D-dual-commit-playbook.md`, bundled with this skill.

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
`docs/spec/appendices/C-pre-survey-grep-patterns.md`, bundled with this skill.

## Anti-patterns (red flags)

The following patterns indicate a discipline violation. Stop and remediate before proceeding.

- **Pre-flipping pending → OK before provisional approval** — the ledger row must not be marked
  OK until reviewer `ACCEPT-TO-FLIP` and direct or standing flip authorization are recorded. Reviewer final HAT 3
  `ACCEPT` and direct or standing commit authorization remain mandatory after staging. Premature flip breaks the audit trail
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
| Appendix A (`docs/spec/appendices/A-day-1-bootstrap-checklist.md`) | Day 1 bootstrap checklist | `/adversarial-pairing:init-pairing` plugin command |
| Appendix B (`docs/spec/appendices/B-six-closure-signals.md`) | Six closure signals run-card | `/adversarial-pairing:adversarial-review` plugin command |
| Appendix C (`docs/spec/appendices/C-pre-survey-grep-patterns.md`) | Pre-survey grep pattern library | `/adversarial-pairing:hat-1-stop` plugin command |
| Appendix D (`docs/spec/appendices/D-dual-commit-playbook.md`) | Dual-commit playbook | `/adversarial-pairing:dual-commit` plugin command |
| Appendix E (`docs/spec/appendices/E-standing-operator-authorization.md`) | Standing operator authorization | Repeated conversational GO prompts |

### Day 1 bootstrap

On Codex, use `tools/bootstrap.sh` in place of the
`/adversarial-pairing:init-pairing` Claude Code plugin command:

```bash
# From this skill directory on Linux, macOS, WSL, or Git Bash:
bash tools/bootstrap.sh <target-project-root>
```

The script creates only missing wiki and ledger scaffold files. It writes methodology
instructions only when the target has no existing `CLAUDE.md`; otherwise it prints a manual-merge
block and preserves the file. The tool stops before committing. After independent review, the
bootstrap commit requires direct GO or valid standing authorization that explicitly names that
repository and effect; an uncommitted scaffold is not a closed HAT 3.

On Windows, locate Git Bash explicitly when `bash` is not on `PATH` (normally
`C:\Program Files\Git\bin\bash.exe`) and pass POSIX drive paths such as
`/d/Work/Repo`, keeping paths with spaces quoted. Do not treat `spawn bash ENOENT`
as a test failure in the script itself and do not replace it with inline writes. See Appendix A
(`docs/spec/appendices/A-day-1-bootstrap-checklist.md`) for the full checklist.

The packaged bootstrap is deliberately no-clobber: existing wiki pages, tools, registries,
ledgers, and project instructions are preserved. Its bundled registry builder creates disclosed
provisional stubs (`status: supposition`, `scanner-mode: stub`) only; a successful stub `--check`
proves deterministic scaffold content, not codebase coverage, and cannot satisfy closure signal 5
without a real scanner or reviewer-approved N/A.

### Tool calls on Codex

Codex sessions use standard shell tooling in place of Claude Code's named tools.

| Action | Codex equivalent |
|--------|-----------------|
| Search codebase | `rg` / `rg --files` (fallback to the platform shell if unavailable) |
| Read file | platform-native read command or connected resource reader |
| Edit file | `apply_patch` for targeted edits |
| Run scripts | shell execution |

## Reference

Paths below are relative to this self-contained skill directory.

Installation, prerequisites, and migration: `docs/installation.md`.

| Resource | Path |
|----------|------|
| Full spec (all 7 clusters) | `docs/spec/` |
| Appendix A — Day 1 bootstrap checklist | `docs/spec/appendices/A-day-1-bootstrap-checklist.md` |
| Appendix B — Six closure signals | `docs/spec/appendices/B-six-closure-signals.md` |
| Appendix C — Pre-survey grep patterns | `docs/spec/appendices/C-pre-survey-grep-patterns.md` |
| Appendix D — Dual-commit playbook | `docs/spec/appendices/D-dual-commit-playbook.md` |
| Appendix E — Standing operator authorization | `docs/spec/appendices/E-standing-operator-authorization.md` |
| Case study (Phase 9, Wave 5) | `docs/case-studies/phase-9-wave-5/` |
| Bootstrap script | `tools/bootstrap.sh` |
