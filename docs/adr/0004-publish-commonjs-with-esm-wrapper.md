# Publish one CommonJS implementation with an ESM wrapper

Superseded by ADR-0006.

The package publishes one CommonJS implementation and a thin ESM re-export through conditional package exports. This matches Playwright's Node 20-compatible distribution shape, supports both `require` and `import`, and avoids separate module instances that could duplicate fixture state.
