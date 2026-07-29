---
status: accepted
---

# Approve the production stack and M1–M4

On 2026-07-29 the owner gave G1 GO and authorized M1–M4 in one continuous
implementation pass with minimal ceremony.

The accepted production stack is TypeScript strict, Vite, npm with a pinned
lockfile, Planck.js 1.5.0, semantic DOM, Canvas 2D, SVG and Vitest. Execution
starts in-process and batched; there is no UI framework, rendering engine,
chart library, worker or backend.

The production application is implemented at the repository root. The T0
prototype remains separate evidence and was not copied wholesale.

Evidence: [M1–M4 implementation report](../M1_M4_IMPLEMENTATION_REPORT.md).
