---
description: Stamp the HAT 1 STOP pre-flight gate before any implementation code is written; freezes mode, pre-survey, design, RED tests, and mantras for reviewer ACCEPT/REDIRECT.
---

# /hat-1-stop

Stamp the HAT 1 STOP report at the start of any implementation unit. This command
freezes the pre-flight state before a single line of implementation code is written.
The operator MUST NOT proceed until a reviewer has issued ACCEPT (or REDIRECT with
explicit notes). Skipping this gate violates Cluster 1 discipline (§1.5.3).

---

## 1. Pre-flight CI Verification

Determine which mode applies before filling this section.

| Mode | Trigger condition |
|------|------------------|
| **Bootstrap** | No ledger row exists yet for `<scope>`; first commit in this unit |
| **Steady-state** | Ledger row exists; prior GREEN CI recorded |

**Active mode:** `[ ] Bootstrap  [ ] Steady-state`

```
# Run in provider repo root:
git status --short
gh run list --limit 3 --branch $(git branch --show-current)
```

Last CI run result: `<PASS / FAIL / PENDING>`
Ledger row for `<scope>`: `<exists / missing>`

---

## 2. Pre-survey Checklist (helper-aware grep)

Search for existing helpers BEFORE writing new code. Fill every cell.

```bash
# Helper-aware grep — run from repo root
grep -r "<keyword>" --include="*.ts" --include="*.mjs" --include="*.py" \
     -l | head -20
```

| Item | Result |
|------|--------|
| Existing helper for `<feature>` found? | `<yes — path / no>` |
| Duplicate export symbol risk? | `<yes — symbol / no>` |
| Immutable surface files touched? | `<list files or none>` |
| Any file already > 400 lines (near limit)? | `<list files or none>` |

---

## 3. Design Choice

**What is being built?**
`<one sentence: component name, location, purpose>`

**Contract delta (what changes at the public boundary):**

```
BEFORE: <describe existing exported interface / none>
AFTER:  <describe new/modified exported interface>
```

**Files to be created or modified:**

```
<files>
```

**Estimated line additions:** `<N>` (all files must stay ≤ 500 lines post-change)

---

## 4. RED Test Plan

List every test that MUST FAIL before implementation begins. All tests must be
written and confirmed RED before the operator issues GO.

```
<tests>
```

Format: `<file>::<test-name> — <what it asserts>`

Example:
```
tests/unit/widget.test.ts::Widget.render — throws when config missing
tests/unit/widget.test.ts::Widget.export — returns correct symbol shape
```

Confirmed RED run output (paste or attach):
```
<paste failing test output here>
```

---

## 5. Mantras — VERBATIM

The following mantras must appear verbatim in every SKILL.md save target for this
scope. Copy them unchanged into the implementation unit notes.

```
MANTRA-1: No helper is written twice. Search before implement.
MANTRA-2: Immutable surfaces are never touched by implementers.
MANTRA-3: RED before GREEN. No test written after implementation.
MANTRA-4: One commit per atomic task. Never bundle.
MANTRA-5: The ledger is the single source of truth for cross-repo state.
```

---

## 6. HAT 1 STOP Outcome

**Submitted by (operator):** `<name / agent-id>`
**Timestamp:** `<ISO-8601>`

```
[ ] ACCEPT  — reviewer confirms pre-survey complete, RED tests listed, design sound
[ ] REDIRECT — reviewer issues notes below before operator may proceed
```

**Reviewer notes (if REDIRECT):**
`<notes>`

**Operator GO** (after ACCEPT only):
`[ ] GO issued — implementation may begin`
