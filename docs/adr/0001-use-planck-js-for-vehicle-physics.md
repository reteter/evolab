---
status: accepted
---

# Use Planck.js for vehicle physics

On 2026-07-29 the owner selected Planck.js 1.5.0 for the M1–M4 vehicle
simulation after T0 showed higher median throughput, simpler browser
distribution and a shorter path to playable vehicle behaviour than Rapier2D
0.19.3. Physics remains behind `Simulation Port` so the choice is reversible;
the supported repeatability boundary is recorded in
[ADR-0002](0002-bound-repeatability-to-same-build-and-runtime.md).

Evidence: [T0 browser-first result](../t0/T0_BROWSER_RESULT.md).
