"""Minimal fit pass: grow boxes into free space, and drop inherited font sizes
that cannot fit their content at any box size. Nothing here is a design change
beyond what is needed to stop text overflowing."""
from pptx import Presentation
from pptx.util import Inches, Pt
from edit import sl, find

P = "work.pptx"
prs = Presentation(P)


def resize(sh, w=None, h=None, l=None, t=None):
    if w is not None: sh.width = Inches(w)
    if h is not None: sh.height = Inches(h)
    if l is not None: sh.left = Inches(l)
    if t is not None: sh.top = Inches(t)


def setpt(sh, pt):
    for para in sh.text_frame.paragraphs:
        for r in para.runs:
            r.font.size = Pt(pt)


def shrink_wrap(sh):
    sh.text_frame.word_wrap = True


# --- slide 16: title inherited 52pt from "Smart Snake Robot" (17 chars) ----
s = sl(prs, 16)
t5 = find(s, "Text 5")
resize(t5, w=11.9, h=1.00)
setpt(t5, 38)
shrink_wrap(t5)

t6 = find(s, "Text 6")
resize(t6, w=11.9, h=0.50)
setpt(t6, 13)
shrink_wrap(t6)

# station detail lines sit inside a 1.35" card with ~0.30" to spare
for nm in ("Text 19", "Text 24", "Text 29"):
    sh = find(s, nm)
    resize(sh, h=0.40)
    setpt(sh, 9.5)
    shrink_wrap(sh)
for nm in ("Text 18", "Text 23", "Text 28"):
    setpt(find(s, nm), 8.5)
    shrink_wrap(find(s, nm))

# --- slides 22, 23, 26: diagram captions, 0.46" of free space below --------
for n in (22, 23, 26):
    s = sl(prs, n)
    for nm in ("LeftCap", "RightCap"):
        sh = find(s, nm)
        resize(sh, h=0.44)
        setpt(sh, 10)
        shrink_wrap(sh)

# --- slides 17, 20: intro paragraph above the bullet list ------------------
for n in (17, 20):
    s = sl(prs, n)
    sh = find(s, "ProblemIntro")
    resize(sh, h=0.90)
    setpt(sh, 11)
    shrink_wrap(sh)

prs.save(P)
print("fit pass applied")
