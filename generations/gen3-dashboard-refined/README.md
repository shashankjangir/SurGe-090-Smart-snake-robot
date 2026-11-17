# SURGE refined dashboard

A separate Gen 3 website with a restrained technical interface. It includes the planar dashboard, Gen 3 dashboard, phone controller and 3D viewer. Its bundled frontend and local state are maintained separately from the [main generation](../gen3-experimental-3d/README.md).

## Run both websites

From the repository root, open two PowerShell terminals.

Original:

```powershell
conda run --no-capture-output -n surge python generations/gen3-experimental-3d/backend/web_dashboard/web_app.py
```

Refined:

```powershell
conda run --no-capture-output -n surge python generations/gen3-dashboard-refined/backend/web_dashboard/web_app.py
```

Open the original at [port 5000](http://127.0.0.1:5000/gen3) and the refined edition at [port 5001](http://127.0.0.1:5001/gen3). Each server also has `/`, `/phone` and `/3d`. The refined server defaults to 5001. Use `--port 5002` to choose another port. Starting either server does not open serial hardware.

You can also run `./generations/gen3-dashboard-refined/start.ps1`, with optional `-Port 5002`. Both versions use the existing Conda `surge` environment. If needed, install this copy's `backend/web_dashboard/requirements.txt` in that environment.

## Independent state

The copy has its own joint_map.json, ignored operators.json, ignored transmitter_port.json, runs, gait presets and saved poses. Existing local credentials and saved presets were copied once. Logs start fresh. The browser cookie is `surge_refined_session`, separate from the original server's cookie. Signing into one website does not sign into the other. Changes made after this copy do not synchronize.

The [joint map](joint_map.json) records 12 joints with `calibrated: true`, speed 2144, tracking error 492 and tracking timeout 0.5 seconds. The owner marked IDs 11 and 12 calibrated on 10 November 2026. Joint travel is ±110° and shared gait amplitudes have a separate 90° cap. Read the [handoff](../../docs/GEN3_HANDOFF.md) before operating hardware.

Both websites can be open together. Use only one server to control the physical robot at a time. Their operator leases are independent and do not arbitrate ownership across servers. Stop and disconnect hardware in one server before using the other.

## What changed

| Image suggestion | Implementation |
| --- | --- |
| 1. Remove filler badges | Removed specification chips and repeated team tags. Live progress, update rate, execution, feedback and operator states remain. |
| 2. Remove redundant labels | Shortened console headings and tuning actions. Units, warnings, field labels and accessible names remain. |
| 3. Remove random italics | Operational readouts use normal text. |
| 4. Limit monospace | Interface labels use Inter; measured joint values retain a data face. |
| 5. Use a design system | Shared tokens.css defines fonts, semantic colours, spacing, corners and motion timing. |
| 6. Show the product | Removed the decorative ribbon, stickers and poster canvas. The existing robot view leads. |
| 7. Enlarge the main feature | Increased the Gen 3 viewport and put it first on smaller screens. |
| 8. Group with spacing | Related fields, panel headings and toolbars use a consistent spacing scale. |
| 9. Specific headlines | The pages identify the Gen 3 control console and Gen 2.1 simulation console. |
| 10. Emphasize the action | Blue marks primary actions. Stop remains a persistent red control. |
| 11. Accent colour | SURGE blue is retained for actions and selection; semantic colours indicate outcomes. |
| 12. Consistent icons | Existing SVG icons share currentColor and a consistent stroke weight. |
| 13. Remove embellishments | Removed the announcement ticker and generation transition overlay; disabled decorative header and search effects. |
| 14. Consistent radii | Shared outer-panel and inner-control corner tokens. |
| 15. Text contrast | Darker neutral text, field boundaries and keyboard focus rings. |
| 16. Heading wrapping | Balanced headings, flexible widths and wrapping tabs. |
| 17. Optical alignment | Shared icon/label sizing, compact navigation and aligned controls. |
| 18. Tabular numbers | Live data uses stable-width digits; removed rolling telemetry animations. |
| 19. Loading states | Relevant command requests distinguish pending, accepted and failed responses. |
| 20. Useful animation | A brief GSAP acknowledgement cue, explicit hover/press transitions and reduced-motion support. No page-load reveal. |

Command acceptance means the server received the command. The existing live status reports actual motion and completion. No robot-control validation or safety gate was removed.

GSAP 3.13.0 is vendored for offline use. Its upstream license header is retained. The motion implementation follows the [official matchMedia documentation](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/). The remaining runtime requirements are unchanged.

The later source cleanup removed five unused poster-effect implementations from this copy's `common.js`. Its request feedback, gamepad, battery, glass and GridBeam implementations remain. The main generation retains the poster implementations and uses separate `pages`, `components` and `data` script folders. See this copy's [asset guide](backend/web_dashboard/static/README.md) before editing either frontend.

## Verification commands

Run from the repository root:

```powershell
node generations/gen3-dashboard-refined/tests/test_refined_feedback.cjs
Get-ChildItem generations/gen3-dashboard-refined/tests/test_*.cjs | ForEach-Object { node $_.FullName; if ($LASTEXITCODE) { throw "Node check failed" } }
conda run -n surge python generations/gen3-dashboard-refined/tests/check_refined_browser.py
conda run -n surge python -m unittest discover -s generations/gen3-dashboard-refined/tests -p test_refined.py -v
conda run -n surge python -m unittest discover -s generations/gen3-dashboard-refined/tests -p 'test_*.py' -v
```

## Recorded copy-creation checks

The copy-creation Python run exercised 175 tests. It reported four pre-existing failure cases, reproduced against the original generation's hardening tests. These were one stale expectation for the old browser-upload button text and three expected rejection-status mismatches for phone input. The configuration/HTTP checks and request-feedback checks passed in that session.

Browser checks use temporary test credentials and block serial transport. Hardware operation, firmware upload and physical calibration are outside this verification.

The copy-creation browser verification passed login, PyBullet connection, simulation motion and Stop, all workspace tabs, keyboard focus and reduced motion. Layouts and tab reachability passed at 320, 375, 768, 1280 and 1920 pixels, plus landscape. The rendered design check reported zero blocking failures, four advisory warnings about shared component recipes, and one deliberate waiver for the larger emergency-stop target. The new-style mechanical detector reported no findings in that session.

The original generation was checked against 802 pre-copy file hashes when this copy was created. Those results describe that session, including its earlier source layout and test expectations.

On 17 November 2026, all 41 refined Node test scripts passed after stale fixtures were updated for the compact interface and current control helpers. The maintained generation's 43 Node scripts also passed. These are software checks.
