---
title: Automatic builds
description: Build your extension in Playwright global setup before running tests.
---

You can use Playwright's
[`globalSetup`](https://playwright.dev/docs/test-global-setup-teardown#option-2-configure-globalsetup-and-globalteardown)
hook to automatically build your extension before running tests. This gives you:

- **Run individual tests from VS Code.** Click the play button beside a test without a separate
  terminal build step. Enable setup on each run as shown below.
- **Keep the standard command.** Developers and coding agents can use `npx playwright test`, including
  file filters and `--grep`, without knowing a project-specific build-and-test script.
- **Test fresh code.** Rebuilding before tests prevents accidentally testing an older build in `dist/`.

## Configure the build

For an extension already configured with [CRXJS](https://crxjs.dev/guide/installation/from-scratch/),
call Vite's [`build()`](https://vite.dev/guide/api-javascript#build) from the setup hook:

```ts title="global-setup.ts"
import { build } from 'vite';

export default async function globalSetup() {
  await build();
}
```

Register the hook and point `extensionPath` at the build output:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';
import type { WebextOptions } from 'playwright-webext';

export default defineConfig<WebextOptions>({
  globalSetup: './global-setup.ts',
  use: {
    extensionPath: './dist',
  },
});
```

This example assumes the Vite and Playwright configuration files are in the project root, tests run
from that directory, and Vite outputs to `dist/`. `build()` uses the existing Vite configuration,
including the CRXJS plugin. Playwright waits for the build to finish; if it fails, tests do not start.

## Run from VS Code

In the [Playwright VS Code extension](https://playwright.dev/docs/getting-started-vscode#global-setup),
enable **Run global setup on each run** in the Playwright sidebar to rebuild whenever you run a test.
You can also save this setting for the workspace:

```json title=".vscode/settings.json"
{
  "playwright.runGlobalSetupOnEachRun": true
}
```

Each run includes the build time, even when you select only one test.
