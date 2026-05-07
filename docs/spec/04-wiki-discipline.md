# Cluster 4 — Wiki Discipline

**Parent index**: [README.md](README.md)
**Previous cluster**: [03 — Ledger Discipline](03-ledger-discipline.md)
**Next cluster**: [05 — Code Discipline](05-code-discipline.md)
**Version**: v0.1.0

---

## §4.1 Statement

The wiki is a parallel knowledge layer to the ledger — NOT a replacement for it. On Day 1 of any
new project, the agent MUST execute the 8-step bootstrap protocol to create the wiki folder
structure, initialize ledger files, install wiki tools, and update the project CLAUDE.md. Bootstrap
STOPS BEFORE git commit; no autonomous commit during bootstrap. After bootstrap, every
code-affecting patch MUST include corresponding wiki updates in the same commit as the code and
the ledger row append. Parallel sync is non-negotiable: the wiki and the ledger travel together in
every patch commit, neither satisfying the other. Pages added to the wiki MUST declare LAW 13
frontmatter with all required fields (status, type, role, provenance, last-verified-at); pages
without valid frontmatter are blocked at HAT 3 closure. The wiki is the project's structured
knowledge base — it tells an agent entering the project (or re-entering after months away) what
tools exist, how to operate the software, and how the architecture works, in a form queryable by
role and type rather than requiring full-file reads.

---

## §4.2 Rationale

A ledger records what changed and when — it is a sequence of closure events. A wiki records what
the project is — its tools, its architecture, its operational procedures. These two knowledge
stores answer different questions and neither substitutes for the other. An agent that skips wiki
sync but maintains a complete ledger can answer "what was done in seq N?" but cannot answer "what
CLI verbs does this project expose?" or "how do I recover from failure mode Y?". Conversely, an
agent that maintains a rich wiki but skips ledger rows has no audit spine — there is no per-patch
record of verification evidence, save target classification, or residual disclosure. Both layers
are required because the agent's operational context depends on both: the ledger for accountability
and traceability, the wiki for navigability and knowledge continuity.

Bootstrapping the wiki on Day 1 — before any code lands — is structurally important. A wiki added
as an afterthought (after seq 3, 10, or 30) accumulates permanent registry drift: the registries
cannot be retrospectively generated with high confidence because the tool-to-codebase alignment
was never maintained from the start. The Day 1 bootstrap installs the tools and creates the
structure at the moment when drift is impossible — before any codebase exists. Every subsequent
patch then runs tools as gates, ensuring registries never diverge. The operator-gated first commit
(bootstrap outputs READY, no autonomous commit) is a deliberate pause: the operator reviews the
structure before the first commit is recorded, confirming the scaffold is correct before the audit
trail begins.

---

## §4.3 Failure modes

- **Bootstrap skipped entirely**: wiki is added after several patches have already landed;
  registries cannot be accurately reconstructed from prior commits; permanent registry drift;
  tool-to-codebase alignment is always approximate.
- **Bootstrap auto-commits without operator GO**: agent completes the 8 bootstrap steps and
  commits autonomously without outputting READY and awaiting operator confirmation; policy
  violation; operator loses the review window on the scaffold structure.
- **Per-patch wiki sync skipped**: code patch is committed with a ledger row but no wiki updates;
  registries drift immediately; the wiki no longer reflects the current codebase; the next agent
  session reads stale data.
- **Wiki sync substituted for ledger**: agent updates wiki/log.md and calls it the ledger row;
  the actual feature-ledger.md receives no entry; audit trail loses code traceability and
  save-target classification.
- **Tier A registries edited by hand**: an agent edits a registry file directly instead of running
  build-registries; the next auto-regen pass overwrites the manual edit; drift is introduced and
  then silently reversed; any data in the manual edit is lost.
- **Tier C skipped silently**: a patch introduces a new architectural insight but the agent neither
  creates a concept/synthesis page nor logs an explicit `tier-C: noop` rationale; the cognitive
  update is lost; no record exists of whether reflection was performed.
- **LAW 13 frontmatter missing**: a wiki page is committed without the required YAML block;
  wiki-lint fails at HAT 3 closure; the page cannot be queried by role or type; semantic
  filtering breaks.
- **Invalid enum value in frontmatter**: a page declares `role: how-to` (not a valid enum value);
  wiki-lint rejects it; HAT 3 blocks; the issue must be corrected before reviewer ACCEPT.
- **Manual layer absent**: the `manual/` subfolder is never populated; agents entering the project
  have no user-manual pages; they must reverse-engineer operating procedures from entity files and
  concept pages, which is slower and error-prone.
- **Role field absent from frontmatter**: pages omit the `role` field; semantic queries ("what
  tool-catalog pages exist?") return empty results; agent cannot filter wiki by purpose.

---

## §4.4 Reference example

In a phased delivery, the wiki is bootstrapped on Day 1 (8 steps, no auto-commit) and synced
parallel to the ledger on every subsequent patch. Pages declare LAW 13 frontmatter with
status/type/role/provenance/last-verified-at. The wiki serves THREE distinct roles for an
operating agent: (a) tool-catalog (what tools the software offers); (b) user-manual (how to
operate the software); (c) reference-doc (how the software works internally). The Tier A/B/C
update model distinguishes mechanically-regenerated pages, semi-automatic templated pages, and
cognitive-reflection pages.

For a concrete instantiation across an 18-seq delivery, see
[`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/).

---

## §4.5 Sub-patterns

### §4.5.1 Day 1 bootstrap protocol

**Statement**

When an agent enters a new project for the first time, it MUST execute the 8-step Day 1 bootstrap
to create wiki structure, ledger files, tools, and project CLAUDE.md updates. Bootstrap STOPS
BEFORE git commit; the agent outputs `READY: bootstrap structure complete; operator GO required
for first commit`. NO autonomous commit during bootstrap. Two equivalent invocation paths exist:
a slash command (Claude Code plugin: `/init-pairing`) and a shell script (Codex / no-plugin:
`tools/bootstrap.sh <target-project-root>`). Both paths execute the same 8 steps:

1. Create `wiki/` + 7 subfolders + 2 base files.
2. Inject `wiki/CLAUDE.md` from template (schema doc).
3. Inject `wiki/log.md` from template (append-only header).
4. Create `wiki/tools/` with 4 utilities (build-registries, sync-mirror, wiki-lint,
   audit-entity-exports) copied from `tools/*.mjs`.
5. Generate 6 initial registries via `tools/build-registries.mjs <project-root>`.
6. Create ledger files (`feature-ledger.md`, `status-ledger.md`) with header + mantras VERBATIM.
7. Update project `CLAUDE.md` with reference to wiki + ledger workflow.
8. Output `READY: bootstrap structure complete; operator GO required for first commit`.

**Rationale**

The bootstrap creates the minimum structure required for all subsequent per-patch sync steps to
function correctly. Executing bootstrap as the very first task — before any code lands — ensures
that registries are aligned with the codebase from commit zero and that the wiki tools are
available as gates from the first seq onward. The operator-gated first commit is not merely
procedural: it gives the operator a deliberate review window over the scaffold before the audit
trail begins. An autonomous bootstrap commit would bypass this window and make it structurally
impossible to correct scaffold errors before they become part of the permanent git history.

**Failure modes**:

- Bootstrap skipped → wiki added later as afterthought → registry drift permanent: registries
  generated after code already exists have no reliable baseline; drift is introduced from the
  moment bootstrap was skipped.
- Bootstrap auto-commits without operator GO → policy violation: the operator loses the review
  window; the bootstrap structure enters git history without confirmation that it is correct.

**Abstract example**: any new project under this methodology executes Day 1 bootstrap as the very
first task, regardless of project size or expected delivery length. The agent installs the
scaffold, outputs READY, and waits. The operator reviews the structure (wiki folder tree, initial
ledger headers, CLAUDE.md update) and issues GO. The first commit is then recorded by the
operator-authorized action, not by the agent autonomously.

---

### §4.5.2 Three-roles schema (tool-catalog + user-manual + reference-doc)

**Statement**

Every wiki page declares a `role` field in its LAW 13 frontmatter. Three roles are enumerated:

- `tool-catalog`: pages describing what tools, CLI verbs, exported symbols, or interfaces the
  software offers. Auto-generated registries (`entities/registry-*.md`) carry this role by
  default. Individual entity pages that explicitly catalogue tooling may also be marked
  `tool-catalog`.
- `user-manual`: pages describing how to USE the software as an agent. Lives primarily in
  `manual/*.md`. Some workflow-oriented `syntheses/` pages may also carry this role when they
  describe operational procedures rather than architectural insights.
- `reference-doc`: the DEFAULT role for `concepts/`, `sources/`, `syntheses/`, and `hypotheses/`
  folders, and for most `entities/` pages that describe architecture, schema, or internal
  structure rather than tooling or procedures.

A page must carry exactly one role; the three roles are mutually exclusive per page.

**Rationale**

The three roles reflect three distinct query patterns that an agent performs when re-entering a
project or resolving an operational question. "What tools does this project expose?" is a
tool-catalog query — the agent greps `role: tool-catalog` and gets the complete registry without
reading individual source files. "How do I invoke recovery from failure mode Y?" is a user-manual
query — the agent goes to `manual/` and finds the procedure. "How does component X work
internally?" is a reference-doc query — the agent reads `concepts/` and `entities/`. Without the
role field, all three query patterns collapse into a single undifferentiated full-wiki scan, which
is slower and less reliable. Role-based filtering also makes the wiki auditable: an agent can
verify "does a user-manual page exist for procedure Z?" without reading every synthesis page.

**Failure modes**:

- Role field absent → semantic queries break → agent cannot filter by purpose: an agent entering
  the project greps for tool-catalog pages and returns zero results even though registries exist;
  it must read the entire `entities/` folder to discover tooling.
- Manual layer absent → agent must reverse-engineer usage from entity files: no `manual/` pages
  exist; the agent cannot find operational procedures; it reads entity and concept pages and
  infers procedures, which is error-prone and time-consuming.

**Abstract example**: an agent entering a new project queries `role: tool-catalog` to discover all
available CLI verbs without reading individual entity pages. It then queries `role: user-manual`
to find the operational procedure for a specific workflow. The two queries return non-overlapping
page sets. A page that describes both what a tool does (reference) and how to invoke it
(procedure) is classified `user-manual` because the operative query is "how to use it", and the
architectural description is secondary content within the page.

---

### §4.5.3 Per-patch sync (parallel to ledger, NOT replacement)

**Statement**

Every code-affecting commit MUST include corresponding wiki updates in the same commit, parallel
to the ledger row append. The per-patch sync workflow is ordered as follows:

1. Append ledger row to `feature-ledger.md` (Cluster 3).
2. Append entry to `wiki/log.md`.
3. Tier A: rebuild registries (`build-registries.mjs <project-root>`).
4. Tier B: create or update entity/schema/hook/manual pages affected by the patch.
5. Tier C: write a cognitive-reflection page (concept, synthesis, or hypothesis) OR log an
   explicit `tier-C: noop` rationale in the ledger row.
6. Run wiki tools as gates: `wiki-lint --check`, `build-registries --check`,
   `audit-entity-exports --check`. All must exit 0 before HAT 3 closure.

Wiki sync is PARALLEL to ledger — both are required in the same commit. Wiki sync does NOT
substitute for the ledger row, and the ledger row does NOT substitute for wiki sync.

**Rationale**

The parallel requirement exists because the two stores answer different questions and both must be
accurate at every commit boundary. A commit that lands code + ledger row but no wiki sync leaves
the knowledge base out of sync: an agent reading the wiki after that commit sees the pre-patch
world while the codebase has already moved forward. The wiki tools as gates (step 6) enforce this
mechanically: if a patch creates a new exported symbol but fails to update the registry, the
`--check` mode of `build-registries` exits non-zero and the HAT 3 gate blocks. The gate converts
the "parallel sync is required" rule from aspirational to structural — the commit cannot close
until sync is verified.

**Failure modes**:

- Wiki sync skipped → registries drift → knowledge fragmented across commits: an agent entering
  the project three seq later finds registries that do not reflect the current codebase; it must
  cross-reference git log and source files to reconstruct what changed; navigability is broken.
- Wiki sync substituted for ledger → audit trail loses code traceability: the wiki/log.md entry
  is present but `feature-ledger.md` has no row; HAT 3 audit finds no closure evidence for the
  seq; the patch cannot be considered properly closed.

**Abstract example**: every patch lands a `wiki/log.md` entry in the same commit as the ledger
row, with registries regenerated and any new entity or concept page added. When an auditor
inspects a commit, they find: (a) the code change; (b) the ledger row with save-target
classification and verification evidence; (c) the wiki/log.md entry; (d) regenerated registry
files reflecting the new state; (e) any new or updated entity/concept pages. All five components
arrive in one atomic commit.

---

### §4.5.4 Tier A/B/C update model

**Statement**

Wiki pages fall into three tiers with different update mechanisms:

- **Tier A — Mechanical**: registries (6 inverse-index files) and coverage maps. Auto-regenerated
  by the `build-registries.mjs` and `sync-mirror.mjs` tools. NEVER edited by hand. Frontmatter
  carries `compile-policy: 'regenerable-from-codebase'`. Any manual edit is overwritten by the
  next regeneration run without warning.
- **Tier B — Semi-automatic**: new entity pages, schema pages, DB-table pages, hook pages, and
  `manual/` pages. The agent creates these from the relevant template and fills them from source
  (codebase, design doc, ledger row). The `audit-entity-exports` tool detects missing pages and
  exits non-zero if a registered symbol has no corresponding entity page.
- **Tier C — Cognitive**: concept pages, synthesis pages, and hypothesis pages. After every patch,
  the agent reflects: does this change introduce a new architectural insight, a cross-source
  synthesis, or a speculation worth recording? If yes, create the page. If no, log an explicit
  `tier-C: noop` rationale in the ledger row (e.g., "tier-C: noop — patch is mechanical refactor,
  no new architectural insight"). Silent skip (no page, no rationale) is non-compliant.

**Failure modes**:

- Tier A edited by hand → conflict with auto-regen → drift introduced: the manual edit is
  overwritten silently on the next rebuild; any data captured there is lost; the agent believes
  the registry contains its hand-edit but it does not.
- Tier C skipped silently (no page, no rationale) → cognitive update lost: an architectural
  insight introduced in a patch is not recorded; future agents must re-derive it from source;
  the wiki's cognitive layer stagnates; no record exists of whether reflection was performed.

**Abstract example**: a patch that adds a new entity (e.g., a new CLI verb, a new DB table)
triggers Tier B: the agent creates a new entity page from template and fills it from the
codebase. If the patch also introduces a new architectural pattern, Tier C fires: the agent writes
a concept page capturing the insight. If the patch is a mechanical refactor with no new insight,
the agent writes `tier-C: noop — mechanical refactor, no new architectural insight` in the ledger
row. Tier A always fires (registries are always rebuilt), regardless of patch type or size.

---

### §4.5.5 LAW 13 frontmatter

**Statement**

Every wiki page MUST declare YAML frontmatter with these required fields:

```yaml
---
status: sourced | computed | claimed | supposition
type: concept | source | entity | synthesis | hypothesis | manual
role: tool-catalog | user-manual | reference-doc
provenance:
  - kind: 'audit-finding' | 'codebase-file' | 'codebase-directory' | 'protocol' |
           'feature-ledger' | 'generated-inventory' | 'generated-summary' |
           'command-output' | 'wiki-page'
    ref: '<path or ref>'
    locator: '<line range or section>'   # optional
last-verified-at: YYYY-MM-DD
---
```

All five fields are required. Enum values are exact-match: any value not in the declared enum is
invalid. The `provenance` array must contain at least one entry. The `last-verified-at` field
MUST be updated whenever the page content is verified against source. The `type` field `manual`
is an extension beyond the base Karpathy schema — it designates pages that describe operational
procedures for using the software as an agent.

**Rationale**

LAW 13 frontmatter serves two purposes: machine-queryability and trustworthiness calibration. The
`role` and `type` fields enable the three-role query patterns described in §4.5.2 — without them,
the wiki is a flat folder of markdown files with no semantic structure. The `status` and
`provenance` fields encode the trustworthiness of each claim: `sourced` with a `codebase-file`
provenance tells an agent that the page content was verified against actual source; `supposition`
tells an agent that the content is speculative and requires verification before acting on it.
The `last-verified-at` field enables staleness detection: a page last verified 90 days ago on a
fast-moving codebase is a candidate for re-verification before use. The `wiki-lint` tool validates
all fields at HAT 3 closure, making frontmatter compliance a structural gate rather than a best-
effort convention. Pages without frontmatter are rejected before they enter the commit.

**Failure modes**:

- Missing field → wiki-lint fails → page rejected: a page is committed without the `role` field;
  `wiki-lint --check` exits non-zero; HAT 3 closure blocks; the field must be added before
  reviewer ACCEPT is issued.
- Invalid enum value → wiki-lint fails → page rejected: a page declares `status: verified`
  (not a valid enum value); wiki-lint rejects it; the page must be corrected to one of the four
  valid status values before HAT 3 proceeds.
- Stale `last-verified-at` → trustworthiness unknown: a page's `last-verified-at` is 180 days
  old; an agent reading it cannot know whether the content still reflects the current codebase;
  re-verification is required before the page can be treated as `sourced`.

**Abstract example**: every page in the wiki begins with a YAML frontmatter block validated by
the `wiki-lint` tool. When a new entity page is created as part of a Tier B update, the agent
fills all five frontmatter fields before staging the file. At HAT 3 closure, `wiki-lint` runs
against all modified and new wiki files. A file with missing or invalid frontmatter causes
`wiki-lint` to exit non-zero with an itemized list of violations. HAT 3 is blocked until every
violation is resolved. The reviewer confirms that `wiki-lint` exits 0 before issuing ACCEPT.

---

## Cross-references

- **Spec index**: [README.md](README.md) — glossary definitions for wiki, LAW 13 frontmatter,
  Tier A/B/C, bootstrap, role (tool-catalog / user-manual / reference-doc), per-patch sync,
  wiki-lint, build-registries, audit-entity-exports.
- **Previous cluster**: [03 — Ledger Discipline](03-ledger-discipline.md) — per-patch ledger row
  and per-patch wiki sync travel in the same commit (§3.5.1); neither satisfies the other; wiki
  sync is step 2 of the per-patch workflow that begins with the ledger row append.
- **Next cluster**: [05 — Code Discipline](05-code-discipline.md) — code discipline governs what
  changes land in a patch; wiki discipline governs the knowledge-base updates that accompany every
  patch; the two clusters are sequentially dependent within each HAT 2 → HAT 3 transition.
- **Appendix A**: [`appendices/A-day-1-bootstrap-checklist.md`](appendices/A-day-1-bootstrap-checklist.md)
  — step-by-step checklist for the 8-step Day 1 bootstrap protocol (§4.5.1); the appendix is the
  operational reference; this cluster file is the rationale layer.
- **Reference implementation**: [`../case-studies/phase-9-wave-5/`](../case-studies/phase-9-wave-5/)
  — concrete instantiation of all five sub-patterns across an 18-seq delivery: bootstrap
  transcript, per-patch sync runs, Tier A/B/C update examples, LAW 13 frontmatter samples,
  and wiki-lint gate outputs.
