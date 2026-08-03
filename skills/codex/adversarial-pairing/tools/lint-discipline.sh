#!/usr/bin/env bash
# lint-discipline.sh — self-application gate for Cluster 7 (500-line rule)
# Sweeps docs/spec/**/*.md and skills/**/SKILL.md for files >500 lines.
# Optionally sweeps docs/superpowers/plans/**/*.md if that folder exists.
# Exit 0 = all checks pass; Exit 1 = violations found (itemized).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXIT_CODE=0
VIOLATIONS=()

# --- Check 1: 500-line rule on spec files ---
echo "=== Check 1: 500-line rule (docs/spec/**/*.md) ==="
SPEC_DIR="$REPO_ROOT/docs/spec"
if [ -d "$SPEC_DIR" ]; then
  while IFS= read -r f; do
    lines=$(wc -l < "$f" | tr -d ' ')
    if [ "$lines" -gt 500 ]; then
      VIOLATIONS+=("$f: $lines lines (>500)")
      EXIT_CODE=1
    else
      echo "  OK  $lines  $f"
    fi
  done < <(find "$SPEC_DIR" -name "*.md" -type f 2>/dev/null | sort)
else
  echo "  (docs/spec not found, skipping)"
fi

# --- Check 2: 500-line rule on SKILL.md files ---
echo "=== Check 2: 500-line rule (skills/**/SKILL.md) ==="
SKILLS_DIR="$REPO_ROOT/skills"
if [ -d "$SKILLS_DIR" ]; then
  while IFS= read -r f; do
    lines=$(wc -l < "$f" | tr -d ' ')
    if [ "$lines" -gt 500 ]; then
      VIOLATIONS+=("$f: $lines lines (>500)")
      EXIT_CODE=1
    else
      echo "  OK  $lines  $f"
    fi
  done < <(find "$SKILLS_DIR" -name "SKILL.md" -type f 2>/dev/null | sort)
else
  echo "  (skills/ not found, skipping)"
fi

# --- Check 3: 500-line rule on plans/ (optional, skip if absent) ---
echo "=== Check 3: 500-line rule (docs/superpowers/plans/**/*.md) ==="
PLANS_DIR="$REPO_ROOT/docs/superpowers/plans"
if [ -d "$PLANS_DIR" ]; then
  while IFS= read -r f; do
    lines=$(wc -l < "$f" | tr -d ' ')
    if [ "$lines" -gt 500 ]; then
      VIOLATIONS+=("$f: $lines lines (>500)")
      EXIT_CODE=1
    else
      echo "  OK  $lines  $f"
    fi
  done < <(find "$PLANS_DIR" -name "*.md" -type f 2>/dev/null | sort)
else
  echo "  (docs/superpowers/plans not found, skipping)"
fi

# --- Summary ---
echo ""
if [ ${#VIOLATIONS[@]} -eq 0 ]; then
  echo "=== ALL CHECKS PASSED ==="
  exit 0
else
  echo "=== VIOLATIONS FOUND ==="
  printf '  - %s\n' "${VIOLATIONS[@]}"
  exit 1
fi
