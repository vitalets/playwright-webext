---
status: accepted
---

# Expose extension launch for custom fixtures

Expose `launchWithExtension()` returning an `Extension` with `.context` and `.close()`. Authors
release the browser context and temporary copies through `await extension.close()`. Keep the native
context methods unchanged. The built-in fixture and launch API share the internal context launcher
and construct `Extension` directly, allowing the fixture to track video before installation.
The launch API owns browser creation, installation, temporary extension copies, and cleanup,
including cleanup after partial setup failures. Authors choose fixture names, scopes, dependencies,
and parameters through Playwright's existing fixture API.

Keep the isolated test-scoped `extension` fixture and replace the built-in `extensionW` with a
custom worker-fixture recipe. This avoids maintaining a separate configuration contract that reads
project settings instead of resolved fixture dependencies. Remove `extensionW` directly: the author
confirmed there are no users requiring a compatibility period.

Make `extensionPath` a worker-scoped option so both test fixtures and custom worker fixtures can
consume it as a resolved dependency. Configuration and file-level `test.use()` overrides remain
supported; describe-level overrides become unsupported. The path is normally configured once.

The launch API forwards supplied browser options and retains native `launchPersistentContext()`
defaults and inheritance. Do not maintain a complete defaults or undefined-property list to block
inheritance. Document that omitted context settings can come from the active test at creation time;
in a lazy shared fixture, those can be the first requesting test's settings and remain in effect
for subsequent tests. Inheritance depends on fixture setup timing.

Install by default; accept `extensionAutoInstall: false` to defer installation, matching the
existing Playwright option name. Keep the `extensionAutoInstall` fixture option test-scoped
so installation and upgrade tests can override it per describe group. Custom worker fixtures pass
the launch parameter explicitly when needed.

Group browser parameters into `launchOptions` and `contextOptions`; `headless` belongs in
`launchOptions`. Keep extension-specific parameters at the top level.

Use native Playwright context timeout settings for extension lifecycle waits without a separate
extension timeout option. The runner limits fixture setup and test execution; `launchOptions.timeout`
controls browser startup separately. Keep per-test video retention and attachments in the built-in `extension`
fixture. Custom fixtures primarily serve shared contexts and do not receive that integration.

Resolve explicit `launchWithExtension({ extensionPath })` and `extension.install(path)` paths
from the current working directory. The built-in fixture resolves its configured `extensionPath`
relative to the config directory before constructing the extension. Calling `install()` without a
path and upgrading use that original build path. The shared-fixture recipe passes the path directly, assuming the config file is in the working
directory; custom fixtures can resolve it explicitly when needed. No public `baseDir` option is needed.

This decision supersedes ADR 0010. The complete design was confirmed for implementation.
