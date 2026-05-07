# Appendix B — Six Closure Signals Reference

**Purpose.** At every HAT 3 closure gate the operator MUST confirm all six signals
before recording the cycle as complete. A cycle is not closed until every signal is
green. Use this appendix as a run-card: work through signals 1-6 in order, log the
result, then proceed to the commit.

Cross-references: [01-roles-and-cycles.md](../01-roles-and-cycles.md) §HAT 3,
[03-ledger-discipline.md](../03-ledger-discipline.md) §3.4,
[04-wiki-discipline.md](../04-wiki-discipline.md) §4.5,
[06-state-integrity.md](../06-state-integrity.md) §6.5.

---

## Signal 1 — Tests pass
**What.** Targeted test(s) must be RED→GREEN; full suite must also be green (no regressions).
```bash
pytest tests/<module>/test_<feature>.py -v
pytest --tb=short   # exit 0 required
```

## Signal 2 — R2 inline OK
**What.** Post-operator ACCEPT token present in the committed diff. The flip from
HOLD → ACCEPT happens **before** the commit. See [06-state-integrity.md](../06-state-integrity.md) §6.5.1.
```bash
git diff HEAD~1 HEAD | grep -c "ACCEPT"   # ≥ 1
git diff HEAD~1 HEAD | grep "HOLD"        # must return nothing
```

## Signal 3 — Confounder N/A (or harness OK)
**What.** Either `confounder: N/A` recorded in the ledger, or harness run confirms
the confounder is controlled.
```bash
grep "confounder: N/A" docs/ledger/current.md        # qualitative cycle
python scripts/harness_check.py --cycle <id>          # quantitative cycle (exit 0)
```

## Signal 4 — `/lint-wiki` issueCount = 0
**What.** Wiki linter reports zero issues (broken links, missing front-matter,
duplicate anchors). See [04-wiki-discipline.md](../04-wiki-discipline.md) §4.3.
```bash
python scripts/lint_wiki.py    # output must show issueCount: 0
```

## Signal 5 — `build-registries --check` exit 0
**What.** Registry builder confirms all cluster/role registries are consistent with
files on disk. See [04-wiki-discipline.md](../04-wiki-discipline.md) §4.4.
```bash
python scripts/build_registries.py --check   # exit 0 required
```

## Signal 6 — Tier-C reflection logged
**What.** Ledger entry contains either `tier-C: yes, p.<N>` or `tier-C: noop — <reason>`.
Silence is a red signal. See [04-wiki-discipline.md](../04-wiki-discipline.md) §4.5.4.
```bash
grep -E "tier-C: (yes|noop)" docs/ledger/current.md   # ≥ 1 match
```

---

## Quick Reference Table

| # | Signal | Command | Pass condition |
|---|--------|---------|----------------|
| 1 | Tests pass | `pytest --tb=short` | exit 0, no FAILED |
| 2 | R2 inline OK | `git diff HEAD~1 HEAD \| grep ACCEPT` | ≥ 1; no HOLD |
| 3 | Confounder N/A | `grep "confounder: N/A" docs/ledger/current.md` | ≥ 1 (or harness exit 0) |
| 4 | /lint-wiki | `python scripts/lint_wiki.py` | issueCount: 0 |
| 5 | build-registries | `python scripts/build_registries.py --check` | exit 0 |
| 6 | Tier-C reflection | `grep -E "tier-C: (yes\|noop)" docs/ledger/current.md` | ≥ 1 match |

---

## Failure Modes

| Signal | Red condition | Remediation |
|--------|--------------|-------------|
| 1 | Tests still FAILED | Root-cause and fix; never suppress |
| 2 | HOLD still present in diff | Apply ACCEPT flip, re-stage, recommit |
| 3 | No `confounder:` key in ledger | Add `N/A` note or run harness |
| 4 | issueCount > 0 | Fix reported issues; re-run linter |
| 5 | Non-zero exit | Reconcile registry vs disk; re-run |
| 6 | No `tier-C:` key | Add yes-with-page or noop rationale |

---

## Cluster Mapping

Each signal is owned by a primary cluster. Failures should be investigated under
that cluster's discipline rules.

| Signal | Primary cluster |
|--------|----------------|
| 1 Tests pass | Cluster 5 (Code Discipline) |
| 2 R2 inline OK | Cluster 6 (State Integrity §6.5.1) |
| 3 Confounder N/A | Cluster 5 (Code Discipline) |
| 4 /lint-wiki | Cluster 4 (Wiki Discipline) |
| 5 build-registries --check | Cluster 4 (Wiki Discipline) |
| 6 Tier-C reflection | Cluster 4 (Wiki Discipline §4.5.4) |
