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

**Type:** `string`.  
**Required.**

The directory containing your unpacked extension. Relative paths resolve from
the Playwright configuration file's directory, or the current working directory when there is no
config file. Absolute paths are also accepted.

Build the extension before running tests. The extension must use Chromium Manifest V3; a background
service worker is optional and detected automatically. This path is also the current build used by
[`extension.upgrade()`](../api/extension.md#upgrade).

Extensions without a worker support manifest access, extension pages, and lifecycle operations.
Worker evaluation, event dispatch, storage helpers, and `waitForFunction()` require a declared worker.

### extensionAutoInstall

**Type:** `boolean`.  
**Default:** `true`.

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

### extensionInitScript

**Type:** `string | { content: string } | (string | { content: string })[]`.  
**Default:** unset.

JavaScript that runs before your extension code in the service worker and all extension pages.
If the extension has no service worker, the init script runs only in extension pages.

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';
import type { WebextOptions } from 'playwright-webext';

export default defineConfig<WebextOptions>({
  use: {
    extensionPath: './dist',
    extensionInitScript: './test/extension-init.js',
  },
});
```

```js title="test/extension-init.js"
Math.random = () => 42;
```

You can also pass inline source:

```ts
extensionInitScript: { content: 'Math.random = () => 42;' },
```

Pass an array to run multiple scripts in order. Each item has its own scope; use `globalThis` to
share values between scripts:

```ts
extensionInitScript: [
  './test/extension-init.js',
  { content: 'Date.now = () => 0;' },
],
```

To pass values into inline source, use `JSON.stringify()` when interpolating them. It adds the
quotes and escaping needed for string values containing quotes, backslashes, or newlines:

```ts
import { test } from 'playwright-webext';

const userName = 'Alex "AJ" Smith';

test.use({
  extensionInitScript: {
    content: `globalThis.testUserName = ${JSON.stringify(userName)};`,
  },
});
```

To run different code in the worker and popup, check their paths:

```js title="test/extension-init.js"
const manifest = chrome.runtime.getManifest();

// For service worker
if (location.pathname === `/${manifest.background?.service_worker}`) {
  // ...
}

// For popup
if (location.pathname === `/${manifest.action?.default_popup}`) {
  // ...
}
```

#### Rules

- Relative paths resolve from the Playwright configuration directory, or from the current working
  directory with `launchWithExtension()`.
- Use plain JavaScript without imports or exports.
- Use `globalThis` for values that extension code needs to access.
- The extension does not wait for async work to finish.
- The script runs again when an extension page loads or the worker restarts.
- It does not run on ordinary websites or in content scripts.

<details>
<summary>Under the hood</summary>

For extension pages, the package uses Playwright's `context.addInitScript()` with a check that skips
ordinary websites. This API does not run in service workers, so the package changes the prepared
manifest to point to a worker wrapper. Schematically:

```diff title="manifest.json"
 {
   "background": {
-    "service_worker": "worker.js"
+    "service_worker": "webext-wrapper.js"
   }
 }
```

The wrapper loads your init script first, then the original worker:

```diff title="webext-wrapper.js"
+import './webext-init-script.js';
+import './worker.js';
```

These changes apply in a temporary directory, leaving the source unchanged.

</details>

### extensionClock

**Type:** `ExtensionClockOptions`.  
**Default:** unset.

Sets the date in the service worker and all pages and frames in `extension.context` before the
extension loads. In `'fixed-time'` mode (the default), the date stays fixed while timers keep running. Set
`mode: 'full-control'` for full timer control. Omit `extensionClock` to keep the real date and timers.

| Option       | Type                             | Default                                                                                 | Effect                                                                     |
| ------------ | -------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `time`       | `number \| string \| Date`       | Required                                                                                | Fixed or starting date; numbers are Unix milliseconds.                     |
| `mode`       | `'fixed-time' \| 'full-control'` | `'fixed-time'`                                                                          | Fixed date with running timers, or full timer control.                     |
| `paused`     | `boolean`                        | `false`                                                                                 | Starts the fully controlled clock paused. Requires `mode: 'full-control'`. |
| `workerFake` | Array of Sinon API names         | `['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance']` | Worker APIs to fake. Requires `mode: 'full-control'`.                      |

`workerFake` accepts [Sinon's `toFake` names](https://github.com/sinonjs/fake-timers#var-clock--faketimersinstallconfig)
available in service workers. Use `['Date']` to fake only dates in the worker; an empty array selects
all supported APIs. In `full-control` mode, page timers cannot be narrowed to selected functions
because Playwright does not support it. Native worker APIs excluded by `workerFake` keep running,
even with `paused: true`.

```ts
test.use({
  extensionClock: { time: '2026-01-01T00:00:00Z' },
});
```

Use `extension.clock.setFixedTime()` in the default mode. Full timer control enables `pause()`,
`resume()`, `runFor()`, and `setSystemTime()` instead. See [Fake timers](../guides/fake-timers.md)
for examples and the [API reference](../api/clock.md) for method availability.
The same options are available in `launchWithExtension()`.

## Forwarded Playwright options

- [browserName](https://playwright.dev/docs/api/class-testoptions#test-options-browser-name) (Chromium only)
- [headless](https://playwright.dev/docs/api/class-testoptions#test-options-headless)
- [launchOptions](https://playwright.dev/docs/api/class-testoptions#test-options-launch-options)
- [contextOptions](https://playwright.dev/docs/api/class-testoptions#test-options-context-options)

Context options, including `baseURL`, `storageState`, `permissions`, `locale`, and `viewport`,
apply to `extension.context`.
Set them directly in `use` or through `use.contextOptions`. Individual options take precedence over
values in `contextOptions`.

`storageState` accepts an object or a JSON file path and is restored before extension installation.

## Traces, screenshots, and videos

Playwright's [trace](https://playwright.dev/docs/api/class-testoptions#test-options-trace) and
[screenshot](https://playwright.dev/docs/api/class-testoptions#test-options-screenshot) settings
apply automatically to the extension context. For example, `screenshot: 'only-on-failure'` attaches
screenshots to the report for failed tests. Pages must remain open until context teardown to appear
in these screenshots.

The
[video](https://playwright.dev/docs/api/class-testoptions#test-options-video) setting controls video
recording, including retention modes, retries, and recording size. Retained videos are attached to
the test report after the extension context closes. Custom fixtures using `launchWithExtension()`
do not receive this video integration; see [shared context](../advanced/shared-context.md#caveats).

See [Using context](using-context.md) for direct access and mapping the `context` fixture.
