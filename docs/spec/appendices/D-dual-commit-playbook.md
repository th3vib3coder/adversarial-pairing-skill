# Appendix D — Cross-Repo Dual-Commit Playbook

## Purpose

Use this playbook whenever a patch spans **two repos with a dependency direction**:
one repo (the **provider**) supplies a feature, contract, or interface that the other
repo (the **consumer**) depends on. A dual-commit is required any time consumer
correctness is contingent on provider state that has not yet been pushed and verified.

---

## Decision Tree — When Does Dual-Commit Apply?

Check each trigger. One positive answer is sufficient to mandate this playbook.

- [ ] The consumer imports a symbol, endpoint, or schema from the provider repo.
- [ ] Consumer CI would fail if the provider were not already pushed and green.
- [ ] The ledger row for the consumer patch references a provider change.
- [ ] The provider introduces a new API that the consumer calls for the first time.
- [ ] Any test in the consumer repo hits the provider at runtime or via contract.
- [ ] The architectural dependency direction is provider → consumer (even if temporarily
      decoupled by a feature flag).

If **none** apply, a single-repo commit flow is sufficient.

---

## Order Rule

**Provider FIRST. Consumer SECOND.**

The dependency direction is a fixed architectural fact: the consumer cannot function
without the provider feature it depends on. Pushing in any other order creates a window
where the consumer references a provider state that does not yet exist in the remote —
or has not been mechanically verified by CI.

---

## Step-by-Step Playbook

### Step A: Stage and commit provider repo

Stage all changed provider files. Verify no unintended files are included.

```bash
git -C <provider-repo> add <files>
git -C <provider-repo> status   # confirm staging set is correct
git -C <provider-repo> commit -m "<provider commit message>"
```

### Step B: Push provider repo

```bash
git -C <provider-repo> push
```

Note the run ID returned by the push output or retrieve it immediately after:

```bash
gh run list --repo <provider-org/provider-repo> --limit 1
```

### Step C: Watch provider CI to completion

```bash
gh run watch <run-id> --repo <provider-org/provider-repo> --exit-status
```

Do **not** proceed until this command exits with status 0 (green). A non-zero
exit code means provider CI is red — go to Failure Mode 1 recovery below.

### Step D: Flip pending→OK in consumer ledger row

**This step MUST happen BEFORE staging or committing the consumer repo.**

After reviewer ACCEPT on the consumer patch triggers operator GO:

1. Open the consumer feature ledger.
2. Replace the placeholder (`R2 inline pending`) with the confirmed state (`R2 inline OK`).
3. Run a cardinality check to confirm no "pending" tokens remain:

```bash
grep -c "R2 inline pending" <consumer-ledger-file>   # must return 0
grep -c "R2 inline OK"      <consumer-ledger-file>   # must have increased by N
```

The flip ALWAYS happens BEFORE the consumer commit. Committing with a "pending"
placeholder still in the ledger is an anti-pattern — see Failure Mode 4 below.

### Step E: Stage all consumer files (including the flipped ledger)

```bash
git -C <consumer-repo> add <code-files> <ledger-file> <wiki-files>
git -C <consumer-repo> status   # confirm flipped ledger is in the staging set
```

### Step F: Commit consumer repo

```bash
git -C <consumer-repo> commit -m "<consumer commit message>"
```

### Step G: Push consumer repo

```bash
git -C <consumer-repo> push
# retrieve run ID: gh run list --repo <consumer-org/consumer-repo> --limit 1
```

### Step H: Watch consumer CI to completion

```bash
gh run watch <run-id> --repo <consumer-org/consumer-repo> --exit-status
```

Two CI greens, two commits, zero dependency window. The playbook is complete.

---

## Failure Modes

### FM-1: Provider CI red — STOP

**Trigger**: Step C exits with non-zero status.

**Risk**: Consumer references a provider feature that is broken in the remote.
Proceeding opens a dependency window where consumer CI will fail for a provider-
layer reason, misleading triage toward the consumer.

**Recovery**:
1. Do **not** push the consumer under any circumstances.
2. Diagnose and fix the provider failure (new commit on provider).
3. Repeat Steps B and C until provider CI is green.
4. Only then continue to Step D.

---

### FM-2: Consumer pushed before provider

**Trigger**: Consumer was committed and pushed before provider push completed.

**Risk**: For a non-zero window, the consumer's reference exists in the remote while
the provider feature does not. Any CI trigger during that window fails the consumer
for a reason unrelated to consumer logic. Triage begins at the wrong layer.

**Recovery**:
1. Revert the consumer push if the provider is not yet green:
   `git -C <consumer-repo> revert HEAD --no-edit && git -C <consumer-repo> push`
2. Complete the provider cycle (Steps A–C) to green.
3. Re-apply the consumer change and restart from Step D.

---

### FM-3: Provider and consumer pushed in parallel

**Trigger**: Both repos pushed simultaneously without waiting for provider CI.

**Risk**: Race condition — CI scheduling determines which lands first; dependency
direction is not reflected in the commit ordering; failures are non-deterministic
across runs and hard to reproduce.

**Recovery**:
1. Identify which CI run represents which repo.
2. Wait for both to settle.
3. If provider is red, apply FM-1 recovery; if consumer is red due to a provider gap,
   apply FM-2 recovery.
4. Establish a strict sequential order for all future dual-commit operations.

---

### FM-4: Flip happens after commit (anti-pattern)

**Trigger**: The consumer ledger was committed with `R2 inline pending` still present;
a second "fix" commit is required to correct the ledger state.

**Risk**: The pushed commit permanently carries "pending" state in the audit trail.
A corrective second commit is visible evidence of a state integrity failure; it also
means the ledger was temporarily misleading to any reader between the two commits.

**Recovery**:
1. Flip the ledger immediately: replace `R2 inline pending` → `R2 inline OK`.
2. Run cardinality check (grep count = 0 for pending).
3. Stage the corrected ledger and commit with a message that explicitly identifies
   this as a state-integrity correction (e.g., `fix(ledger): flip pending→OK missed
   before prior commit — corrective ledger patch`).
4. Push and watch CI.
5. Record the incident as a process deviation in the next HAT 1 pre-survey.

---

## Cross-References

- **Cluster 6 §6.5.2** (`06-state-integrity.md`): canonical statement, rationale,
  and abstract example for the cross-repo dual-commit ordering sub-pattern.
- **README.md** glossary: entry for **"cross-repo dual-commit"** defines the full
  sequence including the BEFORE-commit flip requirement and CI-watch gates.
- **Case studies**: `../case-studies/phase-9-wave-5/` — concrete sequencing examples
  across a multi-seq dual-repo delivery, including deviation and recovery instances.
