"""Slides 19, 21, 28 - all duplicated from slide 10
(strategy banner + 3 cards + 7-step progress rail + achievement banner)."""
from pptx import Presentation
from edit import sl, find, txt, lst, fill, notes

P = "work.pptx"
prs = Presentation(P)

GREEN, BLUE, AMBER = "1F9D55", "1E6FD6", "E8821E"


def steps(s, spec):
    """spec: list of (label, icon, colour, status_or_None) for step0..step6."""
    for i, (label, icon, colour, status) in enumerate(spec):
        txt(find(s, "step%d_label" % i), label)
        txt(find(s, "step%d_icon" % i), icon)
        fill(find(s, "step%d_circle" % i), colour)
        try:
            st = find(s, "step%d_status" % i)
        except KeyError:
            continue
        txt(st, status or "")


def cards(s, spec):
    for i, (title, items) in enumerate(spec):
        txt(find(s, "card%d_title" % i), title)
        lst(find(s, "card%d_items" % i), items)


# ------------------------------------------------------------- slide 19
s = sl(prs, 19)
txt(find(s, "subtitle"), "ONBOARD FIRMWARE STACK")
txt(find(s, "title"), "ESP32 Firmware — Four Targets, One Bus")
txt(find(s, "s1_text"),
    "Firmware Strategy: the Waveshare driver's onboard ESP32 is the robot master and "
    "owns the servo bus; a second ESP32 at the base station receives telemetry over "
    "ESP-NOW and forwards it to the Pi 5 by USB serial. Bench and field firmware are "
    "mutually exclusive on the driver board — one is flashed at a time.")
cards(s, [
    ("ROBOT ESP32 — FIELD", [
        "robot_esp32 — gait CPG, 10-DOF",
        "MPU6050 on I2C GPIO 21 / 22",
        "Current-stall obstacle FSM",
        "ESP-NOW telemetry transmit",
    ]),
    ("BASE STATION ESP32 #2", [
        "base_esp32 — ESP-NOW receive",
        "USB serial to Pi 5 @ 115200",
        "base_station.py logs telemetry",
    ]),
    ("BENCH & BRING-UP TOOLS", [
        "spin_all — broadcast smoke test",
        "assign_ids — one servo at a time",
        "usb_servo_bridge — Python stack",
        "PlatformIO, one env per sketch",
    ]),
])
txt(find(s, "s3_label"), "FIRMWARE BRING-UP SEQUENCE")
steps(s, [
    ("Firmware\nwritten",      "✓", GREEN, None),
    ("PlatformIO\nbuilds",     "✓", GREEN, None),
    ("Broadcast\nsmoke test",  "✓", GREEN, None),
    ("ID\nassignment",         "⏳", BLUE,  None),
    ("Bus\nverification",      "→", AMBER, None),
    ("Gait on\nhardware",      "→", AMBER, "Upcoming"),
    ("ESP-NOW\ntelemetry",     "→", AMBER, "Upcoming"),
])
txt(find(s, "achieve_text"),
    "Key Achievement: all five firmware targets are written and compile clean under "
    "PlatformIO, and the broadcast smoke test drives all ten servos before any ID has "
    "been assigned — so the control stack was validated without waiting on bring-up.")
notes(s, "Three ESP32s in total, two on the robot and one at the base. The "
         "important design point is that video and telemetry are separate radio "
         "links: ESP-NOW carries telemetry, ordinary WiFi will carry camera "
         "video. Do not try to push video through ESP-NOW - the payload cap is "
         "250 bytes. The bring-up rail is honest: we are at ID assignment, not "
         "past it.")

# ------------------------------------------------------------- slide 21
s = sl(prs, 21)
txt(find(s, "subtitle"), "CAD EVOLUTION")
txt(find(s, "title"), "Segment Design v4 → v5 → v6")
txt(find(s, "s1_text"),
    "Design Strategy: the segment is a parametric CadQuery model, not a hand-drawn "
    "solid, so every dimension traces to a named constant and the model refuses to "
    "export if its own assumptions stop holding. v6 is the design of record; its three "
    "fixes were found by measuring the earlier versions rather than looking at them.")
cards(s, [
    ("V4 — BASELINE", [
        "First parametric segment",
        "58 mm joint-to-joint pitch",
        "Ground contact never measured",
        "Superseded, still printable",
    ]),
    ("V5 — SUPERSEDED", [
        "Widened yoke rectangle",
        "Early sidewall bug fixed",
        "Shares v4's bounding box",
        "Dimensional error — do not print",
    ]),
    ("V6 — DESIGN OF RECORD", [
        "Belly scales now touch ground",
        "Scales reoriented for undulation",
        "Positive M2 motor retention",
        "Self-check asserts all three",
    ]),
])
txt(find(s, "s3_label"), "FABRICATION PIPELINE")
steps(s, [
    ("Parametric\nmodel",      "✓", GREEN, None),
    ("Self-check\npasses",     "✓", GREEN, None),
    ("Probe\nST3215 STEP",     "⏳", BLUE,  None),
    ("Print one\nsegment",     "→", AMBER, None),
    ("Measure\nfriction",      "→", AMBER, None),
    ("Print\nremaining 10",    "→", AMBER, "Upcoming"),
    ("Chain\nassembly",        "→", AMBER, "Upcoming"),
])
txt(find(s, "achieve_text"),
    "Key Achievement: v6 caught three defects that v4 and v5 shared — the bottom plate "
    "sat 0.45 mm below the belly scales so 94% of ground contact was the one surface "
    "never meant to touch; the scales resisted the wrong axis for lateral undulation; "
    "and the motor had no positive retention at all.")
notes(s, "The headline is that these defects were found by measurement, not by "
         "inspection - the model enumerates every face at minimum z and asserts "
         "which ones they are. Print v6, not v4 and definitely not v5. The "
         "friction measurement in step 5 is the real unknown: every locomotion "
         "claim in this deck assumes anisotropic belly friction that has never "
         "been measured on a printed part.")

# ------------------------------------------------------------- slide 28
s = sl(prs, 28)
txt(find(s, "subtitle"), "INVENTORY, BUDGET & PROCUREMENT GAPS")
txt(find(s, "title"), "What We Hold, What We Still Need")
txt(find(s, "s1_text"),
    "Budget Position: Gen 1 spend was approximately ₹33,760 of the ₹1,00,000 SURGE "
    "grant. Remaining procurement is estimated at ₹10,200 and is almost entirely "
    "consumables and safety hardware — the expensive actuator and compute line items "
    "are already held.")
cards(s, [
    ("IN HAND — 9 LINE ITEMS", [
        "10× Waveshare ST3215 servos",
        "Waveshare driver with ESP32",
        "ESP32 #2, Pi 5 8 GB, MPU6050",
        "3S LiPo 1800 mAh, Mean Well 5 V",
        "Camera Module 3, XL6009 boost",
    ]),
    ("MISSING — CRITICAL (SAFETY)", [
        "Inline fuse and holder",
        "LiPo alarm / BMS module",
        "XT60 loop-key disconnect",
        "Without these the pack is unsafe",
    ]),
    ("MISSING — HIGH PRIORITY", [
        "3S balance charger, storage bag",
        "Servo daisy-chain cables ×12",
        "F623ZZ bearings, M2 fasteners",
        "PLA+ filament, TPU belly pads",
    ]),
])
txt(find(s, "s3_label"), "PROCUREMENT STATUS")
steps(s, [
    ("Actuators\nreceived",    "✓", GREEN, None),
    ("Compute\nreceived",      "✓", GREEN, None),
    ("Power\nsource held",     "✓", GREEN, None),
    ("Safety\nparts",          "⏳", BLUE,  None),
    ("Fasteners\n& bearings",  "→", AMBER, None),
    ("Filament\n& pads",       "→", AMBER, "Upcoming"),
    ("Camera\nfor ESP32",      "→", AMBER, "Upcoming"),
])
txt(find(s, "achieve_text"),
    "Key Achievement: the actuator blocker that stalled Generation 1 is cleared — all "
    "ten servos, the driver board and the power source are in hand. Every remaining "
    "gap is a low-cost consumable, not a supply-chain risk.")
notes(s, "Be direct about the sunk Gen 1 cost. The favourable point is that "
         "Gen 2 needs only consumables and safety parts and the grant covers it "
         "comfortably. The critical row is not optional - running a 3S LiPo with "
         "no fuse, no BMS and no disconnect is the one genuinely unsafe thing in "
         "this project. Verify the ST3215 purchase cost before presenting; the "
         "inventory lists them as held but records no price.")

prs.save(P)
print("slides 19, 21, 28 written")
