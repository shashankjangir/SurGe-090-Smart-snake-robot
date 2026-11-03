"""Slides 22, 23, 26 - duplicated from slide 3
(4 quadrant cards + a left 'stub' diagram and a right 'chain' diagram)."""
from pptx import Presentation
from edit import sl, find, txt, lst, notes

P = "work.pptx"
prs = Presentation(P)


def left_diagram(s, title, ctrl, items, caption):
    txt(find(s, "LeftTitle"), title)
    txt(find(s, "CtrlL"), ctrl)
    for i, v in enumerate(items):
        txt(find(s, "Servo%d" % i), v)
    txt(find(s, "LeftCap"), caption)


def right_diagram(s, title, ctrl, items, caption):
    txt(find(s, "RightTitle"), title)
    txt(find(s, "CtrlR"), ctrl)
    for i, v in enumerate(items):
        txt(find(s, "M%d" % i), v)
    txt(find(s, "RightCap"), caption)


def quadrants(s, learn_eye, learn_items, dec_eye, dec_title, dec_reason):
    txt(find(s, "LearnEye"), learn_eye)
    lst(find(s, "LearnBul"), learn_items)
    txt(find(s, "DecEye"), dec_eye)
    txt(find(s, "DecTitle"), dec_title)
    txt(find(s, "DecReason"), dec_reason)


# ------------------------------------------------------------- slide 22
s = sl(prs, 22)
txt(find(s, "EyebrowB"), "STRUCTURE & LOAD PATH")
txt(find(s, "TitleB"), "v6 Load Path & Positive Motor Retention")
left_diagram(s, "v4 / v5 — Motor Lifts Straight Out", "Horn",
             ["Slip-fit 0.4 mm", "Open at top", "Lightening windows", "~1 mm rear wall"],
             "The motor sits in an open pocket with no fastener. Nothing resists it lifting out.")
right_diagram(s, "v6 — Captured in a Closed Cradle", "Horn",
              ["M2", "M2", "M2", "M2"],
              "Four M2 screws capture the motor against a closed cradle wall.")
quadrants(s, "LOAD PATH", [
    "Horn face transfers joint torque to the next segment",
    "F623ZZ flange bearing on the horn-opposite side",
    "Bearing carries radial load off the motor shaft",
    "14 mm bolt circle, 4 × M2 blind holes each face",
    "Closed cradle wall reacts motor reaction torque",
], "RETENTION — RESOLVED IN V6",
    "Four M2 screws through a closed cradle",
    "v4 and v5 relied on an interference fit alone. Under repeated gait loading that is "
    "a slow failure: the pocket wears, the motor rocks, and joint backlash grows. v6 "
    "adds positive fastening and restores the sidewall the lightening windows removed.")
notes(s, "The load path point is that the motor shaft should not be carrying "
         "radial load - the F623ZZ bearing on the opposite face does that, and "
         "the horn only transfers torque. The retention fix matters more than it "
         "sounds: an interference fit that loosens turns into joint backlash, "
         "and backlash in a 10-joint chain compounds into a gait that will not "
         "track. This was found by measuring the pocket, not by looking at it.")

# ------------------------------------------------------------- slide 23
s = sl(prs, 23)
txt(find(s, "EyebrowB"), "FRICTION, KEELS & TORQUE")
txt(find(s, "TitleB"), "Why v6 Can Actually Move — Friction & Torque Budget")
left_diagram(s, "v4 / v5 — Scales Never Touched Ground", "Belly",
             ["Plate at −3.45 mm", "Scales at −3.00 mm", "Plate 1006 mm²", "Scales 66 mm²"],
             "The plate hung 0.45 mm below the scales — 94% of ground contact was the one "
             "surface never meant to touch.")
right_diagram(s, "v6 — Keels Carry the Robot", "Belly",
              ["Grip", "Slide", "Grip", "Slide"],
              "Scales swept along the body: grip across it, slide along it — the asymmetry "
              "lateral undulation requires.")
quadrants(s, "TORQUE BUDGET", [
    "ST3215 stall torque 2.94 N·m at 12 V",
    "XL330 was 0.52 N·m — 5.7× less",
    "10 joints, 58 mm pitch, ~580 mm body",
    "Head pod adds ≈ 0.02 N·m — under 1% of budget",
    "Torque is no longer the binding constraint",
], "THE REMAINING UNKNOWN",
    "Anisotropic friction ratio is unmeasured",
    "Every locomotion claim in this deck assumes the belly grips across the body and "
    "slides along it. That ratio has never been measured on a printed part. Printing one "
    "v6 segment and measuring fore/aft versus lateral friction is the single highest-value "
    "next experiment.")
notes(s, "Two halves. The torque half is settled - 5.7 times more joint torque "
         "than Generation 1, and the head pod barely registers against it, so "
         "torque stopped being the limiting factor the moment we switched "
         "actuators. The friction half is not settled and I want to be explicit "
         "about that. A snake robot moves by having different friction across "
         "the body than along it. v4 and v5 got that backwards and also never "
         "touched the ground with the feature that was supposed to do it. v6 "
         "fixes both in CAD, but nobody has put a printed segment on a surface "
         "and measured the ratio. Until that happens, the gait is theory.")

# ------------------------------------------------------------- slide 26
s = sl(prs, 26)
txt(find(s, "EyebrowB"), "GAIT & OBSTACLE RESPONSE")
txt(find(s, "TitleB"), "Gait Generation and the Evasion State Machine")
left_diagram(s, "Lateral Undulation — Travelling Wave", "CPG",
             ["Joint 1   φ = 0°", "Joint 2   φ = 72°", "Joint 3   φ = 144°", "Joint 4   φ = 216°"],
             "A serpenoid phase offset propagates down the chain at 50 Hz; amplitude 400 ticks ≈ 35°.")
right_diagram(s, "Evasion Finite State Machine", "FSM",
              ["RUN", "STALL", "BACK", "TURN"],
              "A sustained current rise trips STALL; the robot reverses, turns away, then resumes.")
quadrants(s, "GAIT PARAMETERS", [
    "Control loop 50 Hz",
    "Amplitude 400 encoder ticks ≈ 35°",
    "Phase offset 72° per joint, 10 joints",
    "Goal position written as a sync payload",
    "Gait continues if the IMU is absent",
], "OBSTACLE DETECTION",
    "Proprioceptive — no external sensor",
    "Collision is inferred from PRESENT_CURRENT at address 69 rather than a rangefinder. "
    "The threshold is still a placeholder at 1200 mA and must be calibrated against a "
    "measured free-run and stall current before it can be trusted.")
notes(s, "The gait is a central pattern generator - a travelling sine wave with "
         "a fixed phase offset per joint, which is the standard lateral "
         "undulation formulation. The part worth drawing attention to is "
         "obstacle detection: there is no ultrasonic sensor and no rangefinder "
         "in the loop. The robot notices an obstacle because a joint draws more "
         "current than it should, which is proprioception rather than exteroception. "
         "That is elegant and it costs nothing in hardware, but the threshold is "
         "a guess until we measure a real stall on a real segment.")

prs.save(P)
print("slides 22, 23, 26 written")
