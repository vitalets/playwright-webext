# Changelog

> This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## [Unreleased]

- Add `Extension.openOptions()` for interacting with the configured options document in a regular
  tab.
- Add `Extension.openPopup()` for interacting with the configured popup document in a regular tab.
- Add `Extension.openDetailsPage()` for enabling and disabling the extension through Chromium's
  management UI.
- Add `Extension.waitForReady()` and keep `extension.worker` attached to a replacement service
  worker after the extension restarts.
- Forward Playwright `launchOptions` to the extension browser.

## [0.1.1] - 2026-09-04

- Initial release.

[unreleased]: https://github.com/vitalets/playwright-webext/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/vitalets/playwright-webext/releases/tag/v0.1.1
