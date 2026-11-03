# Issue tracker: Local Markdown

Issues and specs live in `.scratch/`, with one feature per directory.

- Spec: `.scratch/<feature>/spec.md`.
- Issues: `.scratch/<feature>/issues/<NN>-<slug>.md`, numbered from `01`, one file per ticket.
- Record triage state in a `Status:` line using `triage-labels.md`.
- Append comments and conversation history under `## Comments`.

When a skill says to publish to the issue tracker, create the appropriate local
Markdown file. When fetching a ticket, read its referenced path or resolve its
number within the feature directory. No GitHub issue publication is implied.

---

## Update — 2 November 2026

**Status (2 Nov).** These conventions are unchanged. Issues are currently kept per feature under
`.scratch/<feature>/issues/`, for example `esp-connection/01–03` (signed packet length, plain-text radio,
high-amplitude servo loss — owner reports wiring fixed, re-query pending) and `gen3-console/01–14`.
