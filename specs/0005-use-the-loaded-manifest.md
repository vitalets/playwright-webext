# Expose Chrome's loaded manifest

Expose `extension.manifest` as a snapshot from `chrome.runtime.getManifest()`, preserving localized
values and the manifest Chrome actually loaded. Reading `manifest.json` directly would expose source
contents that can differ from the running extension.

Use the declared service worker when available, or a temporary extension document for builds without
one. Detect the declaration automatically from the installed build; do not require another option or
inject a helper worker. Successful lifecycle transitions replace the snapshot rather than mutating
previously returned values. Worker-only APIs still require a real extension worker.
