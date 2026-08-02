---
description: Perform an independent HAT 3 tactical, strategic, and six-signal closure review; only a distinct reviewer may ACCEPT.
---

# /adversarial-pairing:adversarial-review

Act only as the declared REVIEWER. Do not edit files, repair the diff, stage,
commit, push, issue operator GO, or declare a standing authorization. Inspect evidence independently; an
implementer's summary is a claim, not proof.

Required inputs:

- reviewer and implementer instance IDs (must differ);
- current seq and accepted HAT 1 STOP report;
- repository root(s), authorized file list, ledger row, and wiki tier;
- HAT 2 RED/GREEN evidence and the candidate file inventory.
- direct operator decisions, or the standing-authorization record and its prior consumptions.

If any input is absent, return `REDIRECT` with the missing evidence.

## A. Determine the review phase and inspect the right surface

Read the canonical feature-ledger table structurally: locate the `R2 inline`
column from its header, then locate exactly one anchored row for the current
seq. Do not search the whole ledger for free-text `pending` or `ACCEPT` tokens;
mantras, evidence, and historical rows are documentary text, not current state.

When the current R2 cell is `R2 inline pending`, this is the **pre-flip review**.
Review the working-tree candidate and every untracked path:

```bash
git status --short
git diff --name-status
git diff --stat
git diff
git ls-files --others --exclude-standard
git diff --cached --name-status
```

An empty index and empty `git diff --cached` are valid in this phase and are not
missing evidence. Inspect the contents of every authorized untracked file with a
read-only file operation; `git diff` does not include them. Any path outside the
accepted HAT 1 file list is a redirect. If the index is not empty, disclose it
and inspect it as part of the candidate, but it cannot serve as the final staged
review required after the flip.

When the current R2 cell is `R2 inline OK`, this is the **post-flip final
review**. Run:

```bash
git status --short
git diff --cached --name-status
git diff --cached --stat
git diff --cached
git diff --name-only
git ls-files --others --exclude-standard
```

The complete atomic patch must be staged. Unstaged or untracked authorized
changes are a redirect because the cached diff would not be the commit candidate.

In the applicable phase, verify:

1. **Anti-duplication:** for every new helper/export, run repository-wide `rg`
   searches for literal names, analogous implementations, wrappers, and dynamic
   dispatch. Cite exact paths and lines.
2. **Frozen details and shape pins:** compare every claimed constant, schema,
   prompt, enum, and public signature with the exact authoritative spec section.
3. **Immutable surfaces:** compare touched files and public contracts with the
   HAT 1 authorization. An unapproved touch is a redirect.
4. **Local coherence:** no dangling references, partial refactors, unexplained
   dependencies, generated noise, or file over 500 lines.
5. **State integrity:** pre-flip inventory covers tracked and untracked candidate
   files; post-flip staging contains only the complete intended patch, including
   ledger and required wiki changes.

## B. Strategic review against HAT 1

Verify that every changed file and design decision is traceable to the accepted
STOP report. Check scope containment, ground-truth support, redirect/split-event
documentation, and methodology adherence.

RED-before-code is established from the session record and captured failing
output, not inferred from commit order in a pre-commit diff. If the
evidence does not establish RED-first sequencing, return `REDIRECT`.

## C. Six closure signals — execute and record all six

All checks are scoped to the current seq. Record the exact command, exit code,
and relevant output. Never substitute a convenient runner for the project's
canonical command.

### Signal 1 — targeted and full tests

Run the project-native targeted GREEN command from the RED record, then the
project-native full suite. Require both exit 0 and no hidden skips/regressions.
Also verify the captured pre-fix RED output matches the same targeted test.

### Signal 2 — structural current-seq R2 state

Inspect the canonical table header and the one anchored current-seq row. Before
the flip, the exact R2 cell must be `R2 inline pending`; after the flip, inspect
that row in the cached diff and require the exact cell `R2 inline OK`:

```bash
rg -n "^\|[[:space:]]*<seq>[[:space:]]*\|" <ledger-file>
git diff --cached -- <ledger-file>   # required only for post-flip final review
```

Final PASS requires exactly one current row, the exact `R2 inline OK` cell, and
the staged reviewer/operator transition records. Generic words elsewhere in the
ledger or diff are not state evidence.

If the tactical, strategic, and other five signals pass but the current row is
still pending, emit the exact provisional token:

```text
ACCEPT-TO-FLIP — technical closure passes; operator flip authorization is required.
```

This is not final HAT 3 ACCEPT and authorizes no commit. After a direct
GO-to-flip or valid standing-authorization consumption is recorded, the implementer changes only
the current R2 cell to `R2 inline OK`, stages the complete atomic patch, and resubmits the cached
diff for final verification. The reviewer verifies scope but never consumes authorization.

### Signal 3 — confounder controlled

Inspect the current ledger row. Require either `confounder: N/A` with a specific
reviewer-approved rationale or the exact project-native confounder harness with
exit 0. A match from another seq does not pass.

### Signal 4 — wiki lint

Run the reviewed plugin-bundled linter against the project wiki:

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/wiki-lint.mjs" "<repo-root>/wiki" --json
```

Require exit 0 and `issueCount: 0`. Do not silently execute a preserved,
unreviewed target-owned script.
Run project-specific broken-link or duplicate-anchor checks separately when the
project defines them.

### Signal 5 — registry consistency

Run the project-specific real registry scanner in check mode. The bundled
`build-registries.mjs` is a scaffold/stub; output containing
`NOT a completeness proof` cannot satisfy this signal. If no real scanner
exists, require an explicit current-seq `N/A` rationale approved by the reviewer.

### Signal 6 — Tier-C reflection

Inspect the current ledger row and require exactly one of:

```text
tier-C: yes, p.<N>
tier-C: noop — <specific reason>
```

Silence, a match from another seq, or a bare `noop` fails.

## D. Decision

Return a table with Tactical, Strategic, and Signals 1–6, each marked
`PASS`, `FAIL`, or `N/A` with evidence. A signal may be N/A only where the spec
explicitly permits it and the rationale is approved.

Before the state flip, the only positive output is the provisional
`ACCEPT-TO-FLIP` token defined above. After the state flip and complete staging,
final output
must be exactly one of:

```text
ACCEPT — tactical and strategic review pass; all six closure signals are green.
REDIRECT — <numbered defects, exact evidence, and minimum required correction>.
```

Only the distinct reviewer may emit `ACCEPT`. ACCEPT does not commit. A direct GO or a separate,
recorded consumption of valid standing authorization is still required before commit/push. When
standing authorization already covers that exact effect, the implementer proceeds without asking
for another conversational GO. Any scope mismatch is `REDIRECT`.
