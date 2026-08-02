---
status: claimed
type: manual
role: reference-doc
provenance:
  - kind: protocol
    ref: adversarial-pairing-skill/tools/bootstrap.sh
last-verified-at: 2026-08-02
---
# Wiki Schema (LAW 13)

This file documents the required frontmatter schema for all wiki pages.
LAW 13: every wiki page MUST have YAML frontmatter with the fields below.

## Required frontmatter fields

```yaml
---
status: sourced | computed | claimed | supposition
type: concept | source | entity | synthesis | hypothesis | manual
role: tool-catalog | user-manual | reference-doc
provenance:
  - kind: <primary-source-kind>
    ref: <citation-or-url>
    locator: <optional-section-or-page>
last-verified-at: YYYY-MM-DD
---
```

## Status definitions

- **sourced**: backed by a primary source cited in provenance
- **computed**: derived deterministically from sourced data
- **claimed**: asserted without a primary source; needs verification
- **supposition**: working hypothesis; treat as provisional

## Operator notes

Replace this file's content with project-specific schema details.
This placeholder was injected by bootstrap.sh.
