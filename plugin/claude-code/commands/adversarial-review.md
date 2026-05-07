---
description: Two-level adversarial review (tactical diff + strategic plan) on staged changes; both must PASS before commit.
---

# /adversarial-review

Trigger a two-level adversarial review on all staged changes. Level 1 (tactical)
operates at diff granularity and catches mechanical violations. Level 2 (strategic)
operates at plan granularity and catches scope drift, methodology deviation, and
ground-truth misalignment. Both levels must pass before a commit is issued. This
command implements Cluster 2 §2.5.2 review protocol.

---

## Level 1 — Tactical Review (diff-level)

Run against `git diff --staged`. Every row must resolve to PASS before Level 2.

### 1.1 Anti-duplication check

```bash
# For each new function/class in the diff, search for prior art:
grep -r "<new-symbol>" --include="*.ts" --include="*.mjs" --include="*.py" \
     --exclude-dir=node_modules -l
```

| Check | Result |
|-------|--------|
| New symbols already exist elsewhere? | `[ ] No  [ ] Yes — <path>` |
| Imported helper available but re-implemented? | `[ ] No  [ ] Yes — <detail>` |

### 1.2 Frozen-detail integrity

Frozen details are constants, prompt strings, enum values, or config keys that are
declared canonical in `blueprints/` or `docs/spec/`. They must never be paraphrased.

| Frozen item | Source location | Present verbatim in diff? |
|-------------|-----------------|--------------------------|
| `<item-1>` | `<path>` | `[ ] Yes  [ ] No` |
| `<item-2>` | `<path>` | `[ ] Yes  [ ] No` |

### 1.3 Immutable surface check

Immutable surfaces: `blueprints/`, `docs/spec/DESIGN.md`, ledger schema columns.

```bash
git diff --staged --name-only | grep -E "^(blueprints/|docs/spec/DESIGN)"
```

Result: `<none — PASS / list files — FAIL>`

### 1.4 File size rule (500-line hard limit)

```bash
# Check all files touched by the diff:
git diff --staged --name-only | xargs -I{} sh -c 'echo "$(wc -l < {}) {}"' \
  | awk '$1 > 500 {print "OVER LIMIT:", $0}'
```

Result: `<none — PASS / violations listed>`

### 1.5 Tactical verdict

```
[ ] PASS — all Level 1 checks green; proceed to Level 2
[ ] FAIL — violations listed above; REDIRECT before commit
```

---

## Level 2 — Strategic Review (plan-level)

Evaluate the diff in the context of the approved implementation plan.

### 2.1 Ground-truth alignment

Is each decision in the diff traceable to a specific spec section or approved plan item?

| Decision in diff | Traceable to | Grounded? |
|-----------------|--------------|-----------|
| `<decision-1>` | `<spec §N.N>` | `[ ] Yes  [ ] No` |
| `<decision-2>` | `<spec §N.N>` | `[ ] Yes  [ ] No` |

### 2.2 Scope creep detection

```
[ ] Diff touches only files listed in the HAT 1 STOP design choice
[ ] No new exports added beyond the approved contract delta
[ ] No new dependencies introduced without plan approval
```

### 2.3 Methodology adherence

```
[ ] RED tests were written BEFORE implementation (confirmed via commit order)
[ ] No test was added or modified AFTER the GREEN commit
[ ] Commit is atomic (single task, single logical change)
```

### 2.4 Strategic verdict

```
[ ] PASS — plan-aligned, no scope creep, methodology followed
[ ] REDIRECT — strategic issues noted below
```

**Redirect notes:** `<notes if REDIRECT>`

---

## Decision Output

```
ACCEPT  — both Level 1 and Level 2 PASS; commit may proceed
REDIRECT — one or more checks failed; implementer must address before commit
```

**Final decision:** `[ ] ACCEPT  [ ] REDIRECT`
**Reviewer:** `<name / agent-id>`
**Timestamp:** `<ISO-8601>`

---

## 5-Axis Evaluation Summary

| Axis | Score (1-5) | Notes |
|------|-------------|-------|
| Anti-duplication | ` ` | |
| Frozen-detail fidelity | ` ` | |
| Immutable surface safety | ` ` | |
| File size compliance | ` ` | |
| Ground-truth alignment | ` ` | |

**Overall:** `<ACCEPT / REDIRECT>`
