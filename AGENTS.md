# Project continuation

For Gen 3 operation, calibration, firmware, dashboard or simulation work, first read
[the current handoff](docs/GEN3_HANDOFF.md) and
[the measured joint map](generations/gen3-experimental-3d/joint_map.json).
Use the live file for settings and preserve existing local edits.

As reviewed on 17 November 2026, Gen 3 has 12 joints. Odd IDs are pitch, even IDs
are yaw. Pitch ID 1 has sign +1, pitch IDs 3/5/7/9/11 have sign -1, and all yaw
signs are +1. The user marked IDs 11/12 calibrated on 10 November. The map saves
`calibrated: true`, zero 2048, bounds 796–3300, speed 2144,
`tracking_error` 492 and `tracking_timeout` 0.5. Shared gait amplitude and bias
use the separate 90-degree cap. Read the [upgrade note](docs/hardware/12_MOTOR_UPGRADE.md)
for commissioning limits.

The maintained dashboard lives under `generations/gen3-experimental-3d/backend/`.
Screens go in `web_dashboard/templates/pages/` and `web_dashboard/static/pages/`.
Shared pieces go in the corresponding `components/` folders. Browser requests
and storage go in `static/data/`; server record storage goes in
`surge_control/data/`. Keep one job per file and search for existing behavior
before adding code. See the [asset guide](generations/gen3-experimental-3d/backend/web_dashboard/static/README.md).

Keep the maintained dashboard's glass, pixel-snake headline, ticker, stickers and
transitions. Design tokens live in `static/tokens.css`. Shared styling and the
commented helper-text rules live in `static/components.css`. The
[UI refresh record](docs/gen3/DASHBOARD_UI_REFRESH.md) explains the design.

The refined dashboard is independent. The Pi package is a legacy 10-joint
distribution. Check each copy's own map and dependencies when editing it.
The last confirmed transmitter was COM8 on 3 November. OTA firmware was
installed then; later receiver changes remain unflashed.

## Agent records

- Track issues locally under `.scratch/` using [the issue-tracker rules](docs/agents/issue-tracker.md).
- Use [the five triage labels](docs/agents/triage-labels.md).
- Use [the glossary and ADR conventions](docs/agents/domain.md) for domain documentation.
- Follow [the repository guide](docs/REPOSITORY_LAYOUT.md) for verification commands.
