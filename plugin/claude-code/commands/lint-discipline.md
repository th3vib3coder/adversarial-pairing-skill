---
description: Run valid mechanical discipline checks without treating provisional registry stubs as coverage evidence.
allowed-tools: Bash
---

# /adversarial-pairing:lint-discipline

Run the checks below from the target repository root. Report each command, its exit code,
and the exact violations. Never convert SKIP or N/A into PASS.

## 1. Scope and staged state

```bash
git status --short
git diff --cached --name-only --diff-filter=ACMR
```

If there is no staged diff, say so. Do not silently switch to `HEAD~1`; pre-commit HAT evidence
belongs to `git diff --cached`.

## 2. Cluster 7: 500-line ceiling

For every staged Markdown file under a spec, plan, wiki, or skill path, run `wc -l` and fail
when the count exceeds 500. Also flag 400-500 lines as an early-warning band. Quote paths so
spaces are safe. Report the file and exact count.

## 3. Cluster 3: ledger and mantra presence

If the project declares exact mantras in its project instructions, verify those exact strings
in every declared save target. Do not use generic hard-coded mantras as substitutes. Confirm
that the current seq has exactly one staged `feature-ledger.md` row and a staged `wiki/log.md`
entry when the patch affects code. If the project declares no save targets, report N/A and ask
the reviewer to decide; do not invent them.

## 4. Cluster 4: LAW 13 frontmatter

Use the plugin-bundled reviewed linter with the required positional wiki path. Never execute a
preserved target-owned `wiki/tools/*` file merely because bootstrap found it there.

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/wiki-lint.mjs" "<repo-root>/wiki" --json
```

PASS requires exit 0 and JSON `issueCount: 0`. If the tool is absent, report SKIP, which is
not a pass. Do not call the unsupported form `node tools/wiki-lint.mjs --staged`.

## 5. Registry signal

If a project-specific real scanner is configured, run its documented check. Otherwise this
trusted command may be used only to detect drift in the bundled provisional scaffold:

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/build-registries.mjs" "<repo-root>" --check
```

Output containing `NOT a completeness proof` means N/A for registry coverage even when the
process exits 0. Record a reviewer-approved N/A rationale; never label the stub result PASS.

## 6. HAT state checks

Locate the current seq structurally. Read the feature-ledger table header to
identify the `seq`, `R2 inline`, and `tier-C` columns, then require exactly one
anchored current-seq row. Inspect the current transition rows in the status
ledger and the current wiki log entry separately:

```bash
rg -n "^\|[[:space:]]*<seq>[[:space:]]*\|" <feature-ledger-file>
git diff --cached -- <feature-ledger-file>
git diff --cached -- <status-ledger-file>
git diff --cached -- <wiki-log-file>
```

Require the current row's exact R2 cell and a reasoned current-row Tier-C cell.
Match reviewer/operator decisions only in transition rows anchored to the same
seq. Never grep the whole diff for generic `ACCEPT`, `HOLD`, or `pending` text:
the command documentation, mantras, historical rows, and residual disclosures
can contain those words. Do not mutate a ledger or create a decision token while
running lint.

## Result

Return a table with `check`, `status` (`PASS`, `FAIL`, `SKIP`, or `N/A`), `evidence`, and
`exit code`. Overall PASS is allowed only when every required mechanical check is PASS and all
N/A items carry reviewer approval. Stop before any commit.
