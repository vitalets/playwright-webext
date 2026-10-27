# Defer Firefox support until its runtime integration is verified

Keep the package Chromium-only until a Firefox integration demonstrates installation, native
Playwright page access, and a defined background API. Supporting Chromium extensions without a
worker does not remove the Chromium-specific installation and management dependencies.

Track Firefox scope, investigation, and implementation in
[GitHub issue #1](https://github.com/vitalets/playwright-webext/issues/1).
