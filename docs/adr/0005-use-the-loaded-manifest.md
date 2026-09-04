---
status: accepted
---

# Expose Chrome's loaded manifest

The `extension.manifest` property is a `chrome.runtime.ManifestV3` snapshot obtained from `chrome.runtime.getManifest()` in the extension worker, not a direct parse of `manifest.json`. This reflects localized values and the manifest Chrome actually loaded; exact source-file contents can receive a separately named API if a future use case requires them.
