---
title: Running tests
description: Understand automatic extension installation and cleanup during a test run.
---

## Build your extension

Build your extension before running tests. The package loads a directory containing `manifest.json`;
it does not build your source or install extensions from a store. These guides assume the unpacked
build is in `dist/`.

## Run tests

Once the build is ready at the configured `extensionPath`, run:

```bash
npx playwright test
```

Each test requesting `extension` gets an fresh Chromium profile with the extension installed. Installation waits for the service worker to get ready.
