# Changelog

## v0.2.0 — 2026-08-03

- Added read-only GitHub CI across Ubuntu/Windows and Node 18.17/24.
- Replaced free-text commit gating with structural ledger parsing and bounded, fail-closed commit-target resolution.
- Hardened bootstrap and registry generation against clobbering, linked paths, partial preflight failure, and unsafe replacements.
- Made every distributed skill/plugin bundle self-contained with synchronized trusted docs and tools.
- Clarified the two-stage HAT 3 flow: pre-flip review, explicit flip authorization, final staged review, and commit authorization.
- Added scoped, revocable standing operator authorization for autonomous completion without repeated GO prompts.
- Corrected Windows Git Bash invocation guidance and disclosed that bundled registries are deterministic stubs, not coverage evidence.

## v0.1.0 — 2026-05-07

- Published full adversarial-pairing package as a public repository.
- Included separate skill entry points for Codex and Claude Code:
  - `skills/codex/adversarial-pairing/SKILL.md`
  - `skills/claude-code/adversarial-pairing/SKILL.md`
- Included Claude Code plugin surfaces under `plugin/claude-code/`.
- Included methodology spec, appendices, tools, tests, and case study.
