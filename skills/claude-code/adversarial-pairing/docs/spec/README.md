# Adversarial Pairing — Spec Index

**Version**: v0.2.0-rc.1
**Date**: 2026-08-02
**Status**: release candidate

---

## Preface

This spec documents the **adversarial-pairing** methodology: a disciplined two-agent workflow for
agentic coding sessions that pairs an implementer agent with a reviewer agent operating in
structured HAT cycles (HAT 1 → HAT 2 → HAT 3) with enforced verification gates, parallel ledger
and wiki updates, and cross-repo state integrity. The intended audience is any team running
agentic two-agent workflows — Claude Code + Codex pairing or equivalent platforms — on projects
that demand reproducible delivery quality.

The problem this methodology solves is the silent accumulation of workflow debt in agentic
sessions: skipped pre-surveys, pre-flipped pending placeholders, batched ledger entries, bundle
creep across patch boundaries, and wiki state that drifts from reality. Each failure mode is
well-understood; the gap is a structured, enforceable framework that names them, provides
detection patterns, and binds closure gates so they cannot be bypassed under time pressure.

The promise: any project that adopts adversarial pairing gains a reusable harness — spec +
skills + plugin — that encodes the discipline structurally. The implementer agent knows what to
produce at each HAT boundary. The reviewer agent knows what to attack. Hooks and slash commands
support either direct operator gates or one bounded standing authorization, while preserving the
same independent review and evidence requirements.

---

## Inspiration & extensions

This methodology is directly inspired by Andrej Karpathy's wiki gist
(<https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>), which proposes maintaining
a structured knowledge base alongside a codebase so that agents can build persistent understanding
across sessions. Adversarial pairing extends that foundation with a three-roles schema
(`tool-catalog`, `user-manual`, `reference-doc`) that allows dual-query: folder-based retrieval
for how-to operative pages and role-based semantic filtering for architectural reference, making
the wiki useful to both agents and human maintainers.

The historical, non-normative reference example is the vibe-science +
vibe-research-environment Phase 9 Wave 5 execution (seq 113-130), where 18 seq landed across two
repos with 5 redirect-class events caught without false positives. It motivated several named
patterns, but its old single-stage ACCEPT wording is superseded by the current two-stage HAT 3
contract. See the migration note in the case-study README before using its evidence.

---

## Reference implementation

Concrete examples for all clusters live in:

```
../case-studies/phase-9-wave-5/
```

Each cluster file links bidirectionally to the relevant case-study sub-directory. Case-study files
use the same de-branded abstract framing as the cluster files, with project-specific callouts
clearly marked.

---

## Table of contents

- [Installation, requirements, scopes, and migration](../installation.md)

### Cluster files

1. [Roles & Cycles](01-roles-and-cycles.md)
2. [Verification Discipline](02-verification-discipline.md)
3. [Ledger Discipline](03-ledger-discipline.md)
4. [Wiki Discipline](04-wiki-discipline.md)
5. [Code Discipline](05-code-discipline.md)
6. [State Integrity](06-state-integrity.md)
7. [Plan & Document Discipline](07-plan-and-document-discipline.md)

### Appendices

- [A — Day 1 Bootstrap Checklist](appendices/A-day-1-bootstrap-checklist.md)
- [B — Six Closure Signals](appendices/B-six-closure-signals.md)
- [C — Pre-survey Grep Patterns](appendices/C-pre-survey-grep-patterns.md)
- [D — Dual-commit Playbook](appendices/D-dual-commit-playbook.md)
- [E — Standing Operator Authorization](appendices/E-standing-operator-authorization.md)

---

## Glossary

- **implementer agent**: The agent role responsible for executing HAT 2 (GREEN/TDD) and producing
  HAT 3 closure artifacts. Declares its role explicitly at session start. Operates under reviewer
  challenge at every HAT boundary and must not self-certify closure.

- **reviewer agent**: The agent role responsible for adversarial challenge at HAT 1 (design
  review), HAT 3 (closure verification), and any mid-patch redirect. At HAT 3 the reviewer first
  reviews the working-tree diff plus the authorized untracked-file inventory; an empty index is
  valid at this pre-flip stage. The reviewer may issue provisional `ACCEPT-TO-FLIP`; after direct
  or standing flip authorization, the R2 transition, and complete staging, the reviewer inspects the cached patch and
  may issue final HAT 3 `ACCEPT`. A direct `GO-COMMIT` or recorded consumption of valid standing
  authorization authorizes commit.
  The reviewer does not write code.

- **HAT 1**: STOP report — pre-flight verification + pre-survey + design choice + RED test plan.
  Then reviewer adversarial review (ACCEPT or REDIRECT). Reviewer ACCEPT plus direct GO or valid
  standing-authorization consumption is required before any code touch.

- **HAT 2**: GREEN — RED-first TDD execution. Returns target tests passing.

- **HAT 3**: Closure — full verification (test suite, validate, lint, sync), feature ledger row
  appended, save targets coherent. Two-stage gate: reviewer inspects the pre-flip working-tree and
  untracked inventory → `ACCEPT-TO-FLIP` → direct or standing flip authorization → implementer flips the current
  R2 cell and stages the atomic patch → reviewer inspects the cached patch and issues final HAT 3
  `ACCEPT` → direct or standing commit authorization.

- **standing operator authorization**: An explicit, attributable, bounded operator grant that
  replaces repeated conversational GO prompts for named transitions and external effects. Each
  consumption is recorded separately. It never replaces the distinct reviewer, expands scope, or
  implies merge/tag/release, destructive actions, credentials, or force-push. See Appendix E.

- **seq**: A numbered sequence unit within a Wave/Phase delivery. Each seq maps to one atomic
  patch with its own HAT cycle, ledger row, and wiki sync. The seq trail (e.g., seq 113-130 in
  Phase 9 Wave 5) provides the audit backbone for the entire Wave.

- **ledger row**: A single append-only entry in the feature ledger representing one seq/patch.
  Contains: seq number, title, status (PUSHED/LOCAL), mantras VERBATIM, and a body section
  with R2 inline state. Ledger rows are written per-patch, never batched.

- **save target**: A file that must contain mantras VERBATIM after every patch. Declared in the
  project's CLAUDE.md or equivalent. Save targets form the coherence surface that the
  ledger-mantra-check hook validates at HAT 3 closure.

- **PUSHED save target**: A save target classified as remote-bound (intended to be pushed to
  remote upon direct or standing operator authorization). NOT a temporal state. Actual push is verified separately by post-push
  CI watch + remote-aligned check.

- **LOCAL save target**: A save target classified as local-only (never pushed to remote). Examples:
  blueprints/private/, transcripts, ephemeral notes.

- **mantras VERBATIM**: The exact phrases that MUST be preserved character-by-character across N
  save targets per patch. Project-specific mantras declared in the project's CLAUDE.md or
  equivalent.

- **wiki sync**: The parallel update to the wiki that accompanies every code-touching patch.
  Follows the Tier A/B/C model. Tier A registries auto-regenerate only after a real project scanner
  is configured; bundled registry stubs are schema scaffolds, not coverage. Tier B entity pages are
  created/updated from source, and Tier C cognitive pages are written or explicitly marked noop.
  Wiki sync is a HAT 3 closure gate.

- **Day 1 bootstrap**: First-time setup procedure for a new project. Creates wiki structure +
  ledger files + tools. The tool stops BEFORE git commit; a later reviewed commit requires direct
  authorization or standing authorization that explicitly names the bootstrap commit. Following the bootstrap, the first regular task transitions the repo from bootstrap
  mode to steady-state mode by configuring remote + first CI run.

- **Tier A/B/C update model**: A three-tier classification of wiki update types. Tier A
  (mechanical): registries generated by an explicitly configured real project scanner and never
  hand-edited; bundled registry stubs are provisional and do not satisfy Tier-A coverage. Tier B
  (semi-automatic): entity/schema/hook pages created from template by the agent. Tier C
  (cognitive): concept/synthesis/hypothesis pages written on architectural insight, or explicitly
  logged as noop with rationale.

- **ground-truth-driven split**: A Code Discipline sub-pattern that mandates patch boundaries be
  determined by the actual codebase structure (imports, test coverage, schema ownership) rather
  than by feature grouping or time convenience. Prevents bundle creep at the root level.

- **anti-bundle-creep**: The enforcement discipline that keeps each patch to a single coherent
  change surface. A patch that touches more than one logical boundary requires explicit
  reviewer sign-off and a split rationale in the ledger row. Named after the failure mode
  observed when multiple unrelated changes accumulate in a single commit.

- **immutable surface lock**: A Code Discipline sub-pattern that treats declared public API
  surfaces, exported symbol lists, and schema contracts as locked during a patch unless the
  patch's stated intent is an interface change. Mutation of an immutable surface without
  explicit reviewer ACCEPT is a HAT 3 block condition.

- **helper-aware pre-survey**: A Verification Discipline sub-pattern that extends the standard
  pre-survey grep to include helper utilities, shared modules, and indirect callers — not only
  the direct call sites of the changed function. Emerged from seq 127 where a helper-mediated
  dependency was missed by a surface-level grep.

- **R2 inline pending**: Placeholder text in a feature-ledger row. It remains until provisional
  reviewer `ACCEPT-TO-FLIP` and direct or standing flip authorization; the implementer then flips it to
  `R2 inline OK`, verifies the exact current-seq R2 table cell, and stages the change. Documentary
  prose and other seq rows are excluded from this structural check. Reviewer final HAT 3 `ACCEPT`
  and direct or standing commit authorization are still required before commit.

- **pre-flight CI verification**: Pre-task checks before HAT 1. Two modes: Bootstrap mode (Day 1,
  no remote/CI yet) skips remote/CI checks; Steady-state mode (post-bootstrap) enforces remote
  HEAD aligned + last CI green + working tree expected + immutable surfaces clean.

- **post-push CI watch**: A Cluster 1 sub-pattern requiring the implementer to monitor CI outcome
  after every push, not just at commit time. CI failures discovered post-push must be triaged
  before the next HAT cycle begins. Skipping post-push watch is a recognized failure mode.

- **cross-repo dual-commit**: When a change spans a provider and consumer, complete each
  repository's two-stage closure independently: reviewer `ACCEPT-TO-FLIP` → direct or standing
  flip authorization → flip/stage → reviewer final HAT 3 `ACCEPT` → direct or standing commit authorization. Commit and
  push the provider first, wait for provider CI green, then repeat the gate for the consumer.

- **honest residual disclosure**: A State Integrity sub-pattern requiring that any known
  limitation, bypass surface, or deferred work be stated explicitly in the ledger row or
  patch description at the time of closure. Post-hoc discovery of undisclosed residuals is a
  spec violation; proactive disclosure is always preferred over silent omission.
