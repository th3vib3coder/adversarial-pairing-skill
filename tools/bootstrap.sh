#!/usr/bin/env bash
# bootstrap.sh — trusted Day 1 launcher; all mutation lives in bootstrap-apply.mjs.
# Bash 3.2+, Git Bash, WSL, Linux, and macOS.
set -euo pipefail
export LC_ALL=C

usage() {
  cat <<'USAGE'
Usage: bash tools/bootstrap.sh <target-project-root>

Creates only missing adversarial-pairing scaffold files. Existing wiki pages,
tools, registries, ledgers, and project instructions are preserved byte-for-byte.
After failure, empty scaffold directories may remain because directory rollback
is disabled; rerunning safely completes missing files and deletes no existing file.
USAGE
}

case "${1:-}" in -h|--help) usage; exit 0 ;; esac
if [ "$#" -ne 1 ]; then usage >&2; exit 2; fi
TARGET_ROOT="$1"

case "$TARGET_ROOT" in
  *:\\*|*:[/\\]*)
    if command -v cygpath >/dev/null 2>&1; then TARGET_ROOT="$(cygpath -u "$TARGET_ROOT")"
    elif command -v wslpath >/dev/null 2>&1; then TARGET_ROOT="$(wslpath -u "$TARGET_ROOT")"
    else echo "ERROR: Windows path needs cygpath or wslpath; pass a POSIX path" >&2; exit 2
    fi
    ;;
esac

root_probe="$TARGET_ROOT"
while [ "$root_probe" != "/" ] && [ "${root_probe%/}" != "$root_probe" ]; do root_probe="${root_probe%/}"; done
case "$root_probe" in
  /|//|/[A-Za-z]|/cygdrive/[A-Za-z]|/mnt/[A-Za-z])
    echo "ERROR: unsafe target (filesystem root): $TARGET_ROOT" >&2; exit 2 ;;
esac
if [ ! -d "$TARGET_ROOT" ]; then echo "ERROR: target directory does not exist: $TARGET_ROOT" >&2; exit 2; fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
NODE_BIN=""; NODE_WINDOWS_ARGUMENTS=0
if command -v node >/dev/null 2>&1; then NODE_BIN="$(command -v node)"
elif command -v node.exe >/dev/null 2>&1; then NODE_BIN="$(command -v node.exe)"; NODE_WINDOWS_ARGUMENTS=1
else echo "ERROR: no Node runtime found (neither node nor node.exe)" >&2; exit 1
fi

node_path() {
  if [ "$NODE_WINDOWS_ARGUMENTS" -eq 0 ]; then printf '%s\n' "$1"; return; fi
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; return; fi
  if command -v wslpath >/dev/null 2>&1; then wslpath -w "$1"; return; fi
  echo "ERROR: node.exe path conversion is unavailable" >&2; return 1
}

case "$TARGET_ROOT" in /*) TARGET_ABS="$TARGET_ROOT" ;; *) TARGET_ABS="$PWD/$TARGET_ROOT" ;; esac
APPLY_SOURCE="$REPO_ROOT/tools/bootstrap-apply.mjs"
PREFLIGHT_SOURCE="$REPO_ROOT/tools/bootstrap-preflight.mjs"
for trusted in "$APPLY_SOURCE" "$PREFLIGHT_SOURCE"; do
  if [ -L "$trusted" ] || [ ! -f "$trusted" ] || [ ! -r "$trusted" ]; then
    echo "ERROR: trusted bootstrap helper is missing, linked, or unreadable: $trusted" >&2; exit 1
  fi
done
"$NODE_BIN" "$(node_path "$APPLY_SOURCE")" "$(node_path "$REPO_ROOT")" "$(node_path "$TARGET_ABS")"
