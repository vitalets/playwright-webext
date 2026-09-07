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
