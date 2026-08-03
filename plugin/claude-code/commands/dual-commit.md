---
description: Execute a gated provider-first, consumer-second dual-repo delivery; each commit requires HAT 3 ACCEPT and valid operator authorization.
---

# /adversarial-pairing:dual-commit

Use only when the dependency direction is provider → consumer. This command is
a controlled playbook, not authorization to mutate either repository. Never commit, push, flip a
ledger, or create a missing row without the direct gate or valid standing-authorization
consumption listed for that action. Standing authorization must name both repositories, branches,
seqs, effects, and provider-first ordering.

## 0. Freeze identities and evidence

- Provider repo/branch: `<absolute path>` / `<branch>`
- Consumer repo/branch: `<absolute path>` / `<branch>`
- Provider seq and ledger row: `<id/path>`
- Consumer seq and ledger row: `<id/path>`
- Distinct reviewer: `<agent-id>`
- Dependency evidence: `<why consumer requires provider>`

Both repos must already have accepted HAT 1 scopes and completed HAT 2. A
missing ledger row is a STOP: return to HAT 1/closure and create it in pending
state. Never create a missing row directly as `OK`.

## Provider gate

Before Step A, require this exact sequence:

1. `/adversarial-pairing:adversarial-review` verifies the provider diff and records
   `ACCEPT-TO-FLIP` (all technical checks green; only the pending state remains).
2. Operator records direct `GO-TO-FLIP` or a standing-authorization consumption for provider.
3. Implementer changes only the provider current-seq marker from
   `R2 inline pending` to `R2 inline OK`, records the reviewer evidence, and
   stages the complete atomic provider patch.
4. Reviewer reruns the staged six-signal review and issues final HAT 3 `ACCEPT`.
5. Operator records direct `GO-COMMIT provider` or a standing-authorization consumption.

Without all five records, stop before Step A.

## A. Commit provider

```bash
git -C <provider-repo> status --short
git -C <provider-repo> diff --cached --name-status
git -C <provider-repo> commit -m "<atomic provider message with seq>"
```

Confirm the staged set contains the provider ledger/wiki evidence and no
unapproved file. Never use `--no-verify`.

## B. Push provider

```bash
git -C <provider-repo> push origin <provider-branch>
```

## C. Watch provider CI

Use the repository's authoritative CI command or UI/API and record the run URL,
commit SHA, command, exit code, and final GREEN result. With GitHub CLI, for
example:

```bash
gh run list --repo <provider-owner/repo> --branch <provider-branch> --limit 3
gh run watch <provider-run-id> --repo <provider-owner/repo> --exit-status
```

Provider CI RED stops the playbook. Fix it in a new atomic provider HAT cycle;
do not touch or push the consumer.

## Consumer gate

Only after provider CI is GREEN:

1. Add the provider commit SHA and CI URL to the existing pending consumer row.
2. `/adversarial-pairing:adversarial-review` verifies the consumer diff against its accepted HAT 1
   scope and records `ACCEPT-TO-FLIP`.
3. Operator records direct `GO-TO-FLIP` or a standing-authorization consumption for consumer.
4. Implementer flips only the consumer current-seq marker from
   `R2 inline pending` to `R2 inline OK` and stages code, ledger, and wiki files.
5. Reviewer reruns the staged six-signal review and issues final HAT 3 `ACCEPT`.
6. Operator records direct `GO-COMMIT consumer` or a standing-authorization consumption.

No consumer mutation, staging, commit, or push is authorized by provider CI alone. Missing
consumer review or valid operator authorization is a STOP. An in-scope standing authorization
removes the need to ask again, but each transition still needs its own ledger record.

## D. Verify the consumer flip before commit

```bash
git -C <consumer-repo> diff --cached -- <consumer-ledger-file>
rg -n "^\|[[:space:]]*<consumer-seq>[[:space:]]*\|" <consumer-ledger-file>
```

Read the table header to locate the `R2 inline` column, require exactly one anchored consumer-seq
row, and require that cell to equal `R2 inline OK`. Documentary prose and other seq rows do not
count.

## E. Verify the complete consumer staging set

```bash
git -C <consumer-repo> status --short
git -C <consumer-repo> diff --cached --name-status
```

Require all authorized consumer code, ledger, and wiki files and nothing else.

## F. Commit consumer

```bash
git -C <consumer-repo> commit -m "<atomic consumer message with provider seq>"
```

## G. Push consumer

```bash
git -C <consumer-repo> push origin <consumer-branch>
```

## H. Watch consumer CI

Run the authoritative CI watch to completion and record run URL, commit SHA,
exit code, and GREEN result. The dual delivery closes only after both remote
commits exist, both CI runs are GREEN, both ledger rows are OK, and both wiki
records match the landed SHAs.

## Stop conditions

- No HAT 3 ACCEPT or no valid operator authorization for either commit: stop.
- Missing row: return to HAT 1; never synthesize an already-OK row.
- Provider CI RED: repair provider in a new cycle; consumer remains untouched.
- Push rejection: fetch/rebase only when the exact recovery is authorized; never force-push main.
- Pending marker discovered after commit: record a state-integrity incident and
  repair it in a new reviewed commit; never rewrite published history silently.
