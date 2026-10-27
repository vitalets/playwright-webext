# Expose extension launch for custom fixtures

Expose `launchWithExtension()` so authors choose fixture scope, dependencies, and shared-state
cleanup through Playwright's existing fixture API. This replaces `extensionW` (ADR 0010), whose
project-settings lookup created a separate configuration contract and bypassed resolved fixtures.
Make `extensionPath` worker-scoped so custom worker fixtures can consume it.

The returned `Extension` owns its context and private build copies; `extension.close()` releases
both without replacing native context methods. Keep the isolated built-in fixture for per-test
video reporting and config-relative paths.

Preserve native Playwright option inheritance instead of maintaining a parallel defaults list.
A lazy shared context can inherit the first requesting test's settings, which remain in effect
for later tests. Authors must choose setup timing and shared-state cleanup deliberately.
