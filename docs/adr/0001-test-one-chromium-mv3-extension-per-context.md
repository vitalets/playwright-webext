---
status: accepted
---

# Test one Chromium MV3 extension per isolated context

The package supports one unpacked Chromium Manifest V3 extension in a fresh browser profile and persistent context per extension test. Non-mutating tests load the configured extension directory directly to preserve its path-derived development ID; future workflows that modify extension files, such as catalog projection or unpacked upgrade, use private staging explicitly. This deliberately favors deterministic profile isolation and lifecycle ownership over worker-level reuse, multiple-extension orchestration, branded-browser support, or a nominal cross-browser abstraction that Playwright's extension-loading model cannot currently honor.

## Consequences

The package owns the Extension Under Test's persistent context without replacing Playwright's built-in `context` or `page`. Lifecycle operations explicitly reacquire invalidated surfaces, while snapshot values such as the loaded manifest are replaced rather than mutated.
