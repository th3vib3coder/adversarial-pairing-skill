# Appendix C — Helper-Aware Pre-Survey Grep Patterns

## Purpose

Run these patterns **before any HAT 1 STOP** that requires either anti-duplication
evidence or a complete call-site enumeration. A survey grounded in grep output
prevents the Implementer from asserting "no other callers" or "no duplicate logic"
without mechanical evidence.

Execute all five classes in sequence, deduplicate the union of hits, and classify
each hit before writing your STOP answer.

---

## Pattern Library

### Class 1: Direct Importers

Finds every file that imports a named module or symbol by its literal path.

```bash
grep -rn "from .*<module>" <root>
grep -rn "require.*<module>" <root>
```

Replace `<module>` with the module identifier under investigation (e.g., a filename
stem or package name). Catches ES/Python imports and CommonJS requires.

---

### Class 2: Bracket Dispatch

Finds dynamic method calls routed through a bracket-access expression, which static
import search misses entirely.

```bash
grep -rn "<obj>\[[^]]*\](" <root>
```

Replace `<obj>` with the object variable name (e.g., `reader`, `handler`, `adapter`).
These call sites are invisible to Class 1 because no module path appears on the line.

---

### Class 3: Helper Conventions

Finds wrapper or utility functions that follow naming conventions common in the
codebase. Run all three sub-patterns:

```bash
grep -rn "safe[A-Z][a-zA-Z]*(" <root>
grep -rn "withFallback\b" <root>
grep -rn "tryRead[A-Z]" <root>
```

Adjust prefixes to match the codebase naming scheme (e.g., swap `safe` for `guarded`,
`tryRead` for `tryFetch`) to surface thin wrappers that silently absorb errors.

---

### Class 4: Instanceof Checks

Finds guard clauses that branch on a specific error or object type. Useful for
locating all sites that handle a particular failure path.

```bash
grep -rn "instanceof <ErrorClass>" <root>
```

Replace `<ErrorClass>` with the error type name (e.g., `NotFoundError`,
`TimeoutError`). Each hit is a potential swallow or re-throw site.

---

### Class 5: Catch/Swallow Patterns

Finds try-catch blocks and inspects the body for silent catches (empty body or
comment-only body).

```bash
grep -rn "} catch (.*) {" -A 3 <root>
```

The `-A 3` lines reveal whether the catch body rethrows, logs, or silently discards.
A catch body containing only a comment or a no-op is a swallow site.

---

## Combining the Classes

1. Run all five patterns against `<root>` (typically the `src/` or equivalent tree).
2. Collect output into a single list; remove duplicate file:line entries.
3. For each unique hit, classify it (see Decision Tree below).
4. Record counts by class in your STOP evidence block.

Combining matters: Class 1 misses bracket dispatch; Class 2 misses named imports;
Class 3 misses ad-hoc wrappers; Classes 4–5 are error-path only. The union is the
meaningful signal.

---

## Decision Tree

```
Hit found
│
├─ Is the file under a test/ or __tests__/ directory?
│   ├─ Yes → mark TEST-ONLY; exclude from production caller count
│   └─ No  → continue
│
├─ Does the hit import or call the function directly (Class 1 or 2)?
│   ├─ Yes → classify as PRODUCTION CALLER
│   └─ No  → continue
│
├─ Does the hit wrap the function with error suppression (Class 3 or 5)?
│   ├─ Yes → classify as SWALLOW SITE; flag for Adversary review
│   └─ No  → continue
│
└─ Does the hit branch on an error type (Class 4)?
    ├─ Re-throws → classify as PROPAGATOR
    └─ Absorbs   → classify as SWALLOW SITE; flag for Adversary review
```

---

## Failure Modes

**False negatives — pattern library incomplete**

- Dynamic `require()` with a computed string (e.g., `` require(`plugins/${name}`) ``)
  will not match Class 1 literal patterns.
- Aliases or re-exports under a different name defeat all five classes unless the
  alias name is also searched.
- Minified or transpiled output in `<root>` inflates noise; restrict to source directories only.

**False positives — test files counted as production**

- Test fixtures that import the module to exercise it are not production callers.
  Always filter hits through the Decision Tree's first branch before claiming a
  caller count.
- Commented-out code matched by the pattern still appears in output; inspect context
  lines before counting.

---

## Cross-Reference

- Verification Discipline §2.5.1 — "Call-Site Enumeration" (`02-verification-discipline.md`):
  any STOP asserting "complete enumeration" must attach grep evidence from at least Class 1 and Class 2.
- See also `README.md` for the full spec index and the appendix registry.
