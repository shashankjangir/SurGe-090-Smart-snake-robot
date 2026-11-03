# Domain docs

Use a single-context layout: optional `GLOSSARY.md` at the repository root and
architectural decision records under `docs/adr/`.

Before exploring an area, read the glossary and relevant ADRs when present.
If they do not exist, proceed silently; do not create placeholders. Domain-modeling
work can add them when terms or decisions are actually resolved.

Use the glossary's vocabulary. Surface conflicts with existing ADRs explicitly,
including which decision conflicts and why it may need reconsideration.

For Gen 3, also follow the continuation instructions in `AGENTS.md`: read the
current handoff and joint map before operation, calibration or implementation work.

---

## Update — 2 November 2026

**Status (2 Nov).** These conventions are unchanged. Issues are currently kept per feature under
`.scratch/<feature>/issues/`, for example `esp-connection/01–03` (signed packet length, plain-text radio,
high-amplitude servo loss — owner reports wiring fixed, re-query pending) and `gen3-console/01–14`.
