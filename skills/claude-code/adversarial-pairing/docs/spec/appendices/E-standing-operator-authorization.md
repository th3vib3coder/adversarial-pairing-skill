# Appendix E — Standing Operator Authorization

**Parent index**: [README.md](../README.md)
**Cross-references**: [Cluster 1 — Roles & Cycles §1.5.2](../01-roles-and-cycles.md) · [Cluster 6 — State Integrity](../06-state-integrity.md)
**Version**: v0.2.0-rc.1

---

## Purpose

The default protocol asks the operator for a separate `GO`, `GO-TO-FLIP`, and `GO-COMMIT` at
each boundary. That mode remains valid. For a bounded repair or delivery that the operator wants
completed without repeated conversational pauses, the operator may instead grant a **standing
operator authorization** once. It replaces repeated prompts; it never replaces independent
review, test evidence, or state-integrity checks.

Standing authorization is an authorization mechanism, not an autonomous-review shortcut. The
implementer still cannot ACCEPT its own work. A distinct reviewer still decides HAT 1, performs
the pre-flip review, and performs the final cached-patch review. CI still has to finish green.

## Required authorization record

The authorization must be explicit and attributable to the operator. Do not infer it from urgency,
silence, a generic request to “continue,” or a previous unrelated task. Before consuming it, record:

```text
authorization-id: <stable id>
operator-source: <verbatim message in a private record, or durable reference/source receipt>
objective: <one bounded outcome>
repositories-and-branches: <closed list>
seq-range: <closed list or one named repair cycle>
allowed-transitions: <HAT1, FLIP-STAGE, COMMIT-PUSH, optional MERGE-TAG-RELEASE>
allowed-external-effects: <closed list>
expires: <time, event, or objective completion>
exclusions: <destructive actions, force-push, secrets, unrelated paths, etc.>
```

An authorization with an open-ended repository, branch, objective, or external-effect scope is
invalid. `MERGE-TAG-RELEASE` is not implied by `COMMIT-PUSH`; it must be named separately.
Cross-repository delivery must name each repository and branch.

### Public-artifact privacy

A public artifact must not reproduce a private transcript, PII, or machine-specific user paths merely
to prove attribution. Keep the verbatim operator source in the private task record. In a public ledger,
publish a durable locator or a SHA-256 source receipt with its source count, ordering, encoding, separator,
trailing-newline rule, and any portable path aliases needed to reconstruct the authorized scope. A hash
does not create authorization; the reviewer must inspect the private transcript and verify the receipt
before the first consumption. Public aliases such as `<CODEX_HOME>`, `<CLAUDE_CONFIG_DIR>`, and
`<clean-replay-worktree>` must be defined by role, not expanded to a person's local filesystem path.

## Gate consumption

When the relevant reviewer decision is green, the implementer proceeds without asking the operator
again and appends a normalized transition record to the status ledger:

```text
OPERATOR-GO HAT1 via standing-auth <authorization-id>
GO-TO-FLIP via standing-auth <authorization-id>
GO-COMMIT via standing-auth <authorization-id>
```

Each record names the seq, reviewer decision/evidence, exact action, and timestamp. Recording a
consumption does not manufacture authorization: the original operator source and current scope
must still match. The same authorization may cover multiple named transitions, but every
transition gets its own record so the audit trail remains reconstructable.

## Mandatory pause conditions

Standing authorization stops applying immediately when any of these conditions occurs:

- the reviewer issues `REDIRECT` or `BLOCK` and remediation would expand the authorized scope;
- a path, repository, branch, seq, external effect, or destructive operation is not named;
- the baseline or CI failure cannot be attributed and repaired inside the authorized objective;
- a push is rejected and recovery would require rebase, history rewrite, or force-push not named;
- credentials, legal acceptance, financial action, user impersonation, or another human-only
  decision is required;
- the authorization expires, is revoked, or becomes ambiguous.

The implementer may repair a reviewer finding without another prompt only when the repair remains
inside the frozen objective and file/effect boundaries. It must be resubmitted to the distinct
reviewer. A scope expansion requires a new or amended operator authorization.

## Bootstrap and dual-repository use

The bootstrap tool itself always stops before Git mutation. A later bootstrap commit may proceed
without a fresh prompt only when standing authorization explicitly includes that target repository,
the bootstrap commit, and the required commit/push effect, after independent review of the created
and preserved-path inventory.

For provider/consumer delivery, authorization must name both repositories and preserve provider
first ordering. Provider CI green remains a hard prerequisite for consumer mutation. One
repository's reviewer decision or authorization consumption is never evidence for the other.

## Revocation and closure

The operator may revoke standing authorization at any time. Revocation applies before the next
state-changing operation and is recorded in the status ledger. Authorization expires automatically
when its named outcome is delivered, final CI is green, and any explicitly authorized
merge/tag/release action is complete. It cannot be reused for a later task.
