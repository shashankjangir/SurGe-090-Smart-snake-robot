"""Slides 18 and 24 - duplicated from slide 6
(vertical block-diagram chain + right-hand boxes + legend + status row)."""
from pptx import Presentation
from edit import sl, find, txt, lst, notes

P = "work.pptx"
prs = Presentation(P)

# ------------------------------------------------------------- slide 18
s = sl(prs, 18)
txt(find(s, "Text 0"), "GEN 1 → GEN 2 ARCHITECTURE")
txt(find(s, "Text 1"), "From Tethered Pi Control to Onboard ESP32")
txt(find(s, "Text 8"),
    "Control moved onto the robot    ·    Pi 5 relegated to base station    ·    Link is now wireless")

txt(find(s, "PwrLabel"), "3S LiPo 1800 mAh   (11.1 – 12.6 V)")
txt(find(s, "RPiLabel"), "Waveshare Driver + ESP32   [Robot Master]")
txt(find(s, "CommLabel"), "Feetech STS Bus   (1 Mbps, half-duplex)")
txt(find(s, "DynLabel"), "10 × Waveshare ST3215 Servos")
txt(find(s, "RobLabel"), "Robot Segments   (10 × servo joints)")
txt(find(s, "CALabel"), "Gait CPG runs onboard")

txt(find(s, "FutHeader"), "OFF-ROBOT & PLANNED")
txt(find(s, "SensorLabel"), "MPU6050 IMU  (I²C 21 / 22)")
txt(find(s, "CamLabel"), "ESP32 Camera  (planned)")
txt(find(s, "WirelessLabel"), "ESP-NOW → ESP32 #2 → Pi 5")

txt(find(s, "StatHead"), "Generation 2 Implementation Status")
txt(find(s, "StatItem0"), "All firmware targets written and building")
txt(find(s, "StatItem1"), "Servo IDs not yet assigned — all ship as ID 1")
txt(find(s, "StatItem2_0"), "v6 segments not yet printed")
txt(find(s, "StatItem2_1"), "ESP-NOW link not yet exercised on hardware")

notes(s, "The single most important change is where control lives. In "
         "Generation 1 the Raspberry Pi was the controller and sat on the robot, "
         "tethered over USB to a U2D2. In Generation 2 the ESP32 on the "
         "Waveshare driver is the master, the Pi 5 moved off the robot entirely, "
         "and the link between them is ESP-NOW rather than a cable. That is what "
         "makes untethered operation possible. Compare this against the "
         "Generation 1 block diagram on slide 6 - the shape of the system is "
         "genuinely different, not just re-labelled.")

# ------------------------------------------------------------- slide 24
s = sl(prs, 24)
txt(find(s, "Text 0"), "ELECTRICAL & POWER ARCHITECTURE")
txt(find(s, "Text 1"), "Field and Bench Power Paths")
txt(find(s, "Text 8"),
    "Robot rail resolved    ·    No DC conversion needed    ·    Protection hardware outstanding")

txt(find(s, "PwrBlock" if False else "PwrLabel"), "3S LiPo 1800 mAh   —   20.0 Wh")
txt(find(s, "RPiLabel"), "Inline fuse  +  XT60 loop key   [NOT YET HELD]")
txt(find(s, "CommLabel"), "1000 µF bulk capacitor   [NOT YET HELD]")
txt(find(s, "DynLabel"), "Waveshare Driver VIN   (6 – 12 V)")
txt(find(s, "RobLabel"), "10 × ST3215   —   27 A worst-case stall")
txt(find(s, "CALabel"), "≈ 22 min at 4 A")

txt(find(s, "FutHeader"), "BENCH PATH (TETHERED)")
txt(find(s, "SensorLabel"), "Mean Well LRS-100-5  (5 V, 20 A)")
txt(find(s, "CamLabel"), "12 V 2 A supply  —  ID assignment")
txt(find(s, "WirelessLabel"), "XL6009 boost  —  one servo only")

txt(find(s, "StatHead"), "Power Status & Open Risks")
txt(find(s, "StatItem0"), "LiPo sits inside the servo range — no conversion needed")
txt(find(s, "StatItem1"), "Driver is rated 6–12 V; a full 3S pack is 12.6 V")
txt(find(s, "StatItem2_0"), "Fuse, BMS and loop key are not yet in inventory")
txt(find(s, "StatItem2_1"), "LiPo C-rating unverified — sets the real current ceiling")

notes(s, "The resolved part is the robot rail: a 3S pack sits inside the "
         "ST3215's 6.0 to 12.6 volt window, so it feeds the driver directly with "
         "no buck or boost anywhere in the path. That removes the whole "
         "conversion problem Generation 1 had at 5 volts. Two things are not "
         "resolved and both belong on the record. First, Waveshare rates this "
         "board 6 to 12 volts, and a fully charged 3S pack is 12.6 - so we are "
         "0.6 volts over spec at the top of every charge cycle. Second, none of "
         "the three protection parts are held yet. The 27 amp figure is "
         "worst-case all-joints-stalled, not normal draw, but it is what sizes "
         "the fuse.")

prs.save(P)
print("slides 18, 24 written")
