---
description: Day 1 bootstrap for a new adversarial-pairing scope; runs the 8-step Appendix A checklist and stops before any git commit (operator GO required).
argument-hint: <target-project-root>
---

# /init-pairing

Day 1 bootstrap for a new adversarial-pairing scope. This slash command is the
Claude Code equivalent of running `tools/bootstrap.sh <target-project-root>`
from a terminal. Both paths perform the identical 8 Appendix A bootstrap steps.
Both stop unconditionally before any git commit; the operator must issue an
explicit GO before the first commit is created.

---

## Invocation

```
/init-pairing <target-project-root>
```

- `<target-project-root>` — an **existing** directory path that will receive the
  wiki scaffold and ledger files. It does **not** have to be a git repository yet.

---

## Equivalence note

`/init-pairing <target>` and `tools/bootstrap.sh <target>` are two entry points
for the same operation. Both execute the 8 steps below in order and both
terminate at the same STOP boundary (Step 8). The agent may choose either path:

- **Delegated** — call `tools/bootstrap.sh <target-project-root>` if the script
  is available and executable in the current environment.
- **Inline** — execute Steps 1-7 directly using Bash and Write tools, then print
  the Step 8 READY message.

Neither path ever creates a git commit.

---

## Path validation (Windows hosts)

On Windows, paths must be in POSIX style before passing to bash:

- **MSYS / Git Bash**: use `/c/Users/…` (drive letter lowercased, no colon)
- **WSL**: use `/mnt/c/Users/…`

`tools/bootstrap.sh` has a built-in path guard that auto-converts Windows-style
paths (`C:\…` or `C:/…`) via `cygpath -u` (MSYS) or `wslpath -u` (WSL) when
those tools are available. If neither is available the script exits with an
error and instructs the operator to pass a POSIX path manually.

---

## Bootstrap steps (Appendix A)

### Step 1 — Create wiki folder structure

Create the following 8 subfolders inside `<target>`:

```
<target>/wiki/concepts/
<target>/wiki/entities/
<target>/wiki/sources/
<target>/wiki/syntheses/
<target>/wiki/hypotheses/
<target>/wiki/manual/
<target>/wiki/coverage/
<target>/wiki/tools/
```

```bash
mkdir -p \
  "$TARGET/wiki/concepts" \
  "$TARGET/wiki/entities" \
  "$TARGET/wiki/sources" \
  "$TARGET/wiki/syntheses" \
  "$TARGET/wiki/hypotheses" \
  "$TARGET/wiki/manual" \
  "$TARGET/wiki/coverage" \
  "$TARGET/wiki/tools"
```

Result: `[ ] Created`

---

### Step 2 — Inject `<target>/wiki/CLAUDE.md`

Write the LAW 13 schema placeholder document at `<target>/wiki/CLAUDE.md`.
This file documents the required YAML frontmatter schema for all wiki pages.

Contents must include:

- Required frontmatter fields: `status`, `type`, `role`, `provenance`,
  `last-verified-at`
- Status definitions: `sourced`, `computed`, `claimed`, `supposition`
- A note that this placeholder was injected by bootstrap and should be replaced
  with project-specific schema details

Result: `[ ] Injected`

---

### Step 3 — Inject `<target>/wiki/log.md`

Write an append-only change-log header at `<target>/wiki/log.md`.

Contents:

```markdown
# Wiki Change Log

Append-only. Most recent first.

<!-- FORMAT: each entry on one line:
  YYYY-MM-DD | <author> | <page-path> | <change-summary>
-->
```

Result: `[ ] Injected`

---

### Step 4 — Copy 4 ESM tools into `<target>/wiki/tools/`

Copy the following four files from this repo's `tools/` directory into
`<target>/wiki/tools/`:

| Source (this repo)                  | Destination                              |
|-------------------------------------|------------------------------------------|
| `tools/build-registries.mjs`        | `<target>/wiki/tools/build-registries.mjs`  |
| `tools/sync-mirror.mjs`             | `<target>/wiki/tools/sync-mirror.mjs`       |
| `tools/wiki-lint.mjs`               | `<target>/wiki/tools/wiki-lint.mjs`         |
| `tools/audit-entity-exports.mjs`    | `<target>/wiki/tools/audit-entity-exports.mjs` |

```bash
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for tool in build-registries sync-mirror wiki-lint audit-entity-exports; do
  cp "$REPO_ROOT/tools/${tool}.mjs" "$TARGET/wiki/tools/${tool}.mjs"
done
```

Result: `[ ] 4 tools copied`

---

### Step 5 — Generate 6 initial registries

Run `build-registries.mjs` against the target to produce 6 registry stubs.
This is advisory: if the target codebase is empty on Day 1, the registries
will be empty stubs and that is expected.

```bash
node "$TARGET/wiki/tools/build-registries.mjs" "$TARGET"
```

On Windows with WSL / node.exe interop, `bootstrap.sh` automatically converts
the tool path and target argument to Windows-style paths using `wslpath -w` when
`node.exe` is the only Node runtime available.

If no Node runtime is found, print a warning and continue — registry generation
is non-fatal.

Result: `[ ] Registries generated  [ ] WARNING: no Node runtime — skipped`

---

### Step 6 — Inject ledger files

Write two ledger files at the **target repo root** (not inside `wiki/`):

**`<target>/feature-ledger.md`**

```markdown
# Feature Ledger

Per-patch rows. Add one row per feature shipped.

## Mantras (VERBATIM placeholder — replace with project mantras)

- "<mantra 1>"
- "<mantra 2>"

## Columns

| patch | feature | mantra | status | notes |
|-------|---------|--------|--------|-------|
```

**`<target>/status-ledger.md`**

```markdown
# Status Ledger

Per-cluster status. Update when cluster status changes.

## Mantras (VERBATIM placeholder — replace with project mantras)

- "<mantra 1>"
- "<mantra 2>"

## Columns

| cluster | gate | status | last-updated | notes |
|---------|------|--------|--------------|-------|
```

Result: `[ ] feature-ledger.md written  [ ] status-ledger.md written`

---

### Step 7 — Append `## adversarial-pairing methodology` block to `<target>/CLAUDE.md`

If `<target>/CLAUDE.md` already contains the header
`## adversarial-pairing methodology`, skip this step (idempotent).

Otherwise, append the following block (or create the file if absent):

```markdown
## adversarial-pairing methodology

This project uses the adversarial-pairing two-agent methodology framework.

- Wiki source of truth: `wiki/` (LAW 13 frontmatter required on all pages)
- Per-patch ledger: `feature-ledger.md` + `status-ledger.md` (mantras VERBATIM in save targets)
- Tools: `wiki/tools/` (build-registries, sync-mirror, wiki-lint, audit-entity-exports)
- Day 1 bootstrap was performed via `bootstrap.sh` or `/init-pairing`

For full methodology, see the adversarial-pairing repo: docs/spec/, skills/, plugin/.
```

Result: `[ ] Appended  [ ] Skipped (already present)`

---

### Step 8 — STOP

Do **not** run `git init`, `git add`, or `git commit`. Print exactly:

```
READY: bootstrap structure complete; operator GO required for first commit
```

The operator reviews the scaffold and issues GO when satisfied. The first commit
is always a manual operator action.

---

## Outcome

```
[ ] READY — all 8 steps complete; operator may issue GO
[ ] ABORT — fatal error in steps 2-7 (e.g., target directory does not exist)
```

A missing target directory is fatal and must abort before Step 1. All other
errors in Steps 2-7 should be reported with context; the agent may continue to
subsequent steps unless the failure makes continuation impossible.
