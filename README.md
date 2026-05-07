# adversarial-pairing

A reusable methodology for two-agent agentic workflows: implementer + adversarial reviewer, structured HAT cycles, parallel ledger/wiki updates, and traceable delivery.

---

## Why

Two-agent agentic workflows lose their way during long delivery cycles.
Implementers drift from spec. Reviewers self-certify. Ledgers fall behind.
The work ships, but nobody can reconstruct what was verified and what was assumed.

This framework distills a reusable methodology — implementer + adversarial reviewer + structured HAT cycles + parallel ledger/wiki updates — that prevents drift, enforces ground-truth verification, and makes the work traceable.

Key guarantees:

- Every claim the implementer makes is adversarially attacked before acceptance.
- Every gate (tests, lint, line-count) runs before the ledger entry closes.
- Every redirect and closure is recorded with evidence, not assertion.
- The wiki and ledger are updated atomically with the code change, not after.

---

## What's inside

### Spec (`docs/spec/`)

12 files: 1 README + 7 discipline clusters + 4 appendices.

| File | Topic |
|------|-------|
| `README.md` | Spec index and reading order |
| `01-roles-and-cycles.md` | Implementer / reviewer roles, HAT cycle protocol |
| `02-verification-discipline.md` | Gate definitions, evidence rules, no-self-cert policy |
| `03-ledger-discipline.md` | Ledger schema, update triggers, dual-commit pattern |
| `04-wiki-discipline.md` | Wiki update rules, atomic-with-code requirement |
| `05-code-discipline.md` | Line-count cap (500), naming, template conventions |
| `06-state-integrity.md` | State-machine rules, redirect taxonomy, pending-flip guard |
| `07-plan-and-document-discipline.md` | Plan discipline, document scope, traceability chain |
| `appendices/A-day-1-bootstrap-checklist.md` | Bootstrap checklist for a new pairing engagement |
| `appendices/B-six-closure-signals.md` | The six signals that legitimately close a ledger entry |
| `appendices/C-pre-survey-grep-patterns.md` | Grep patterns for pre-survey ground-truth checks |
| `appendices/D-dual-commit-playbook.md` | Step-by-step dual-commit procedure |

### Case study (`docs/case-studies/phase-9-wave-5/`)

Reference implementation: Wave 5 v2.1 of a production Phase 9 delivery.
5 files covering the full arc — sequential trail, redirect events, closure evidence, per-cluster examples, and a README index.

| File | Content |
|------|---------|
| `README.md` | Case study index and summary |
| `01-trail.md` | Chronological sequence trail |
| `02-redirect-events.md` | Catalog of redirects and their causes |
| `03-closure-evidence.md` | Closure signals with evidence references |
| `04-per-cluster-examples.md` | Per-discipline annotated examples |

### Skills

| File | Entry point |
|------|-------------|
| `skills/claude-code/adversarial-pairing/SKILL.md` | Claude Code entry point — invoke via `/adversarial-pairing` |
| `skills/codex/adversarial-pairing/SKILL.md` | Codex (OpenAI) entry point |

### Plugin (`plugin/claude-code/`)

Claude Code plugin: 5 slash commands + 2 runtime hooks.

**Commands** (`plugin/claude-code/commands/`):

| Command | Purpose |
|---------|---------|
| `/init-pairing` | Bootstrap a new adversarial-pairing engagement |
| `/adversarial-review` | Run a reviewer-side adversarial review pass |
| `/hat-1-stop` | Execute HAT-1 stop (gate check + ledger update) |
| `/dual-commit` | Perform atomic dual-commit (code + ledger) |
| `/lint-discipline` | Run lint-discipline gate (500-line rule + naming) |

**Hooks** (`plugin/claude-code/hooks/`):

| Hook | Purpose |
|------|---------|
| `ledger-mantra-check.js` | Blocks tool calls that would update the ledger without the required mantra prefix |
| `pending-flip-guard.js` | Blocks state flips from `pending` to `done` without a gate-evidence reference |

### Tools (`tools/`)

4 ESM scripts + 2 shell utilities.

| File | Purpose |
|------|---------|
| `audit-entity-exports.mjs` | Audit entity export completeness against the registry |
| `build-registries.mjs` | Build entity and pattern registries from source |
| `sync-mirror.mjs` | Sync the ledger mirror to the wiki |
| `wiki-lint.mjs` | Lint wiki documents against the discipline schema |
| `bootstrap.sh` | Bootstrap a target project with the pairing harness |
| `lint-discipline.sh` | Self-application lint gate (line-count + naming) |

---

## Quick start

### Codex / no-plugin

Run the bootstrap script against your target project root:

```bash
bash tools/bootstrap.sh <target-project-root>
```

This copies the harness templates, initializes the ledger skeleton, and prints
the day-1 checklist from `appendices/A-day-1-bootstrap-checklist.md`.

### Claude Code (with plugin)

1. Install the plugin by pointing Claude Code at `plugin/claude-code/`.
2. Invoke `/init-pairing` to bootstrap a new engagement.
3. Use `/adversarial-review`, `/hat-1-stop`, `/dual-commit`, and `/lint-discipline`
   during the delivery cycle.

Alternatively, run `tools/bootstrap.sh` manually (same as the Codex path) and
skip the plugin installation.

---

## Status

v0.1.0 — public distribution of the full adversarial-pairing methodology package: spec, case study, Claude Code plugin, Codex skill, Claude Code skill, hooks, and tools.

---

## License

MIT. See `LICENSE`.

---

## Contributing

Pattern evolution follows the framework itself:

1. New pattern proposed in `docs/proposals/<pattern>.md`.
2. Adversarial review by a second agent (reviewer role, spec §01).
3. Gates pass (tests, lint, line-count).
4. Minor version bump + ledger entry.

No pattern is accepted on the implementer's self-certification alone.
