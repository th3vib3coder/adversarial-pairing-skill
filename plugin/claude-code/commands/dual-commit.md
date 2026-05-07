---
description: Cross-repo provider+consumer commit/push playbook with ledger flip pending->OK in strict A-H order; preserves cross-repo ledger consistency.
---

# /dual-commit

Cross-repo commit and push playbook for provider + consumer repositories. Execute
all 8 steps in strict order (A → H). Never reorder. Step D (ledger flip) must
happen BEFORE the consumer commit — this is the invariant that keeps ledger state
consistent across repos. Implements Appendix D of the adversarial-pairing spec.

**Prerequisites:** `/adversarial-review` ACCEPT issued on provider diff.

---

## Step A — Stage and commit provider repo

```bash
# In provider repo root:
git add <provider-files>
git status --short          # confirm only intended files staged
git commit -m "<provider-commit-message>"
```

Fill in:
- Provider files staged: `<provider-files>`
- Commit message: `<provider-commit-message>` (must reference task ID)

**Failure mode:** if commit hook fails, fix the violation and re-run Step A.
Do NOT use `--no-verify`.

---

## Step B — Push provider

```bash
# In provider repo root:
git push origin <provider-branch>
```

Fill in:
- Provider branch: `<provider-branch>`

**Failure mode:** if push is rejected (non-fast-forward), rebase on remote and
re-run Steps A–B. Never force-push to main.

---

## Step C — Watch provider CI

```bash
# In provider repo root:
gh run watch
```

Wait for GREEN. Do NOT proceed to Step D until CI passes.

- Provider CI run URL: `<url>`
- CI result: `[ ] GREEN  [ ] RED — investigate before continuing`

**Failure mode:** if CI is RED, fix in a new commit (re-run Steps A–C). Never flip
the ledger against a failing CI.

---

## Step D — Flip ledger row: pending → OK (BEFORE consumer commit)

This step must execute BEFORE any consumer file is staged.

```bash
# In consumer repo root, edit the ledger:
# File: docs/ledger.md  (or equivalent ledger path)
# Find the row for <provider-scope> and change status pending → OK
# Record the provider CI run URL in the ledger row.

# Verify the flip:
grep "<provider-scope>" docs/ledger.md
```

Fill in:
- Provider scope / feature ID: `<provider-scope>`
- Ledger file path: `<ledger-path>`
- Provider CI run URL recorded in ledger: `[ ] Yes`

**Failure mode:** if the ledger row does not exist, create it with status OK and the
CI URL. Never leave a consumer commit with a missing or pending ledger entry.

---

## Step E — Stage all consumer files (including flipped ledger)

```bash
# In consumer repo root:
git add <consumer-files> <ledger-path>
git status --short          # confirm ledger row change is staged
```

Fill in:
- Consumer files staged: `<consumer-files>`
- Ledger file included in staging: `[ ] Yes`

**Failure mode:** if ledger is not staged, the commit is invalid. Abort and
re-stage including the ledger.

---

## Step F — Commit consumer

```bash
# In consumer repo root:
git commit -m "<consumer-commit-message>"
```

Fill in:
- Commit message: `<consumer-commit-message>` (must reference provider task ID
  and confirm ledger flip, e.g. `feat(consumer): integrate <scope>; ledger OK`)

**Failure mode:** same as Step A — fix hook violations in a new commit, never skip.

---

## Step G — Push consumer

```bash
# In consumer repo root:
git push origin <consumer-branch>
```

Fill in:
- Consumer branch: `<consumer-branch>`

**Failure mode:** same as Step B.

---

## Step H — Watch consumer CI

```bash
# In consumer repo root:
gh run watch
```

Wait for GREEN. Dual-commit is complete only when both CI runs are GREEN.

- Consumer CI run URL: `<url>`
- CI result: `[ ] GREEN  [ ] RED — investigate`

**Dual-commit complete:** both provider CI and consumer CI GREEN, ledger row OK.

---

## Completion Summary

| Step | Status |
|------|--------|
| A — provider commit | `[ ] done` |
| B — provider push | `[ ] done` |
| C — provider CI GREEN | `[ ] done` |
| D — ledger flip pending→OK | `[ ] done` |
| E — consumer stage (incl. ledger) | `[ ] done` |
| F — consumer commit | `[ ] done` |
| G — consumer push | `[ ] done` |
| H — consumer CI GREEN | `[ ] done` |
