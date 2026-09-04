---
status: accepted
---

# Publish ESM only

The package publishes one ESM implementation with no CommonJS build or wrapper. To support both ESM imports and CommonJS-classified Playwright tests through Node's synchronous ESM loading, it requires Node `^20.19.0 || >=22.12.0`, exposes the same synchronous module for `import` and `require` conditions, and avoids top-level await.
