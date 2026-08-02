# Case Study — Phase 9 Wave 5 v2.1

> **Historical v2.1 evidence — non-normative.** This record predates the current two-stage HAT 3
> gate. Within these historical files, pre-flip “reviewer ACCEPT” maps to today's provisional
> working-tree review and `ACCEPT-TO-FLIP`; an empty index is valid at that point. The record did
> not yet name the later complete cached re-review, final HAT 3 `ACCEPT`,
> and operator `GO-COMMIT` as separate gates. Use the current spec and appendices for normative
> procedure; do not copy the legacy ordering from this folder.
>
> **Evidence availability limitation.** The source repositories, original ledgers, and raw CI
> records referenced by this case study are not bundled with this distribution. In particular,
> `01-trail.md` records semantic SHA placeholders rather than verifiable commit identifiers.
> Quantitative and closure claims are therefore historical assertions and are not independently
> verifiable from this distribution; obtain the source repositories and ledgers before treating
> them as audit evidence.

## Summary

Wave 5 of Phase 9 v2.1 landed 18 sequential implementation units (seq 113-130)
across two repositories:

- **vibe-science** — the main research environment plugin host
- **vibe-research-environment (VRE)** — the orchestration runtime

The work used a two-agent pairing model: Codex as implementer and Claude as
reviewer. During the wave, **5 redirect events** were caught and resolved with
**zero false positives** — every redirect corresponded to a genuine misalignment
between spec and ground truth.

Wave 5 closed with dual-repo CI green (no regressions) and a clean working tree
(only LOCAL-tagged untracked files expected per protocol).

---

## Origin Context

**Project:** Bioinformatics thesis on single-cell RNA sequencing (scRNA-seq)
analysis. The research pipeline is developed and maintained inside the
vibe-research-environment, with operator supervision by Carmine Russo.

**Phase 9 v2.1 plan:** A structured task tree (T5.1 through T5.7) mapping
governance event categories (A through E) to implementation seq. Each task
carries a HAT (Human Adversarial Test) cycle: HAT 1 (pre-survey + ground
truth), HAT 2 (implementer produces), HAT 3 (reviewer accepts or redirects).

**Seq numbering:** Seq are monotonically increasing integers assigned at commit
time inside the WIKI_VRE ledger. Wave 5 covers seq 113-130 inclusive.

**Historical role of this case study:** This document set preserves the empirical record that
motivated several patterns in the framework. It grounds abstract cluster descriptions in concrete,
reported decisions, but the bundled record does not independently prove those decisions. It is not
the normative protocol and does not override later spec corrections.

---

## Reference Status

This case study is:

- **Historical:** it is evidence of observed behavior under the v2.1 protocol, with the migration
  mapping above required whenever the old single-stage ACCEPT terminology appears
- **Historical assertion record:** the files report commit, CI, and ledger evidence from the
  original projects, but the original repositories and ledgers are not bundled and `01-trail.md`
  uses semantic SHA placeholders. The quantitative and closure claims are not independently
  verifiable from this distribution
- **Replaceable:** operators running this framework on their own projects may
  swap this folder for their own case study, provided they maintain the same
  sub-file structure (01-trail, 02-redirect-events, 03-closure-evidence,
  04-per-cluster-examples)
- **Branded by exception:** the cluster body abstract-only constraint does NOT
  apply here; vibe-science, vibe-research-environment, WIKI_VRE, and all Phase 9
  identifiers are permitted within this folder

---

## Table of Contents

| File | Contents | Primary clusters illuminated |
|---|---|---|
| [01-trail.md](01-trail.md) | Chronological trail of seq 113-130 | Clusters 1, 3, 4 |
| [02-redirect-events.md](02-redirect-events.md) | 5 redirect events: location, root cause, recovery | Cluster 2 |
| [03-closure-evidence.md](03-closure-evidence.md) | Wave 5 final state at seq 130 | Cluster 6 |
| [04-per-cluster-examples.md](04-per-cluster-examples.md) | One concrete example per cluster (7 total) | All 7 clusters |

---

## Quick Navigation

**Cluster 1 — Roles & Cycles:** See `01-trail.md` (HAT cycle structure visible
in every seq entry) and `04-per-cluster-examples.md` §1 (seq 124 HAT 1/2/3
full trail).

**Cluster 2 — Verification Discipline:** See `02-redirect-events.md` (all 5
redirects document HAT verification catching real misalignments) and
`04-per-cluster-examples.md` §2 (seq 126-127 pre-survey gap discovery).

**Cluster 3 — Ledger Discipline:** See `01-trail.md` (each seq entry lists
cluster relevance) and `04-per-cluster-examples.md` §3 (seq 124 row with 15
save targets enumerated).

**Cluster 4 — Wiki Discipline:** See `01-trail.md` seq 127 entry and
`04-per-cluster-examples.md` §4 (Tier C concept page extension pattern).

**Cluster 5 — Code Discipline:** See `04-per-cluster-examples.md` §5 (Round 94
F4 lock: kernel-bridge.js diff = 0 across all 18 seq).

**Cluster 6 — State Integrity:** See `03-closure-evidence.md` (dual-repo CI
green, clean working tree) and `04-per-cluster-examples.md` §6 (seq 129
dual-repo dual-commit ordering).

**Cluster 7 — Plan & Document Discipline:** See `04-per-cluster-examples.md` §7
(seq 124 row body length management and spec amendment LOCAL pattern).

---

## Wave 5 at a Glance

| Dimension | Value |
|---|---|
| Seq range | 113 – 130 (18 seq) |
| Repos touched | vibe-science, vibe-research-environment |
| Agent pairing | Codex (implementer) + Claude (reviewer) |
| HAT cycles completed | 18 (one per seq) |
| Redirect events | 5 (zero false positives) |
| CI runs at closure | VRE 25185264658 + Plugin 25185120155 (both green) |
| Mantras accumulated | see `03-closure-evidence.md` §Mantras |
| Open residuals at closure | see `03-closure-evidence.md` §Honest Residuals |
| Task tree | T5.1 – T5.7 (governance categories A – E) |

---

## How to Use This Case Study

1. **Read the cluster description** in `docs/spec/` (abstract layer).
2. **Find the matching example** in `04-per-cluster-examples.md` (concrete
   grounding).
3. **Trace back** to the seq entry in `01-trail.md` for full context.
4. **If a redirect is mentioned**, cross-reference `02-redirect-events.md` for
   root cause and recovery detail.
5. **For final-state questions** (CI, working tree, honest residuals), consult
   `03-closure-evidence.md`.

This five-step path navigates the bundled historical record; it does not independently verify the
reported claims. Treat the record as illustrative unless the original repositories, ledgers, and
CI artifacts are available for inspection.
