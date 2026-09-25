---
title: Configuration options
description: Configure the extension path, automatic installation, and supported Playwright options.
---

Add the package options to Playwright's `use` configuration. `WebextOptions` provides type checking
for the extension-specific options:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';
import type { WebextOptions } from 'playwright-webext';

export default defineConfig<WebextOptions>({
  use: {
    extensionPath: './dist',
    // ...
  },
});
```

## Extension options

### extensionPath

**Type:** `string`. **Default:** `''`; a non-empty path is required when requesting `extension`.

The directory containing your unpacked extension. Relative paths resolve from
the Playwright configuration file's directory, or the current working directory when there is no
config file. Absolute paths are also accepted.

Build the extension before running tests. The extension must use Chromium Manifest V3
and have a background service worker. This path is also the current build used by
[`extension.upgrade()`](../api/extension.md#upgrade).

### extensionAutoInstall

**Type:** `boolean`. **Default:** `true`.

Installs the configured extension before the test body runs. Set it to `false` when a test needs to
control installation, such as installing an older build for a migration test:

```ts
import { test } from 'playwright-webext';

test.use({
  extensionAutoInstall: false,
});

test('installs an older build and upgrades it', async ({ extension }) => {
  await extension.install('./dist-v1');
  // ...
  await extension.upgrade();
});
```

The example requires both an older build in `dist-v1/` and the current build at `extensionPath`.
See [Migration](../guides/migration.md) for assertions on the upgrade's effects.

`extensionPath` is required even when automatic installation is disabled. `extension.context`
exists before installation, but metadata and worker operations require an installed, ready extension.

## Forwarded Playwright options

- [browserName](https://playwright.dev/docs/api/class-testoptions#test-options-browser-name) (Chromium only)
- [headless](https://playwright.dev/docs/api/class-testoptions#test-options-headless)
- [launchOptions](https://playwright.dev/docs/api/class-testoptions#test-options-launch-options)
- [locale](https://playwright.dev/docs/api/class-testoptions#test-options-locale)
- [viewport](https://playwright.dev/docs/api/class-testoptions#test-options-viewport)

## Test timeout

The extension fixture uses the [test timeout](https://playwright.dev/docs/test-timeouts#test-timeout)
for worker readiness and shutdown waits during installation and lifecycle operations.

## Context settings

Other context options, such as `baseURL`, `storageState`, and `permissions`, are not automatically
forwarded to `extension.context`. Likewise, do not assume native fixture tracing or video settings
apply to this separately created context. See [Using context](using-context.md) for direct access and
mapping the `context` fixture; that mapping does not change which options are forwarded.
