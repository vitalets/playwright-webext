# Automatic Support for Extensions Without a Background Worker

## Summary

Support Manifest V3 extensions that omit `background.service_worker` automatically. Add no
`workerless` option or property, and do not introduce a helper extension.

## Implementation Changes

- During initial readiness, open `chrome://extensions` and poll `chrome.management.getAll()` for
  the single enabled extension with `type: "extension"` and `installType: "development"`. Use its
  ID and fail descriptively if zero or multiple candidates remain. The API defines `development`
  as an unpacked extension. See the
  [Chrome management API](https://developer.chrome.com/docs/extensions/reference/api/management).
- Cache the resolved ID on that `Extension` instance. Do not cache across tests, since each fixture
  owns a fresh browser context and the loaded extension may change.
- Open the guaranteed `chrome-extension://<id>/manifest.json` resource and call
  `chrome.runtime.getManifest()` there. Cache this loaded Manifest Snapshot as
  `extension.manifest`.
- If the loaded manifest declares `background.service_worker`, continue waiting for and attaching
  the matching Playwright worker. Otherwise, complete readiness immediately.
- Keep `extension.worker: Worker` unchanged; accessing it when no service worker exists continues
  throwing `Extension service worker is not available.`
- Make `uninstall()` execute `chrome.management.uninstallSelf()` through a temporary
  extension-origin manifest page, removing its dependency on a running worker.
- On later `waitForReady()` calls, reuse the cached ID, refresh the Manifest Snapshot, and wait for
  a worker only when the refreshed manifest declares one.
- Update README guidance, ADR 0005's runtime-manifest acquisition description, and `CONTEXT.md` so
  an Extension Under Test may optionally have an Extension Service Worker.

## Public Interfaces

- Add nothing to `WebextOptions`.
- Do not add a `workerless` public field.
- Keep the existing `id`, `manifest`, `worker`, popup/details, and uninstall APIs intact.
- Broaden `waitForReady()` from "worker ready" to "extension ready," while retaining worker
  readiness for extensions that declare one.

## Test Plan

- Add a worker-free MV3 fixture with a popup document.
- Verify automatic initialization, generated ID, loaded manifest, zero service workers, and the
  existing `worker` error.
- Verify popup opening, details-page disable/enable followed by `waitForReady()`, and uninstall all
  work without a worker.
- Retain the existing worker-backed tests to confirm worker attachment and user-agent evaluation.
- Run `npm run prettier`, `npm run tsc`, and focused Playwright tests for both fixtures.

## Assumptions

- The isolated persistent profile contains exactly one enabled unpacked development extension
  because the launcher uses `--disable-extensions-except`.
- The management and manifest pages are transient and closed before the fixture reaches test code.
- Per-test manifest retrieval is intentional and already occurs today; cross-test caching is
  avoided to prevent stale IDs or manifests.
