# Needle 2: fit for SurGe

This page preserves a dated research, planning, or verification record. Its trial values and results describe that session. Use the [current handoff](../GEN3_HANDOFF.md) and [setup guide](../START_HERE.md) for the maintained application.

Date: 2026-11-07. Scope: official-source research and local documentation review only; no installation, model execution, firmware upload or hardware motion.

## Recommendation

For the owner's confirmed architecture, **Needle 3 belongs beside the existing backend on the Raspberry Pi; the laptop displays the dashboard**. The Pi model, OS, architecture and RAM have not been inspected. This supersedes the earlier PC-host recommendation; the Needle 2 material below remains version-specific background. Needle could translate a short request into a proposed existing application action. It should not generate servo targets, replace the gait controller, own the serial connection or participate in the timing-critical safety loop. This is a project integration assessment, not a measured result.

## What it actually does

Cactus describes Needle 2 as a 45-million-parameter tool-calling and structured-extraction model, using its Simple Attention Network and CQ2 quantization. The advertised package is about 14 MB and a session about 28 MB RAM. Vendor figures include roughly 500 decode tokens/second on Raspberry Pi 5; those are not SurGe latency measurements. [Needle 2 release article](https://cactuscompute.com/blog/needle-2).

The v2 interface accepts text plus tool schemas and returns structured calls, arguments and confidence. Grammar constrains output structure; off-topic requests can return an empty call. The documented attention window is 256 tokens with tools pinned, and catalogues above five tools use retrieval. Those mechanisms do not establish that a selected action or its arguments are correct. It is not a vision system, SLAM implementation, learned locomotion policy or general robotics planner. [Needle 2 model card](https://huggingface.co/Cactus-Compute/needle2).

For voice use, add a separate speech-to-text stage before Needle 2; spoken acknowledgements also need a speech-output component. The current repository describes **Needle 3** and separate **Whistle** speech recognition sharing an engine. That newer arrangement must not be attributed to Needle 2 itself. [Current upstream repository](https://github.com/cactus-compute/cactus).

## Availability, versions and hardware

- The public v2 repository contains Windows x64/ARM executables, Linux ARM64/x64 builds, WebAssembly and Python wheels, including Windows wheels. Its observed revision is `32e9e3a93b205f786929697446ae669cf0a84579`. A prototype should record the exact model artifact and compatible package version rather than silently follow upstream defaults. [Pinned v2 files](https://huggingface.co/Cactus-Compute/needle2/tree/32e9e3a93b205f786929697446ae669cf0a84579).
- Upstream now defaults to Needle 3. Current Cactus 4 does not support Needle 2; use `cactus-compute<4` and the `legacy` branch for v2. The earlier `generation=2` guidance does not apply to the current package. [Current Python quickstart](https://github.com/cactus-compute/cactus#readme).
- The v2 model card and accompanying license identify Apache-2.0. Retain the license and applicable notices when distributing artifacts. [Pinned v2 license](https://huggingface.co/Cactus-Compute/needle2/blob/32e9e3a93b205f786929697446ae669cf0a84579/LICENSE).
- The release article claims ESP32-S3 support; the later v2 card instead mentions ESP32-P4 and an externally reported approximately 11 MB S3 port. Neither establishes compatibility with SurGe's configured `esp32dev` radio boards. Use the owner-reported Pi backend as the proposed inference host; do not migrate inference into receiver firmware based on the marketing claim. [Release article](https://cactuscompute.com/blog/needle-2), [v2 model card](https://huggingface.co/Cactus-Compute/needle2).

## Smallest useful experiment

Proposed flow: typed text, or separately transcribed speech → Needle → application validation and action preview → existing runtime → simulation. Start with no more than five narrow tools: read status, list presets, select a simulation preset, request a bounded simulation run, and stop. These are proposed tool contracts, not implemented endpoints. Read-only tools need no new motion authority. A simulation request should visibly identify its destination and remain subject to the existing runtime checks.

Use the manual-completion interface rather than the convenience auto-execution loop so the application inspects every call before dispatch. Validate tool names, types, allowed presets, bounds, current workspace and authorization independently of the model. Reject unknown calls, ambiguous requests and low confidence; determine any threshold from a local labelled set. Schema-valid output and high confidence are insufficient permission for physical movement. [v2 completion interface](https://huggingface.co/Cactus-Compute/needle2#quickstart-with-python).

Keep hardware arming, operator supervision, controller freshness, tracking checks, watchdog and torque-off in their existing owners. Do not expose raw serial commands, EEPROM writes, calibration changes or unconstrained joint angles. Voice stop can be an additional convenience, never the only stop path. This preserves the workspace and safety ownership in [ADR 0002](../adr/0002-simulation-hardware-workspaces.md).

Before calling the experiment successful, replay labelled requests including negation, ambiguous directions, unsupported actions, repeated commands and erroneous transcripts. Check exact selected actions/arguments, refusals, host latency and continued responsiveness when inference stalls. Run simulation only before considering a separately reviewed supervised hardware extension.

## Project state and verification boundary

Read [the current handoff](../GEN3_HANDOFF.md) and [the live joint map](../../generations/gen3-experimental-3d/joint_map.json) first. The observed map currently saves speed **2144**, tracking error **492** and timeout **0.5 s**, which differs from older narrative values. The maintained twelve-joint map uses pitch ID 1 +1, pitch IDs 3/5/7/9/11 −1, all yaw +1; neutral 2048 and bounds 796–3300. No settings were changed. The handoff still records installed firmware's ±70° clamp and unverified larger physical clearance; a language interface does not resolve either limit.

Only source availability and documentation were checked. No package compatibility, command accuracy, audio quality, inference latency, offline behavior or physical operation has been measured here.

## Needle 3 follow-up — 7 November 2026

**Prefer Needle 3 for a new experiment on the owner's Raspberry Pi backend**, with the same application-owned validation and simulation-first scope above. This is an integration recommendation: the current package targets it, while v2 needs the legacy package. It is not evidence that v3 is more accurate for SurGe. No explicit v2-versus-v3 head-to-head was found in the official product page, model card or current README reviewed; their benchmark claims against other models do not settle that comparison. [Current repository](https://github.com/cactus-compute/cactus), [Needle 3 product page](https://www.cactuscompute.com/needle).

- V3 adds text embeddings and configurable 2–20-layer subnetworks (29–121M parameters). Its advertised 8–29 MB refers to the model binary, **not total runtime RAM**; the same page also says 9–29 MB in its architecture section. Its reported 400–4,000 decode tokens/s is a Raspberry Pi 5 vendor range, not a measurement of the owner's Pi. Inspect the actual Pi and evaluate command accuracy, request latency, peak RAM and backend responsiveness before choosing a layer count. [Product page](https://www.cactuscompute.com/needle).
- Use `cactus-compute`, `import cactus` and `complete()` to inspect calls. `run()` executes functions. V3 reads the whole toolset and has no retrieval head, so the earlier v2 retrieval description must not carry over. Keep the proposed small toolset. Regex `triggers` can force calls below the confidence floor; avoid them in the initial robot-command trial. [Python reference](https://www.cactuscompute.com/blog/needle-python-docs).
- Hindi/Hinglish text accuracy is **unverified**: the reviewed Needle pages give no support guarantee or language-specific evaluation for either. Whistle's documented speech languages are English, German, French, Spanish, Italian, Dutch and Polish; Hindi is absent. Treat Hindi/Hinglish voice as a separate speech-recognition choice and test mixed-language text explicitly. [Python reference](https://www.cactuscompute.com/blog/needle-python-docs).
- The current repository and v3 model card identify Apache-2.0. Local inference still involves first-use engine/weight downloads, and Python anonymous usage counts are enabled unless disabled with `CACTUS_TELEMETRY=0` or `DO_NOT_TRACK=1`. The reference says these counts exclude prompts, outputs and data. Disable telemetry when evaluating an offline configuration and provision the cached artifacts first. [Repository](https://github.com/cactus-compute/cactus), [v3 model card](https://huggingface.co/Cactus-Compute/needle3), [Python reference](https://www.cactuscompute.com/blog/needle-python-docs).

Decide between generations using the same labelled SurGe requests, exact action/argument scoring, refusals, host latency and peak RAM. No model was installed or run for this follow-up, and no robot setting or hardware state was changed.

## Owner-confirmed Pi architecture and capability inventory

On 7 November the owner reported that all backend work runs on a Raspberry Pi and the laptop is the dashboard client, and intends to run Needle 3 on that Pi. This is owner-reported deployment context, not a remotely inspected installation; the Pi model, OS, RAM and deployed revision remain unknown. Proposed flow: laptop text (or separately transcribed voice) → Pi Needle 3 → validated application tools → existing Pi backend → existing robot transport. Keep inference outside the control worker so inference delays cannot hold up control or Stop.

Needle contributes tool selection, structured extraction and text embeddings. The application still performs calculations, compares measurements and executes actions. Speech recognition/output, camera interpretation, localization, mapping and navigation planning need their own components. These distinctions follow the [Needle product description](https://www.cactuscompute.com/needle) and [Cactus component overview](https://github.com/cactus-compute/cactus).

The inventory below is based on the local [web application](../../generations/gen3-experimental-3d/backend/web_dashboard/web_app.py), its existing backend contracts and the current handoff. **Existing** means the underlying application operation exists; none currently has a Needle integration, and availability on the owner's live Pi has not been verified.

| Area | Useful language-driven operations | Existing capability and additional work |
| --- | --- | --- |
| Motion | Select a gait; propose a bounded run/duration; stop; request centering | Existing start/stop/center and preset APIs. Hardware movement retains explicit destination, operator authority and existing checks. No voice-generated servo loop or simulated gamepad hold. |
| Presets | List, find, save or update a gait preset; request deletion | Existing preset CRUD with concurrent-edit checks. Natural-language matching is a new adapter; preview destructive changes. |
| Poses | List/load a pose; capture a hand-positioned shape; name/update a saved pose; request Move to Pose | Existing pose capture/storage and pose execution. Torque-off capture and movement confirmation remain separate; a capture request never means move. |
| Live settings | Propose amplitude, frequency, phase or bias changes; apply to the current run | Existing live Apply validates bounds, run identity and revisions. Needle extracts a proposal; application validates units and limits. Saved calibration is not a casual command tool. |
| Status | Ask which workspace/job is active, which port is selected, what settings are loaded, who owns control | Existing status, map, port and session APIs. Report timestamps and actual state rather than infer successful motion from a request. |
| Diagnostics | Request a stopped bus check; identify missing servo replies; inspect tracking, voltage, temperature or battery estimate | Existing diagnostics/metrics and telemetry. Idle snapshots can be stale; battery reserve is voltage-derived, not measured remaining capacity. Diagnostic interpretation needs application rules and human checks. |
| Pi health | Ask CPU/RAM usage or whether inference is competing with control | Existing system-stats API reports CPU/RAM if psutil is available; host temperature is currently `N/A`. Inference timing, memory limits, thermal monitoring and alerts need new measurement/services. |
| Records | Find runs; fetch logs; attach surface, displacement and notes; compare trial results | Existing run listing, log download and annotations. Cross-run analysis needs ordinary application calculations; semantic search needs a new local embedding index. Retrieval is not a guarantee of factual answers. |
| Simulation trials | Connect/disconnect simulation; try a named gait; request finite trials; review available path reports | Existing simulation/start/stop/report operations. Batch trials, scoring and parameter search need an orchestrator using deterministic bounds and metrics; Pi simulation performance is unmeasured. Simulation results do not certify physical performance. |
| Navigation | Supply a target/route; request assisted tracking; eventually return to a marked location | Existing route/localization interfaces are not a sensor or navigation stack. Physical assistance depends on verified fresh localization. Reliable obstacle avoidance, mapping, docking and autonomous mission completion require suitable sensors, perception/planning and validation. |
| Maintenance | Read configuration; find a procedure; review firmware build status; request a supported build | Existing map/build/status operations. Dashboard firmware upload deliberately refuses every request; flashing remains owner-operated. Calibration, EEPROM, torque and wiring work require human-supervised procedures. A documentation search index would be new. |
| Voice and inspection | Speak commands/acknowledgements; inspect an image; classify inspection findings | New audio/camera hardware and separate speech/vision services as needed. Needle can route requests or extract text findings; it does not itself listen, see, measure defects or supply a general planner. |

Start with read-only status/preset/run tools and one finite simulation request, then measure on the actual Pi while the backend is under representative load. Broader tools are possibilities for staged integration, not installed features. No installation, robot connection, setting change or motion was performed for this update.
