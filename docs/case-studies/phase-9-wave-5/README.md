# Case Study — Phase 9 Wave 5 v2.1

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

**Canonical role of this case study:** This document set is the default
empirical anchor for the adversarial-pairing framework. It grounds abstract
cluster descriptions in concrete, observable decisions. It is replaceable per
project — any project may substitute its own empirical case study — but Phase 9
Wave 5 is the reference implementation shipped with this repository.

---

## Reference Status

This case study is:

- **Canonical:** it is the default citation when cluster descriptions reference
  "observed behavior" or "empirical example"
- **Grounded:** every claim below is traceable to a commit SHA, CI run ID, or
  ledger row in the WIKI_VRE
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

1. **Read the cluster description** in `docs/spec/clusters/` (abstract layer).
2. **Find the matching example** in `04-per-cluster-examples.md` (concrete
   grounding).
3. **Trace back** to the seq entry in `01-trail.md` for full context.
4. **If a redirect is mentioned**, cross-reference `02-redirect-events.md` for
   root cause and recovery detail.
5. **For final-state questions** (CI, working tree, honest residuals), consult
   `03-closure-evidence.md`.

This five-step trace path ensures that every abstract claim in the cluster specs
is reachable to empirical evidence in at most three hops.
