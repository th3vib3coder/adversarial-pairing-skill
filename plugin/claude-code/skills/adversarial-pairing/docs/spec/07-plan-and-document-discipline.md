# Cluster 7 — Plan & Document Discipline

**Parent index**: [README.md](README.md)
**Previous cluster**: [06 — State Integrity](06-state-integrity.md)
**Version**: v0.2.0

---

## §7.1 Statement

Plan and document discipline is non-negotiable across three surfaces: file size, task atomicity,
and multi-file navigation. A spec or plan file that grows past 500 lines induces reviewer fatigue
and doc-rot. An implementation plan whose tasks bundle multiple intents or hide implicit
dependencies causes scope creep mid-execution and commit ambiguity. A multi-file document
structure that lacks a single-point index is a labyrinth: readers cannot navigate, cannot
determine where to start, and cannot discover cross-references without reading every file.
Adversarial pairing forecloses all three failures structurally: the 500-line threshold triggers a
mandatory split before the boundary is crossed; every plan task is atomic, sequential, and
explicit; every multi-file folder carries a `README.md` index as the single navigation point.
These are enforcement rules, not style guidelines.

---

## §7.2 Rationale

Documentation is code for the human reader and for the reviewer agent. A file that exceeds 500
lines carries the same risks as a function that spans multiple responsibilities: it is harder to
review, harder to locate the relevant section under time pressure, and harder to keep coherent as
the project evolves. Doc-rot accelerates when the cost of opening and scanning a file is high —
reviewers skim rather than read, and stale sections accumulate silently. The 500-line ceiling
keeps each document scope-bounded. The 400-line early-warning band gives authors a preemptive
split window so the refactor happens before content pressure and deadline pressure coincide.

Implementation plans are the agent's roadmap. A non-atomic task — one that bundles two intents,
leaves dependencies implicit, or includes conditional branches — is a map with missing roads: the
agent improvises mid-task, expands scope without a commit anchor, and leaves reviewers unable to
verify a clean boundary. Atomicity and sequentiality are not aesthetic preferences; they are
structural properties that make each commit reviewable in isolation and each dependency legible
before execution begins. When every task is completable in one session, lands as one commit, and
names its predecessor explicitly, the plan becomes a verifiable contract rather than an aspirational
outline.

---

## §7.3 Failure modes

- File exceeds 500 lines at commit → reviewer fatigue, split-attention errors, doc-rot
- File reaches exactly 500 lines → next routine edit pushes it over with no preemptive split
- Split triggered well past 500 lines → refactor under pressure, broken cross-references during
  restructuring
- Non-atomic plan task → scope creep mid-task, unclear commit boundary, stale ledger entries
- Non-sequential task ordering → hidden dependencies surface mid-execution, plan breaks before
  completion
- Implicit tasks ("obvious steps" omitted) → execution stalls when implicit context is not shared
  by all agents in the session
- Multi-file folder without `README.md` index → reader cannot navigate, does not know where to
  start
- Index exists but lacks cross-references to child files → child files float disconnected from
  navigation
- Index accumulates content (becomes a cluster page itself) → loses its navigation focus, defeats
  its purpose

---

## §7.4 Reference example

In a phased delivery, every spec, plan, and wiki page respects the 500-line rule. Implementation
plans are decomposed into atomic, sequential tasks with explicit dependencies. When a doc grows
past 400 lines, it is preemptively split into a folder with `README.md` as index and numbered
child files. The framework's own spec, plan, and case-study files apply this discipline to
themselves (auto-application).

For a concrete instantiation showing the spec auto-application and the implementation plan
structure, see `../case-studies/phase-9-wave-5/`.

---

## §7.5 Sub-patterns

### §7.5.1 500-line file size rule

- **Statement**: no `.md` spec, plan, or wiki page may exceed 500 lines. Between 400 and 500
  lines: trigger to split into multiple files with an index. Below 400 lines: single file is
  acceptable.
- **Rationale**: a file exceeding 500 lines causes reviewer fatigue, accelerates doc-rot, and
  introduces split-attention errors during review and edit cycles. Reviewers begin to skim rather
  than read, stale sections accumulate without detection, and the cost of any targeted edit rises
  because the relevant section must first be located in a large document. The 400-line early-warning
  band exists so the split can be executed before deadline pressure coincides with the refactor
  cost.
- **Failure modes**:
  - file exceeds 500 lines at commit → reviewer fatigue, split-attention errors
  - file is at exactly 500 lines → next edit pushes it over with no preemptive split triggered
  - split triggered too late (well past 500) → painful restructuring under delivery pressure
- **Abstract example**: when a spec section approaches 400 lines, the author splits into a folder
  with `README.md` index and numbered child files BEFORE crossing the 500-line boundary. The
  `README.md` lists each child with a one-line description and a relative link. The original
  single-file path becomes the index.

---

### §7.5.2 Atomic-sequential implementation plans

- **Statement**: every implementation plan is a sequence of atomic tasks. Each task expresses one
  intent unit, is independently completable, testable, and closeable in a single session. Tasks
  MUST NOT bundle multiple intents. Tasks MUST NOT include conditional nested sub-plans. Ordering
  is strictly sequential: task N+1 explicitly names task N as its dependency and does not begin
  until task N is committed and landed.
- **Rationale**: atomicity prevents scope creep mid-task by bounding what the implementer is
  authorized to change within a single HAT cycle. Sequentiality makes dependencies legible before
  execution begins, so that no agent has to infer ordering from implicit context. When each task
  lands as one commit with one ledger row and one reviewer ACCEPT, the plan becomes auditable
  end-to-end: a reviewer can reconstruct the delivery simply by reading the task sequence and
  matching it against the ledger.
- **Failure modes**:
  - non-atomic tasks → scope creep mid-task, ambiguous commit boundary, unclear when to call
    closure
  - non-sequential ordering → hidden dependencies surface mid-execution, plan breaks before
    completion
  - implicit "obvious" steps omitted → execution stalls when the implicit context is not shared
    by all agents in the session
- **Abstract example**: a plan with N tasks each estimated at ≤ 30 minutes, each landing as one
  commit, each with an explicit "depends on: task N-1 committed" line. No task contains the word
  "and" in its intent statement — if it does, it is split.

---

### §7.5.3 Index-driven multi-file structure

- **Statement**: when a doc or plan crosses the 500-line threshold, it becomes a folder. The
  folder MUST contain a `README.md` that functions as the sole index: preface, table of contents
  with relative links to every child file, and cross-references to related clusters or appendices.
  Body content lives in numbered child files. The index MUST NOT contain body content beyond the
  preface.
- **Rationale**: the index is the single navigation point for the entire multi-file folder. Without
  it, a reader landing in the folder does not know how many files exist, what order to read them
  in, or which file contains the relevant section. An index that drifts into content loses its
  navigation focus, forcing the reader to scan the index as well as the child files — defeating
  the purpose of the split.
- **Failure modes**:
  - multi-file folder without `README.md` → reader cannot navigate, does not know where to start
  - index lacks cross-references to child files → child files float disconnected from the
    navigation surface
  - index accumulates content (stops being a pure navigation file) → defeats its purpose, adds a
    new file to scan
- **Abstract example**: a spec with 7 cluster files lives in a `docs/spec/` folder with `README.md`
  as the index naming each cluster with a relative link, plus an `appendices/` sub-folder linked
  from the index. A reader arriving at `docs/spec/` opens `README.md` and can navigate to any
  cluster or appendix in one click.
