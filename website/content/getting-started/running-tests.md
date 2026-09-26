---
title: Running tests
description: Build your extension and run its Playwright tests.
---

## Build your extension

Build your extension before running tests. The package loads a directory containing `manifest.json`;
it does not build your source or install extensions from a store. These guides assume the unpacked
build is in `dist/`.

## Run tests

Once the build is ready at the configured `extensionPath`, [run your tests](https://playwright.dev/docs/running-tests):

```bash
npx playwright test
```

Each test requesting `extension` gets a fresh Chromium profile with the extension installed.
Installation waits for the service worker to become ready, but asynchronous startup work may still
be running. The fixture closes the browser context after the test.
