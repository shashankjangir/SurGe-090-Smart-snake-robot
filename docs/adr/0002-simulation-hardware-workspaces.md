# Separate Simulation and Hardware workspaces

Date: 3 November 2026

Status: implemented; supervised hardware trial pending.

## Decision

Each generation exposes two visible workspaces instead of an execution dropdown.
Simulation fixes its destination to simulation/SIM and does not include a serial
port in starts. Hardware fixes its destination to hardware/ST3215; Gen 3 retains
an initially selected mathematical Dry run toggle. Calibration, firmware and
per-joint tools remain hardware-only. Gen 2.1 uses one visible workspace and
requires the current engine stopped/disconnected before changing workspaces.

A single root-scoped gamepad implementation mounts independent panels with a
page-level enable lock. Both retain strict blur, visibility, lease, freshness,
neutral-input and hold-to-run protections. Backend ownership, Stop, validation,
tracking and torque-off remain authoritative and shared.

Gen 3 drafts are independent. Explicit waveform copy preserves Hardware timing
and measured speed. Presets and recorded gait runs have explicit load destinations;
run history shows execution badges and a page-session filter. Shared history and
presets keep their current backend storage. No backend split or new UI dependency.

## Reason

An operator must see the execution destination before starting. The previous
mixed Controls form duplicated Simulation controls and prevented using a gamepad
while watching the 3D view. Gen 2.1's hidden engine input was incorrectly queried
as a checked radio, making Hardware unreachable.

## Consequences

Simulation controller and button use one finite payload builder. Controller route
assistance consumes the workspace route only when no explicit controller route
was supplied; it never creates a second automatic follower. Hardware live Apply
rejects simulation jobs. Connected-engine and fresh-status checks protect Gen 2.1.
Feedback belongs to its connected workspace and clears on disconnect/mismatch.

Existing CSS and motion conventions remain. The new Gen 2.1 segmented control
uses the transitions.dev sliding-tab snippet with reduced-motion support. No GSAP
dependency is added for a CSS-sized interaction. All physical trials require a
supervising operator; this implementation was verified without opening hardware.
