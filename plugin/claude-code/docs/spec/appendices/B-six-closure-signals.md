# Appendix B — Six Closure Signals Reference

**Purpose.** At every HAT 3 closure gate a distinct reviewer MUST confirm all
six signals before recording the cycle as complete. A cycle is not closed until
every signal is green. Work through signals 1–6 in order, record exact evidence,
then require direct GO or a valid standing-authorization consumption before commit.

HAT 3 has two review surfaces. Before the flip, inspect `git diff`, `git status`,
and every authorized untracked file; an empty index is valid. Signals 1 and 3–6
may support provisional `ACCEPT-TO-FLIP`, while Signal 2 honestly remains
pending. After direct or standing flip authorization, inspect the complete cached patch; only this
post-flip review can make all six signals green and produce final HAT 3 ACCEPT.

Cross-references: [01-roles-and-cycles.md](../01-roles-and-cycles.md) §HAT 3,
[03-ledger-discipline.md](../03-ledger-discipline.md) §3.4,
[04-wiki-discipline.md](../04-wiki-discipline.md) §4.5,
[06-state-integrity.md](../06-state-integrity.md) §6.5.

---

## Signal 1 — Tests pass

**What.** The project-native targeted test has captured RED-before-code evidence
and now passes; the project-native full suite also passes without regressions.

```bash
<project-native targeted test command>   # captured RED before implementation; GREEN now
<project-native full-suite command>      # exit 0 required
```

Discover and record the commands from manifests, build files, contributor docs,
or CI configuration. Do not assume a language-specific runner.

## Signal 2 — R2 inline OK

**What.** After reviewer approval and direct or standing flip authorization, the current-seq
ledger marker has changed from the exact `R2 inline pending` placeholder to
`R2 inline OK` and the transition is staged before commit.

```bash
rg -n "^\|[[:space:]]*<seq>[[:space:]]*\|" <ledger-file>
git diff --cached -- <ledger-file>                 # post-flip cached row
```

Read the table header to locate the R2 column and require exactly one anchored
current-seq row. A generic token elsewhere in prose, another column, another
row, or the diff is not evidence for this signal.

## Signal 3 — Confounder N/A (or harness OK)

**What.** The current ledger row records a specific reviewer-approved
`confounder: N/A` rationale, or the project-native confounder harness exits 0.

```bash
rg -n "confounder: N/A" feature-ledger.md
<project-native confounder harness command>
```

A match belonging to another seq does not pass.

## Signal 4 — wiki lint issueCount = 0

**What.** A reviewed/trusted copy of the bundled wiki linter reports zero LAW 13
frontmatter issues. It does not check broken links or duplicate anchors; run
project-specific checks for those separately.

```bash
node <trusted-skill-root>/tools/wiki-lint.mjs <repo-root>/wiki --json
```

Require exit 0 and `issueCount: 0`. Do not silently execute a preserved,
unreviewed target-owned tool.

## Signal 5 — registry consistency

**What.** A project-specific real scanner confirms that registries match the
files on disk. The bundled builder is explicitly a scaffold/stub: its `--check`
only validates placeholder drift and is not evidence of codebase coverage.
Until a real scanner exists, record reviewer-approved N/A with a current-seq
rationale.

```bash
<project-specific real registry scanner command>   # exit 0
# Output containing "NOT a completeness proof" cannot satisfy this signal.
```

## Signal 6 — Tier-C reflection logged

**What.** The current ledger row contains exactly one of:

```text
tier-C: yes, p.<N>
tier-C: noop — <specific reason>
```

Silence, a match from another seq, or a bare `noop` is red.

---

## Quick reference

| # | Signal | Pass condition |
|---|--------|----------------|
| 1 | Tests pass | Same targeted test has captured RED then GREEN; project-native full suite exits 0 |
| 2 | R2 inline OK | Header-defined R2 cell in the one staged current-seq row is exactly `R2 inline OK` |
| 3 | Confounder | Current-seq N/A rationale approved, or harness exits 0 |
| 4 | Wiki lint | Trusted linter exits 0 with `issueCount: 0` |
| 5 | Registry check | Real scanner exits 0, or reviewer-approved current-seq N/A; stub is insufficient |
| 6 | Tier-C | Current-seq `yes, p.<N>` or reasoned `noop` |

## Failure modes

| Signal | Red condition | Remediation |
|--------|---------------|-------------|
| 1 | RED evidence missing, targeted test fails, or full suite fails | Restore RED evidence or fix; never suppress |
| 2 | Row missing, unstaged, or still pending | Obtain approval and valid flip authorization, apply pending → OK, stage, resubmit |
| 3 | No current-seq control/rationale | Add honest N/A rationale or run harness |
| 4 | Non-zero exit or issueCount > 0 | Fix reported issues; rerun trusted linter |
| 5 | Non-zero exit or stub presented as completeness | Use a real scanner or record approved N/A |
| 6 | Current-seq Tier-C field absent/empty | Add page reference or specific noop rationale |

## Cluster mapping

| Signal | Primary cluster |
|--------|-----------------|
| 1 Tests pass | Cluster 5 — Code Discipline |
| 2 R2 inline OK | Cluster 6 — State Integrity §6.5.1 |
| 3 Confounder | Cluster 5 — Code Discipline |
| 4 Wiki lint | Cluster 4 — Wiki Discipline |
| 5 Registry consistency | Cluster 4 — Wiki Discipline |
| 6 Tier-C reflection | Cluster 4 — Wiki Discipline §4.5.4 |
