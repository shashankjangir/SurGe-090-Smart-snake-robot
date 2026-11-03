# Project continuation

For Gen 3 operation, calibration, firmware, dashboard or simulation work, first read
`docs/GEN3_HANDOFF.md` and the current `generations/gen3-experimental-3d/joint_map.json`.
They record the hardware setup, successful trials, and unresolved limits. The confirmed
sign mapping (pitch ID 1 = 1, pitch IDs 3/5/7/9 = -1, all yaw IDs = 1) is saved in `joint_map.json`.
Preserve current measured settings; do not substitute older chat examples.

## Agent skills

### Issue tracker

Track issues in local Markdown under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage roles. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context glossary and ADR layout. See `docs/agents/domain.md`.

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

Current measured settings: speed 1500, `tracking_error` 216, `tracking_timeout` 0.5. Radio is now plain text;
the PC transmitter is on COM7. Read the dated entries at the top of `docs/GEN3_HANDOFF.md` first.
