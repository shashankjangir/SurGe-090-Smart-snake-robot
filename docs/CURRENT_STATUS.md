# Current project status

Reviewed on **17 November 2026** against the maintained source and saved map. This page distinguishes recorded physical work from software verification.

The [Gen 3 map](../generations/gen3-experimental-3d/joint_map.json) saves 12 calibrated joints, zero 2048, bounds 796–3300 counts, speed 2144, tracking error 492 and timeout 0.5 seconds. Pitch ID 1 is +1, pitch IDs 3/5/7/9/11 are -1, and all yaw IDs are +1. Shared gait amplitude and bias use the separate 90-degree cap.

| Date or period | Recorded work |
| --- | --- |
| Earlier prototypes | Dynamixel XL330, then a ten-joint planar ST3215 chain and servo-bus tools. |
| 26 October | Individual centering and pitch-only trials at 2, 5 and 10 degrees. A 10-degree run used an eight-second ramp. |
| 31 October | Gen 2.1 layout, continuous simulated route traversal and unified console work, recorded in commit fc24e4e. |
| Later high-amplitude trial | Yaw 30 degrees, pitch 25 degrees, 0.5 Hz and speed 1500 produced a write fault and missing IDs 7/8. Wiring was reported repaired. A logged recheck remains pending. |
| 1–3 November | Tracking, pose tools, per-joint settings, researched presets, CAD-based simulation, gamepad controls, separate workspaces and OTA implementation. |
| 3 November, firmware | Receiver on COM6 and transmitter on COM8 identified by MAC. Both OTA-capable firmware environments uploaded with verified flash hashes. Twenty HELLO-only exchanges passed with robot battery disconnected. |
| 4 November | Software joint bounds widened to approximately ±110 degrees. Firmware source changed, with installation pending. |
| 7 November | IDs 11 and 12 added across the maintained Gen 3 code, map, simulation, assets and receiver source. See [the upgrade record](hardware/12_MOTOR_UPGRADE.md). |
| 9–10 November | Dashboard UI refresh and owner-marked calibration for IDs 11/12. See [the UI record](gen3/DASHBOARD_UI_REFRESH.md). |
| November software audit follow-up | Items 1–20 addressed through firmware source fixes, browser and storage fixes, code cleanup, CAD input repair and clearer distribution labels. |

## Software audit follow-up

| Items | Changes in the working tree |
| --- | --- |
| 1–8 | Accurate watchdog torque-off replies, pending Stop priority, one secure login handler for both aliases, keyboard phone Stop, corrupt-preset preservation, a legacy 10-joint Pi label, 12-joint native test stubs and a shared 90-degree gait cap. |
| 9–14 | Visible pairing links, WebGL fallback, preserved annotation drafts and explicit clearing, recalculated planar reports, expired idle viewer sessions, a bounded start-retry window and portable CAD inputs. |
| 15–17 | Removed absent customization controls, orphan CSS, unused editor code, variables, Python wrappers, native sliders, stale imports and the unused Gen 2 path shim. Hidden GridBeam rendering pauses. |
| 18–20 | Removed unused CAD assembly grouping and imports, inactive effects from the refined copy, and a constant-false legacy presentation branch. Historical trial records and antenna-clearance requirements remain. |

The maintained dashboard retains its glass, pixel-snake headline, ticker, stickers and transitions. Screens now live in `pages/`, shared pieces in `components/` and loading/saving code in `data/`. The [software guide](SOFTWARE.md) explains the layout.

## Recorded verification and gaps

On 17 November 2026, stale test fixtures were updated for retired controls, phone pairing errors, the current joint count and controller defaults. The controller tests cover an explicitly configured timeout, the owner-requested default and explicit release/Stop.

A publication-only export containing 1,191 files passed these checks. The export excluded Git metadata, ignored private configuration and caches.

| Check | Result |
| --- | --- |
| Root Python | 66 tests passed, with two skips |
| Maintained Gen 3 Python | 179 tests passed |
| Refined Python | 175 tests passed |
| Gen 2 offline Python | 21 tests passed |
| Maintained Node | All 43 scripts passed |
| Refined Node | All 41 scripts passed |
| Markdown | 164 files checked, zero local-link errors |
| Repository layout | 1,289 historical move records and 52 dashboard asset paths checked |

These runs used Windows and the existing Conda `surge` environment. A fresh dependency installation and the GitHub-hosted [offline CI workflow](../.github/workflows/python-package.yml) remain unverified. The workflow selects Python 3.11 and Node 22.

Earlier Chromium checks passed pairing, annotation save/clear/draft behavior, WebGL fallback, GridBeam visibility and refined simulation/Stop behavior. CAD inputs loaded as eight servo solids and 253 controller solids. Prototype transforms and retained exporter structure were checked. Full assembly export and physical fit remain pending.

The layout checker accepts the intentional root CAD folder. Historical move records are checked for path containment and uniqueness, while required runtime files and dashboard assets are checked for existence.

## Physical work still pending

The last firmware installation was 3 November. The later 12-motor, wider-limit, watchdog and Stop-priority changes are source changes awaiting installation and physical verification. An actual Wi-Fi OTA transfer and reboot also remain unverified.

The last confirmed board mapping is COM6 receiver and COM8 transmitter. The reported battery is an external 2200 mAh 3S LiPo on long leads, and the last owner report says fuses are absent.

Before a new physical trial, record diagnostics from all 12 joints, check the wiring repair, measure voltage under load, and verify support, clearance and cable routing. Repeat small finite trials before retrying the failed high-amplitude case. Measure ground travel directly and validate any localization source before physical route assistance.

Use the [handoff](GEN3_HANDOFF.md), [operating guide](operations/1_APP_USAGE_MANUAL.md) and [travel worksheet](../generations/gen3-experimental-3d/TRAVEL_TRIALS.md). Earlier records remain in [the archive](archive/2026-11-03/README.md).
