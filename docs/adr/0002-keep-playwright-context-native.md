---
status: accepted
---

# Keep Playwright's built-in context native

The lazy, test-scoped `extension` fixture creates an instance of the exported `Extension` class, which owns and exposes a separate persistent Chromium context instead of overriding Playwright's built-in `context` and `page`. This keeps ordinary website tests completely native when they do not request `extension`, avoids eagerly creating an unused normal context in extension tests, and makes the distinction explicit: built-in pages are ordinary, while pages created through `extension.context` have the extension loaded.
