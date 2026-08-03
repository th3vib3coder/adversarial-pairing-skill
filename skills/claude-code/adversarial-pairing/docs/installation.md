# Installation and migration

This repository ships three supported surfaces: a Claude Code plugin, a standalone Claude Code
skill, and a standalone Codex skill. Choose one surface for each runtime. Installing both the
Claude plugin and legacy global command copies creates duplicate commands and is not supported.

## Requirements

- Node.js 18.17.0 or newer on `PATH`;
- Git;
- Bash on Linux/macOS/WSL, or Git Bash on Windows;
- a current Claude Code release for plugin installation, or a Codex release that supports skills.

Verify the local prerequisites before installation:

```bash
node --version
git --version
bash --version
```

On Windows, run bootstrap commands in Git Bash. From PowerShell, locate Git Bash explicitly when
it is not on `PATH`:

```powershell
$gitBash = (Get-Command bash.exe -ErrorAction SilentlyContinue).Source
if (-not $gitBash) { $gitBash = Join-Path $env:ProgramFiles 'Git\bin\bash.exe' }
if (-not (Test-Path -LiteralPath $gitBash -PathType Leaf)) { throw 'Git Bash not found' }
```

Do not continue after an `ENOENT` or “bash not found” error. The trusted bootstrap has no inline
Write/Edit substitute.

## Claude Code plugin (recommended for hooks)

Inside Claude Code, add this GitHub repository as a marketplace and install the plugin:

```text
/plugin marketplace add th3vib3coder/adversarial-pairing-skill
/plugin install adversarial-pairing@adversarial-pairing
/reload-plugins
```

The install dialog offers `user`, `project`, and `local` scopes. Start with `local` when testing
the workflow in one repository. Use `project` only when collaborators should install the same
plugin, and `user` only when its hooks should run in every project.

The plugin commands are namespaced:

- `/adversarial-pairing:init-pairing`
- `/adversarial-pairing:hat-1-stop`
- `/adversarial-pairing:adversarial-review`
- `/adversarial-pairing:dual-commit`
- `/adversarial-pairing:lint-discipline`

Both plugin hooks are registered automatically while the plugin is enabled. `/hooks` shows their
source and matcher. Do not copy the same handlers into `.claude/settings.json`; duplicate
registration makes scope and troubleshooting ambiguous. See the bundled `hooks/ENABLE.md`
activation notes inside the plugin package.

For non-interactive installation, the equivalent shell command accepts an explicit scope:

```bash
claude plugin marketplace add th3vib3coder/adversarial-pairing-skill
claude plugin install adversarial-pairing@adversarial-pairing --scope local
```

## Standalone Claude Code skill

Copy the complete `skills/claude-code/adversarial-pairing/` directory into one of these empty
destinations:

- user scope: `~/.claude/skills/adversarial-pairing/`
- project scope: `<project>/.claude/skills/adversarial-pairing/`

Copy the whole directory, including `SKILL.md`, `docs/`, `tools/`, and `LICENSE`; do not copy only
`SKILL.md`. Invoke the standalone skill as `/adversarial-pairing`. A standalone skill does not
register hooks or the plugin's five commands. Use the plugin if those runtime components are
required.

## Standalone Codex skill

Copy the complete `skills/codex/adversarial-pairing/` directory to
`$CODEX_HOME/skills/adversarial-pairing/` (normally
`~/.codex/skills/adversarial-pairing/`). Restart Codex so the new skill inventory is loaded.
Codex uses the manual templates and `tools/bootstrap.sh`; Claude Code plugin commands and hooks do
not run in Codex.

## Bootstrap a target project

Run the bootstrap from the installed skill or plugin directory, never from a target-owned copy:

```bash
bash tools/bootstrap.sh <target-project-root>
```

From PowerShell, quote the executable, script, and target paths:

```powershell
& $gitBash 'C:\path\to\adversarial-pairing\tools\bootstrap.sh' 'D:\Work\My Project'
```

The script validates the complete target before its first write, creates only missing managed
files, prints a deterministic `CREATE`/`PRESERVE` inventory, verifies the resulting wiki with
trusted bundled tools, and stops before commit.

On failure, only empty directories created by the bootstrap runner may remain. Rollback does not
remove a pre-existing path or an unknown/concurrently substituted path. After correcting the
reported cause, rerun the same trusted command: its no-clobber contract completes missing files
and preserves every path that already exists.

## Migrate from v0.1.x or a manual Claude installation

1. Preserve any local modifications to the old skill, command, or hook files outside the install
   directory; never overlay a new package onto unknown edits.
2. Install v0.2.0 into a clean directory or update the plugin through Claude Code.
3. If the plugin is enabled, retire legacy copies of `hat-1-stop.md`,
   `adversarial-review.md`, `dual-commit.md`, `init-pairing.md`, and `lint-discipline.md` from
   `~/.claude/commands/` after confirming the namespaced commands load.
4. Remove duplicate project/user hook registrations only after `/hooks` shows both handlers from
   the plugin. The plugin handlers are already active at the selected scope.
5. Run `/reload-plugins` or restart the host, then test the workflow in a disposable repository.

Existing target-project wiki pages, ledgers, tools, registries, and project instructions are not
migration inputs: v0.2.0 bootstrap preserves them. Any merge into a preserved file is a separate,
reviewed change.

## Direct gates or standing authorization

Direct-gate mode asks the operator for each HAT transition. For a bounded repair that should finish
without repeated prompts, the operator can grant standing authorization once. The record must name
the objective, repositories and branches, seq range, permitted transitions and external effects,
expiry, and exclusions. It does not replace the distinct reviewer, tests, cached-patch review, or
CI watch, and it never implies merge/tag/release, destructive actions, force-push, or credentials.
See [`spec/appendices/E-standing-operator-authorization.md`](spec/appendices/E-standing-operator-authorization.md).
