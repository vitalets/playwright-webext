---
status: accepted
---

# Defer Firefox support until its runtime integration is verified

Keep the package Chromium-only for now: Firefox supports Manifest V3, but Playwright does not expose its extension background event pages, and this package relies on native service workers for readiness, evaluation, storage, and lifecycle operations. Raw WebDriver BiDi does not currently provide direct extension-background access either; a separate Firefox DevTools RDP integration is plausible but remains unverified in this package. See the [evidence and references](../firefox-support.md).

If revisited, target an explicitly documented MV3 subset with automatic setup through the normal test command and native Playwright pages, contexts, locators, and assertions. Full Chromium feature parity is not required for the first Firefox release; the exact subset and background API remain undecided. This retains the current boundary in ADR 0001 rather than promising Firefox support before a working integration exists.
