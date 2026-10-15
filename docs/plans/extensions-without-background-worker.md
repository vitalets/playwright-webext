# Automatic Support for Extensions Without a Background Worker

## Scope and status

File-based worker detection and a resolved manifest snapshot are implemented with the workerless
fixture and focused tests below.
Support Manifest V3 extensions that omit `background.service_worker`. A declared worker that is
stopped or fails to start is a different case; do not classify it as workerless.

Detect support automatically, without an `extensionWorkerless` option or a public `workerless`
property. The installed build's manifest file supplies the declaration, so a second configuration value would need
conflict handling and could become stale after an upgrade. Do not introduce a helper extension or
modify the extension to add a worker.

## Extension identity

Use the ID already returned by the installer's CDP `Extensions.loadUnpacked` call. It works without
a worker and does not require an explicit manifest `key`. Remove the earlier proposal to discover
the extension by scanning `chrome.management.getAll()`.

Assign the returned ID before acquiring the manifest or waiting for readiness.
Match subsequent worker and management events by this ID, not merely a `chrome-extension://` prefix.
Keep identity scoped to the instance; retain the installer's existing ID check during upgrades.

An explicit `manifest.key` is available in the loaded manifest when supplied. It is unnecessary
for discovering the installed ID, and an extension without it should not receive an invented key.

## Manifest acquisition

Installation and upgrade privately read `manifest.json` from the prepared build directory after
a successful CDP load, copying, and locale preparation. The installer exposes `hasServiceWorker` by checking for
`"service_worker"` in the file. The extension's public `hasServiceWorker` getter delegates to that flag to select the
manifest acquisition path and control the workerless guard in `waitForFunction()`. The installer
keeps detection private to install and upgrade. Before installation, `hasServiceWorker` is undefined. File read errors propagate instead of being
interpreted as workerlessness.

For worker-backed extensions, find or wait for the matching worker and evaluate
`chrome.runtime.getManifest()` there. For workerless extensions, open a temporary browser tab at
`chrome-extension://<id>/manifest.json`, evaluate the same API, and close the page in `finally`.
Chromium exposes the extension runtime API there even though the document displays JSON. Navigation
or evaluation failures must fail readiness.

Both paths preserve the loaded, localized snapshot contract in
[ADR 0005](../adr/0005-use-the-loaded-manifest.md), including resolved names and any explicit `key`.
The source manifest is used only to choose the path; it is never assigned to `extension.manifest`.
No popup, options document, helper extension, or added worker is required.

Store the snapshot on the extension instance; property access does not open another page. Acquire a
fresh snapshot after installation and successful reload transitions, including upgrades, and publish
it after readiness succeeds. Editing the file alone does not mutate a previously returned snapshot.
Do not cache across tests, where the build or locale may differ.

`ExtensionManagement` could read raw source through
`chrome.developerPrivate.requestFileSource()` from `chrome://extensions/`, but this reads current disk
contents with unresolved localization tokens. Neither `chrome.management.get()` nor
`chrome.developerPrivate.getExtensionInfo()` returns a complete resolved manifest. Do not use these
as a fallback for manifest acquisition because that would change the property's semantics.

Sources: [management API](https://developer.chrome.com/docs/extensions/reference/api/management),
[developerPrivate schema](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/common/extensions/api/developer_private.webidl),
and [file reader implementation](https://github.com/chromium/chromium/blob/main/chrome/browser/extensions/api/developer_private/developer_private_functions.cc).

A local benchmark of 20 reads in one Chromium session measured medians of 0.5 ms for reading and
parsing the file, 5.4 ms for reading through an existing worker, and 132.8 ms for opening a manifest
page, evaluating, and closing it. These are local microbenchmark results, not suite-level guarantees.
Worker-backed extensions pay only the file-read cost in addition to their existing worker evaluation.
Only workerless extensions need the temporary page.

## Readiness and lifecycle

Installation and upgrade establish the ID and worker declaration before readiness. If a worker is declared,
wait for the matching worker and acquire its manifest; otherwise use the temporary document.
Check existing workers as well as newly emitted ones so a worker started during installation is not
missed. Propagate load errors and worker readiness timeouts for extensions that declare a worker.
A ready execution context does not guarantee successful application startup or completion of its
asynchronous handlers.

For enable, reload, upgrade, and enabled file-access changes, synchronize the operation before
acquiring the replacement snapshot. Refresh `hasServiceWorker` only during install and upgrade.
Changing the worker declaration on disk and then reloading is outside the current scope. Do not mistake an old worker or an old manifest for readiness of
the replacement. Register any required lifecycle listeners before triggering the operation, and
bound waits with the existing timeout conventions. Workerless completion must use management or
operation completion rather than an event that cannot occur.

Reload through `chrome.runtime.reload()` when a worker is available. Otherwise use
`ExtensionManagement`, awaiting completion with
`populateErrorForUnpacked: true`. When a worker is available, uninstall through its
`chrome.management.uninstallSelf()` API and wait for worker closure. Otherwise use
`uninstallWithCDP()`, which awaits CDP `Extensions.uninstall` completion without
a temporary page. This also supports
disabled extensions and preserves uninstall feedback pages. Calling `chrome.management.uninstall()`
from `chrome://extensions` forces a confirmation dialog, even with `showConfirmDialog: false`. Disabling
or uninstalling a workerless extension must not wait for worker closure. An unchanged file-access
setting and enabling an already enabled extension remain no-ops; changing file access while disabled
must leave the extension disabled.

Refresh the Manifest Snapshot after successful transitions, including upgrades that add or remove a
worker declaration. Close transient pages on success and failure. Do not retain a hidden extension
page, which could change the extension's runtime behavior.

## Public behavior

Expose read-only `extension.ready`: false before installation, true after initial installation and manifest acquisition, and
while disabled, false after successful uninstall or context closure. It tracks this instance, not
external management changes. Keep existing option and property types. Resource URLs, popup/options/side-panel documents, details,
and lifecycle operations should work without a worker whenever their own prerequisites are met.

Keep `extension.worker: Worker` and its existing unavailable-worker error. `evaluate`, `dispatch`,
and storage helpers currently execute in that worker; retain that execution context and fail
clearly when no worker is declared. Make `waitForFunction` fail promptly for a known
workerless extension, while preserving its retry behavior for an extension that declares a worker.
A generic document execution API or workerless storage support would be a separate API decision.

The API comments, public documentation, CHANGELOG, and ADR 0005 describe the implemented behavior.
Existing tests retain localized manifest values and equality with `chrome.runtime.getManifest()`.

## Evidence and implementation checks

Temporary browser probes on 2026-10-14 used Playwright 1.62.1 and Chromium 151.0.7922.34, in headless
mode with the repository's extension-loading flags. The fixture had no background declaration, HTML
document, or permissions, and used a localized manifest name. Probes confirmed:

- CDP returned an ID, and the temporary manifest page exposed `chrome.runtime.getManifest()` with
  zero service workers, both with and without an explicit key.
- The runtime manifest returned the localized name and preserved the explicit key when present.
- `requestFileSource` returned the unresolved name token. After editing the file without reloading,
  it returned the edited name, while the runtime manifest retained the original localized name.

These probes establish the distinction between raw and runtime manifests, not the proposed lifecycle
synchronization.

Create `test/data/extension-no-worker/` alongside the existing extension fixtures. Include an MV3
`manifest.json` without a `background` declaration, a minimal `popup.html` with visible test content,
and a localized name with an English message catalog. Omit an explicit key from the base fixture so
it exercises generated IDs.

Add `test/specs/no-worker.spec.ts`, selecting this fixture with
`test.use({ extensionPath: './data/extension-no-worker' })`. Start with these focused tests:

- Automatic installation returns an ID and a resolved manifest with the localized name, leaves zero
  service workers, and closes the temporary manifest page. Accessing `extension.worker` throws the
  existing unavailable-worker error.
- Deferred installation completes after `extension.install()` and exposes the same manifest behavior.
- `openPopup()` displays the fixture's visible content without starting a worker.
- Disable/enable and reload complete without waiting for worker events; the popup remains usable
  afterward and reload produces a fresh manifest snapshot.
- Uninstall completes and removes the extension from Chromium's management inventory.

Extend focused coverage as the affected lifecycle paths are implemented:

- Automatic and deferred installation, with and without a key, including a document-free fixture.
- Popup/options/side-panel use, resolved localization values, and manifest snapshot freshness.
- Reading the loaded custom or localized build, preserving explicit keys, rejecting navigation or
  evaluation failures, and leaving previous snapshots unchanged when the source file is edited.
- Temporary-page cleanup on success and failure, and repeated property access without new pages.
- Enable/disable, reload, upgrade, file-access changes, and uninstall with no worker; preserve
  uninstall feedback pages and disabled-state behavior.
- Upgrades in both directions between workerless and worker-backed manifests.
- Clear failures from worker-only APIs, and rejection of a missing declared worker script.
- Matching the installed ID when another extension worker is present, and rejecting stale worker or
  manifest observations during transitions.
- Existing worker-backed installation, lifecycle, evaluation, and storage behavior.

Run `npm run prettier`, `npm run tsc`, ESLint on changed implementation/test files, and the focused
Playwright tests when implementing. The fixture and focused tests accompany the implementation.

## Known edge case

Editing the worker declaration on disk while the extension is disabled does not update Chrome's
loaded manifest when the extension is enabled again. Keep the declaration detected during install
or upgrade; rereading the file on enable could wait for a worker Chrome never starts. Broader support for changing worker declarations outside install and upgrade
remains outside the current scope.

## Follow-up review

Review upgrade retry behavior separately: the installer currently marks an upgrade as completed
before CDP loading succeeds, so a failed load can consume the upgrade attempt.

Detect the declaration with a `"service_worker"` substring check instead of parsing JSON. This accepts
Chrome's permissive manifest syntax without reproducing its parser. Occurrences in comments or
unrelated values can produce false positives; escaped property names can produce false negatives.
These are accepted limitations of this heuristic.
