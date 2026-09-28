# Changelog

> This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## [Unreleased]

- Export `waitUntil(callback, options)` to poll for and return a truthy value.
- Add `extension.waitForPage(url, options)` to wait for existing or newly opened pages, resolving
  relative URLs under the extension and matching absolute URLs in its browser context.
- Add local search across the website's guides and API documentation.

## [0.2.0] - 2026-09-27

- Add `extension.storage[area].expect(key?)` for retrying Playwright assertions, including `.not`.
  Omit the key or pass `undefined` to assert against the whole storage area.
- Add `extension.openSidePanel()` and readonly `extension.sidePanelUrl` for the side panel document
  declared by `side_panel.default_path`. The helper opens a regular tab and ignores runtime side
  panel overrides.
- Add readonly `extension.optionsUrl` and `extension.popupUrl` properties for the configured
  options and popup page URLs.

## [0.1.2] - 2026-09-23

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

[unreleased]: https://github.com/vitalets/playwright-webext/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/vitalets/playwright-webext/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/vitalets/playwright-webext/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/vitalets/playwright-webext/releases/tag/v0.1.1
