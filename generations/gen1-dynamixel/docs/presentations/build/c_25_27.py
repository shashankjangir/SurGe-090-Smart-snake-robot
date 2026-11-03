"""Slides 25 and 27 - duplicated from slide 13 (3x2 grid of six icon cards)."""
from pptx import Presentation
from edit import sl, find, txt, fill, notes

P = "work.pptx"
prs = Presentation(P)

GREEN, BLUE, AMBER = "1F9D55", "1E6FD6", "E8821E"

# card N -> (title shape, desc shape, icon-circle shape)
CARDS = [
    ("Text 10", "Text 11", "Shape 9"),
    ("Text 14", "Text 15", "Shape 13"),
    ("Text 18", "Text 19", "Shape 17"),
    ("Text 22", "Text 23", "Shape 21"),
    ("Text 26", "Text 27", "Shape 25"),
    ("Text 30", "Text 31", "Shape 29"),
]


def grid(s, eyebrow, title, cards):
    txt(find(s, "Text 0"), eyebrow)
    txt(find(s, "Text 1"), title)
    for (tn, dn, cn), (ct, cd, colour) in zip(CARDS, cards):
        txt(find(s, tn), ct)
        txt(find(s, dn), cd)
        fill(find(s, cn), colour)


# ------------------------------------------------------------- slide 25
grid(sl(prs, 25), "SAFETY ARCHITECTURE & CRITICAL GAPS",
     "Five Protection Parts the Robot Does Not Yet Have", [
    ("Inline fuse — MISSING",
     "Nothing limits fault current on a 27 A-capable pack.", AMBER),
    ("Loop-key disconnect — MISSING",
     "No safe way to isolate the battery from the bus.", AMBER),
    ("LiPo alarm / BMS — MISSING",
     "No cell-level undervoltage protection below 3.0 V.", AMBER),
    ("Bulk capacitor — MISSING",
     "Servo inrush transients reach the driver unsuppressed.", AMBER),
    ("Balance charger & bag — MISSING",
     "No safe charge, balance or storage path for the pack.", AMBER),
    ("Current-stall limit — IN FIRMWARE",
     "Software torque cap works, but is not a fuse.", GREEN),
])
notes(sl(prs, 25),
      "This is the slide I would rather not need. Five of the six cards are "
      "amber and they are all cheap - roughly 3600 rupees for the whole row. "
      "The reason it is on the deck rather than buried in a spreadsheet is that "
      "a 3S lithium polymer pack capable of 27 amps, with no fuse, no cell "
      "monitoring and no disconnect, is the one genuinely hazardous thing in "
      "this project. The sixth card is deliberate: the firmware current limit "
      "is real and it works, but software cannot protect against a short "
      "circuit. Nothing goes on the LiPo until the first three are fitted.")

# ------------------------------------------------------------- slide 27
grid(sl(prs, 27), "VERIFICATION & MOCK-MODE RESULTS",
     "What Has Been Proven Without Hardware", [
    ("v6 CAD self-check",
     "Model refuses to export if its assumptions break.", GREEN),
    ("Mock mode — SURGE_MOCK=1",
     "Full gait stack runs with no servos attached.", GREEN),
    ("Wokwi simulation",
     "ESP32, servos, IMU and display validated virtually.", GREEN),
    ("PlatformIO — five targets",
     "All firmware environments compile clean.", GREEN),
    ("Broadcast smoke test",
     "Ten servos driven before any ID was assigned.", GREEN),
    ("Hardware verification",
     "Ping, stall calibration and gait still outstanding.", AMBER),
])
notes(sl(prs, 27),
      "The honest framing is that this is verification without hardware, which "
      "is worth a lot but is not the same as a working robot. The five green "
      "cards are real: the CAD model asserts its own ground-contact geometry, "
      "the Python stack runs a full gait in mock mode, the simulation covers "
      "the electronics, every firmware target builds, and the broadcast test "
      "moved all ten servos on the bench. The amber card is the point of the "
      "slide - nothing has been calibrated against a real stall current yet, "
      "and that is the next measurement.")

prs.save(P)
print("slides 25, 27 written")
