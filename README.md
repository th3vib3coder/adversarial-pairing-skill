# adversarial-pairing

A reusable methodology for two-agent agentic workflows: implementer + adversarial reviewer, structured HAT cycles, parallel ledger/wiki updates, and traceable delivery.

Installation, prerequisites, scopes, and v0.1.x migration are documented in
[`docs/installation.md`](docs/installation.md).

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
- A bounded standing authorization can remove repetitive operator prompts without removing the
  distinct reviewer, state gates, or CI watch.

---

## What's inside

### Spec (`docs/spec/`)

13 files: 1 README + 7 discipline clusters + 5 appendices.

| File | Topic |
|------|-------|
| [`docs/spec/README.md`](docs/spec/README.md) | Spec index and reading order |
| [`docs/spec/01-roles-and-cycles.md`](docs/spec/01-roles-and-cycles.md) | Implementer / reviewer roles, HAT cycle protocol |
| [`docs/spec/02-verification-discipline.md`](docs/spec/02-verification-discipline.md) | Gate definitions, evidence rules, no-self-cert policy |
| [`docs/spec/03-ledger-discipline.md`](docs/spec/03-ledger-discipline.md) | Ledger schema, update triggers, dual-commit pattern |
| [`docs/spec/04-wiki-discipline.md`](docs/spec/04-wiki-discipline.md) | Wiki update rules, atomic-with-code requirement |
| [`docs/spec/05-code-discipline.md`](docs/spec/05-code-discipline.md) | Line-count cap (500), naming, template conventions |
| [`docs/spec/06-state-integrity.md`](docs/spec/06-state-integrity.md) | State-machine rules, redirect taxonomy, pending-flip guard |
| [`docs/spec/07-plan-and-document-discipline.md`](docs/spec/07-plan-and-document-discipline.md) | Plan discipline, document scope, traceability chain |
| [`docs/spec/appendices/A-day-1-bootstrap-checklist.md`](docs/spec/appendices/A-day-1-bootstrap-checklist.md) | Bootstrap checklist for a new pairing engagement |
| [`docs/spec/appendices/B-six-closure-signals.md`](docs/spec/appendices/B-six-closure-signals.md) | The six signals that legitimately close a ledger entry |
| [`docs/spec/appendices/C-pre-survey-grep-patterns.md`](docs/spec/appendices/C-pre-survey-grep-patterns.md) | Grep patterns for pre-survey ground-truth checks |
| [`docs/spec/appendices/D-dual-commit-playbook.md`](docs/spec/appendices/D-dual-commit-playbook.md) | Step-by-step dual-commit procedure |
| [`docs/spec/appendices/E-standing-operator-authorization.md`](docs/spec/appendices/E-standing-operator-authorization.md) | Scoped authorization without repetitive GO prompts |

### Historical case study (`docs/case-studies/phase-9-wave-5/`)

Non-normative historical evidence: Wave 5 v2.1 of a production Phase 9 delivery. Its legacy
single-stage ACCEPT terminology is mapped to the current two-stage gate in the case-study README.
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
| [`skills/claude-code/adversarial-pairing/SKILL.md`](skills/claude-code/adversarial-pairing/SKILL.md) | Claude Code entry point |
| [`skills/codex/adversarial-pairing/SKILL.md`](skills/codex/adversarial-pairing/SKILL.md) | Codex (OpenAI) entry point |

### Plugin (`plugin/claude-code/`)

Claude Code plugin: 5 slash commands + 2 runtime hooks.

**Commands** (`plugin/claude-code/commands/`):

| Command | Purpose |
|---------|---------|
| `/adversarial-pairing:init-pairing` | Delegate to the packaged no-clobber bootstrap; stop before commit |
| `/adversarial-pairing:adversarial-review` | Run a reviewer-side adversarial review pass |
| `/adversarial-pairing:hat-1-stop` | Execute HAT-1 stop (gate check + ledger update) |
| `/adversarial-pairing:dual-commit` | Perform atomic dual-commit (code + ledger) |
| `/adversarial-pairing:lint-discipline` | Run valid mechanical checks; disclose stub registry coverage as N/A |

**Hooks** (`plugin/claude-code/hooks/`):

| Hook | Purpose |
|------|---------|
| [`ledger-mantra-check.js`](plugin/claude-code/hooks/ledger-mantra-check.js) | Advises when code edits lack the paired ledger/log update |
| [`pending-flip-guard.js`](plugin/claude-code/hooks/pending-flip-guard.js) | Blocks every Bash-tool commit while a canonical ledger still has `R2 inline pending` |

Activation, scope, and compatibility notes:
[`plugin/claude-code/hooks/ENABLE.md`](plugin/claude-code/hooks/ENABLE.md).
Plugin hooks are active whenever the plugin is enabled at its selected user, project, or local
scope. Bootstrap never changes hook settings.

### Tools (`tools/`)

6 ESM scripts + 2 shell utilities.

| File | Purpose |
|------|---------|
| `audit-entity-exports.mjs` | Audit entity export completeness against the registry |
| [`tools/build-registries.mjs`](tools/build-registries.mjs) | Write and verify disclosed deterministic registry stubs; this is not a source scanner |
| `sync-mirror.mjs` | Sync the ledger mirror to the wiki |
| `wiki-lint.mjs` | Lint wiki documents against the discipline schema |
| `bootstrap.sh` | No-clobber scaffold; rejects broad or linked targets before writing |
| `bootstrap-apply.mjs` | Apply the preflight-authorized scaffold with exclusive no-clobber writes |
| `bootstrap-preflight.mjs` | Validate runtime, source tools, target, and managed paths before bootstrap writes |
| `lint-discipline.sh` | Self-application lint gate (line-count + naming) |

---

## Quick start

### Codex / no-plugin

Run the bootstrap script against your target project root:

```bash
bash tools/bootstrap.sh <target-project-root>
```

From Windows PowerShell, call Git Bash explicitly and quote both paths:

```powershell
$gitBash = 'C:\Program Files\Git\bin\bash.exe'
& $gitBash 'tools/bootstrap.sh' 'D:\path\to\target-project'
```

If Git for Windows is installed elsewhere, locate `bash.exe` first. Do not continue after an
`ENOENT`/“bash not found” error; no inline Write/Edit fallback is equivalent to the trusted script.

This creates only missing scaffold files, preserves existing wiki pages, tools, registries,
ledgers, and project instructions, and stops before any commit. The bundled registry builder
emits disclosed stubs; only a real project scanner can provide codebase coverage. The day-1
checklist is
[`docs/spec/appendices/A-day-1-bootstrap-checklist.md`](docs/spec/appendices/A-day-1-bootstrap-checklist.md).

If bootstrap fails after creating directories, the only permitted residue is empty directories
created by that run. Cleanup never removes a pre-existing path or an unknown/concurrently
substituted path. Fix the cause and rerun: no-clobber completes the missing scaffold while
preserving everything already present.

For a bounded autonomous repair, the operator may grant standing authorization once. It must name
the objective, repositories/branches, transitions, external effects, expiry, and exclusions. The
implementer records every consumption and continues only after independent reviewer decisions;
merge/tag/release and destructive operations are never implied. See
[`docs/spec/appendices/E-standing-operator-authorization.md`](docs/spec/appendices/E-standing-operator-authorization.md).

### Claude Code (with plugin)

1. Follow the marketplace installation in [`docs/installation.md`](docs/installation.md).
2. Invoke `/adversarial-pairing:init-pairing`; it delegates to the packaged no-clobber script and has no inline
   Write/Edit fallback.
3. Use the other `/adversarial-pairing:<command>` entries during the delivery cycle.

Alternatively, run `bash tools/bootstrap.sh <target-project-root>` directly and skip the plugin
installation. Both paths preserve existing managed files and stop before commit.

---

## Status

v0.2.0 — stable release with structural commit gating, bounded standing
authorization, no-clobber bootstrap, synchronized self-contained bundles, and hosted Node 18.17/24 CI.

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
