# Web Extension Testing

This context describes automated testing of an author's own unpacked web extension through Playwright.

## Language

**Extension Author**:
The person or team developing and testing its own web extension.
_Avoid_: Harness user, package consumer

**Extension Under Test**:
The author's unpacked Chromium Manifest V3 extension currently exercised by a test run. In v0 it has a background service worker.
_Avoid_: Target extension, tested extension

**Extension Details Page**:
Chromium's management surface for one Extension Under Test, distinct from the list of all loaded extensions.
_Avoid_: Extensions Page

**Catalog Projection**:
Testing a selected translation catalog through the extension's real i18n API without claiming to change the browser's actual locale.
_Avoid_: Locale emulation, mocked locale

**Unpacked Upgrade**:
A transition from an older local version of the Extension Under Test to a newer one while preserving extension identity and profile state. It excludes extension-store delivery behavior.
_Avoid_: Store update, version swap

**Manifest Snapshot**:
The manifest Chrome exposes for the loaded extension version through its runtime API. A later upgrade produces a new snapshot rather than mutating the existing one.
_Avoid_: Live manifest, current manifest
