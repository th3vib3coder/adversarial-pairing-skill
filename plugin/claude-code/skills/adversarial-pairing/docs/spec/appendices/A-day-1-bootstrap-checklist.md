# Appendix A — Day 1 Bootstrap Checklist

**Parent index**: [README.md](../README.md)
**Cross-references**: [Cluster 4 — Wiki Discipline §4.5.1](../04-wiki-discipline.md) · [Cluster 1 §1.5.3](../01-roles-and-cycles.md)
**Version**: v0.2.0-rc.1

---

## Purpose

Use this appendix on Day 1 of any new project — before any code lands — to execute the 8-step
bootstrap. Bootstrap creates the wiki folder structure, installs wiki tools, initializes ledger
files, and creates a project `CLAUDE.md` only when one is absent. If one already exists, it is
preserved and a manual-merge block is printed for operator review. Bootstrap stops before git
commit; the first commit needs direct authorization or valid standing authorization that names the
target and effect.

---

## Two Invocation Paths

| Context | Command |
|---|---|
| Claude Code (plugin present) | `/adversarial-pairing:init-pairing` |
| Codex / no plugin | `bash tools/bootstrap.sh <target-project-root>` |

Both paths use the same installed, hardened no-clobber script and stop before commit. The Claude
command must not reproduce the procedure inline or fall back to direct Write/Edit operations.
Neither path may issue a git commit autonomously.

### Windows with Git Bash

From a Git Bash terminal, use POSIX drive paths and quote paths containing spaces:

```bash
bash "/c/Users/<user>/.codex/skills/adversarial-pairing/tools/bootstrap.sh" "/d/Work/My Project"
```

From PowerShell, locate Git for Windows explicitly when `bash.exe` is not on `PATH`:

```powershell
$gitBash = (Get-Command bash.exe -ErrorAction SilentlyContinue).Source
if (-not $gitBash) { $gitBash = "$env:ProgramFiles\Git\bin\bash.exe" }
& $gitBash -lc 'bash "/c/Users/<user>/.codex/skills/adversarial-pairing/tools/bootstrap.sh" "/d/Work/My Project"'
```

Replace the example roots with the reviewed installed skill and target. A Windows
path such as `D:\Work\My Project` becomes `/d/Work/My Project` inside Git Bash.
If Git Bash is absent or invocation returns `ENOENT`, stop and install/locate Git
for Windows; do not reproduce the bootstrap with PowerShell redirections.

---

## The 8-Step Checklist

### Step 1 — Create folder structure: `wiki/` + 8 subfolders

```
wiki/
  entities/
  concepts/
  sources/
  syntheses/
  hypotheses/
  manual/
  coverage/
  tools/
```

**Verification**: `ls wiki/` returns the eight subdirectory names. Steps 2 and 3 add
`CLAUDE.md` and `log.md` without overwriting files that already exist.

---

### Step 2 — Create missing `wiki/CLAUDE.md` from the schema template

When `wiki/CLAUDE.md` is absent, `bootstrap.sh` creates it from an inline LAW 13 schema
template; no separate template file is required. An existing file is preserved byte-for-byte.
The generated file documents the wiki schema: frontmatter fields
(status, type, role, provenance, last-verified-at), valid enum values per field, and the
Tier A/B/C update model used at every HAT 3 closure.

**Verification**: `head -5 wiki/CLAUDE.md` shows a YAML frontmatter block with required fields.

---

### Step 3 — Create missing `wiki/log.md` from the append-only template

When `wiki/log.md` is absent, `bootstrap.sh` creates it from an inline template. An existing
file is preserved byte-for-byte. The generated file is the append-only activity log for the
wiki layer and declares the append-only rule plus the column schema for log entries.

**Verification**: `head -8 wiki/log.md` shows valid YAML frontmatter; the body declares the
append-only rule.

---

### Step 4 — Create missing `wiki/tools/` utilities from packaged tools

Copy each packaged tool only when the corresponding target is absent; preserve existing target
tools byte-for-byte:

| Tool | Source |
|---|---|
| `build-registries.mjs` | `tools/build-registries.mjs` |
| `sync-mirror.mjs` | `tools/sync-mirror.mjs` |
| `wiki-lint.mjs` | `tools/wiki-lint.mjs` |
| `audit-entity-exports.mjs` | `tools/audit-entity-exports.mjs` |

**Verification**: `ls wiki/tools/` returns all four filenames.

---

### Step 5 — Generate 6 provisional registry stubs via `tools/build-registries.mjs`

```bash
node "<trusted-skill-root>/tools/build-registries.mjs" "<project-root>" --no-overwrite
```

`<trusted-skill-root>` is the reviewed installed skill or canonical source checkout. Never execute
the target's `wiki/tools/*` copy during bootstrap: no-clobber preserves pre-existing target files,
so their contents are not trusted implicitly.

This produces 6 registry files under `wiki/entities/`:

- `registry-cli-verbs.md`
- `registry-exported-symbols.md`
- `registry-db-writers.md`
- `registry-schema-graph.md`
- `registry-gate-triggers.md`
- `registry-protocol-invariants.md`

The bundled scanner is a stub. These files are explicitly marked `status: supposition` and
`scanner-mode: stub`; they are schema scaffolds only. They do not accumulate real entries and
must never be presented as evidence of codebase coverage. Replace or extend the scanner before
using registry completeness as a HAT 3 gate.

**Verification**: `ls wiki/entities/registry-*.md` returns 6 filenames. Each file has LAW 13
frontmatter plus an explicit warning that the scanner is a stub and the file is not a coverage proof.

---

### Step 6 — Create missing ledger files with header + mantras VERBATIM placeholder

When absent, create `feature-ledger.md` and `status-ledger.md` in the project root. This bootstrap
does not expose a configurable ledger path. Preserve existing ledgers byte-for-byte. Each generated file receives: (a) a header
comment declaring the append-only rule; (b) the mantras block VERBATIM as placeholder text. The
mantras block is not summarized or paraphrased — the trusted Node bootstrap runner generates it
from its in-package constant (no target-owned template is executed).

**Verification**: `grep -c "VERBATIM" feature-ledger.md` returns ≥ 1.

---

### Step 7 — Create or propose a manual merge for project `CLAUDE.md`

When no project-level `CLAUDE.md` exists, create one containing:

- Path to `wiki/` and `wiki/CLAUDE.md`
- Path to `feature-ledger.md` and `status-ledger.md`
- One-line note that every code-affecting patch requires parallel wiki sync + ledger row append
- Reference to Cluster 4 §4.5.1 for wiki discipline details

When `CLAUDE.md` already exists, preserve it byte-for-byte and print the proposed methodology
block as `manual merge required`. The operator decides whether and how to merge it after review.

**Verification**: for a newly created file, `grep -c "wiki/" CLAUDE.md` and
`grep -c "feature-ledger" CLAUDE.md` each return ≥ 1. For a pre-existing file, its hash is
unchanged and the bootstrap output contains `manual merge required` unless the marker was already present.

---

### Step 8 — Output READY and STOP

```
READY: bootstrap structure complete; operator authorization required for first commit
```

**STOP. NO git commit inside bootstrap.** The procedure is complete. The operator reviews the
scaffold. Only after a direct GO or a recorded consumption of standing authorization that expressly
names this repository and bootstrap commit may the implementer run `git add` and `git commit`.

No `git add`, `git commit`, or `git push` is issued by the bootstrap tool. A later pairing cycle
may proceed without another prompt only under the bounded contract in
[Appendix E](E-standing-operator-authorization.md).

**Verification**: the output line appears in the session log. No git commit exists in `git log`
for bootstrap artifacts until after direct or standing operator authorization is recorded.

---

## Common Failures and Recovery

| Failure | Symptom | Recovery |
|---|---|---|
| `tools/*.mjs` files absent | Step 4 copy fails; wiki/tools empty | Obtain tool set from canonical spec repo; do not hand-author tools |
| Transaction fails after directory creation | No `READY`; only empty runner-created directories may remain | Fix the reported cause and rerun. No-clobber completes missing files; rollback never removes pre-existing or unknown/concurrently substituted paths |
| Existing `wiki/CLAUDE.md` has wrong content | Schema fields incomplete | Correct it explicitly after review; bootstrap preserves existing files and will not overwrite it |
| Trusted `build-registries.mjs <project-root>` errors | Step 5 exits non-zero | Check Node.js version (≥18.17 required) and verify the reviewed skill installation |
| Stub registry check presented as coverage proof | `NOT a completeness proof` appears in output | Implement/use a project-specific scanner, or record reviewer-approved N/A rationale |
| Ledger mantras paraphrased instead of VERBATIM | Grep for "VERBATIM" returns 0 | Re-copy mantras block from template without modification |
| Commit issued without direct or standing operator authorization | `git log` shows an unauthorized bootstrap commit | Policy violation; flag it and do not continue without operator acknowledgment |
| Appendices dir absent | Import of this checklist fails | Create `docs/spec/appendices/` and re-read this file |

---

## Cross-References

- **Wiki Discipline §4.5.1** ([`../04-wiki-discipline.md`](../04-wiki-discipline.md)): canonical
  statement of the 8-step bootstrap protocol, rationale for an operator-authorized first commit, and
  failure modes for bootstrap-skipped and auto-commit scenarios.
- **Roles & Cycles §1.5.3** ([`../01-roles-and-cycles.md`](../01-roles-and-cycles.md)): defines
  Bootstrap mode vs Steady-state mode for pre-flight CI verification. Bootstrap mode applies on
  Day 1; the first task after bootstrap transitions the repo to Steady-state mode.
- **README.md** ([`../README.md`](../README.md)): full cluster index and glossary.
- **Appendix E** ([`E-standing-operator-authorization.md`](E-standing-operator-authorization.md)):
  bounded standing authorization and mandatory pause conditions.
