---
title: Running tests
description: Build your extension and run its Playwright tests.
---

## Build your extension

Build your extension before running tests. The package loads a directory containing `manifest.json`;
it does not build your source or install extensions from a store. These guides assume the unpacked
build is in `dist/`.

A common approach is to build first, then run Playwright, either in the terminal or through a
`package.json` script. For a Vite-based extension:

```bash
npx vite build && npx playwright test
```

This works when you use the combined command, but running Playwright directly or clicking a test in
VS Code skips the build step and may test outdated files. To build whenever you run tests, see
[Automatic builds](../advanced/automatic-builds.md).

## Run tests

Once the build is ready at the configured `extensionPath`, [run your tests](https://playwright.dev/docs/running-tests):

```bash
npx playwright test
```

Each test requesting `extension` gets a fresh Chromium profile with the extension installed.
Installation waits for the service worker to become ready. The fixture closes the browser context after the test.
