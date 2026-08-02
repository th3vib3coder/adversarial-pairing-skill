# Cluster 3 — Ledger Discipline

**Parent index**: [README.md](README.md)
**Previous cluster**: [02 — Verification Discipline](02-verification-discipline.md)
**Next cluster**: [04 — Wiki Discipline](04-wiki-discipline.md)
**Version**: v0.2.0-rc.1

---

## §3.1 Statement

Every code-affecting patch MUST produce exactly one ledger row appended to the feature ledger in
the same commit as the code. The row is non-negotiable and non-delegable: no batching across
patches, no rollup across time, no scheduler substitution. The row MUST enumerate the patch's save
targets with explicit classification — PUSHED (remote-bound classification) or LOCAL (local-only
classification) — and MUST contain the project's declared mantras VERBATIM, character-by-character,
in each save target designated to carry them. The ledger is the project's append-only audit spine:
a record of what landed, where it went, and what invariants were preserved at closure. Any gap in
the ledger — missing row, batched row, mantra paraphrase — breaks the audit trail at that point
and cannot be reconstructed after the fact.

---

## §3.2 Rationale

The ledger exists because agentic delivery is asynchronous, multi-session, and often multi-repo.
Without a per-patch record, the audit question "what changed in seq N, and was it pushed or local?"
has no authoritative answer. Git log provides commit messages and diffs, but not the structured
verification evidence — test outcomes, save target classification, mantra preservation, honest
residual disclosure — that the ledger row mandates. The ledger is not a duplicate of git log; it
is the layer above git log that records closure quality, not just closure occurrence.

The distinction between PUSHED save targets (remote-bound classification) and LOCAL save targets
(local-only classification) is critical because it expresses intent at the moment of closure, not
temporal state. A row that does not distinguish PUSHED from LOCAL at the time of commit becomes
ambiguous the moment any file is later moved or pushed out of band. The save target classification
is a non-temporal declaration: it captures the design intent of the patch, independent of whether
the push has happened yet. Actual push verification is a separate gate — post-push CI watch and
remote-aligned check — that confirms the intent was fulfilled. The ledger row is the promise; the
CI gate is the verification that the promise was kept.

---

## §3.3 Failure modes

- **Missing ledger row**: a code-affecting patch is committed without appending a ledger row; the
  audit trail has a gap at that seq; reconstruction requires reading git log and inferring intent,
  which is unreliable.
- **Batched ledger rows**: multiple seq rolled into one row (per-day, per-sprint, or per-batch
  rollup); per-patch granularity is lost; it becomes impossible to determine which commit belongs
  to which seq or which verification evidence applies to which change.
- **Scheduler treated as ledger replacement**: the project's scheduler (CI hygiene, daily digest,
  auto-audit) runs and appends a summary; the implementer treats this as satisfying the per-patch
  row requirement; the seq has no individual row; audit gate triggers.
- **Save target classification missing**: ledger row enumerates paths but does not mark which are
  PUSHED (remote-bound) and which are LOCAL (local-only); scope intent is ambiguous; post-hoc
  privacy or drift audits cannot use the row as a source of truth.
- **PUSHED/LOCAL confusion as temporal state**: implementer records PUSHED to mean "currently
  pushed to remote" rather than "remote-bound classification"; row state becomes misaligned with
  reality as soon as push timing differs from intent; a temporal bug propagates into the audit
  trail.
- **LOCAL artifact pushed by accident**: a LOCAL-classified artifact is pushed to remote (privacy
  leak, scope violation); the ledger row correctly classified it LOCAL but the push was not
  guarded; post-push CI watch catches the drift.
- **PUSHED artifact left local**: a PUSHED-classified artifact is never pushed; the remote repo
  diverges from the ledger's stated intent; remote-aligned check detects the inconsistency.
- **Mantra paraphrased**: mantras are re-worded, summarized, or partially quoted in a save target
  instead of copied character-by-character; the integrity check on the save target fails; the row
  is non-compliant; the HAT 3 gate must block.
- **Mantra missing from one of N targets**: the row declares N save targets for mantras, but the
  mantra is present in fewer than N; cardinality check fails; partial preservation is not
  compliant.
- **Row committed after code commit**: ledger row is appended in a separate follow-up commit
  rather than in the same commit as the code; the code exists in git history without its ledger
  record; audit atomicity broken.
- **Honest residual omitted**: a known limitation or bypass surface is discovered at HAT 3 but not
  disclosed in the row; post-hoc discovery constitutes a spec violation; proactive disclosure at
  closure is always required.

---

## §3.4 Reference example

In a phased delivery, every code-affecting commit MUST be accompanied by exactly one row appended
to the project ledger. The row enumerates: (a) save targets touched (PUSHED + LOCAL classification);
(b) test/verification evidence; (c) honest residual disclosure; (d) project mantras VERBATIM. The
scheduler runs ledger hygiene (audit, visibility) but NEVER substitutes the per-patch row append.

For a concrete instantiation across an 18-seq delivery, see
[`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/).

---

## §3.5 Sub-patterns

### §3.5.1 Per-patch ledger row

**Statement**

Every code-affecting patch lands ONE ledger row in the same commit. NO batching. NO per-day
rollup. The scheduler is additive (audit/visibility) and NOT a substitute for the per-patch row
append. "Same commit" means the ledger row file and the code files are staged together and
committed in one atomic git commit; a ledger row committed separately from its code does not
satisfy this requirement.

**Rationale**

The per-patch granularity requirement exists to preserve attributability: the ability to look at
any commit in git history and immediately find its complete closure record — verification evidence,
save targets, residual disclosure — in one place. Batched rows destroy attributability because the
row-to-commit mapping becomes many-to-one: one row covers multiple commits, and the row's
evidence cannot be attributed to any individual commit without reconstruction from external
sources. The scheduler anti-pattern is specifically dangerous because it looks like a ledger
update (a row is appended by an automated process) but covers a hygiene or audit pass, not a
specific patch. An implementer that points to a scheduler-generated entry as the ledger row for a
seq has provided no closure evidence — the scheduler entry records that a hygiene pass ran, not
that a specific change was verified and closed.

**Failure modes**:

- Scheduler treated as ledger replacement → row append silently skipped → audit trail broken:
  the seq exists in git log but has no individual verification record; audit cannot confirm
  closure quality.
- Per-day batched rows → loss of per-patch granularity → unclear which commit belongs to which
  row: reconstructing the mapping requires reading diffs and timestamps rather than the ledger;
  the ledger's value as a source of truth is eliminated.

**Abstract example**: in a phased delivery, every seq that lands code has its own ledger row
appended in the same commit as the code change. The scheduler runs nightly hygiene (registry
rebuild, link check, coverage map update) and appends a hygiene log entry — but that entry is
explicitly marked as a hygiene pass, not a seq row. When an auditor looks at the git log, every
code commit has a paired ledger row in the same commit; scheduler entries are distinguishable by
their type marker and do not substitute for seq rows.

---

### §3.5.2 Save targets coherence (PUSHED vs LOCAL)

**Statement**

Each ledger row MUST enumerate its save targets explicitly, distinguishing PUSHED (remote-bound
classification) from LOCAL (local-only classification). The distinction is non-temporal — it
expresses INTENT at the time of closure, not current push state. A save target classified PUSHED
declares that the artifact is intended for remote; a save target classified LOCAL declares that
the artifact MUST NOT be pushed to remote. The actual push is verified separately by post-push CI
watch + remote-aligned check (Cluster 1 §1.5.4). The ledger row is the statement of intent; the
post-push gate is the verification that intent was fulfilled.

**Rationale**

Save target classification serves two distinct purposes: privacy/scope enforcement (LOCAL
artifacts that must not leave the local environment) and drift detection (PUSHED artifacts that
must reach remote and will be detected missing by the remote-aligned check). Both purposes require
that the classification be stated at closure, not inferred after the fact. If a row lists paths
without classification, a later auditor cannot determine whether a file was intended to be pushed
or intentionally kept local — and the distinction matters for compliance, reproducibility, and
incident response. The non-temporal framing is essential: marking a file PUSHED does not mean it
has been pushed yet; it means the design decision is that it will be pushed. Conflating "PUSHED
classification" with "currently pushed to remote" introduces a temporal bug — the row's claimed
state is accurate only at one specific moment in time (immediately after push) and inaccurate at
every other moment, which makes the ledger unusable as a persistent record.

**Failure modes**:

- LOCAL artifacts pushed by accident → privacy/scope leak: an artifact classified LOCAL in the
  ledger row is committed and pushed without the implementer noticing; remote-aligned check or
  post-push CI detects the push; incident response required.
- PUSHED artifacts left local → remote drift, inconsistent state: an artifact classified PUSHED
  in the ledger row is never pushed; remote repo diverges from declared intent; remote-aligned
  check detects the gap at the next pre-flight.
- Confusing PUSHED with "currently pushed" → temporal bug, ledger row state misalignment with
  reality: implementer records PUSHED meaning the file has already been pushed rather than
  declaring it remote-bound; the row's meaning changes retroactively when the actual push happens;
  audit cannot use the row as a stable source of truth.

**Abstract example**: a project declares that its `blueprints/private/` folders are LOCAL by
convention and its feature ledger and primary code paths are PUSHED. Each ledger row's "paths"
column lists both categories, each marked with its classification. An auditor reading the row
knows immediately which files are intended for remote (and can verify via remote-aligned check)
and which must remain local (and can verify they were never pushed). The row's classification
does not change after the fact — it is a permanent statement of design intent captured at closure.

---

### §3.5.3 Mantras VERBATIM in N save targets

**Statement**

Project-declared mantras — defined in the project's CLAUDE.md or equivalent configuration file —
MUST be preserved character-by-character in N specific save targets per patch. The exact N and the
list of target files are project-specific declarations; the mantra strings themselves are
non-negotiable. Paraphrase, summarization, partial quotation, and reformatting are all
non-compliant. Verification: each save target is grep-matched against the mantra string; the
count of matches MUST equal the declared N. A count of fewer than N is a HAT 3 block condition
that must be resolved before reviewer ACCEPT is issued.

**Rationale**

Mantras are invariants, not guidelines. A project that declares mantras in CLAUDE.md is asserting
that certain phrases carry structural meaning — they are the recognizable markers that confirm the
project's operating context is present in every closure artifact. Character-by-character
preservation is required (not best-effort similarity) because the grep-based verification is
exact-match: a mantra paraphrased in a save target produces a grep miss, and the cardinality check
fails. This is intentional — the verification must be mechanical and unambiguous, not subject to
reviewer judgment about whether a paraphrase "captures the spirit" of the mantra. The N-target
requirement enforces redundancy: if a mantra is present in only one save target, a single file
loss or corruption eliminates the invariant; N ≥ 2 ensures it appears in multiple artifact types
(e.g., ledger row AND wiki log entry AND feature description).

**Failure modes**:

- Mantra paraphrased → integrity broken → audit gate triggers: the implementer rewrites the
  mantra in their own words in a save target; the grep-match fails; the cardinality count is
  fewer than N; the ledger-mantra-check hook issues a warning; HAT 3 cannot close until the
  verbatim text is restored.
- Mantra missing in one of N targets → cardinality check fails: the implementer copies the mantra
  into N-1 targets and omits the last; the count is N-1, not N; the check fails even though N-1
  copies are correct; partial preservation is not compliant.

**Abstract example**: a project declares 2 mantras to be preserved in 3 save targets per patch
(the feature ledger row, the wiki log entry, and the HAT 3 STOP report). At HAT 3 closure, the
implementer verifies: mantra 1 grep-matched in all 3 targets (count 3), mantra 2 grep-matched in
all 3 targets (count 3). Both counts equal the declared N=3. The ledger-mantra-check hook
confirms: exit 0. Reviewer ACCEPT proceeds. Compare with a failure path: mantra 2 was paraphrased
in the wiki log entry; grep-match returns count 2 for mantra 2 (N=3 expected); hook exits 1 with
a specific failure message; HAT 3 is blocked until the wiki log entry is corrected to carry the
verbatim mantra string.

---

## Cross-references

- **Spec index**: [README.md](README.md) — glossary definitions for ledger row, save target,
  PUSHED save target (remote-bound classification, non-temporal), LOCAL save target (local-only
  classification), mantras VERBATIM, honest residual disclosure, seq, R2 inline pending/OK.
- **Previous cluster**: [02 — Verification Discipline](02-verification-discipline.md) — redirect
  events caught by strategic review (§2.5.2) MUST be recorded in the ledger row of the affected
  seq; the two-level review produces the evidence that the ledger row captures.
- **Next cluster**: [04 — Wiki Discipline](04-wiki-discipline.md) — wiki sync runs in parallel
  with the ledger row append; both are HAT 3 closure gates; neither satisfies the other.
- **Reference implementation**: [`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/)
  — concrete instantiation of all three sub-patterns across an 18-seq delivery: per-patch row
  records, PUSHED/LOCAL classification examples, mantra cardinality verification runs, and the
  scheduler-vs-ledger distinction in practice.
