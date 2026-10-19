# Keep Playwright's built-in context native

The lazy `extension` fixture owns a separate persistent Chromium context instead of overriding
Playwright's built-in `context` and `page`. Ordinary website tests remain native, and extension
tests avoid creating an unused ordinary context. Authors explicitly use `extension.context`
for pages that need the extension; custom fixtures preserve the same boundary (ADR 0011).
