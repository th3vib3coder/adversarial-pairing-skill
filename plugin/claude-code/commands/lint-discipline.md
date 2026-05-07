---
description: 7-cluster mechanical compliance check on staged changes (file size, mantra match, LAW 13 frontmatter); workflow-discipline clusters listed but not auto-checked.
---

# /lint-discipline

7-cluster compliance check on staged changes. **Mechanical checks only.** This
command runs automated, deterministic assertions against the repo. Clusters 1, 2,
5, and 6 are workflow-discipline concerns that cannot be mechanically verified —
they are documented here for completeness but produce no automated output.

Exit semantics: `0` if all mechanical checks pass; `1` with itemized violations.

---

## Mechanical Checks (automated)

### Cluster 7 — 500-line rule

Sweep all spec docs, skill manifests, and plan files. Any file exceeding 500 lines
is a hard violation.

```bash
# Staged files only:
git diff --staged --name-only \
  | grep -E "(docs/spec/.*\.md|skills/.*/SKILL\.md|blueprints/.*\.md)" \
  | xargs -I{} sh -c 'count=$(wc -l < "{}"); if [ "$count" -gt 500 ]; then echo "OVER 500: {} ($count lines)"; fi'

# Full sweep (all tracked files):
git ls-files "docs/spec/**/*.md" "skills/**/SKILL.md" \
  | xargs -I{} sh -c 'count=$(wc -l < "{}"); if [ "$count" -gt 500 ]; then echo "OVER 500: {} ($count lines)"; fi'
```

Expected output: `<none — PASS>` / `<list of OVER 500 lines — FAIL>`

Cluster 7 result: `[ ] PASS  [ ] FAIL — violations: <list>`

---

### Cluster 3 — Ledger-mantra match

Verify that all five mantras appear verbatim in every SKILL.md save target.
The mantras must be present as exact strings — no paraphrasing.

```bash
MANTRAS=(
  "MANTRA-1: No helper is written twice. Search before implement."
  "MANTRA-2: Immutable surfaces are never touched by implementers."
  "MANTRA-3: RED before GREEN. No test written after implementation."
  "MANTRA-4: One commit per atomic task. Never bundle."
  "MANTRA-5: The ledger is the single source of truth for cross-repo state."
)

for f in $(git ls-files "skills/**/SKILL.md"); do
  for m in "${MANTRAS[@]}"; do
    grep -qF "$m" "$f" || echo "MISSING in $f: $m"
  done
done
```

Expected output: `<none — PASS>` / `<list of MISSING lines — FAIL>`

Cluster 3 result: `[ ] PASS  [ ] FAIL — violations: <list>`

---

### Cluster 4 — LAW 13 frontmatter validity + role enum

Invoke the canonical wiki-lint tool. This check validates YAML frontmatter presence,
required fields, and that `role:` values belong to the approved enum.

```bash
node tools/wiki-lint.mjs --staged
```

If `tools/wiki-lint.mjs` is not present, report: `SKIP — wiki-lint.mjs not found`.
A SKIP is NOT a pass; the operator must install the tool before this check is
considered green.

Expected output: `<no errors — PASS>` / `<error list — FAIL>` / `<SKIP>`

Cluster 4 result: `[ ] PASS  [ ] FAIL  [ ] SKIP`

---

## Non-mechanical Clusters (workflow-discipline — not auto-checked)

The following clusters encode human-judgment workflow rules. They cannot be
asserted mechanically and produce no automated output from this command. They are
enforced via the HAT 1 STOP and /adversarial-review gates.

| Cluster | Discipline | Enforcement gate |
|---------|-----------|-----------------|
| Cluster 1 | Pre-flight CI verification, mode selection | /hat-1-stop §1 |
| Cluster 2 | Adversarial review (tactical + strategic) | /adversarial-review |
| Cluster 5 | Atomic commit sequencing | /adversarial-review §2.3 |
| Cluster 6 | Cross-repo dual-commit ordering | /dual-commit Step D |

These clusters are listed here so that `/lint-discipline` output clearly
distinguishes "not checked" from "checked and passed."

---

## Exit Summary

```bash
# Aggregate exit code logic (run after all mechanical checks above):
FAILURES=0

# Cluster 7
[ "$cluster7_pass" = "yes" ] || FAILURES=$((FAILURES + 1))

# Cluster 3
[ "$cluster3_pass" = "yes" ] || FAILURES=$((FAILURES + 1))

# Cluster 4
[ "$cluster4_pass" = "yes" ] || FAILURES=$((FAILURES + 1))

exit $FAILURES   # 0 = all mechanical checks pass; 1+ = violations
```

**Lint result:** `[ ] 0 — all mechanical checks PASS  [ ] 1 — violations listed above`

**Timestamp:** `<ISO-8601>`
