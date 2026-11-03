# Snake gait presets from primary sources (SURGE 090 Gen 3)

Researched 3 November 2026. Scope: map the published gaits for modular snake robots onto
the SURGE 090 gait generator (`generations/gen3-experimental-3d/gait.py`, `targets_at`).
No hardware was commanded for this note. Anything marked **unverified** was not confirmed
in a primary source I could open.

## 0. Our generator and the conversion rules

Our generator (from `gait.py`; k counts per axis, k = 0 at the head end, assuming
`joint_map.json` lists joints in ID order):

```
yaw   k (IDs 2,4,6,8,10): bias + A_yaw   * sin(phase - k*lag)
pitch k (IDs 1,3,5,7,9) :        A_pitch * sin(phase - k*lag + offset)
phase = 2*pi*frequency*t, scaled by a raised-cosine ramp envelope
peak demand = 651.9 * (2*pi*|f|*A + pi/(2*ramp)*(A + |bias|))  counts/s  (A in rad)
```

**Reference equation (Tesch et al. 2009, eqs. 1–2).** The CMU "gait equation" is
`θ(n,t) = β_even + A_even·sin(ξ)` for even n, `β_odd + A_odd·sin(ξ + δ)` for odd n, with
`ξ = (dξ/dn)·n + (dξ/dt)·t`. In that paper even modules bend in the vertical plane and odd
modules bend in the horizontal plane, and n counts *every* module. β sets the offsets used for
steering, A the amplitudes, dξ/dn the spatial frequency, dξ/dt the temporal frequency and δ the
lateral-vs-vertical phase shift
([Tesch et al., Adv. Robotics 23:1131, DOI 10.1163/156855309X452566](https://www.cs.cmu.edu/~mtesch/publications/Advanced_Robotics_2009.pdf), §4.1).
Rollinson's thesis restates the same compound-serpenoid form, with separate spatial and
temporal frequencies for the lateral and dorsal waves (eqs. 2.1–2.2)
([Rollinson, CMU-RI-TR-14-13, 2014](https://kilthub.cmu.edu/articles/thesis/Control_and_Design_of_Snake_Robots/6715361)).

Conversion rules (my own derivations, so they are **inferences** and not paper claims):

| Paper quantity | Ours | Note |
|---|---|---|
| A_odd (lateral) / A_even (vertical) | `yaw amp` / `pitch amp` | Our odd IDs are pitch, so Tesch's "even" maps to our pitch. The labels differ but the roles match. |
| β_odd (lateral offset) | `bias` | We have no pitch bias. |
| dξ/dn per module (Ω) | `lag = 2·|Ω|` | Our k steps over two physical modules. |
| dξ/dt | `2π·frequency` | |
| Travelling direction | `f > 0, lag > 0` → wave runs head → tail (k increasing) | Posterior (head-to-tail) waves are the biological norm for lateral undulation and sidewinding ([Mohammadi et al. 2016](https://www.control.utoronto.ca/~maggiore/papers/MohRezMagPet16.pdf) §I; [Marvi et al. 2014](https://arxiv.org/pdf/1410.2945) p.6). Flip the sign of either f or lag to reverse it. |
| δ (lateral vs vertical) | `offset` (pitch relative to yaw) | See below. |

**Module offset caveat (inference).** Our generator gives yaw k and pitch k the same spatial
phase, even though yaw k sits one module tailward. On a continuous backbone the effective
pitch-vs-yaw offset is therefore `offset − lag/2`. Gong et al. explicitly ignore this
one-module offset ("directly used the odd joints for horizontal … even joints for vertical")
([Gong et al., IJRR 2016, kinematic gait synthesis](https://goldmanlab.gatech.edu/pages/publications/pdf/kinematicgaitsynth.pdf), §5.1),
so their δ can be copied straight into `offset`. Tesch's δ sits inside a per-module ξ, so
converting it to our offset needs the module numbering direction, which the paper does not tie
to head or tail. That conversion is ambiguous and is marked as such below.

**Aliasing (inference, sampling theorem).** Each axis has only 5 samples, so `|lag|` must stay
below 180°. A lag of 216° is the same as −144°, a *reversed* wave. Keep `|lag|` at or below
about 150° so the wave is still visible.

## 1. Gait by gait

### 1.1 Lateral undulation (serpenoid slithering)
- **Source equation.** Hirose's serpenoid (sinusoidal curvature along arc length) is the
  standard model. The planar joint form is `φ_i = α·sin(ωt + (i−1)δ) + φ0`, with φ0 a joint
  offset that steers ([Mohammadi, Rezapour, Maggiore, Pettersen, IEEE TCST 2016, eq. 1](https://www.control.utoronto.ca/~maggiore/papers/MohRezMagPet16.pdf),
  which cites Hirose 1993 and Liljebäck et al.). Their simulation used N = 10 links, α = 30°,
  δ = 72°, and anisotropic friction c_t = 0.5, c_n = 3 (same paper, §VII).
  Hirose's own book (*Biologically Inspired Robots*, OUP 1993) was **not accessed**, so the
  original serpenoid constants are **unverified** here.
- **Tesch:** "setting the even amplitude to zero and the odd amplitude to a non-zero value".
  They demonstrated it **only while swimming** in a waterproof skin (§4.1.1).
- **Mapping:** `pitch = 0`, `yaw = α`, `bias = φ0` (turning), `lag = δ`, `offset` unused,
  f > 0 for forward motion.
  - Keeping the per-joint δ = 72° gives 4·72 = 288° of wave over the 5 yaw joints, about 0.8
    waves.
  - Keeping the wave count instead (9·72° ≈ 1.8 waves over 10 links) would need lag = 162°,
    which is too close to aliasing. I recommend **lag 90° (one wave across the yaw joints)**.
    This is an **inference**.
- **Caveat:** the propulsion model assumes anisotropic friction (c_n > c_t), for example from
  wheels or scales ([Mohammadi et al.](https://www.control.utoronto.ca/~maggiore/papers/MohRezMagPet16.pdf)
  §II). A bare robot on isotropic ground mostly slips. Tesch's only robot result was in water.

### 1.2 "Slithering" (CMU hybrid)
- **Tesch:** "lateral axis execute a sine wave with half of the frequency of the vertical wave",
  which "requires a slight modification of our model" (§4.1.1).
- **Mapping:** **not expressible**, because we have one frequency for both axes. The nearest
  preset is lateral undulation plus a small pitch wave. That is **unverified** as equivalent.

### 1.3 Linear progression / rectilinear / vertical undulation (inchworm)
- **Tesch:** "setting the amplitude of the lateral wave to zero and running a purely vertical
  wave". For stability they "set the offset associated with lateral modules to a non-zero value"
  so the robot forms an arc, which "allow[s] the operator to steer" through the arc's radius and
  direction. An "S" footprint keeps the motion straight. The vertical amplitude is kept small for
  stability (§4.1.1, §5.1).
- **Mapping:** `yaw = 0`, `pitch = A`, `bias = β` (arc for stability and steering; 0 gives a
  straight but tippy line), `lag` 90–144°, `offset` irrelevant. An S-shaped footprint needs
  per-joint bias overrides, so it is not a preset.
- **Flat ground:** plausible. Tesch measured it as the lowest-power gait (§5.1).

### 1.4 Sidewinding (straight)
- **Tesch:** "Identical vertical and lateral waves with δ = π/4"; changing δ alters the travel
  angle (§4.1.1). Rollinson: sidewinding "corresponds to a phase offset of π/4 in the serpenoid
  equations" (thesis App. A.3.1).
- **Marvi et al., Science 346:224 (2014)**, [DOI 10.1126/science.1255718](https://doi.org/10.1126/science.1255718)
  ([arXiv 1410.2945](https://arxiv.org/pdf/1410.2945)): the robot used "two posteriorly-directed
  traveling waves in the horizontal and vertical planes with a 1/4 period phase offset,
  Δφ = 1.57 rad". Other values from the paper:
  - snakes measured 1.51 ± 0.17 rad;
  - λ = 0.5 L, on a 17-module robot;
  - the frequency was kept low "to avoid motor angular position and speed error";
  - on level hard ground an aspect ratio of 0.9 gave 0.03 m/s at f = 0.08 Hz.
- **Gong et al. (IJRR 2016)** horizontal wave `A sin(Ωn+ωt)` and vertical wave
  `e·A sin(Ωn+ωt+π/2)`, with Ω = 2π/12 per joint, ω = 2π, e = 0.3 and A ≈ 0.7 rad at mid-body
  (eq. 11–12, 16-module robot).
- **Simulation support:** [Zhang et al. 2021, arXiv 2106.08454](https://arxiv.org/pdf/2106.08454)
  find sidewinding clusters at a lifting phase of about 1/4 and 3/4 when the lifting and lateral
  waves have the same wavenumber.
- **Mapping:**
  - `offset = ±90°`, copied directly from Gong and Marvi. The sign sets left or right travel.
  - `yaw = A`, `pitch` 0.3–0.9 × A.
  - `lag`: Gong's 30° per joint gives 60°, while keeping Gong's 1.33 waves over 10 modules
    gives about 96°; Marvi's λ = 0.5 L gives 5 modules per wave, so lag = 144°.
  - `bias = 0`, f > 0.
  - The π/4 value from Tesch and Rollinson becomes about 45° ± lag/2 in our convention, and the
    sign is ambiguous (see §0). Treat 90° as the primary-sourced start and sweep 45–135° in
    simulation.

### 1.5 Sidewinding with turning
- **Primary-sourced methods:**
  - **Conical sidewinding:** an amplitude gradient along the body,
    `A_c(n) = a(n − n̄) + 0.7`, with n̄ = 8 and a = 0.068 for the fastest, tightest turn
    ([Gong et al. IJRR 2016](https://goldmanlab.gatech.edu/pages/publications/pdf/kinematicgaitsynth.pdf)
    eq. 12, citing Gong, Hatton & Choset ICRA 2012).
  - **Reversal turning:** "a sudden π phase shift in the vertical wave" (same paper, §4–5).
  - **Diagonal travel:** changing δ "controls the angle" of travel (Tesch §4.1.1).
- **Mapping:**
  - Conical needs per-joint `gain` overrides. Rescaled to our 5 yaw joints, the gains
    `1 + (a/0.7)(n − n̄)` taper roughly 0.6 → 1.4 from head to tail. That rescaling is an
    **inference**.
  - Reversal = change `offset` from +90° to −90°. This is the same as a 180° shift of the pitch
    wave and is primary-sourced.
  - A preset-only option is a small yaw `bias`. Tesch says offsets steer ground gaits (Fig. 7),
    but **turning sidewinding by bias is unverified** in a primary source.

### 1.6 Lateral rolling (lag 0, offset ±90°)
- **Tesch:** "dξ/dn is set to zero such that at a given instant of time, each axis conforms to an
  arc. δ is set to π/2 … The amplitude parameters, in this case, control the radius of
  curvature". The arc must be "of a large enough amplitude" to keep tipping the robot over
  (§4.1.2, Fig. 10).
- **Rollinson:** spatial frequency 0 and δ = π/2. The arc "rolls either toward or away from the
  center of the arc" (App. A.3.2).
- **Mapping:** `lag = 0`, `offset = ±90°` (the sign or the sign of f sets the roll direction),
  `yaw = pitch = A`, `bias = 0`. The lag = 0 case needs no module-offset correction.
  **Primary-sourced.**
- **Flat ground:** plausible. The robot twists within an arc and needs no friction anisotropy.

### 1.7 Helical rolling / corkscrew / pole and pipe climbing
- **Tesch:** "With a non-zero value of dξ/dn, the robot can model the shape of a helix … used to
  climb up the outside of poles and the inside of pipes" (§4.1.2).
- **Rollinson:** the helix gait is `A·sin(ξ)` lateral and `A·sin(ξ+π/2)` dorsal. Pipe crawling
  uses spatial frequency chosen for "approximately 1.5 wave cycles over the length of the robot".
  Pole climbing uses 5–10 cm poles (thesis eq. 3.1–3.2, App. A.3.3–A.3.4).
- **Mapping:** `yaw = pitch = A`, `offset = ±90°`. For 1.5 waves over 10 modules, 54° per module
  gives `lag ≈ 108°` (an inference).
- **Caveat:** this needs something to wrap around or push against. On flat ground a helix just
  rolls sideways, which is the "corkscrew" behaviour. A 10-module robot about 1 m long cannot
  wrap a pole more than about 1.5 turns, and squeeze force is limited by servo torque. Treat it
  as a **simulation-only** demo for now.

### 1.8 Double linear progression (pipe interior)
- **Tesch:** "With δ set to zero, and with equal amplitudes for both the vertical and lateral
  modules", the shape is a sine wave along the diagonal plane, used to climb wider pipes
  (§4.1.1).
- **Mapping:** `yaw = pitch = A`, `offset = 0`. With the module correction it would be
  `offset ≈ lag/2`, an **inference**. It is for pipes and channels only.

### 1.9 Turning in place / rotating
- **Tesch:** "Having the front and back halves of the robot perform sidewinding, but in opposite
  directions … the snake robot rotates in place about its center" (§4.1.1). Gong et al. measured
  this turn-in-place gait at a maneuverability of 0.16 ± 0.03 m, comparable to reversal turning.
- **Mapping:** **needs overrides, so it is not a preset.** Use the sidewinding preset with
  `phase = 180°` on the back-half pitch joints (IDs 5/7/9, or 7/9). At offset ±90° a 180° shift
  flips the sidewinding direction. This is an **inference** from the reversal-turning result.

### 1.10 Sinus lifting
- **Primary source not accessed.** Ohno & Hirose, "Locomotion of a hyper-redundant mobile robot:
  sinus-lifting", JSME Robomec 2002 ([J-STAGE record](https://www.jstage.jst.go.jp/article/jsmermd/2002/0/2002_37_4/_article/-char/en))
  is in Japanese, and I did not open the full text.
- **Related source:** Zhang et al. ([arXiv 2106.08454](https://arxiv.org/pdf/2106.08454))
  model "symmetric" lifting with the lifting wavenumber at **2×** the lateral one (λ = 2). They
  report it moves only forward, citing Hu et al. PNAS 2009.
- **Mapping:** **not expressible**, because pitch would need twice the spatial *and* temporal
  frequency of yaw. Any approximation through overrides is **unverified**.

### 1.11 Concertina
- **Tesch:** a stop-and-go gait that is "7 times less efficient" in real snakes. CMU "found a
  variant linear progression" worked better for channels (§3.1, §4.1.1).
- **Mapping:** **not expressible** as a single travelling sine, so it would need a scripted gait.
  It is not a preset.

## 2. What is plausible on flat ground with 10 joints (5 pitch + 5 yaw)

| Gait | Flat-ground verdict | Why |
|---|---|---|
| Lateral rolling | **Yes, most robust** | Works through rotation alone and needs no friction anisotropy ([Tesch](https://www.cs.cmu.edu/~mtesch/publications/Advanced_Robotics_2009.pdf) §4.1.2). |
| Sidewinding | **Yes** | Static contacts, wide footprint, "inherent stability" (Tesch §4.1.1). 10 modules gives about 1–2 waves (Marvi λ = 0.5 L). |
| Linear progression | Yes, but slow and tippy | Footprint is a line, so it needs a yaw bias arc (Tesch). Small pitch amplitude only. |
| Lateral undulation | Weak on smooth floors | Needs anisotropic friction. CMU showed it only in water. |
| Sidewinding turn (bias) | Probably | Bias steering is **unverified** for sidewinding. Reversal (offset sign flip) is sourced. |
| Turn in place | Overrides only | Two halves sidewind in opposite directions. Each half has only about 2–3 modules per axis, so expect a weak effect (inference). |
| Helix, pipe, pole, double linear progression | No (needs environment) | These gaits need a pole or pipe to push against. |
| Sinus lifting, slithering, concertina | Not expressible | They need a different frequency per axis or scripting. |

Other caveats:
- With 5 samples per axis, waves are coarse (see the aliasing note in §0).
- Marvi reports that the robot's open-loop sidewinding failed on sand slopes until contact length
  was increased. Our presets are for hard, level ground.
- Joint limits are about ±70° (counts 1252–2844), so keep `A + |bias| ≤ 60°` for margin.

## 3. Recommended presets

Peak demand = `max over axes of 651.9·(2π|f|A + π/(2·ramp)·(A + |bias|))`, with bias applied
to yaw only. Peaks below were computed with that exact formula. Lags follow §1. `offset` is the
pitch-vs-yaw offset. Signs: f > 0 and lag > 0 give a head-to-tail wave. Flip the sign of
`offset` to mirror sidewinding or rolling.

### (a) Simulation (speed limit 3000 counts/s, ramp 2 s)

| Preset | yaw ° | pitch ° | bias ° | f Hz | lag ° | offset ° | ramp s | Peak (counts/s) | Source basis |
|---|---|---|---|---|---|---|---|---|---|
| Lateral undulation | 45 | 0 | 0 | 0.5 | 90 | 0 | 2 | **2011** | Mohammadi/Liljebäck form; lag inferred |
| Lateral undulation turn | 40 | 0 | 15 | 0.5 | 90 | 0 | 2 | **1921** | φ0 offset steering |
| Linear progression | 0 | 25 | 15 | 0.4 | 120 | 0 | 2 | **938** | Tesch (bias = stabilising arc) |
| Sidewinding (Gong) | 40 | 12 | 0 | 0.5 | 96 | 90 | 2 | **1787** | Gong e = 0.3, π/2 |
| Sidewinding (Marvi) | 35 | 30 | 0 | 0.5 | 144 | 90 | 2 | **1564** | Marvi Δφ = π/2, λ = 0.5 L, aspect about 0.9 (ratio inferred) |
| Sidewinding turn | 35 | 12 | 12 | 0.5 | 96 | 90 | 2 | **1671** | bias turning **unverified** |
| Lateral rolling | 35 | 35 | 0 | 0.4 | 0 | 90 | 2 | **1314** | Tesch, Rollinson |
| Helix / corkscrew (sim) | 30 | 30 | 0 | 0.4 | 108 | 90 | 2 | **1126** | Rollinson 1.5 waves |
| Double linear progression (pipe sim) | 25 | 25 | 0 | 0.4 | 120 | 0 | 2 | **938** | Tesch δ = 0 |

All simulation peaks are at or below 2011 counts/s, under 3000.

### (b) Hardware (speed limit 1500 counts/s; target ≤ 60 % = 900; ramp ≥ 2 s)

| Preset | yaw ° | pitch ° | bias ° | f Hz | lag ° | offset ° | ramp s | Peak (counts/s) |
|---|---|---|---|---|---|---|---|---|
| Lateral undulation | 30 | 0 | 0 | 0.20 | 90 | 0 | 2.5 | **643** |
| Lateral undulation turn | 25 | 0 | 10 | 0.20 | 90 | 0 | 2.5 | **608** |
| Linear progression | 0 | 20 | 10 | 0.20 | 120 | 0 | 2.5 | **429** |
| Sidewinding (Gong-like) | 30 | 10 | 0 | 0.20 | 96 | 90 | 2.5 | **643** |
| Sidewinding (Marvi-like) | 25 | 20 | 0 | 0.15 | 144 | 90 | 2.5 | **447** |
| Sidewinding turn | 25 | 10 | 10 | 0.15 | 96 | 90 | 2.5 | **518** |
| Lateral rolling | 25 | 25 | 0 | 0.15 | 0 | 90 | 3 | **417** |

All hardware peaks are at or below 643 counts/s, which is 43 % of 1500. Every case keeps
`A + |bias| ≤ 35°`, well inside ±70°. Helix and double linear progression are left off the
hardware list because they need a pipe or pole.

Hardware notes:
- Marvi kept f low (0.08 Hz on a 17-module robot) to avoid tracking error. Raise f in steps of
  0.05 Hz and watch `tracking_error` (currently 216).
- Rolling at 25° may not tip a 10-module arc; total arc ≈ 5 × A ≈ 125° (inference). If it rocks
  without rolling, raise A toward 35°. At f = 0.15 Hz that gives a peak of 584.
- Run every preset in simulation first and confirm the travel direction there. The head-index
  and sign conventions in §0 are inferences until simulation or a supervised trial confirms them.

## Sources (opened and read)
- Tesch, Lipkin, Brown, Hatton, Peck, Rembisz, Choset. *Parameterized and scripted gaits for
  modular snake robots.* Adv. Robotics 23 (2009) 1131–1158.
  [author PDF](https://www.cs.cmu.edu/~mtesch/publications/Advanced_Robotics_2009.pdf),
  DOI 10.1163/156855309X452566.
- Marvi et al. *Sidewinding with minimal slip.* Science 346 (2014) 224–229.
  [arXiv 1410.2945](https://arxiv.org/pdf/1410.2945),
  [DOI](https://doi.org/10.1126/science.1255718).
- Gong, Travers, Astley, Li, Mendelson, Goldman, Choset. *Kinematic gait synthesis for snake
  robots.* IJRR (2016). [PDF](https://goldmanlab.gatech.edu/pages/publications/pdf/kinematicgaitsynth.pdf).
- Rollinson. *Control and Design of Snake Robots.* CMU-RI-TR-14-13 (2014).
  [KiltHub](https://kilthub.cmu.edu/articles/thesis/Control_and_Design_of_Snake_Robots/6715361).
- Mohammadi, Rezapour, Maggiore, Pettersen. *Maneuvering control of planar snake robots using
  virtual holonomic constraints.* IEEE TCST (2016).
  [PDF](https://www.control.utoronto.ca/~maggiore/papers/MohRezMagPet16.pdf).
- Zhang, Naughton, Parthasarathy, Gazzola. *Friction modulation in limbless, three-dimensional
  gaits.* [arXiv 2106.08454](https://arxiv.org/pdf/2106.08454).

**Not accessed (claims attributed to them are unverified):**
- Hirose, *Biologically Inspired Robots* (1993).
- Hirose & Yamada, IEEE RAM 16(1) 2009, [DOI 10.1109/MRA.2009.932130](https://ieeexplore.ieee.org/document/4799450).
- Ohno & Hirose, Robomec 2002.
- Ma's creeping-locomotion papers.
- Transeth, Pettersen & Liljebäck, Robotica 2009 survey.
- Liljebäck et al., Robotica 2013 (the NTNU repository link returned an HTML shell).
- Gong et al., ICRA 2013 "Extended gait equation for sidewinding".
- CMU Biorobotics gaits page ([link](https://biorobotics.ri.cmu.edu/projects/modsnake/gaits.html)
  failed TLS and returned 404).
