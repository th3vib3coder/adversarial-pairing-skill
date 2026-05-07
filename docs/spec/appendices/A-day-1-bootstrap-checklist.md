# Appendix A — Day 1 Bootstrap Checklist

**Parent index**: [README.md](../README.md)
**Cross-references**: [Cluster 4 — Wiki Discipline §4.5.1](../04-wiki-discipline.md) · [Cluster 1 §1.5.3](../01-roles-and-cycles.md)
**Version**: v0.1.0

---

## Purpose

Use this appendix on Day 1 of any new project — before any code lands — to execute the 8-step
bootstrap. Bootstrap creates the wiki folder structure, installs wiki tools, initializes ledger
files, and updates the project `CLAUDE.md`. It stops before git commit; the operator reviews
the scaffold and issues GO before the first commit is recorded.

---

## Two Invocation Paths (equivalent)

| Context | Command |
|---|---|
| Claude Code (plugin present) | `/init-pairing` |
| Codex / no plugin | `tools/bootstrap.sh <target-project-root>` |

Both paths execute the same 8 steps in the same order and stop at the same point: output of
`READY: bootstrap structure complete; operator GO required for first commit`. Neither path issues
a git commit autonomously.

---

## The 8-Step Checklist

### Step 1 — Create folder structure: `wiki/` + 7 subfolders + 2 base files

```
wiki/
  entities/
  concepts/
  manual/
  how-to/
  registry/
  tools/
  synthesis/
  CLAUDE.md   (placeholder, overwritten in Step 2)
  log.md      (placeholder, overwritten in Step 3)
```

**Verification**: `ls wiki/` returns 7 subdirectory names + `CLAUDE.md` + `log.md`.

---

### Step 2 — Inject `wiki/CLAUDE.md` from template (schema doc)

bootstrap.sh injects `wiki/CLAUDE.md` content (LAW 13 schema doc) via inline heredoc — no
separate template file required. This file documents the wiki schema: frontmatter fields
(status, type, role, provenance, last-verified-at), valid enum values per field, and the
Tier A/B/C update model used at every HAT 3 closure.

**Verification**: `head -5 wiki/CLAUDE.md` shows a YAML frontmatter block with required fields.

---

### Step 3 — Inject `wiki/log.md` from template (append-only header)

bootstrap.sh injects `wiki/log.md` (append-only header) via inline heredoc. This file is the
append-only activity log for the wiki layer. The heredoc provides the header comment that
declares the append-only rule and the column schema for log entries.

**Verification**: `head -3 wiki/log.md` shows the append-only header comment.

---

### Step 4 — Create `wiki/tools/` with 4 utilities copied from `tools/`

Copy four tools into `wiki/tools/`:

| Tool | Source |
|---|---|
| `build-registries.mjs` | `tools/build-registries.mjs` |
| `sync-mirror.mjs` | `tools/sync-mirror.mjs` |
| `wiki-lint.mjs` | `tools/wiki-lint.mjs` |
| `audit-entity-exports.mjs` | `tools/audit-entity-exports.mjs` |

**Verification**: `ls wiki/tools/` returns all four filenames.

---

### Step 5 — Generate 6 initial registries via `tools/build-registries.mjs`

```bash
node wiki/tools/build-registries.mjs <project-root>
```

This produces 6 registry files under `wiki/entities/`:

- `registry-cli-verbs.md`
- `registry-exported-symbols.md`
- `registry-db-writers.md`
- `registry-schema-graph.md`
- `registry-gate-triggers.md`
- `registry-protocol-invariants.md`

On Day 1 (empty codebase), registries contain headers only — no entries. That is correct and
expected; entries accumulate as patches land.

**Verification**: `ls wiki/entities/registry-*.md` returns 6 filenames. Each file has a header row.

---

### Step 6 — Create ledger files with header + mantras VERBATIM placeholder

Create `feature-ledger.md` and `status-ledger.md` in the project root (or configured ledger
path). Each file receives: (a) a header comment declaring the append-only rule; (b) the mantras
block VERBATIM as placeholder text. The mantras block is not summarized or paraphrased — it is
injected via inline heredoc by bootstrap.sh (no separate template file).

**Verification**: `grep -c "VERBATIM" feature-ledger.md` returns ≥ 1.

---

### Step 7 — Update project `CLAUDE.md` with reference to wiki + ledger workflow

Append or update the project-level `CLAUDE.md` with:

- Path to `wiki/` and `wiki/CLAUDE.md`
- Path to `feature-ledger.md` and `status-ledger.md`
- One-line note that every code-affecting patch requires parallel wiki sync + ledger row append
- Reference to Cluster 4 §4.5.1 for wiki discipline details

Do not overwrite existing `CLAUDE.md` content — append a clearly delimited section.

**Verification**: `grep -c "wiki/" CLAUDE.md` returns ≥ 1. `grep -c "feature-ledger" CLAUDE.md`
returns ≥ 1.

---

### Step 8 — Output READY and STOP

```
READY: bootstrap structure complete; operator GO required for first commit
```

**STOP. NO git commit.** The bootstrap procedure is complete. The operator reviews the scaffold
and issues GO. Only after operator GO does the implementer run `git add` and `git commit`.

No `git add`, `git commit`, or `git push` is issued autonomously during or after bootstrap.

**Verification**: the output line appears in the session log. No git commit exists in `git log`
for bootstrap artifacts until after operator GO.

---

## Common Failures and Recovery

| Failure | Symptom | Recovery |
|---|---|---|
| `tools/*.mjs` files absent | Step 4 copy fails; wiki/tools empty | Obtain tool set from canonical spec repo; do not hand-author tools |
| `wiki/CLAUDE.md` injected with wrong content | Schema fields incomplete | Re-run bootstrap.sh to re-inject via heredoc; verify frontmatter fields |
| `build-registries.mjs <project-root>` errors | Step 5 exits non-zero | Check Node.js version (≥18 required); verify wiki/tools/ has the correct tool |
| Ledger mantras paraphrased instead of VERBATIM | Grep for "VERBATIM" returns 0 | Re-copy mantras block from template without modification |
| Auto-commit issued before operator GO | `git log` shows a bootstrap commit | This is a policy violation; flag to operator; do not proceed without explicit acknowledgment |
| Appendices dir absent | Import of this checklist fails | Create `docs/spec/appendices/` and re-read this file |

---

## Cross-References

- **Wiki Discipline §4.5.1** ([`../04-wiki-discipline.md`](../04-wiki-discipline.md)): canonical
  statement of the 8-step bootstrap protocol, rationale for operator-gated first commit, and
  failure modes for bootstrap-skipped and auto-commit scenarios.
- **Roles & Cycles §1.5.3** ([`../01-roles-and-cycles.md`](../01-roles-and-cycles.md)): defines
  Bootstrap mode vs Steady-state mode for pre-flight CI verification. Bootstrap mode applies on
  Day 1; the first task after bootstrap transitions the repo to Steady-state mode.
- **README.md** ([`../README.md`](../README.md)): full cluster index and glossary.
