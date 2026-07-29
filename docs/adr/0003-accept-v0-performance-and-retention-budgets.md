---
status: accepted
---

# Accept v0 performance and retention budgets

On 2026-07-29 the owner accepted the M1–M4 budgets recorded in
[T0_BUDGET_PROPOSAL](../t0/T0_BUDGET_PROPOSAL.md) without changes. They apply
to the owner's desktop, current stable Chromium and a minimum of 8 GB RAM.

The budgets cover startup, rendering, control latency, headless throughput,
generation time, stability, repeatability, render invariance, memory,
retention and initial transfer. A failed budget blocks G1 or the affected
milestone; it does not silently justify a worker, a backend, weaker
repeatability or a wider support promise.

The first response is to reduce telemetry and work batch size. A worker is
introduced only after a measured responsiveness or throughput failure.
