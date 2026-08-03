# Appendix D — Cross-Repo Dual-Commit Playbook

## Purpose

Use this playbook when a patch spans two repositories and consumer correctness
depends on provider state that must land and pass CI first.

## Applicability

One positive answer mandates this flow:

- the consumer imports a provider symbol, endpoint, or schema;
- consumer CI depends on provider remote state;
- the consumer ledger references a provider change;
- the provider introduces an API the consumer calls;
- consumer tests exercise the provider contract;
- architecture establishes provider → consumer dependency.

If none applies, use the single-repository HAT flow.

## Invariants

1. **Provider first; consumer second.** Never push them in parallel.
2. Each repository keeps its own HAT 1, HAT 2, HAT 3, reviewer, and operator authorization records.
3. Before either commit, require this state sequence:
   reviewer inspects the pre-flip working-tree and authorized untracked inventory
   (the index may be empty) → reviewer technical approval → direct or standing flip authorization →
   current R2 cell changes from `R2 inline pending` to `R2 inline OK` and the
   atomic patch is staged → reviewer inspects the cached patch and issues final HAT 3 ACCEPT
   → direct or standing commit authorization.
4. A missing ledger row is a STOP. Return to HAT 1/closure and create it in
   pending state; never synthesize a row directly as `OK`.
5. Provider CI GREEN is evidence for the consumer; it is not consumer reviewer
   ACCEPT and not consumer operator authorization.
6. Standing authorization is valid only when it names both repositories, both branches, both
   seqs, the commit/push effects, and provider-first ordering. Each transition is recorded.

## Provider sequence

### P0 — Provider gate

- Provider HAT 1 was accepted and HAT 2 is green.
- `/adversarial-pairing:adversarial-review` inspects the provider working-tree diff and every authorized
  untracked file, then records `ACCEPT-TO-FLIP`; an empty index is valid here.
- Operator records direct `GO-TO-FLIP provider` or standing-authorization consumption.
- Implementer flips only the current provider row to `R2 inline OK` and stages
  the atomic code + ledger + wiki patch.
- Reviewer reruns all six signals on the complete cached patch and records final HAT 3 ACCEPT.
- Operator records direct `GO-COMMIT provider` or standing-authorization consumption.

Without every item, stop.

### A — Commit provider

```bash
git -C <provider-repo> status --short
git -C <provider-repo> diff --cached --name-status
git -C <provider-repo> commit -m "<provider message with seq>"
```

Do not use `--no-verify`.

### B — Push provider

```bash
git -C <provider-repo> push origin <provider-branch>
```

### C — Watch provider CI

Use the authoritative CI system and record run URL, commit SHA, exact command,
exit code, and final result. With GitHub CLI:

```bash
gh run list --repo <provider-owner/repo> --branch <provider-branch> --limit 3
gh run watch <provider-run-id> --repo <provider-owner/repo> --exit-status
```

Do not touch or push the consumer until provider CI is GREEN.

## Consumer sequence

### C0 — Consumer gate after provider GREEN

- Record provider commit SHA and CI URL in the existing pending consumer row.
- `/adversarial-pairing:adversarial-review` checks the consumer working-tree and untracked inventory
  against its accepted HAT 1 scope and records `ACCEPT-TO-FLIP`.
- Operator records direct `GO-TO-FLIP consumer` or standing-authorization consumption.
- Implementer flips only the current consumer row to `R2 inline OK` and stages
  all authorized consumer code, ledger, and wiki files.
- Reviewer reruns all six signals on the complete cached patch and records final consumer HAT 3 ACCEPT.
- Operator records direct `GO-COMMIT consumer` or standing-authorization consumption.

Provider CI alone authorizes none of these mutations.

### D — Verify staged state flip

```bash
git -C <consumer-repo> diff --cached -- <consumer-ledger-file>
rg -n "^\|[[:space:]]*<consumer-seq>[[:space:]]*\|" <consumer-ledger-file>
```

Read the table header to locate the `R2 inline` column, require exactly one anchored consumer-seq
row, and require that cell to equal `R2 inline OK`. Free-text mentions and other rows are not state
evidence.

### E — Verify complete consumer staging

```bash
git -C <consumer-repo> status --short
git -C <consumer-repo> diff --cached --name-status
```

Require every authorized consumer code, ledger, and wiki file and nothing else.

### F — Commit consumer

```bash
git -C <consumer-repo> commit -m "<consumer message with provider seq>"
```

### G — Push consumer

```bash
git -C <consumer-repo> push origin <consumer-branch>
```

### H — Watch consumer CI

Use the authoritative CI watch and record run URL, SHA, exit code, and GREEN
result. The delivery closes only when both remote commits exist, both CI runs
are GREEN, both current ledger rows are OK, and wiki records match the landed SHAs.

## Failure modes

### Provider CI RED

Stop. Repair the provider in a new atomic HAT cycle and repeat provider push/CI.
Do not modify or push consumer state.

### Consumer committed or pushed early

Stop and disclose the state-integrity incident. Use a reviewed, non-destructive
recovery appropriate to repository policy; never force-push protected history.

### Parallel provider/consumer push

Treat as a sequencing incident. Let both CI runs settle, repair provider first,
then restart the consumer gate after provider GREEN.

### Pending marker committed

Do not rewrite published history silently. Record the incident and repair the
ledger in a new reviewed atomic commit with its own CI watch.

## Cross-references

- [Cluster 1 — Roles & Cycles](../01-roles-and-cycles.md)
- [Cluster 6 — State Integrity](../06-state-integrity.md) §6.5.2
- [Six Closure Signals](B-six-closure-signals.md)
- [Standing Operator Authorization](E-standing-operator-authorization.md)
