#!/usr/bin/env bash
# bootstrap.sh — Day 1 wiki scaffold (stops BEFORE git commit)
# Usage: bootstrap.sh <target-project-root>
# Bash 3.2+ compatible
set -euo pipefail

TARGET_ROOT="${1:?Usage: bootstrap.sh <target-project-root>}"

# Path validation: detect Windows-style paths that bash would mangle
case "$TARGET_ROOT" in
  *:\\*|*:[/\\]*)
    # Has Windows drive prefix like "C:\..." or "C:/..."
    # Try to convert if conversion tool available
    if command -v cygpath >/dev/null 2>&1; then
      TARGET_ROOT="$(cygpath -u "$TARGET_ROOT")"
    elif command -v wslpath >/dev/null 2>&1; then
      TARGET_ROOT="$(wslpath -u "$TARGET_ROOT")"
    else
      echo "ERROR: Windows-style path detected but no cygpath/wslpath available. Pass POSIX path (e.g., /c/Users/...) or install Git Bash MSYS2." >&2
      exit 2
    fi
    ;;
esac

# Resolve absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Guard: target directory must already exist
if [ ! -d "$TARGET_ROOT" ]; then
  echo "ERROR: target directory does not exist: $TARGET_ROOT" >&2
  exit 1
fi

# Step 1: Create wiki/ + 7 subfolders + wiki/tools/
mkdir -p \
  "$TARGET_ROOT/wiki/concepts" \
  "$TARGET_ROOT/wiki/entities" \
  "$TARGET_ROOT/wiki/sources" \
  "$TARGET_ROOT/wiki/syntheses" \
  "$TARGET_ROOT/wiki/hypotheses" \
  "$TARGET_ROOT/wiki/manual" \
  "$TARGET_ROOT/wiki/coverage" \
  "$TARGET_ROOT/wiki/tools"

# Step 2: Inject wiki/CLAUDE.md — placeholder schema doc referencing LAW 13
cat > "$TARGET_ROOT/wiki/CLAUDE.md" <<'CLAUDEMD'
# Wiki Schema (LAW 13)

This file documents the required frontmatter schema for all wiki pages.
LAW 13: every wiki page MUST have YAML frontmatter with the fields below.

## Required frontmatter fields

```yaml
---
status: sourced | computed | claimed | supposition
type: concept | source | entity | synthesis | hypothesis | manual
role: tool-catalog | user-manual | reference-doc
provenance:
  - kind: <primary-source-kind>
    ref: <citation-or-url>
    locator: <optional-section-or-page>
last-verified-at: YYYY-MM-DD
---
```

## Status definitions

- **sourced**: backed by a primary source cited in provenance
- **computed**: derived deterministically from sourced data
- **claimed**: asserted without a primary source; needs verification
- **supposition**: working hypothesis; treat as provisional

## Operator notes

Replace this file's content with project-specific schema details.
This placeholder was injected by bootstrap.sh.
CLAUDEMD

# Step 3: Inject wiki/log.md — append-only change log header
cat > "$TARGET_ROOT/wiki/log.md" <<'LOGMD'
# Wiki Change Log

Append-only. Most recent first.

<!-- FORMAT: each entry on one line:
  YYYY-MM-DD | <author> | <page-path> | <change-summary>
-->
LOGMD

# Step 4: Copy 4 tools → wiki/tools/*.mjs
for tool in build-registries sync-mirror wiki-lint audit-entity-exports; do
  cp "$REPO_ROOT/tools/${tool}.mjs" "$TARGET_ROOT/wiki/tools/${tool}.mjs"
done

# Step 5: Generate 6 registries via build-registries.mjs
# Select Node runtime: prefer 'node', fallback to 'node.exe' (WSL → Windows interop)
NODE_BIN=""
TOOL_PATH=""
TARGET_ARG=""
if command -v node >/dev/null 2>&1; then
  NODE_BIN="node"
  TOOL_PATH="$TARGET_ROOT/wiki/tools/build-registries.mjs"
  TARGET_ARG="$TARGET_ROOT"
elif command -v node.exe >/dev/null 2>&1; then
  NODE_BIN="node.exe"
  # node.exe is Windows-native; needs Windows-style paths
  if command -v wslpath >/dev/null 2>&1; then
    TOOL_PATH="$(wslpath -w "$TARGET_ROOT/wiki/tools/build-registries.mjs")"
    TARGET_ARG="$(wslpath -w "$TARGET_ROOT")"
  else
    # No wslpath — pass POSIX path; node.exe may handle some POSIX paths
    TOOL_PATH="$TARGET_ROOT/wiki/tools/build-registries.mjs"
    TARGET_ARG="$TARGET_ROOT"
  fi
else
  echo "WARNING: no Node runtime found (neither 'node' nor 'node.exe'); skipping registry generation" >&2
fi

if [ -n "$NODE_BIN" ]; then
  "$NODE_BIN" "$TOOL_PATH" "$TARGET_ARG" 2>/dev/null || \
    echo "WARNING: build-registries failed (target may have empty codebase — registries will be empty stubs)" >&2
fi

# Step 6: Inject ledger files
cat > "$TARGET_ROOT/feature-ledger.md" <<'FEATURELEDGER'
# Feature Ledger

Per-patch rows. Add one row per feature shipped.

## Mantras (VERBATIM placeholder — replace with project mantras)

- "<mantra 1>"
- "<mantra 2>"

## Columns

| patch | feature | mantra | status | notes |
|-------|---------|--------|--------|-------|
FEATURELEDGER

cat > "$TARGET_ROOT/status-ledger.md" <<'STATUSLEDGER'
# Status Ledger

Per-cluster status. Update when cluster status changes.

## Mantras (VERBATIM placeholder — replace with project mantras)

- "<mantra 1>"
- "<mantra 2>"

## Columns

| cluster | gate | status | last-updated | notes |
|---------|------|--------|--------------|-------|
STATUSLEDGER

# Step 7: Append wiki + ledger workflow note to target CLAUDE.md
TARGET_CLAUDE_MD="$TARGET_ROOT/CLAUDE.md"
WORKFLOW_BLOCK="
## adversarial-pairing methodology

This project uses the adversarial-pairing two-agent methodology framework.

- Wiki source of truth: \`wiki/\` (LAW 13 frontmatter required on all pages)
- Per-patch ledger: \`feature-ledger.md\` + \`status-ledger.md\` (mantras VERBATIM in N save targets)
- Tools: \`wiki/tools/\` (build-registries, sync-mirror, wiki-lint, audit-entity-exports)
- Day 1 bootstrap was performed via \`bootstrap.sh\` or \`/init-pairing\`

For full methodology, see the adversarial-pairing repo: docs/spec/, skills/, plugin/.
"

if [ -f "$TARGET_CLAUDE_MD" ]; then
  # Only append if our marker is NOT already present (idempotent)
  if ! grep -q "## adversarial-pairing methodology" "$TARGET_CLAUDE_MD"; then
    printf '%s' "$WORKFLOW_BLOCK" >> "$TARGET_CLAUDE_MD"
  fi
else
  # Create new CLAUDE.md with the workflow block
  printf '# %s\n\n%s\n%s' "$(basename "$TARGET_ROOT")" "(project README — extend as needed.)" "$WORKFLOW_BLOCK" > "$TARGET_CLAUDE_MD"
fi

# Step 8: STOP — do NOT git init, git add, or git commit
echo "READY: bootstrap structure complete; operator GO required for first commit"
