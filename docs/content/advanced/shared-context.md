---
title: Shared context
description: Reuse an extension between tests with a custom worker-scoped fixture.
---

The built-in `extension` fixture launches a fresh browser context for every test. If you have many
tests that do not rely on state, you can improve performance by reusing the extension
between them. Use `launchWithExtension()` in a **worker-scoped fixture** to launch it once per worker.

## Caveats

**There is no automatic reset between tests.** Storage, cookies, open pages, listeners, and lifecycle
changes can affect later tests. Consumers own state dependencies and necessary cleanup. An instance
cannot be installed again after uninstalling it.

[Playwright restarts workers after failures](https://playwright.dev/docs/test-retries#failures), so
later tests or retries may receive a fresh extension. Tests that depend on earlier tests can also
fail when selected on their own.

Per-test video retention and attachments belong to the built-in `extension` fixture. A custom shared
fixture does not receive that integration. Traces and screenshots are supported through Playwright's
`trace` and `screenshot` options. Later traces do not include the initial extension setup, and pages
left open by earlier tests can appear in later screenshots.

Omitted browser options can inherit the first requesting test's settings when the shared context
starts. Later `test.use()` calls do not reconfigure it. Pass settings explicitly to
`launchWithExtension()` when they must be fixed.

## Define a shared extension

The recommended setup uses two fixtures:

- `sharedExtensionW` is worker-scoped and launches a browser context with the extension once per worker. Not used directly.
- `sharedExtension` provides access to the shared extension in tests and resets its state.

```ts title="test/fixtures.ts"
import { test as base, launchWithExtension, type Extension } from 'playwright-webext';

export const test = base.extend<{ sharedExtension: Extension }, { sharedExtensionW: Extension }>({
  sharedExtensionW: [
    async ({ extensionPath, headless, launchOptions }, use) => {
      const extension = await launchWithExtension({
        extensionPath,
        launchOptions: { ...launchOptions, headless },
        // ...add custom options
      });

      await use(extension);
      await extension.close();
    },
    { scope: 'worker' },
  ],
  sharedExtension: async ({ sharedExtensionW }, use) => {
    // clear the extension state: pages, mocks, storage...
    await Promise.all(sharedExtensionW.context.pages().map((page) => page.close()));
    await sharedExtensionW.context.unrouteAll({ behavior: 'wait' });
    await sharedExtensionW.storage.local.clear();

    await use(sharedExtensionW);
  },
});
```

## Use in tests

Request `sharedExtension` fixture in your tests. Tests in the same worker reuse the extension.
The example below defines two tests that does not rely on state. the first one checks popup analytics and the second triggers an exception to test error reporting.

```ts title="test/analytics.spec.ts"
import { test } from './fixtures';

test('reports popup analytics', async ({ sharedExtension }) => {
  await sharedExtension.openPopup();
  // check popup analytics
});

test('reports exceptions', async ({ sharedExtension }) => {
  await sharedExtension.evaluate(() => {
    setTimeout(() => {
      throw new Error('Test exception');
    }, 0);
  });
  // check error reportng
});
```
