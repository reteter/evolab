---
status: accepted
---

# Bound repeatability to the same build and JavaScript runtime

On 2026-07-29 the owner accepted repeatability for the same manifest,
archived application build and JavaScript runtime; v0 does not promise
bit-identical results across platforms or application versions. This boundary
matches Planck.js capabilities and is sufficient for debugging, seeded restart
and replay without paying the cost of a stricter deterministic stack.

Consequences: dependency versions, RNG and schemas are pinned in the manifest;
accepted builds must remain reproducible artifacts; changing the platform or
requiring cross-platform exact needs a new decision and technical test.
