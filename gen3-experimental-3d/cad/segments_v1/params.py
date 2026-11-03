"""Every value used by the segments_v1 geometry, by parameter name.

Source of truth: docs/research/GEN3_WAVESHARE_HARDWARE_RESEARCH.md, section 1.
Tags in comments:
  [VENDOR]   official Waveshare drawing, product page or FAQ (nominal, unmeasured)
  [STEP]     read from the official Waveshare STEP model (nominal, unmeasured);
             each one was cross-checked against the 2D drawing where a callout exists
  [PROV]     provisional Phase 1 proposal from section 1d (not a verified fit)
  [ASSUMED]  not in the register; needed for a calculation; labelled as an assumption
  [DERIVED]  computed here from other parameters
  [MAP]      read from gen3-experimental-3d/joint_map.json (read only)
BLOCKS RELEASE marks values that must be measured before Phase 2.

All lengths in millimetres, angles in degrees, masses in grams.
"""

from pathlib import Path

PROTOTYPE_LABEL = "PROTOTYPE: fit and load validation required"

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
SERVO_STEP = REPO / ".scratch/waveshare-research/ST3215-3D/ST3215.step"
BOARD_STEP = REPO / ".scratch/waveshare-research/board-3D/Servo Driver with ESP32_STEP/Servo Driver with ESP32.step"
JOINT_MAP = REPO / "gen3-experimental-3d/joint_map.json"
OUT = ROOT / "out"
REPORTS = ROOT / "reports"
CACHE = ROOT / "out" / "_cache"

# ---------------------------------------------------------------- 1a servo
servo_variant = "unknown: ST3215 12 V (SKU 22414) or ST3215-7.4V (SKU 33014)"  # BLOCKS RELEASE
servo_plan_l = 45.22        # [VENDOR] drawing; STEP gives 45.223. BLOCKS RELEASE
servo_plan_w = 24.72        # [VENDOR] drawing; STEP gives 24.723. BLOCKS RELEASE
servo_axis_from_end = 10.11  # [VENDOR] drawing; STEP horns centred 10.11 from end. BLOCKS RELEASE
servo_height_callouts = (29.0, 32.0, 35.0, 37.25)  # [VENDOR] identified against STEP below. BLOCKS RELEASE
horn_dia = 19.2             # [VENDOR] drawing; STEP horn discs are 19.2. BLOCKS RELEASE
horn_hole_span = 14.0       # [VENDOR] 4 holes on a 14 mm circle (drawing). BLOCKS RELEASE
horn_thickness = None       # unknown in register. STEP shows 4.5 (drive) / 3.35 (rear). BLOCKS RELEASE
spline = "25T, 5.9 mm, metal: never printed"  # [VENDOR]
mount_face_a = (24.45, 20.5)  # [VENDOR] face A (drive side) hole pitch long x transverse. BLOCKS RELEASE
mount_face_b_long = 20.7    # [VENDOR] face B (rear side) longitudinal pitch; transverse unknown. BLOCKS RELEASE
mount_face_a_first_from_horn_end = 18.41  # [VENDOR] drawing. BLOCKS RELEASE
mount_hole_d = None         # unknown thread/diameter/depth. BLOCKS RELEASE
rear_feature_motion = "unknown"  # STEP names the rear disc a 'driven' metal wheel on a case boss;
                                 # suggests a free idler, NOT established. BLOCKS RELEASE
servo_connector = "5264-3P"  # [VENDOR] FAQ; position from STEP (bay on rear-horn face). BLOCKS RELEASE
supplied_screws = ("3x5 self-tapping", "2x6 round-head self-tapping", "M3x6 round-head")  # [VENDOR] FAQ
servo_mass = None           # unknown. BLOCKS RELEASE

# Servo frame S used everywhere: origin on the output axis, midway between the two
# horn faces; +Y = output axis towards the driving horn; -X = towards the far
# (connector) end; Z = plan width. STEP -> S: rotate 180 deg about Y, then
# translate so the axis is at the origin (see servo_ref.py, which checks these).
horn_face_y = 37.25 / 2     # [STEP] drive horn face +18.625, rear disc face -18.625 = 37.25 callout
case_x = (-(servo_plan_l - servo_axis_from_end), servo_axis_from_end)  # [DERIVED] -35.11 .. 10.11
case_z_half = servo_plan_w / 2  # [DERIVED] 12.36
case_y_face_b = -15.475     # [STEP] rear-horn face of the case (29 mm body = face B..face A). BLOCKS RELEASE
case_y_face_a = 14.025      # [STEP] drive-side face at the mounting holes. BLOCKS RELEASE
case_y_top_block = 16.525   # [STEP] raised block, 32 mm callout = face B..block top. BLOCKS RELEASE
top_block_x = (-33.5, -10.5)  # [STEP] extent of the raised block. BLOCKS RELEASE
top_block_z_half = 6.5      # [STEP]
rear_boss_y = -19.175       # [STEP] fixed case boss through the rear disc centre (0.55 proud). BLOCKS RELEASE
rear_boss_r = 3.5           # [STEP] approx radius of that boss
connector_bay_x = (-33.5, -16.0)  # [STEP] open bay on the rear-horn face holding both ports. BLOCKS RELEASE
connector_bay_z_half = 9.0  # [STEP]
# Face A rear holes (used for retention): 18.41 + 24.45 from the horn end.
face_a_hole_x = (servo_axis_from_end - 18.41, servo_axis_from_end - 18.41 - 24.45)  # [DERIVED] -8.30, -32.75
face_a_hole_z = 20.5 / 2    # [DERIVED] +-10.25

# ---------------------------------------------------------------- 1b board
board_sku = "21593 (candidate, unconfirmed)"  # BLOCKS RELEASE
board_l, board_w = 65.0, 30.0   # [VENDOR] / STEP agrees. BLOCKS RELEASE
board_hole_span = (58.0, 23.0)  # [VENDOR] STEP holes at 3.5 mm from edges. BLOCKS RELEASE
board_hole_d = 2.75             # [VENDOR] STEP agrees. Do not assume M3. BLOCKS RELEASE
pcb_t = 1.6                     # [PROV] STEP also models 1.6. BLOCKS RELEASE
board_under_clear = 3.9         # [STEP] ESP32 module M1 on the underside. BLOCKS RELEASE
board_top_height = 7.3          # [STEP] DC jack CN1 above the top copper. BLOCKS RELEASE
board_vin = (6.0, 12.0)         # [VENDOR]
# Plugged-connector envelopes are unknown: provisional boxes, BLOCKS RELEASE.
plug_dc_len = 30.0              # [PROV] barrel plug + strain relief beyond the jack mouth
plug_usb_len = 25.0             # [PROV] USB-C plug + overmould beyond the board edge
plug_servo_up = 12.0            # [PROV] 5264 plug + wire bend above the board header
antenna_clear = 15.0            # [VENDOR: Espressif guidance] keep metal/power wiring away

# Servo plug envelope from the servo bay (unknown): BLOCKS RELEASE
plug_servo_protrusion = 9.0     # [PROV] beyond the case face B incl. wire bend (bay is recessed ~1.5 mm). BLOCKS RELEASE
plug_body = (7.5, 5.0)          # [PROV] 5264-3P housing section used for window sizing

# ---------------------------------------------------------------- 1c robot
n_joints = 10
encoder_neutral = 2048          # [MAP]
encoder_limits = (1252, 2844)   # [MAP] unchanged; CAD gives clearance, not permission
counts_per_rev = 4096           # [VENDOR] 0-4095 over 360 deg
travel_required = 90.0          # brief: mechanical +-90 deg with hardware in place

# ---------------------------------------------------------------- 1d geometry
fit_servo = 0.25        # [PROV] per side. BLOCKS RELEASE
gap_moving = 1.5        # [PROV] minimum between moving bodies. BLOCKS RELEASE
clearance_margin = 0.1  # [PROV] added to designed clearances so mesh chording in the checks
                        # cannot hide a shortfall; the checks still compare with gap_moving
wall = 2.4              # [PROV] BLOCKS RELEASE
rib = 2.0               # [PROV] BLOCKS RELEASE
fillet_root = 2.0       # [PROV]
chamfer_bed = 0.5       # [PROV]
standoff_h = board_under_clear + 1.0  # [PROV] per 1d. BLOCKS RELEASE
cable_loop_r = None     # UNKNOWN: bend limit not known; no value invented. BLOCKS RELEASE
material = "PETG (assumed)"
density = 1.27          # g/cm3 [PROV] for mass estimates only. BLOCKS RELEASE

# Fork (the coupling a body uses to grip the next servo's horn and rear disc)
fork_h = 24.0           # [PROV] arm width; covers the 19.2 horn and 14 mm screw circle + heads
arm_t = 4.0             # [PROV] arm plate thickness
boss_h = 2.5            # [PROV] spacer between horn face and arm; clears the 0.55 mm proud
                        # rear boss by >= gap_moving. Same both sides so the fork is symmetric.
boss_r = 9.0            # [PROV] spacer disc radius, inside the 9.6 horn radius
hub_bore_d = 8.0        # [PROV] clears the horn centre screw head / rear boss, screwdriver access
horn_screw_clear_d = 2.4  # [PROV] horn hole thread unknown. BLOCKS RELEASE
horn_screw_head_d = 4.5   # [PROV] counterbore. BLOCKS RELEASE
horn_screw_head_h = 1.8   # [PROV] counterbore depth. BLOCKS RELEASE
crossbar_d = 4.0        # [PROV] radial depth of the fork crossbar behind the end wall
fork_inner_z = horn_face_y + boss_h            # [DERIVED] 21.125
fork_outer_z = fork_inner_z + arm_t            # [DERIVED] 25.125

# Cradle retention screws (face A rear pair), through bosses that seat on face A
cradle_screw_clear_d = 2.4  # [PROV] hole size unknown. BLOCKS RELEASE
cradle_screw_head_d = 4.5   # [PROV] BLOCKS RELEASE
cradle_screw_head_h = 1.8   # [PROV]

# Horn clearance in the cradle walls around the rotating horn / rear disc
horn_relief_r = horn_dia / 2 + gap_moving + clearance_margin  # [DERIVED] 11.2

# Cable model (open channels; anchors on rigid bodies; free span across joints)
cable_channel_w = 9.0     # [PROV] passes a 7.5 mm plug body with margin. BLOCKS RELEASE
cable_channel_d = 4.0     # [PROV]
cable_side_offset = 2.0   # [PROV] cable centre beyond the fork arm outer face

# Round, outwardly symmetric body (v2, owner feedback 2 Nov 2026)
body_r = 28.5             # [PROV] outer radius of every body; smallest round section that encloses
                          # the servo + plugs with a 2.4 wall. BLOCKS RELEASE (plug envelope)
cable_groove_w = 7.0      # [PROV] room for the bus lead plus one future sensor lead side by side
cable_groove_d = 3.5      # [PROV] cable sits below the round surface
cable_tunnel = (9.0, 6.0) # [PROV] w x h, passes a 7.5 x 5 plug body. BLOCKS RELEASE
rubber_band_d = 0.8       # [PROV] recess for the rubber strips to be pasted on later
rubber_band_inset = 1.5   # [PROV] band ends this far inside each round section

# Head / tail
head_nose_len = 24.0      # [PROV] round nose beyond the head crossbar face
head_bay_r = 18.0         # [PROV] round front sensor bay radius
head_bay_floor_wall = 4.0 # [PROV] bay floor thickness in front of the clevis face
head_sensor_holes = 20.0  # [PROV] square pitch of 4 blind pilot holes in the bay floor
head_sensor_pilot_d = 2.2 # [PROV] self-tapping pilot / heat-set insert size TBD
head_wire_d = 6.0         # [PROV] passage pocket -> J1 cable groove
tail_board_gap = 2.0      # [PROV] servo end wall to board front edge
tail_board_y = 2.0        # [PROV] tail-frame Y of the PCB top copper (local -Y is up)
tail_end_wall = 3.0       # [PROV] round end cap thickness
tail_top_open_half = 18.0 # [PROV] half-width of the service opening over the board
tail_dc_hole_r = 6.5      # [PROV] DC plug passes the end cap. BLOCKS RELEASE (plug size)

# ---------------------------------------------------------------- loads
# Not in the register. Assumptions for the load table only; all BLOCKS RELEASE.
servo_mass_assumed = 60.0       # [ASSUMED] g, unmeasured
board_mass_assumed = 20.0       # [ASSUMED] g incl. plugs, unmeasured
cable_mass_per_joint = 4.0      # [ASSUMED] g per inter-servo lead
hardware_mass_per_joint = 4.0   # [ASSUMED] g screws per joint
# Vendor torque figures (stall is not a working rating)
rated_torque_kgcm = {"12V": 10.0, "7.4V": 5.0}   # [VENDOR] rated load
stall_torque_kgcm = {"12V": 30.0, "7.4V": 19.5}  # [VENDOR]
duty_factor = 0.5               # [PROV] continuous fraction of rated load used in checks

# ---------------------------------------------------------------- sweep
sweep_step = 5.0
refine_step = 1.0
