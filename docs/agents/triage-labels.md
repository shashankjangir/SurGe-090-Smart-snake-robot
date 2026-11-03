# Triage labels

| Role | Local label | Meaning |
|---|---|---|
| needs-triage | needs-triage | Maintainer needs to evaluate the issue |
| needs-info | needs-info | Waiting for more information |
| ready-for-agent | ready-for-agent | Fully specified and ready for agent work |
| ready-for-human | ready-for-human | Requires human implementation |
| wontfix | wontfix | Will not be actioned |

Use these names in local issue `Status:` lines when a skill refers to a triage role.

---

## Update — 2 November 2026

**Status (2 Nov).** These conventions are unchanged. Issues are currently kept per feature under
`.scratch/<feature>/issues/`, for example `esp-connection/01–03` (signed packet length, plain-text radio,
high-amplitude servo loss — owner reports wiring fixed, re-query pending) and `gen3-console/01–14`.
