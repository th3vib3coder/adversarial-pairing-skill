# Hook activation and scope

The plugin registers both hooks automatically from `hooks/hooks.json`. They are active whenever
the `adversarial-pairing` plugin is enabled; do not paste a duplicate hook block into
`.claude/settings.json`. Installation scope controls where they apply:

- `user`: every project opened by that user;
- `project`: collaborators who install and enable the project-declared plugin;
- `local`: only the current user in the current project.

For the least surprising rollout, start with `local`, inspect the hook inventory with `/hooks`,
then promote to `project` or `user` only when the wider scope is intentional. After installing,
updating, enabling, or disabling the plugin during a running session, use `/reload-plugins`.

The hook handlers use Claude Code's cross-platform exec form:

```json
{
  "type": "command",
  "command": "node",
  "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/ledger-mantra-check.js"]
}
```

`args` keeps the cached plugin path as one argument on Windows, macOS, and Linux. Node.js
18.17.0 or newer must be available on `PATH`.

## Standalone skill installations

Copying `skills/claude-code/adversarial-pairing/` into a personal or project skill directory
installs the methodology only. A standalone skill does not register plugin hooks. Use the plugin
when deterministic hook enforcement is required; do not point project settings at scripts in a
clone that may be moved or deleted.

## What each hook does

`ledger-mantra-check.js` is advisory: it always exits 0 and never blocks. It runs after
Edit/Write and warns when a non-Markdown file outside `wiki/` and `docs/` is changed without
both a staged ledger file and a staged `wiki/log.md` entry.

`pending-flip-guard.js` is blocking and exits 2 on commit attempts while a structurally parsed
current ledger row has `R2 inline pending`. WIP-like commit messages are not exempt. The hook
recognizes direct, chained, `git.exe`, Git-global-option, and `git -C <path> commit` forms. It
tracks literal `cd`/`pushd`, `popd`, parenthesized subshell scope, and explicit Git work-tree
overrides; ambiguous targets fail closed.

The registration intentionally matches every Bash tool call. Claude Code matchers filter by tool
name, not by command contents, so the script self-scopes and returns immediately for non-commit
commands. Known bypasses remain: IDE commits, direct GitHub API calls, and commits issued outside
the Claude Code Bash tool. Add a repository-local Git hook when enforcement must cover those paths.

## Disable or remove

Disable or uninstall the plugin at the same scope used for installation. Claude Code's
`disableAllHooks` setting disables all eligible hooks, not only this plugin's hooks, so it is a
coarse emergency switch rather than a per-plugin control.
