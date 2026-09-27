---
title: Shared context
description: Reduce extension setup time by sharing a browser context between tests in a Playwright worker.
---

The `extension` fixture launches a fresh browser context and installs the extension for every test.
For short tests, this setup can take more time than the assertions. For such cases, the package
provides another fixture, `extensionW`, which shares one extension and browser context between tests
in the same Playwright worker.

## When to use

- **Your extension does not rely much on state.** Sharing works best when tests do not change stored
  settings or leave other state behind. Examples include reading translations or checking behavior
  that depends only on the current page.
- **State is easy to clean up.** Reuse can also help when tests change only a few settings or open
  pages that you can reset or close after each test. If cleanup is complicated, use `extension`
  for a fresh context instead.
- **Setup takes a large share of test time.** In our local benchmark on an M1 Pro, launching a fresh
  context and installing the small test extension took about **0.7 seconds per test** (median setup
  time across 45 tests). `extensionW` pays this cost once per worker. Results depend on the machine
  and extension; compare timings for your own suite, including cleanup.
- **Many tests use the same setup.** Tests can reuse the same loaded extension, including a localized
  copy, instead of preparing it for every test. Use `extension` when each test needs a fresh install
  or browser profile.

## Caveats

**There is no automatic reset between tests.** Extension storage, cookies, open pages, event
listeners, and other state can affect later tests. Consumers own state dependencies and any
necessary [cleanup](#clean-up-shared-state). Disabling, upgrading, or uninstalling the extension
also affects later tests; an instance cannot be installed again after uninstalling it.

- **Shared state may be lost.** [Playwright restarts workers after failures](https://playwright.dev/docs/test-retries#failures),
  so later tests or retries may receive a fresh extension. State is not shared across workers or
  separate runs. Tests that rely on earlier tests may also fail when selected on their own.
- **Test-scoped configuration does not apply.** File-level and `describe`-level `test.use()` overrides
  for extension and context settings are ignored, as are values computed by custom test-scoped
  fixtures. Use [project configuration](#configure-the-shared-context) instead. Worker-scoped
  `browserName`, `headless`, and `launchOptions` retain their normal fixture behavior.
- **Video recording is unsupported.** Both `use.video` and `use.contextOptions.recordVideo` are
  ignored. The shared context stays open between tests, whereas the package's video retention and
  attachments rely on per-test context teardown. Use `extension` when you need per-test video.
- **Traces and screenshots reflect the shared context.** They are still collected per test, but a
  later trace does not repeat the extension's initial setup. Pages left open by earlier tests can
  appear in later screenshots. Pages closed during cleanup may no longer be available for failure
  screenshots.

## Use the shared extension

`extensionW` provides the same [Extension API](../api/extension.md). These two tests demonstrate that
storage persists between tests in the same worker: the first saves a theme, and the second reads it.
Run them together without enabling parallel execution within the file; the second depends on the first.

```ts title="test/shared-context.spec.ts"
import { test } from 'playwright-webext';

test('stores state in the shared extension', async ({ extensionW }) => {
  await extensionW.storage.local.set({ theme: 'dark' });
});

test('reuses the extension and its state in the next test', async ({ extensionW }) => {
  await extensionW.storage.local.expect('theme').toEqual('dark');
});
```

The fixture initializes when first requested and closes its context when the worker exits. `W`
refers to the [Playwright test worker](https://playwright.dev/docs/test-fixtures#worker-scoped-fixtures),
not the extension's background service worker. Tests in separate workers get separate contexts;
this is not one shared instance for the entire run.

Like `extension`, it owns a separate context from Playwright's built-in `page` and `context` fixtures.
Create pages through `extensionW.context`, or [map the context fixture](../basics/using-context.md#map-context-to-the-extension-context)
using `extensionW` as the dependency. Requesting both `extension` and `extensionW` creates two
independent extension contexts.

## Configure the shared context

Set extension and context options in the Playwright configuration file, globally or per project.
For example, use projects to share a separately localized extension within each project's workers:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';
import type { WebextOptions } from 'playwright-webext';

export default defineConfig<WebextOptions>({
  use: {
    extensionPath: './dist',
  },
  projects: [
    { name: 'english', use: { locale: 'en' } },
    { name: 'spanish', use: { locale: 'es' } },
  ],
});
```

Each project runs the selected tests with its locale; assertions must match that language. See
[i18n](../guides/i18n.md) for how translation catalogs are selected and the localization limitations.

`extensionW` reads extension and context settings from the project configuration once at setup.
For example, `test.use({ locale: 'es' })` changes `extension`, but does not change `extensionW`.

Chromium is required. Within project configuration, top-level context
options such as `use.locale` take precedence over `use.contextOptions.locale`.

To install manually, set `extensionAutoInstall: false` in the configuration file and call
`extensionW.install()` once for that instance. Extension lifecycle waits use the project's `timeout`,
rather than an individual test's timeout. See [Configuration options](../basics/configuration.md)
for the available settings.

## Clean up shared state

Use an automatic test-scoped fixture to clear local extension storage before each test:

```ts title="test/fixtures.ts"
import { test as base } from 'playwright-webext';

export const test = base.extend<{ cleanupExtension: void }>({
  cleanupExtension: [
    async ({ extensionW }, use) => {
      await extensionW.storage.local.clear();
      await use();
    },
    { auto: true },
  ],
});
```

Import `test` from this module in files that use the shared context and keep requesting `extensionW`.
The cleanup fixture runs for every test without being requested explicitly. Because it depends on
`extensionW`, it initializes the shared extension even for tests that do not request it.

This gives each test empty local extension storage, including the first test. It also removes values
written during installation. If startup writes storage asynchronously, wait for that work to finish
before calling `clear()`.

Adapt the cleanup to the state your tests change: clearing local extension storage does not clear
sync or session storage, cookies, open pages, or listeners. Close pages you
create when appropriate, but leave context closure to the worker fixture.
