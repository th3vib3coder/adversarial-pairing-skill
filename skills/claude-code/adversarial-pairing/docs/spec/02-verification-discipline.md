# Cluster 2 — Verification Discipline

**Parent index**: [README.md](README.md)
**Previous cluster**: [01 — Roles & Cycles](01-roles-and-cycles.md)
**Next cluster**: [03 — Ledger Discipline](03-ledger-discipline.md)
**Version**: v0.2.0-rc.1

---

## §2.1 Statement

Every scope assessment, diff review, and source attribution performed during an adversarial pairing
session MUST be grounded in actual file content, not in assumptions about what the codebase contains
or what a document says. Verification discipline has three non-negotiable components: (1) before
any HAT 1 STOP is finalized, the implementer MUST execute a helper-aware pre-survey that enumerates
all call sites of the changed surface — direct, bracket-dispatched, and helper-mediated; (2) every
diff presented for reviewer ACCEPT MUST pass a two-level review — tactical (diff-level coherence,
frozen-detail shape, immutable-surface integrity) and strategic (plan adherence, scope containment,
split-decision grounding); and (3) every claim of the form "document X pins shape Y" MUST be
verified against the literal text of document X before it is accepted as a review outcome. A
verification claim that is not grounded in a file read is not verification — it is supposition.

---

## §2.2 Rationale

The root cause of the most costly redirect events in agentic delivery is not bad code — it is bad
scope assessment. When the implementer underestimates the blast radius of a change (missing
helper-mediated call sites, bracket-dispatched consumers, or utility wrappers that re-export a
surface), the diff lands green locally but breaks downstream consumers that were never surveyed.
The pre-survey gap is not caught at HAT 2 because tests only cover paths the implementer thought
to write. It is caught, expensively, at integration or production. Helper-aware pre-survey
discipline exists to close this gap before HAT 1 STOP is issued — not after the diff is written.

The two-level review exists because tactical and strategic failure modes are structurally different.
Tactical failures (a frozen-detail shape has drifted, an immutable surface has been mutated) are
local to the diff and visible to a careful reader. Strategic failures (a split decision was made
without ground-truth evidence, the scope of the patch grew beyond what HAT 1 authorized, a
methodology step was skipped under time pressure) require comparing the diff against the HAT 1
STOP report and the project's operating protocol — neither of which is visible in the diff alone.
A reviewer who performs only tactical review will catch shape errors; they will miss the class of
errors that corrupts the audit trail and produces ledger rows that do not match actual project state.
Shape pin source accuracy is the third pillar: a reviewer who accepts a claim of the form "the spec
says X" without verifying that the spec literally says X has introduced an ungrounded assertion into
the closure record. The correction cost, when the discrepancy is discovered later, always exceeds
the cost of the verification read.

---

## §2.3 Failure modes

- **Pre-survey gap**: implementer greps only direct importers or literal property access; bracket
  dispatch (`reader[methodName]()`), helper wrappers (`safe<X>(reader, ...)`, `withFallback`,
  `tryRead*`), and `instanceof` routing are not surveyed; affected consumers are missing from the
  HAT 1 STOP impact list.
- **Single-round pre-survey**: implementer runs one grep pass and treats the result as complete;
  helper conventions specific to the project are not covered; a second round (after discovering
  the first was incomplete) is not documented in the HAT 1 STOP report.
- **Tactical-only review**: reviewer reads the diff line by line but does not compare it against
  the HAT 1 STOP plan; scope creep, unauthorized split decisions, and methodology deviations pass
  unchallenged.
- **Strategic-only review**: reviewer assesses plan adherence but does not check frozen detail
  shapes or immutable surfaces; shape drift enters the codebase with a valid ACCEPT stamp.
- **Ungrounded shape attribution**: reviewer accepts "the spec pins this shape" or "the philosophy
  document says Y" without reading the cited source; the claim is entered into the closure record
  as fact; a later audit finds the source does not support the claim.
- **Source conflation**: reviewer confuses two documents with overlapping scope (e.g., an
  acceptance-philosophy document and a spec section that pins a concrete interface shape); the
  review outcome is correct for one document but wrong for the other.
- **Post-write pre-survey**: pre-survey is conducted after the diff is already written, not before
  HAT 1 STOP; the implementer's scope assessment is contaminated by the implementation they have
  already committed to; previously unconsidered call sites are rationalized away rather than
  addressed.
- **Scope creep passing review**: HAT 1 STOP authorizes surface A; the diff touches surface B as
  a "small addition"; tactical reviewer approves the B change as locally correct without flagging
  that it was not in scope; strategic review would have caught it but was not performed.
- **Redirect not documented**: reviewer identifies a split decision or scope deviation during
  strategic review but does not issue a formal BLOCK; the concern is noted informally and the patch
  proceeds; the audit trail shows no redirect event even though one occurred.

---

## §2.4 Reference example

In a phased delivery, the implementer must assess the full blast radius of a change before writing
any code. The pre-survey phase is explicitly documented in the HAT 1 STOP report: which grep
patterns were run, which helper conventions were checked, and how many call sites were found at
each level (direct, bracket-dispatch, helper-mediated). In the same delivery, the reviewer
performs two passes: a tactical pass on the diff (shape coherence, immutable surfaces, anti-dup)
and a strategic pass against the HAT 1 plan (scope containment, split-decision evidence, protocol
adherence). Source attribution claims are verified by direct read before being entered into the
closure record.

For a concrete instantiation of these patterns across an 18-seq delivery — including pre-survey
iterations, specific redirect-class events caught at strategic review, and the disambiguation of
overlapping source documents — see [`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/).
The bidirectional link from that folder's index back to this cluster is the canonical reference.

---

## §2.5 Sub-patterns

### §2.5.1 Helper-aware pre-survey

**Statement**

Before producing the HAT 1 STOP report for any seq that modifies a shared surface, the implementer
MUST run a structured pre-survey that covers at minimum four categories of call site:

1. **Literal property access**: `object.property`, `module.export`, direct import references.
2. **Bracket dispatch**: `reader[methodName]()`, `handler[verb]()`, dynamic key lookups that route
   to the changed surface without a static property reference.
3. **Helper conventions**: project-specific wrappers that mediate access to the surface — patterns
   such as `safe<X>(reader, ...)`, `withFallback(reader, key)`, `tryRead*`, `ensure*`, or any
   utility that accepts the surface as an argument and delegates to it internally.
4. **instanceof / type-guard routing**: code that branches on the type of the surface and invokes
   it conditionally; these call sites may not appear in a grep for the surface name.

The pre-survey result — grep commands run, patterns used, counts returned, and any rounds required
to reach coverage — MUST be recorded verbatim in the HAT 1 STOP report. If a second round is
required after discovering that the first missed a helper convention, both rounds are documented.
A pre-survey that covers only category 1 (literal access) is non-compliant regardless of how
many grep patterns were used.

**Rationale**

Helper conventions vary by project. A pre-survey that covers only direct importers will be correct
for a codebase with no indirection layers; it will be catastrophically incomplete for any codebase
that has accumulated utility wrappers over time. Because the implementer cannot know in advance
which helper conventions the project uses, the pre-survey protocol requires explicit checking of
all four categories and explicit documentation of which patterns were searched. The documentation
requirement serves two purposes: it forces the implementer to articulate the scope of the survey
(making gaps visible before the diff is written), and it gives the reviewer a checkable artifact
(the survey record) to validate against the HAT 1 impact list.

**Pattern library** (append project-specific patterns in case study):

- `reader[methodName]()` — bracket-dispatch consumer
- `safe<Surface>(reader, ...)` — safe-accessor helper
- `withFallback(reader, key, default)` — fallback helper
- `tryRead*` / `tryGet*` — nullable accessor family
- `ensure*(reader)` — validation wrapper that calls through
- `instanceof <SurfaceClass>` — type-guard routing

**Failure mode**: pre-survey gap — grepping only direct importers and literal property access
misses bracket-dispatch consumers and helper-wrapped call sites, producing an undercount in the
HAT 1 STOP impact list that is not detected until HAT 2 or post-push integration.

**Abstract example**: in the reference implementation, two pre-survey rounds were needed before
the methodology was consolidated — the first round covered direct importers and literal access;
the second round, triggered when a helper wrapper was discovered during HAT 2 that had not
appeared in round one, added bracket-dispatch and helper-convention patterns. The two-round
outcome and its consequences for the impact list are documented in detail in the case study. The
abstract lesson: plan for at least two rounds on any project where helper conventions are not yet
fully enumerated.

---

### §2.5.2 Tactical + strategic 2-level review

**Statement**

Every diff presented for reviewer ACCEPT MUST be evaluated at two distinct levels before ACCEPT
is issued:

**Tactical level** — diff-scope evaluation:

- Anti-dup: no logic is duplicated that already exists in the codebase and could be reused.
- Frozen details shape: any frozen-detail object (a shape that is declared in a spec or pinned by
  a registry entry) matches the declared shape exactly — no extra fields, no missing fields, no
  type coercions.
- Immutable surface integrity: surfaces declared immutable in the spec (exported API, schema
  contracts, CLI verb signatures) are untouched by the diff; any modification to an immutable
  surface requires direct operator approval or a valid standing-authorization consumption
  documented in the HAT 1 STOP report.
- Local coherence: the diff is self-consistent — no dangling references, no partial refactors
  that leave the codebase in an intermediate state.

**Strategic level** — plan-scope evaluation:

- Split-decision grounding: any decision to split a planned unit of work into two separate patches
  (or to merge two planned units) MUST be grounded in evidence from the ground-truth source (test
  results, CI output, build artifact) — not in implementer judgment alone. The reviewer verifies
  that the HAT 1 STOP report records the evidence.
- Scope containment: the diff touches only surfaces authorized by the HAT 1 STOP report. Any
  surface touched that was not listed in the HAT 1 impact list is a scope violation; the reviewer
  issues a BLOCK and requires a revised HAT 1 STOP before ACCEPT.
- Methodology adherence: the diff was produced by the protocol steps declared in HAT 1 (RED tests
  written first, no shortcuts, no deferred ledger entries); the implementer's closure claim is
  consistent with the protocol record.
- Redirect documentation: if any redirect-class event occurred during HAT 2 (a split decision, a
  scope deviation discovered mid-implementation, a design change from the HAT 1 plan), the event
  is recorded in the ledger and the reviewer verifies the record is present before issuing ACCEPT.

ACCEPT is only valid when both levels pass. A tactical ACCEPT without strategic review is
incomplete and does not satisfy the HAT 3 gate.

**Rationale**

Tactical and strategic errors have different signatures and require different reviewer postures to
detect. Tactical errors are local: a reviewer reading the diff with attention to shape, surface,
and logic can find them without reference to any external document. Strategic errors are relational:
they require the reviewer to hold the HAT 1 plan and the diff simultaneously and check for
divergence. A reviewer who defaults to tactical review (the natural posture when reading a diff)
will have a high catch rate for shape errors and a near-zero catch rate for scope creep and
undocumented split decisions. The two-level protocol forces an explicit mode switch.

**Failure mode**: tactical-only review misses split decisions and scope creep — the diff is
locally correct but violates the HAT 1 plan; the violation is not caught until a downstream seq
discovers that the ledger row does not match actual project state.

**Abstract example**: in the reference implementation, five redirect-class events were caught
using the dual-level review discipline — events that a tactical-only reviewer would have passed
as locally correct diffs. The case study documents each event: which strategic-level check
triggered the BLOCK, what evidence grounded the split decision, and how the ledger recorded the
redirect. The full record is in [`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/).

---

### §2.5.3 Shape pin source accuracy

**Statement**

When a reviewer evaluates a shape claim — "this object has property X of type T", "this API
surface accepts parameters P1 and P2", "this schema field is required" — the claim MUST be
traceable to a specific source: a named file, a named section within that file, and (where
applicable) a line range or quoted literal. "The spec says X" is not a verifiable claim; "spec
section §3.2, line 47 says X" is. If the source cannot be located or the literal text of the
source does not support the claim, the reviewer MUST issue a BLOCK on the shape claim regardless
of whether the shape in the diff looks correct.

Two categories of source document are frequently conflated and MUST be distinguished:

- **Acceptance-philosophy documents**: documents that describe the criteria by which a feature
  will be accepted as complete — e.g., a product requirements document, an acceptance checklist,
  or a philosophy statement. These documents describe WHAT is acceptable, not WHAT the concrete
  shape IS.
- **Spec sections that pin a literal shape**: sections of a technical specification that define
  the concrete interface — property names, types, required/optional flags, default values. These
  documents define the shape precisely.

A reviewer who treats an acceptance-philosophy document as a shape pin is accepting a claim that
the document does not make. The correct verification path is: locate the spec section (not the
philosophy document), read the literal text, and confirm that the diff matches the literal text.

**Rationale**

Shape drift enters codebases through a specific mechanism: a reviewer accepts a shape claim that
is "close enough" to what they believe the spec says, without performing the verification read.
Over time, each "close enough" acceptance compounds: the codebase shape diverges from the spec
shape by increments too small to notice individually but large enough to matter at integration.
The source accuracy requirement is a forcing function for the verification read — it is not
possible to cite "spec §3.2, line 47" without having read spec §3.2, line 47.

The acceptance-philosophy / spec-literal distinction is important because these documents are
written by the same team, often at the same time, and their scope overlap makes conflation easy.
The philosophy document may reference the shape; the spec section defines it. A reviewer who
reads only the philosophy document and finds a reference to the shape has not verified the shape —
they have verified that the philosophy document acknowledges the shape exists. The verification
read must be of the document that pins the literal, not the document that references it.

**Failure mode**: shape drift if reviewer accepts "doc X says Y" when X does not say Y precisely
— either X says something weaker (acknowledges Y without pinning it) or X says something that has
since been superseded by a later spec revision that the reviewer did not check.

**Abstract example**: in the reference implementation, a disambiguation was required between an
acceptance-philosophy document and a spec section that pinned a literal interface shape. The
philosophy document referenced the shape in a descriptive context; the spec section defined the
shape with explicit property names and required/optional flags. The reviewer initially accepted
the philosophy document reference as sufficient; the BLOCK was issued when it became clear that
the philosophy document did not constrain the shape to the degree that the spec section did. The
resolution — a direct read of the spec section and a comparison against the diff — is documented
in the case study at [`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/).

---

## Cross-references

- **Spec index**: [README.md](README.md) — glossary definitions for pre-survey, tactical review,
  strategic review, shape pin, frozen detail, immutable surface, redirect event, split decision,
  acceptance-philosophy document, seq, ledger row.
- **Previous cluster**: [01 — Roles & Cycles](01-roles-and-cycles.md) — HAT 1 STOP report
  structure (§1.5.2) is the primary consumer of pre-survey output; pre-flight CI verification
  (§1.5.3) is the sibling discipline that precedes the pre-survey in the HAT 1 workflow.
- **Next cluster**: [03 — Ledger Discipline](03-ledger-discipline.md) — redirect events caught by
  strategic review (§2.5.2) MUST be recorded in the ledger; the ledger row format and mantra
  requirements are defined there.
- **Reference implementation**: [`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/)
  — concrete instantiation of all three sub-patterns across an 18-seq delivery: pre-survey
  iteration records, five redirect-class events caught by dual-level review, and the
  philosophy-vs-spec disambiguation event.
