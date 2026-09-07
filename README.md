# playwright-webext

A Playwright-powered testing harness for browser extensions.

## Features

- Auto-loading extension by `extensionPath` option.
- A single `extension` fixture with useful methods.
- Extension lifecycle controls for enabling, disabling, and uninstalling.

## Prerequisites

The package is ESM-only. Node `^20.19.0 || >=22.12.0` and Playwright Test are required:

```sh
npm install -D @playwright/test
npx playwright install chromium
```

## Installation

```sh
npm install -D playwright-webext
```

## Configuration

Add `extensionPath` option to the `use` section in the Playwright config:

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import type { WebextOptions } from 'playwright-webext';

export default defineConfig<WebextOptions>({
  use: {
    extensionPath: './dist',
  },
});
```

## Usage

```ts
import { test } from 'playwright-webext';
import { expect } from '@playwright/test';

test('opens an extension page', async ({ extension }) => {
  const page = await extension.context.newPage();

  await page.goto(extension.getURL('options.html'));
  await expect(page).toHaveTitle(/Options/);

  const runtimeId = await extension.worker.evaluate(() => chrome.runtime.id);
  expect(runtimeId).toBe(extension.id);
  expect(extension.manifest.manifest_version).toBe(3);
});
```

Open the extension's configured popup document and interact with it as a normal Playwright
`Page`:

```ts
test('uses the popup', async ({ extension }) => {
  const popupPage = await extension.openPopup();

  await popupPage.getByRole('button', { name: 'Save' }).click();
  await popupPage.close();
});
```

`extension.openPopup()` opens the document declared by `action.default_popup` in a regular
browser tab. It does not open Chromium's native toolbar popup. This makes the document available
through `extension.context.pages()` and Playwright's `Page` API, but the environment is not fully
equivalent to the native popup. This approach follows Chrome's
[end-to-end testing guidance](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing),
which also calls out the active-tab limitation:

- The document uses a normal tab viewport and remains open when focus moves elsewhere. It does not
  reproduce the native popup's automatic sizing, dismissal, or reload-on-open lifecycle.
- The new tab becomes the active tab. Popup code that queries the active tab will therefore find
  the popup document's tab rather than the web page that was active before it opened.
- Opening the tab does not reproduce the toolbar action's user gesture or its temporary
  `activeTab` permission grant.
- Runtime messages sent by the document have `sender.tab` and `sender.tab.id` because the document
  is hosted in a tab. Messages from the native toolbar popup do not normally have `sender.tab`.

Calling Chromium's native `chrome.action.openPopup()` does open the actual toolbar popup in the
loaded-extension browser and does not crash. However, that browser-owned surface does not appear
in `extension.context.pages()` and is not interactable as a Playwright `Page`. Use
`extension.openPopup()` when the test needs locators or other page interactions, and close the
returned page explicitly when the test is finished.

Open Chromium's details page to disable or enable the extension through the same controls
available to users:

```ts
test('toggles the extension', async ({ extension }) => {
  const detailsPage = await extension.openDetailsPage();

  await detailsPage.disable();
  await detailsPage.enable();
  await extension.waitForReady();
  await detailsPage.close();
});
```

Remove the extension from its isolated browser profile:

```ts
test('uninstalls the extension', async ({ extension }) => {
  await extension.uninstall();
});
```

The fixture is lazy. A test that does not request `extension` uses native
Playwright fixtures and does not launch an extension browser:

```ts
test('regular website', async ({ page }) => {
  await page.goto('https://example.com');
});
```

The exported `test` can be extended or combined with other fixture modules
using Playwright's `test.extend()` and `mergeTests()`.

## License

MIT
