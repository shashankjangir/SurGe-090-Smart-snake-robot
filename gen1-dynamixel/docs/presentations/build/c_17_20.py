"""Slides 17 and 20 — both duplicated from slide 2 (card + 8x3 comparison table)."""
from pptx import Presentation
from edit import sl, find, txt, lst, notes, _set_para

P = "work.pptx"
prs = Presentation(P)


def cell(c, text, bold=None):
    tf = c.text_frame
    for p in list(tf.paragraphs)[1:]:
        p._p.getparent().remove(p._p)
    _set_para(tf.paragraphs[0], [(text, bold)] if bold is not None else text)


def table_of(slide):
    for sh in slide.shapes:
        if sh.has_table:
            return sh.table
    raise KeyError("no table")


# ---------------------------------------------------------------- slide 17
s = sl(prs, 17)
txt(find(s, "EyebrowA"), "ACTUATOR RE-SELECTION")
txt(find(s, "TitleA"), "From XL330 to Waveshare ST3215")
txt(find(s, "ProblemEyebrow"), "THE CONSTRAINT")
txt(find(s, "ProblemIntro"),
    "The Gen 1 trade study was sound and its conclusion still holds: a snake "
    "robot needs smart serial bus servos. Only the vendor changed. XL330 became "
    "unobtainable in the Indian market after 2 of 10 units were received.")
lst(find(s, "ProblemBullets"), [
    "Precise absolute position control",
    "Single-cable daisy-chain wiring",
    "Per-joint load and current feedback",
    "Built-in controller, no external driver per joint",
    "Scalable to 10 coordinated joints",
    "Procurable in India, in quantity",
])
txt(find(s, "TableEyebrow"), "XL330 VS ST3215 — AS SELECTED")

rows = [
    ("Criterion", "Dynamixel XL330 (Gen 1)", "Waveshare ST3215 (Gen 2)"),
    ("Stall torque", "0.52 N·m", "2.94 N·m  —  5.7× higher"),
    ("Voltage rail", "5 V", "6.0–12.6 V"),
    ("Stall current", "0.35 A", "2.7 A @ 12 V"),
    ("Encoder", "12-bit absolute", "12-bit absolute, 0–4095"),
    ("Bus protocol", "Dynamixel 2.0, 1 Mbps", "Feetech STS, 1 Mbps half-duplex"),
    ("Driver hardware", "U2D2 + Power Hub + MCU", "Waveshare driver, ESP32 onboard"),
    ("Availability in India", "Unobtainable", "In stock — 10 units held"),
]
t = table_of(s)
for ri, row in enumerate(rows):
    for ci, val in enumerate(row):
        cell(t.cell(ri, ci), val, bold=(ri == 0))

notes(s, "The Gen 1 trade study is not invalidated - its conclusion was smart "
         "bus servos, and that is what we still run. Only the vendor changed, "
         "and it changed for supply reasons, not engineering ones. The torque "
         "column is the favourable consequence: 5.7x more joint torque at the "
         "same joint count. The voltage change from 5 V to 12 V is what forced "
         "the power architecture rework on slide 24.")

# ---------------------------------------------------------------- slide 20
s = sl(prs, 20)
txt(find(s, "EyebrowA"), "BUS PROTOCOL")
txt(find(s, "TitleA"), "Feetech STS Control Table & Packet Format")
txt(find(s, "ProblemEyebrow"), "PACKET FORMAT")
txt(find(s, "ProblemIntro"),
    "All ten servos share one half-duplex TTL line at 1 Mbps. Every packet is "
    "addressed to a single ID, or to broadcast ID 0xFE, which every servo acts "
    "on and none replies to — the only safe way to drive the bus before IDs "
    "are assigned.")
lst(find(s, "ProblemBullets"), [
    "Header  0xFF 0xFF",
    "ID  1–253, or 0xFE broadcast",
    "Length  parameters + 2",
    "Instruction  0x03 = WRITE, 0x02 = READ",
    "Parameters  address, then data bytes",
    "Checksum  bitwise NOT of the byte sum",
    "Multi-byte fields are little-endian",
])
txt(find(s, "TableEyebrow"), "CONTROL TABLE — IMPLEMENTED")

rows = [
    ("Register", "Addr", "Width and meaning"),
    ("ID", "5", "1 byte, EEPROM — factory default 1"),
    ("TORQUE_ENABLE", "40", "1 byte  0 = off, 1 = on"),
    ("GOAL_POSITION", "42", "2 bytes, little-endian, 0–4095"),
    ("GOAL_SPEED", "46", "2 bytes, steps per second"),
    ("LOCK", "55", "1 byte, EEPROM write gate"),
    ("PRESENT_POSITION", "56", "2 bytes, centre = 2048"),
    ("PRESENT_CURRENT", "69", "2 bytes, bit15 = sign, 6.5 mA/count"),
]
t = table_of(s)
for ri, row in enumerate(rows):
    for ci, val in enumerate(row):
        cell(t.cell(ri, ci), val, bold=(ri == 0))

notes(s, "This is the whole interface. Two register facts matter downstream: "
         "GOAL_POSITION is little-endian and 0-4095 with centre 2048, which is "
         "a 4x scale difference from the SC-series servos the Waveshare board "
         "ships configured for; and PRESENT_CURRENT at address 69 is how we "
         "detect a stall, at 6.5 mA per count with the sign in bit 15. The "
         "1200 mA threshold in robot_config.py is still a placeholder and needs "
         "calibrating against a real stall.")

prs.save(P)
print("slides 17, 20 written")
