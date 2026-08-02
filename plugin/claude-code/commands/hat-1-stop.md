---
description: Produce the HAT 1 STOP design gate before tests or implementation are written; requires reviewer ACCEPT and valid operator authorization.
---

# /adversarial-pairing:hat-1-stop

Produce a HAT 1 STOP report only. Do not create or edit tests, implementation,
ledgers, or wiki files while running this command. HAT 2 starts only after a
distinct reviewer issues ACCEPT and operator authorization is recorded. Authorization may be a
fresh GO or consumption of a valid standing authorization; never infer standing authorization.

## 1. Declare roles and scope

- Implementer instance: `<agent-id>`
- Reviewer instance: `<different agent-id>`
- Atomic seq/scope: `<seq and one-line objective>`
- Working repositories: `<paths>`

The implementer may not issue reviewer ACCEPT.

## 2. Classify the pre-flight mode correctly

`Bootstrap` means genuine Day 1: the project has no established remote/CI
baseline and the pairing scaffold is being initialized. A missing row for the
current seq does not make an existing project Bootstrap. Every other case is
`Steady-state`.

- Active mode: `[ ] Bootstrap  [ ] Steady-state`
- Evidence for classification: `<remote/CI/project evidence>`

Discover the project's canonical commands from CI configuration, manifests,
build files, or contributor documentation. Do not assume pytest, npm, or any
other language-specific runner.

Record, then run only read-only pre-flight checks:

```text
project-native baseline/full-suite command: <exact command and exit code>
working-tree command: git status --short
remote CI command or authoritative UI/API: <exact check, or N/A with reason in Bootstrap>
immutable-surface diff check: <exact command and result>
```

A red baseline blocks HAT 2 unless it is explicitly isolated as pre-existing
and the reviewer plus direct or in-scope standing operator authorization approve the exception.

## 3. Helper-aware pre-survey

Run and record all five mandatory search classes. Prefer `rg`; adapt file globs
to the repository. One literal-symbol search is never enough.

```bash
# 1. Literal property/import/export access
rg -n "<surface|symbol|property>" <source-roots>

# 2. Bracket/dynamic dispatch
rg -n "\[[^]]*(<surface|method|verb>)[^]]*\]|\[[A-Za-z_$][A-Za-z0-9_$]*\]\s*\(" <source-roots>

# 3. Helper conventions and wrappers
rg -n "safe[A-Z]|withFallback|try(Read|Get)|ensure[A-Z]|<project-specific-helper>" <source-roots>

# 4. instanceof and type-guard routing
rg -n "instanceof\s+<Type>|is[A-Z][A-Za-z0-9_]*\s*\(|<project-specific-type-guard>" <source-roots>

# 5. Catch/swallow patterns
rg -n -A 3 "catch\s*\([^)]*\)\s*\{" <source-roots>
```

For each class, paste the exact command, match count, relevant paths, and any
second survey round. List direct callers, helper-mediated callers, duplicate
helpers/exports, immutable surfaces, and files near the 500-line limit.

## 4. Freeze the design

- Selected option and rationale: `<decision grounded in the survey>`
- Alternatives rejected and trade-offs: `<evidence>`
- Public contract before/after: `<exact delta or none>`
- Files authorized to change: `<closed list>`
- Files explicitly out of scope: `<list>`
- Estimated line additions and final sizes: `<counts; each file <= 500 lines>`
- Confounder hypothesis/control: `<harness or N/A rationale>`

Any later change to the authorized file list or design returns to HAT 1.

## 5. RED test plan — plan only

List the tests that will be written after operator authorization and why they must fail
against the current implementation. Do not write or execute the new tests yet.

```text
<test-file>::<test-name> — <assertion> — expected pre-fix failure
targeted RED command: <project-native command to run during HAT 2>
full-suite GREEN command: <project-native command to run during HAT 2>
```

## 6. Verbatim mantras

```text
MANTRA-1: No helper is written twice. Search before implement.
MANTRA-2: Immutable surfaces are never touched by implementers.
MANTRA-3: RED before GREEN. No test written after implementation.
MANTRA-4: One commit per atomic task. Never bundle.
MANTRA-5: The ledger is the single source of truth for cross-repo state.
```

## 7. Gate outcome

- STOP submitted by implementer: `<timestamp>`
- Reviewer decision: `[ ] ACCEPT  [ ] REDIRECT`
- Reviewer evidence/notes: `<verbatim>`
- Operator mode after reviewer ACCEPT: `[ ] direct GO  [ ] standing authorization  [ ] NO-GO`
- Standing authorization ID (when selected): `<unique durable ID>`
- Operator source: `<verbatim only in a private record, or exact durable reference/source receipt>`
- Public artifact privacy check: `<no private transcript, PII, or machine path; include SHA-256 receipt metadata and defined portable aliases>`
- Authorized objective: `<closed outcome>`
- Authorized repositories and branches: `<exact remotes and branch names>`
- Authorized seq: `<closed seq identifiers>`
- Allowed state transitions: `<named HAT/flip/stage/commit transitions>`
- Allowed external effects: `<exact pushes, CI, local replacements, or other effects>`
- Expiry condition: `<objective/time/state boundary>`
- Explicit exclusions: `<merge/tag/release/destructive and other excluded effects>`
- Normalized HAT 1 record: `<OPERATOR-GO HAT1 directly or via standing-auth ID>`

Until both reviewer ACCEPT and valid operator authorization are recorded, output `STOP` and make
no test or implementation change. With valid standing authorization, record its consumption and
continue without asking for a repeated conversational GO. Pause if scope, effects, or expiry are
ambiguous; the full contract is `docs/spec/appendices/E-standing-operator-authorization.md`.
