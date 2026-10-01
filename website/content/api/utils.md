---
title: Utils
toc_max_heading_level: 3
description: Utilities for launching extensions and waiting on asynchronous test conditions.
---

## Methods

### launchWithExtension

`launchWithExtension()` creates a persistent Chromium context and returns an
[Extension](extension.md). Use it for [custom shared fixtures](../advanced/shared-context.md) or
outside Playwright Test. It requires an unpacked Chromium Manifest V3 extension with a background
service worker.

#### Usage {#launchwithextension-usage}

```ts
import { launchWithExtension } from 'playwright-webext';

const extension = await launchWithExtension({
  extensionPath: './dist',
  launchOptions: { headless: true },
});

// ...interact with extension

await extension.close();
```

`extension.close()` closes the context and removes temporary extension copies. Setup failures close the context and
clean up copies before the launch rejects.

#### Arguments {#launchwithextension-arguments}

One options object, typed as `LaunchWithExtensionOptions`:

- `extensionPath` (`string`, required): unpacked build directory. Relative paths resolve against the
  current working directory. Absolute paths are used unchanged.
- `extensionAutoInstall` (`boolean`, optional): defaults to `true`. Set to `false` to install manually.
- `launchOptions` ([LaunchOptions](https://playwright.dev/docs/api/class-browsertype#browser-type-launch),
  optional): browser launch settings, including `headless`. The package uses the `chromium` channel
  and adds the flags needed to load extensions.
- `contextOptions` ([BrowserContextOptions](https://playwright.dev/docs/api/class-browser#browser-new-context),
  optional): context settings. Explicit `locale` selects the extension's translation catalog;
  explicit `storageState` is restored before installation.

Omitted browser options retain Playwright's native defaults and inheritance. During Playwright tests,
context settings can inherit the active test's configuration. See the
[shared-context guide](../advanced/shared-context.md#caveats) for how this affects
worker fixtures. The function does not provide the built-in fixture's per-test video retention or
attachments. An inherited `storageState` is not automatically restored by persistent launch; pass
it explicitly when needed.

Extension lifecycle waits use Playwright's context timeout settings. Playwright Test also limits
fixture setup and test execution through its [fixture and test timeouts](https://playwright.dev/docs/test-timeouts).
`launchOptions.timeout` controls browser startup.

#### Returns {#launchwithextension-returns}

`Promise<Extension>` — ready for worker operations when automatic installation is enabled. With
`extensionAutoInstall: false`, the context is available immediately, but metadata and worker
operations require `await extension.install()` first.

### waitUntil

Polls a synchronous or asynchronous callback until it returns a truthy value, then returns that
value. Falsy values such as `undefined`, `null`, `false`, `0`, and `''` cause another attempt.

#### Usage

```ts
import { waitUntil } from 'playwright-webext';

const result = await waitUntil(() => doSomething());
```

To wait for a page by URL, use [`extension.waitForPage()`](extension.md#waitforpage).

#### Arguments

- `callback` (`() => T | Promise<T>`) — Function called on each attempt. Asynchronous results
  are awaited. Return a truthy value to stop polling.
- `options` (object, optional) — Forwarded to Playwright's
  [`expect.poll`](https://playwright.dev/docs/test-assertions#expectpoll):
  - `timeout` (`number`, optional) — Polling timeout in milliseconds. Defaults to the configured
    Playwright assertion timeout (`5_000` ms unless changed). Set to `0` to disable the polling timeout;
    the test's own timeout still applies.
  - `intervals` (`number[]`, optional) — Delays between attempts in milliseconds. Defaults to
    `[100, 250, 500, 1_000]`. After exhausting the array, polling repeats the last interval until the
    callback returns a truthy value or the timeout expires.

#### Returns

`Promise<T>` — Resolves to the first truthy callback result. Rejects if the timeout expires
or the callback throws or rejects.
