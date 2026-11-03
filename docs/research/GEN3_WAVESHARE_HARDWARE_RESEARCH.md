# Gen 3 segment redesign: hardware research and Opus 5.5 prompt

Researched 2 November 2026 against Waveshare primary sources. Restructured the same day for generating the parts with code-based CAD. This brief feeds the design; it does not certify the installed components and it is not a release-ready CAD drawing. The owner has identified the motor as **ST3215**; the voltage variant, controller SKU, printer and material are not confirmed. Existing local v6 CAD is not evidence that its dimensions or assembly transforms are correct.

## How to use this file

Give the whole file to Opus 5.5 (`claude-opus-5-5`) in a session that can run Python inside this repository.

- **Section 1** is the only source of numbers. Every dimension used in CAD comes from there, either as a verified value or as a named parameter.
- **Section 2** lists the reference files to load.
- **Section 3** fixes the toolchain and output layout.
- **Section 4** is the prompt itself: two phases, constraints and acceptance checks.
- **Section 5** records the research and reasoning behind the constraints. Use it to settle questions, not as a second source of dimensions.

## 1. Input register

Every value used in geometry must come from this table. Code refers to each value by its parameter name and keeps all of them in one `params.py`. A value marked **provisional** may be used in Phase 1. Every value marked **blocks release** must be measured before Phase 2.

### 1a. Servo: Waveshare ST3215 (nominal, from the official drawing and product pages)

| Parameter | Value | Source | Confidence | Blocks release |
|---|---|---|---|---|
| `servo_variant` | ST3215 (12 V, SKU 22414) or ST3215-7.4V (SKU 33014): unknown | Owner + [specs](https://docs.waveshare.com/ST3215_Servo) | Unknown | Yes, for load checks |
| `servo_plan_l` × `servo_plan_w` | 45.22 × 24.72 mm | Official 2D drawing | Nominal | Yes, measure |
| `servo_axis_from_end` | 10.11 mm from the near end | Official 2D drawing | Nominal | Yes, measure |
| `servo_height_callouts` | 29 / 32 / 35 / 37.25 mm (37.25 = outermost wheel/hardware envelope) | Official 2D drawing | Nominal | Yes: identify which feature each one is |
| `horn_dia` | Ø19.2 mm | Official 2D drawing | Nominal | Yes, measure the installed horn |
| `horn_hole_span` | 14 mm between opposite holes | Official 2D drawing | Nominal | Yes |
| `horn_thickness`, `horn_stack` | unknown | Not given in the drawing | — | Yes |
| `spline` | 25T, Ø5.9 mm, metal: never print it | [Specs](https://docs.waveshare.com/ST3215_Servo) | Vendor claim | No |
| `mount_face_a` | 24.45 mm longitudinal × 20.5 mm transverse | Official 2D drawing (one face) | Nominal | Yes |
| `mount_face_b` | 20.7 mm longitudinal | Official 2D drawing (opposite face) | Nominal | Yes |
| `mount_hole_d`, thread, depth | unknown | Not given | — | Yes |
| `rear_feature_motion` | unknown whether the opposite-side feature rotates or is fixed | Not established | — | Yes |
| `servo_connector` | 5264-3P | [FAQ](https://docs.waveshare.com/ST3215_Servo/FAQ) | Vendor | Connector position: yes |
| `supplied_screws` | 3×5 mm self-tapping, 2×6 mm round-head self-tapping, M3×6 mm round-head; which hole each one goes in is not stated | [FAQ](https://docs.waveshare.com/ST3215_Servo/FAQ) | Vendor | Yes |
| `servo_mass` | unknown | — | — | Yes, for load checks |

Face A and face B hole patterns differ and are not interchangeable. The drawing's title block says **SCS215**, dated 2022/6/8, even though Waveshare distributes it under ST3215 filenames.

### 1b. Controller: Waveshare Servo Driver with ESP32 (candidate until the installed board is confirmed)

| Parameter | Value | Source | Confidence | Blocks release |
|---|---|---|---|---|
| `board_sku` | 21593 (candidate) | [Official overview](https://docs.waveshare.com/Servo_Driver_with_ESP32) | Unconfirmed | Yes |
| `board_l` × `board_w` | 65 × 30 mm | Official overview | Nominal | Yes, measure |
| `board_hole_span` | 58 × 23 mm between centres | Official overview | Nominal | Yes |
| `board_hole_d` | 2.75 mm (some older listings say 3.0; do not assume M3) | Official overview | Nominal | Yes |
| `pcb_t` | **provisional 1.6 mm** | Common PCB thickness, not measured | Assumed | Yes |
| `board_under_clear` | unknown underside component height | — | — | Yes |
| `board_top_height` | unknown (OLED, ESP32 module, headers) | — | — | Yes |
| Connectors | USB Type-C, 5.5 × 2.1 mm DC jack, servo ports, BOOT/RST buttons, onboard antenna; plug envelopes unknown | Official overview | Positions: from STEP | Yes |
| `board_vin` | 6–12 V; must match the servo variant | Official overview | Vendor | No |

The Bus Servo Driver HAT (A) is a different board (65 × 57 mm, holes 58 × 49 mm, Ø3 mm). Do not use it for the tail mount.

### 1c. Robot settings to preserve (from `generations/gen3-experimental-3d/joint_map.json`, read 2 November 2026)

| Item | Value |
|---|---|
| Joints | 10 servos, IDs 1–10; odd IDs pitch, even IDs yaw |
| Neutral (straight pose) | encoder 2048 on every joint |
| Software limits | 1252–2844 counts (about ±69.96°); unchanged |
| Speed / tracking error / timeout | 1500 counts/s / 216 counts / 0.5 s |
| Signs | pitch ID 1 = +1; pitch IDs 3/5/7/9 = −1; all yaw = +1 |
| Battery | external; the central battery compartment was removed |

±90° of mechanical travel would correspond to 1024–3072 counts. That is only arithmetic, **not permission to change limits**: the CAD gives mechanical clearance, and software limits stay as they are.

### 1d. Geometry and print parameters (provisional proposals for Phase 1)

These are starting values with reasons, not verified fits. Make every one a parameter.

| Parameter | Phase 1 value | Reasoning | Blocks release |
|---|---|---|---|
| `joint_pitch` | **Compute it**: the smallest axis-to-axis spacing that clears ±90° with installed hardware. Report the value. | Measured spacing is unknown; the simulation spacing is illustrative only | Yes: compare with the existing robot and cable reach |
| `fit_servo` | 0.25 mm per side | Typical FDM slip fit; calibrate with a test coupon | Yes |
| `gap_moving` | 1.5 mm minimum between moving bodies | Covers print error, flex and backlash | Yes |
| `wall` | 2.4 mm (6 perimeters at 0.4 mm) | Common stiff FDM wall | Yes |
| `rib` | 2.0 mm | Local stiffening | Yes |
| `fillet_root` | 2.0 mm | Reduces stress at load-path corners | No |
| `chamfer_bed` | 0.5 mm | Bed-facing edges print better chamfered than filleted | No |
| `standoff_h` | `board_under_clear` + 1.0 mm | Keeps underside parts clear | Yes |
| `cable_loop_r` | **unknown**: leave a parameter and flag it | Bend limit not known; do not invent one | Yes |
| `material` | PETG assumed, density 1.27 g/cm³, for mass estimates only | Printer and filament unconfirmed | Yes |

### 1e. Still to measure before Phase 2

- Actual servo label/variant, case envelope, datum faces, axis offsets, horn envelope and bolt pattern, rear-feature motion, mounting threads and safe engagement, connector position and plug envelope, servo mass.
- Installed board identity, outline, thickness, hole positions, component heights above and below, plugged-in connector envelopes, antenna position, board mass.
- Existing joint spacing, motor clocking, head and tail interfaces, full assembled dimensions.
- Cable lengths, connector sizes, fixed points, loop space, branch positions, external power exit.
- Link masses, intended lifted span, baseline wobble of the existing joint.
- Printer build volume, nozzle, material, layer settings, measured fit capability.

Measure with calipers and cross-check against the official drawing and correctly assembled reference CAD. Keep bare case, mounting lugs, horn face-to-face and fully assembled envelopes separate; never merge unlike dimensions into one bounding box.

## 2. Reference files

| Path (repo-relative) | Contents | How to use it |
|---|---|---|
| `.scratch/waveshare-research/ST3215-3D/ST3215.step` | Official servo model | Import as a nominal servo body. Check that its parts are placed correctly before measuring anything. Never take overall extents from an exploded or untransformed assembly. |
| `.scratch/waveshare-research/ST3215-2D/ST3215.dxf`, `.pdf` | Official servo drawing (title block SCS215) | Source of the 1a values; `ST3215-drawing.png` is a rendered view of it |
| `.scratch/waveshare-research/board-3D/Servo Driver with ESP32_STEP/Servo Driver with ESP32.step` | Official controller model | Import for board outline, holes and connector positions; compare with 1b |
| `generations/gen3-experimental-3d/cad/3D_motion_parts/alternate_connector.STEP` (+ `.SLDPRT`) | Existing spatial connector | Reference for the current arrangement only, not a verified master |
| `generations/gen3-experimental-3d/joint_map.json` | Current calibration | Read only; source of 1c |
| `docs/GEN3_HANDOFF.md` | Hardware setup and history | Topology and wiring context |

The STEP files were downloaded but their geometry has not been validated. The `.scratch/` folder is local to this checkout.

## 3. Toolchain and output layout

Use **build123d** (Python, OpenCascade kernel; imports and exports STEP). Use **trimesh** with **manifold3d** for watertightness checks and **python-fcl** for collision and distance queries.

Installed 2 November 2026 on Python 3.14 (Windows) in a virtual environment at `C:\Users\gannu\.venv-cad`, which is the user's home folder, not the repository:

| Package | Version |
|---|---|
| build123d | 0.13.0 (OpenCascade via cadquery-ocp-novtk 8.0.1.1.0) |
| trimesh | 5.2.0 |
| manifold3d | 3.5.4 |
| python-fcl | 0.7.0.11 |
| numpy / scipy | 2.5.4 / 1.18.1 |

Run every script with that interpreter, from the repository root so the repo-relative paths in section 2 resolve:

```bash
C:/Users/gannu/.venv-cad/Scripts/python.exe generations/gen3-experimental-3d/cad/segments_v1/checks/solids.py
```

Do not create a second environment. If the environment is missing, recreate it with the same command and record the new versions here:

```bash
python -m venv C:/Users/gannu/.venv-cad && C:/Users/gannu/.venv-cad/Scripts/pip install build123d trimesh manifold3d python-fcl
```

Write everything under `generations/gen3-experimental-3d/cad/segments_v1/`:

```
segments_v1/
  params.py        # every value from section 1, by parameter name, with source comments
  servo_ref.py     # imports the official STEP, positions it, exposes datum frames
  board_ref.py     # imports the board STEP with plug and connector envelope volumes
  head.py  mid.py  tail.py   # one function per part, returns one solid
  assembly.py      # B0..B10 transforms for any set of joint angles
  checks/
    solids.py      # one-solid, watertight, no floating bodies, units in mm
    sweep.py       # joint sweeps and collision checks, writes a CSV of minimum gaps
    mass.py        # volume, mass and centre of mass per part and for the full robot
  out/             # head/mid/tail .step and .stl, assembly .step at neutral
  reports/         # feasibility.md, clearance.md, loads.md, checklist.md
```

Do not edit anything outside `segments_v1/`: firmware, `joint_map.json` and the dashboard stay unchanged.

## 4. Prompt for Opus 5.5

### Role and task

Act as a mechanical designer for a 3D-printed snake robot with alternating pitch and yaw joints. Design replacement body segments as parametric build123d code, using section 1 as the only source of dimensions. Keep the existing servos, controller, wiring and joint order. Keep vendor facts, your own proposals and unmeasured values clearly labelled as such. Do not take dimensions from photographs.

If constraints conflict, stop and report the exact conflict with a proposed resolution. Do not quietly add parts, change wiring or reduce travel.

### Phase 1: parametric prototype (do this now)

1. Write a short feasibility assessment: the load path, the installation order, and which section-1 unknowns matter most.
2. Build the three parts from the provisional values in section 1, keeping every unknown as a named parameter.
3. Run every check in "Acceptance checks" below and write the reports.
4. Export STEP and STL files labelled **PROTOTYPE: fit and load validation required**.

### Phase 2: release (only after section 1e is measured)

Update `params.py` with the measured values, regenerate, rerun every check, and replace the prototype label only when every **blocks release** item has a measured value and all the checks pass.

### A. Exactly three printed part types

| Part | Count | Body | Description |
|---|---|---|---|
| HEAD | 1 | B0 | Compact rounded end beyond ID 1, coupled to J1's horn. No controller, battery, sensors or decorative add-ons. |
| MID | 9 | B1–B9 | One reusable geometry carrying one servo case and coupling to the next horn. It must work in both pitch and yaw positions without a mirrored fourth part or a bolt-on bracket. |
| TAIL | 1 | B10 | Carries the ID 10 servo case and the controller board, in one solid. |

Starting allocation: J_i sits between B_(i−1) and B_i; the case of servo i belongs to B_i and its horn drives B_(i−1). If the hardware needs the opposite ownership, document why and keep the same three types and order.

Each part is **one connected, watertight solid**: no glued halves, separate lids, loose clamps, separate yokes, cosmetic shells or print-in-place mechanisms. Servos, metal horns, screws and electronics are assembled hardware, not extra printed pieces. Name any new hardware explicitly; do not assume it is available. Structural coupling arms may be integral if they are short, radiused and reinforced. No dangling electronics, loose wiring, fragile tabs or decorative appendages.

### B. Joint order and frames

HEAD — J1 pitch — J2 yaw — J3 pitch — J4 yaw — J5 pitch — J6 yaw — J7 pitch — J8 yaw — J9 pitch — J10 yaw — TAIL with controller.

- World frame: +X towards the head, +Z up in the operating orientation, +Y left.
- Every joint is single-axis, and adjacent axes are orthogonal. No universal or spherical joints.
- `assembly.py` must give the transform for all nine MID instances. Show, rather than assert, that the 90°-rotated MID still has room to insert the servo, reach the wires, keep the joint axis right and sit straight at encoder 2048 with the sign mapping in 1c.
- Clocking marks are recessed or flush, never protruding.
- If extra spacing is needed for travel, report the minimum change and how it affects existing cable reach.

### C. Mechanical travel of at least −90° to +90°

Every joint needs at least −90° to +90° of usable travel from the straight pose, **with servos, horns, screw heads, wires, connectors and neighbouring segments in place**. Free rotation of the bare shaft does not count.

`checks/sweep.py` must cover:

- each joint alone through its full range, the others at neutral, including the HEAD and TAIL ends;
- every adjacent pitch/yaw pair over the full 2-D grid, including all four ±90° corners;
- pinch points at couplings, servo corners, fasteners, cable exits and the board;
- non-adjacent self-collision for a declared set of full-body poses.

Sample at 5° steps, then refine to 1° around the smallest gaps. State the step size used. Report the minimum gap, where it occurs and at which angles, and compare it with `gap_moving`. Hard stops stay outside the ±90° range. Full-body poses that collide must be listed as forbidden; do not claim every ten-joint pose is collision-free. If an adjacent pair fails at ±90°, report the conflict instead of reducing travel.

### D. Fit and low wobble

- Seat each servo against its datum faces and retain it positively; no loose drop-in pocket and no friction-only hold. Do not crush the case.
- Use the existing metal horn and spline. **Never rigidly join a rotating horn to a fixed case feature.** For every support, show its degree of freedom and load path.
- A rear support, if used, is coaxial with the output axis and controls clearance without binding. Any bearing or bushing it needs is a named new hardware item with its mounting and assembly path.
- Screw sizes, threads and engagement come only from section 1. Screw heads stay outside the motion envelope. Do not let screws press into the servo housing; Waveshare warns this can raise the current enough to damage the servo.
- Servo removal and horn-screw access must work without cutting the print, unsoldering or over-flexing a yoke.
- Define a wobble test: case restrained, known lever arm, reversing force from a stated service load, displacement measured, with gear backlash recorded separately from mount and print compliance. No "zero wobble" claims.

### E. Wiring stays the same

- Keep every connector, pinout, ID order, bus connection, power branch and the external battery lead. No battery bay, no moving electronics to the head, no new connectors, no cut or extended leads.
- Wire guides may change: rounded passages or open channels with non-cutting edges that pass the real connector bodies and latches during insertion.
- Anchor cables to a rigid segment away from the hinge, with a protected service loop across each joint. Show the slack at neutral and at both ends of travel. Use `cable_loop_r`; do not invent a bend radius.
- No tie or clip may obstruct motion; existing ties are recessed if reused. If the existing cable lengths cannot handle ±90°, report it as a feasibility conflict.

### F. Tail controller

- One solid with integrated standoffs at the board's holes, and side walls or arches for protection. Open for servicing, with no lid and no trapped board.
- Model the whole board assembly: PCB, parts on both sides, OLED, ESP32 module and antenna, headers, plugged-in USB-C, DC and servo connectors with their cables, and screw heads.
- Leave access for USB, BOOT/RST, power and servo plugs. Keep strain from the external power lead off the PCB sockets.
- Keep the board off the ground and clear of neighbouring links through J10's sweep. Keep the antenna region away from metal and power wiring (Espressif recommends at least 15 mm in every direction) and call for an RF check in the finished tail.
- No waterproofing is required or claimed.

### G. Strong, light, rounded, printable

- Give each part a continuous load path from servo seat to coupling: short ribs, broad transitions, filleted inside corners, local reinforcement around holes. Remove material only where stiffness, retention, alignment and crash protection do not need it.
- Round exposed surfaces and recess fasteners, but keep datum faces flat and holes accurate. No spikes, fragile scales or inaccessible lattices.
- Loads: pitch joints lift downstream mass, so a planar no-gravity assumption does not hold. State load cases for grounded undulation, a supported bend, the largest intended lifted span, tail mass, cable drag and handling. Work out the gravity moments from masses and lever arms (provisional where masses are unknown) and compare them with a justified continuous-duty torque. Stall torque is not a working rating.
- Report each part's volume and mass at the stated density, the full robot's mass and centre-of-mass assumptions. Any strength claim needs a stated allowable value that accounts for print orientation; do not certify from bulk filament data.
- Choose a print orientation for each part, and show the weak layer directions, support locations and access for removing supports. Use small chamfers on bed-facing edges. Never split a part to make it easier to print.
- Keep a smooth, stable ground-contact region. Do not add traction features or claim locomotion gains without a test.

### Acceptance checks

`checks/` must produce, and `reports/checklist.md` must summarise:

1. Exactly three part types; each exports as one watertight, manifold solid with no floating bodies, in millimetres.
2. The assembly is 1 HEAD + 9 MID + 1 TAIL, with the joint order and frames from B and the straight pose at encoder 2048.
3. Every sweep in C, with the minimum gaps tabulated against `gap_moving`, and any forbidden full-body poses listed.
4. Servo and board insertion paths and tool access shown in an installation sequence.
5. Cable routes with reach and slack at neutral and at both travel extremes, or a stated conflict.
6. A volume, mass and load table with assumptions.
7. A BOM separating existing hardware from proposed additions.
8. Every remaining **blocks release** item from section 1 listed.

Physical validation runs in stages: an unpowered fit print against real hardware, then a pitch/yaw pair and a tail fit sample, then a play measurement, then the full robot. Any powered test stays within the current software limits until a separate commissioning step changes them. Never force an unpowered gearbox or push a joint past resistance to show travel.

A rendering, collision-free nominal CAD or a vendor rotation figure is not evidence of a strong, low-wobble, printable assembly.

## 5. Research notes and reasoning

### Servo variants

| Waveshare designation | SKU | Operating voltage | Stall torque | Rated load | Stall current |
| --- | --- | --- | --- | --- | --- |
| ST3215 Servo | 22414 | 6–12.6 V | 30 kg·cm at 12 V | 10 kg·cm at 12 V | 2.7 A |
| ST3215-7.4V Servo | 33014 | 4–7.4 V | 19.5 kg·cm at 7.4 V | 5 kg·cm at 7.4 V | 2.5 A |

Waveshare specifies 360° positioning over 0–4095, unlimited mechanical rotation, a 25T/Ø5.9 mm spline and gear backlash ≤0.5°. These are product claims, not measurements of the owner's units. Rated load and stall torque are not interchangeable. The present 3S supply does not prove which variant was bought. [Official ST3215 specifications](https://docs.waveshare.com/ST3215_Servo)

Unlimited bare-shaft rotation says nothing about assembled clearance: the housing, neighbouring links, horns, fasteners and cables set the real travel. CAD clearance does not authorise wider firmware limits.

### Drawings and models

The [official resources page](https://docs.waveshare.com/ST3215_Servo/Resources-And-Documents) supplies the [servo STEP ZIP](https://files.waveshare.com/upload/5/59/ST3215-3D.zip), the [servo DXF/PDF ZIP](https://files.waveshare.com/upload/0/08/ST3215-2D.zip) and the [driver STEP ZIP](https://files.waveshare.com/wiki/ST3215_Servo/Servo_Driver_with_ESP32_STEP.zip). All three were downloaded to `.scratch/waveshare-research/`, and the PDF was rendered and inspected. The [servo dimension image](https://docs.waveshare.com/assets/images/ST3215_Servo-Size-7d9771d2fa5aba25a01e60994ec44ac1.webp) and [controller dimension image](https://docs.waveshare.com/assets/images/Servo_Driver_with_ESP32-Size-b7fc1495e28d4fd759ebb1c8f05f3262.webp) returned HTTP 403, so no dimensions were taken from them.

Treating 35 mm as the full servo height is unsafe, because 37.25 mm is the outermost illustrated envelope. The drawing gives no hole diameters, threads or depths, no horn thickness, no rear bearing or pivot fit, no tolerances and no revision information.

### Horns, rear support and screws

Waveshare describes a dual-shaft, low-profile design with aluminium servo wheels; this does not show that the opposite-side feature is a second powered output. [Official product description](https://www.waveshare.com/product/modules/motors-servos/motors-servos/st3215-servo.htm). The [FAQ](https://docs.waveshare.com/ST3215_Servo/FAQ) gives the connector and screw list in section 1a and warns that screws pressing into the housing can raise the current enough to damage the servo.

A one-piece printed fork can carry the driven horn and a coaxial rear support, but only if the support allows relative rotation; bolting a moving fork to a stationary boss over-constrains the joint. A printed structure can reduce added wobble but cannot remove gear backlash. "Minimum wobble" covers five separate sources: gear backlash, horn slip, support clearance, servo-to-cradle movement and frame flex. CAD can address the last four. Measure the existing joint first to set a baseline.

### Controller

The [official controller overview](https://docs.waveshare.com/Servo_Driver_with_ESP32) gives the 1b values. The [schematic](https://files.waveshare.com/wiki/Servo-Driver-with-ESP32/Servo_Driver_with_ESP32.pdf) ([resources index](https://docs.waveshare.com/Servo_Driver_with_ESP32/Resources-And-Documents)) shows the circuits but is not a clearance drawing. The [Bus Servo Driver HAT (A)](https://www.waveshare.com/product/bus-servo-driver-hat-a.htm) is a different, larger board.

### Robot context

From [the Gen 3 handoff](../GEN3_HANDOFF.md): ten servos and eleven links; the head is beyond ID 1 and the tail electronics beyond ID 10; odd IDs pitch and even IDs yaw in the resting orientation. The battery is external. Older power schematics do not prove the installed wiring, and the latest owner record says no fuses are fitted. [The current joint map](../../generations/gen3-experimental-3d/joint_map.json) takes precedence over older values in the handoff. [The simulation notes](../gen3/GEN3_SIMULATION.md) describe unmeasured spacing and contact, and an illustrative board proxy. [The older planar v6 notes](../../generations/gen2-st3215/cad/segments/v6/README.md) record unresolved mounting-face pitches, rear-disc behaviour and misplaced STEP subassemblies; their 58 mm spacing, planar load calculations, inferred threads and safety factors must not become Gen 3 requirements.

### Design approaches considered

| Approach | Benefit | Limitation | Decision for Opus 5.5 |
|---|---|---|---|
| Integrated open cradle, short ribs, orthogonal coupling, rounded outline | One printed solid with an installation path and service access | Needs swept-volume and insertion checks | Preferred starting architecture |
| Fully enclosed capsule with separate lid | Protects components | Adds a printed part and can trap the servo or board | Excluded |
| Horn-only, long cantilever connection | Simple geometry | Adds bending and amplifies play | Do not choose just to simplify the CAD |
| Coaxial support on both sides of the servo axis | Reduces structural bending | Needs a verified moving interface or a proper passive bearing | Preferred only if hardware checks support it |

### Printing and RF

Prusa notes that fit depends on material, orientation and calibration, and that bed-facing fillets print worse than chamfers. Its suggestion to split models does not apply here, because each segment must be one piece. [Prusa design guidance](https://help.prusa3d.com/article/modeling-with-3d-printing-in-mind_164135)

Espressif recommends antenna clearance inside the finished enclosure and RF testing of the finished product, with at least 15 mm in every direction for ESP32 modules. Do not modify the existing PCB. [Espressif ESP32 layout guidance](https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32/pcb-layout-design.html#general-principles-of-pcb-layout-for-modules-positioning-a-module-on-a-base-board)

## 6. Scope of this research

No CAD, STL, firmware or calibration was generated or changed. The vendor downloads in `.scratch/waveshare-research/` are manufacturer assets, not new robot parts. No hardware was connected, moved or measured. Final geometry, fit with the exact hardware variant, structural performance, cable clearance through ±90° and the behaviour of finished prints all remain to be validated.

---

## Update — 2 November 2026

**Where the project stands.** The last commit is `fc24e4e` (31 October 2026: Gen 2.1 five-box
dashboard layout, continuous path traversal, unified console UI). Everything dated 31 October –
2 November below is in the working tree and **not yet committed**. No hardware motion was
commanded by the assistant during that work unless stated.

**CAD (to 2 Nov).**
- Gen 3 prototype head/mid/tail parts and neutral assembly are in `generations/gen3-experimental-3d/cad/3D_motion_parts/`
  (V1) and `.../V2/` (round revision, now used by the simulation). All are named
  *PROTOTYPE fit and load validation required*.
- Holders and plates are in `cad/plate chains/`.
- Design brief: `docs/research/GEN3_WAVESHARE_HARDWARE_RESEARCH.md`.
- `generations/gen2-st3215/cad/assembly/Assem3.SLDASM` was deleted from the working tree.

**Simulation now uses the owner's CAD assembly (2 Nov).**
- Browser viewer and default PyBullet model load the V2 prototype
  `cad/3D_motion_parts/V2/assembly_neutral_2048_PROTOTYPE_fit_and_load_validation_required_v2.SLDASM`
  (round Ø57 mm bodies, covered tail, head sensor bay), exported read-only from SolidWorks.
- Joint pivots: 20.61 mm head to ID 1, then 58.37 mm; bounds ≈ 679 × 57 × 57 mm.
  Contact boxes follow the CAD section (0.057 m).
- Mass (0.25 kg/body), box inertia and friction (0.8, anisotropy `[0.1, 1, 1]`) are still illustrative.
- New tools `tools/export_native_assembly.ps1` and `tools/export_assembly_simulation.py`
  produce `static/models/gen3-cad.json` and `gen3-body-0..10.obj`. The older KiCad exporter is superseded.
- `--link-length` still selects the older uniform-box bench.
- PyBullet caterpillar result: lag −72° moved +0.21 m in 24 s; +72° moved −0.13 m.
  Shape presets were tuned with the old 0.1 m links and need re-tuning on the CAD spacing.
- Details: `docs/gen3/GEN3_SIMULATION.md`.

**Status.** Prototype parts were produced as SolidWorks V1 and V2 assemblies. V2 now drives the browser and
PyBullet simulation. Fit and load validation on printed parts is still required.
