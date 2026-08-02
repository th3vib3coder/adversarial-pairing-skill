---
status: sourced
type: concept
role: reference-doc
provenance:
  - kind: protocol
    ref: docs/spec/appendices/E-standing-operator-authorization.md
    locator: Required authorization record; Gate consumption; Mandatory pause conditions
last-verified-at: 2026-08-02
---
# Standing Operator Authorization

Standing operator authorization is the bounded alternative to asking a human operator for a new
GO token at every HAT transition. The operator grants it once for a closed objective, repository
and branch set, seq range, transition/effect list, expiry, and exclusions. The implementer records
each consumption and continues without another conversational prompt.

It changes authorization frequency, not review quality. A distinct reviewer still owns HAT 1,
pre-flip, and final cached-patch decisions. Tests, structural R2 state, complete staging, and CI
watch remain mandatory. Merge/tag/release, destructive actions, force-push, credentials, and scope
expansion are excluded unless the operator names them explicitly.

Authorization pauses on ambiguity, expiry, revocation, reviewer BLOCK, or recovery outside the
recorded boundary. It expires when the named outcome and explicitly permitted external effects are
complete.
