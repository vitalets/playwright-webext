# Changelog

> This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## [Unreleased]

- Add `extension.loadedPath` to inspect the directory used to load the extension.
- Isolate extensions with static declarative network rules to prevent shared metadata conflicts between browsers.
- Fix loading extensions with static declarative network rules when using localization, init scripts, or upgrades.
- Add `extensionInitScript` with file paths, inline source, or an ordered array of both to initialize extension documents and background workers before application code.

## [0.3.7] - 2026-10-15

- Add `extension.pollForPageClosed()` to wait for a page to close.
- Add a complete TypeScript extension example with CRXJS, localization, an options page, and end-to-end tests.

## [0.3.6] - 2026-10-14

- Support extensions without a background service worker.
- Add `extension.ready` to track initial setup completion.
- Add `extension.hasServiceWorker` to check the worker declaration.
- Support uninstalling extensions when no service worker is running.

## [0.3.5] - 2026-10-13

- Add `extension.dispatch(name, ...args)` to dispatch synthetic Chrome events with typed event names
  and listener arguments in the current service worker.

## [0.3.4] - 2026-10-13

- Add `extension.enableDevMode()` to enable Developer mode.

## [0.3.3] - 2026-10-12

- Add `extension.reload()` to reload the extension, and wait for its
  replacement service worker and refreshed manifest.

## [0.3.2] - 2026-10-11

- Allow `extension.pollForPage()` to match regular expressions, `URLPattern` instances, or raw
  `URLPatternInit` objects against the full page URL. URL patterns require global `URLPattern`
  support. Strings continue to match exact URLs.

## [0.3.1] - 2026-10-11

- Rename `waitUntil()` to `poll()`, `WaitUntilOptions` to `PollOptions`, and
  `extension.waitForPage()` to `extension.pollForPage()`. The old names are removed.

## [0.3.0] - 2026-10-01

- Add `launchWithExtension()` for custom fixtures and standalone extension launches, with cleanup
  through `extension.close()`. Explicit launch and installation paths resolve from the working
  directory; the built-in fixture resolves configured `extensionPath` from the config directory. Lifecycle
  waits use native Playwright timeouts. Replace `extensionW` with a documented custom worker fixture.
- Make `extensionPath` worker-scoped so custom worker fixtures can consume it. File-level overrides
  remain supported; overrides inside `test.describe()` are no longer supported.

- Add Google Analytics to the website, configured through `GOOGLE_ANALYTICS_ID`.
- Allow `extension.waitForPage()` to match pages with a synchronous or asynchronous predicate
  receiving the Playwright `Page` instance.

## [0.2.1] - 2026-09-28

- Add `extension.setFileAccess(boolean)` to control Allow access to file URLs and wait for the
  extension's replacement worker when enabled.
- Add `extension.waitForFunction(pageFunction, arg, options)` to poll service worker evaluation
  until it returns a truthy value, waiting for an available worker when needed.
- Export `waitUntil(callback, options)` to poll for and return a truthy value, with
  `WaitUntilOptions` for its polling options.
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

[unreleased]: https://github.com/vitalets/playwright-webext/compare/v0.3.7...HEAD
[0.3.7]: https://github.com/vitalets/playwright-webext/compare/v0.3.6...v0.3.7
[0.3.6]: https://github.com/vitalets/playwright-webext/compare/v0.3.5...v0.3.6
[0.3.5]: https://github.com/vitalets/playwright-webext/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/vitalets/playwright-webext/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/vitalets/playwright-webext/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/vitalets/playwright-webext/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/vitalets/playwright-webext/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/vitalets/playwright-webext/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/vitalets/playwright-webext/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/vitalets/playwright-webext/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/vitalets/playwright-webext/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/vitalets/playwright-webext/releases/tag/v0.1.1
