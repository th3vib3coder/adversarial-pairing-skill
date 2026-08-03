# Skill Entry Points

This repository ships two agent-specific skill entry points.

| Agent/runtime | Skill file |
|---|---|
| Codex | `skills/codex/adversarial-pairing/SKILL.md` |
| Claude Code | `skills/claude-code/adversarial-pairing/SKILL.md` |

The two files share the same methodology but are tuned to their runtime contexts. Codex uses the no-plugin/manual-template path. Claude Code can use either the skill file or the plugin in `plugin/claude-code/`.

Copy the complete skill directory, not only `SKILL.md`. Requirements, supported scopes, plugin
installation, and migration from v0.1.x are documented in [`../docs/installation.md`](../docs/installation.md).
