---
status: accepted
---

# Use Chrome's public manifest types

The public `extension.manifest` property uses `chrome.runtime.ManifestV3` from `@types/chrome` instead of a package-owned partial schema. This provides extension authors with the complete familiar manifest type and deliberately accepts the dependency's ambient `chrome` declarations in consuming TypeScript projects.
