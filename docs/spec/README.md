# Adversarial Pairing — Spec Index

**Version**: v0.1.0
**Date**: 2026-05-01
**Status**: draft

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
reduce the human operator's cognitive load to GO/ACCEPT decisions at well-defined checkpoints.

---

## Inspiration & extensions

This methodology is directly inspired by Andrej Karpathy's wiki gist
(<https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>), which proposes maintaining
a structured knowledge base alongside a codebase so that agents can build persistent understanding
across sessions. Adversarial pairing extends that foundation with a three-roles schema
(`tool-catalog`, `user-manual`, `reference-doc`) that allows dual-query: folder-based retrieval
for how-to operative pages and role-based semantic filtering for architectural reference, making
the wiki useful to both agents and human maintainers.

The reference implementation is the vibe-science + vibe-research-environment Phase 9 Wave 5
execution (seq 113-130), where 18 seq landed across two repos with 5 redirect-class events caught
without false positives. That run surface the sub-patterns that appear here as named, rationale-backed
entities rather than implicit conventions — particularly helper-aware pre-survey (seq 127) and the
pending→OK flip guard (seq 129).

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

---

## Glossary

- **implementer agent**: The agent role responsible for executing HAT 2 (GREEN/TDD) and producing
  HAT 3 closure artifacts. Declares its role explicitly at session start. Operates under reviewer
  challenge at every HAT boundary and must not self-certify closure.

- **reviewer agent**: The agent role responsible for adversarial challenge at HAT 1 (design
  review), HAT 3 (closure verification), and any mid-patch redirect. Issues ACCEPT or BLOCK
  decisions; does not write code. Reviewer ACCEPT is the only gate that authorizes ledger row
  finalization and commit.

- **HAT 1**: STOP report — pre-flight verification + pre-survey + design choice + RED test plan.
  Then reviewer adversarial review (ACCEPT or REDIRECT). Reviewer ACCEPT triggers operator GO
  before any code touch.

- **HAT 2**: GREEN — RED-first TDD execution. Returns target tests passing.

- **HAT 3**: Closure — full verification (test suite, validate, lint, sync), feature ledger row
  appended, save targets coherent. Awaiting reviewer ACCEPT before commit.

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
  remote upon operator GO). NOT a temporal state. Actual push is verified separately by post-push
  CI watch + remote-aligned check.

- **LOCAL save target**: A save target classified as local-only (never pushed to remote). Examples:
  blueprints/private/, transcripts, ephemeral notes.

- **mantras VERBATIM**: The exact phrases that MUST be preserved character-by-character across N
  save targets per patch. Project-specific mantras declared in the project's CLAUDE.md or
  equivalent.

- **wiki sync**: The parallel update to the wiki that accompanies every code-touching patch.
  Follows the Tier A/B/C model: Tier A registries auto-regenerate, Tier B entity pages are
  created/updated from source, Tier C cognitive pages are written or explicitly marked noop.
  Wiki sync is a HAT 3 closure gate.

- **Day 1 bootstrap**: First-time setup procedure for a new project. Creates wiki structure +
  ledger files + tools. Stops BEFORE git commit; outputs "ready, operator GO required for first
  commit". Following the bootstrap, the first regular task transitions the repo from bootstrap
  mode to steady-state mode by configuring remote + first CI run.

- **Tier A/B/C update model**: A three-tier classification of wiki update types. Tier A (mechanical):
  auto-regenerated registries, never hand-edited. Tier B (semi-automatic): entity/schema/hook
  pages created from template by the agent. Tier C (cognitive): concept/synthesis/hypothesis
  pages written on architectural insight, or explicitly logged as noop with rationale.

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

- **R2 inline pending**: Placeholder text in feature ledger row body. Pre-ACCEPT state. Reviewer
  ACCEPT triggers operator GO that flips to "R2 inline OK". Cardinality check (count must equal
  expected pending rows) is the integrity guard.

- **pre-flight CI verification**: Pre-task checks before HAT 1. Two modes: Bootstrap mode (Day 1,
  no remote/CI yet) skips remote/CI checks; Steady-state mode (post-bootstrap) enforces remote
  HEAD aligned + last CI green + working tree expected + immutable surfaces clean.

- **post-push CI watch**: A Cluster 1 sub-pattern requiring the implementer to monitor CI outcome
  after every push, not just at commit time. CI failures discovered post-push must be triaged
  before the next HAT cycle begins. Skipping post-push watch is a recognized failure mode.

- **cross-repo dual-commit**: When a change spans two repos with a dependency direction (provider, consumer), commit the provider repo first → push → wait for CI green → in the consumer repo, reviewer ACCEPT triggers operator GO that flips pending→OK in the consumer ledger row → stage all consumer files (including the flipped ledger) → commit → push → CI watch. The flip ALWAYS happens BEFORE the commit, so the pushed commit carries the corrected ledger state, not "pending".

- **honest residual disclosure**: A State Integrity sub-pattern requiring that any known
  limitation, bypass surface, or deferred work be stated explicitly in the ledger row or
  patch description at the time of closure. Post-hoc discovery of undisclosed residuals is a
  spec violation; proactive disclosure is always preferred over silent omission.
