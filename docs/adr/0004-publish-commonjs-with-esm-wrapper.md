---
status: superseded by ADR-0006
---

# Publish one CommonJS implementation with an ESM wrapper

The package publishes one CommonJS implementation and a thin ESM re-export through conditional package exports. This matches Playwright's Node 20-compatible distribution shape, supports both `require` and `import`, and avoids separate module instances that could duplicate fixture state.
