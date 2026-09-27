---
status: accepted
---

# Offer opt-in worker-scoped extension reuse

Add `extensionW` alongside the isolated test-scoped `extension` fixture to reduce repeated
extension setup. This introduces an opt-in exception to ADR 0001's per-test isolation policy:
tests using `extensionW` share a browser context, and consumers own shared-state dependencies
and any necessary cleanup. Documentation must explain this responsibility and include a
test-scoped cleanup fixture example.

Read existing options from `workerInfo.project.use` instead of adding a separate worker options
object or changing existing option scopes. This preserves the configuration API but limits
`extensionW` to configuration-file and project settings; file-level and describe-level `test.use()`
overrides and computed test fixture values do not apply, and missing defaults must be supplied
explicitly. Ignore video configuration for `extensionW` as a documented limitation.
