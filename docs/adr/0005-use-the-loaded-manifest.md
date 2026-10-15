---
status: accepted
---

# Expose Chrome's loaded manifest

The `extension.manifest` property is a `chrome.runtime.ManifestV3` snapshot obtained from `chrome.runtime.getManifest()` in its worker or a temporary extension document, not a direct parse of `manifest.json`. This reflects localized values and the manifest Chrome actually loaded; exact source-file contents can receive a separately named API if a future use case requires them.

## Workerless acquisition

Read the installed build's source manifest to determine whether it declares a service worker.
The `hasServiceWorker` getter controls acquisition: evaluate `chrome.runtime.getManifest()`
in the matching worker when declared; otherwise open `chrome-extension://<id>/manifest.json`,
evaluate the same API there, and close the document in `finally`.

This avoids opening a tab for worker-backed extensions while preserving resolved manifest values
for both kinds of extension. File contents are used only for detection, never as the public snapshot.
Read the declaration only after installation and upgrade. Changes to the worker declaration
through edited files followed by reload are outside the current scope. See the [workerless support plan](../plans/extensions-without-background-worker.md).
