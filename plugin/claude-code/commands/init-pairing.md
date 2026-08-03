---
description: Safely bootstrap adversarial pairing in an existing project; create only missing files and stop before any git commit.
argument-hint: <target-project-root>
allowed-tools: Bash
---

# /adversarial-pairing:init-pairing

Use the installed, no-clobber bootstrap. There is no inline fallback.

## Required procedure

1. Treat `$ARGUMENTS` as exactly one target-project path. If it is empty, ambiguous,
   nonexistent, a filesystem root, or the user's home/configuration directory, stop and
   request a narrower path.
2. Confirm that this file exists before doing anything:

   `${CLAUDE_PLUGIN_ROOT}/tools/bootstrap.sh`

3. Run only this bootstrap entry point, quoting both paths:

   ```bash
   bash "${CLAUDE_PLUGIN_ROOT}/tools/bootstrap.sh" "<target-project-root>"
   ```

   On Windows, the Bash tool normally supplies Git Bash. If `bash` is not on
   `PATH`, stop rather than falling back to Write/Edit. Locate Git for Windows
   explicitly (commonly `/c/Program Files/Git/bin/bash.exe`) and invoke that
   executable with the same quoted script and target paths. Convert a Windows
   drive path to Git Bash form (`D:\Work\Repo` → `/d/Work/Repo`) when passing it
   through a shell command string; keep paths containing spaces quoted.

4. Do not reproduce the bootstrap with Bash redirections, `cp`, Edit, or Write. Do not
   invoke a different `tools/bootstrap.sh` found in the target project.
5. Treat every `PRESERVE:` line as intentional. Existing wiki pages, tools, registries,
   ledgers, and project instructions must remain byte-for-byte unchanged; any required
   merge is manual and needs a separately approved task.
6. Verify the fresh files that were actually created with the trusted installed
   tools, not the copies inside the target. Do not execute any target-owned
   `wiki/tools/*` script: a preserved file belongs to the target and may contain
   arbitrary code.

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/tools/wiki-lint.mjs" "<target-project-root>/wiki" --json
   node "${CLAUDE_PLUGIN_ROOT}/tools/build-registries.mjs" "<target-project-root>" --check
   ```

   The registry builder is a stub scaffold. A successful `--check` proves only that its
   six provisional files match the stub generator; it is not evidence of source-code
   coverage or registry completeness.
7. Report the created and preserved paths, both verification exit codes, and any manual
   merge requested by the script.
8. Stop the bootstrap command. Never run `git init`, `git add`, `git commit`, or mutate a preserved
   file inside this command. A later reviewed commit requires either direct GO or valid standing
   authorization that explicitly names the target repository and bootstrap commit effect. Merge
   remains separately authorized and is never implied.

## Failure rule

If the installed script is missing, exits nonzero, or either verification fails, report
the exact failure and stop. Do not switch to an inline implementation.
