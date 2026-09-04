# playwright-webext

A Playwright-powered testing harness for browser extensions.

## Features

- Auto-loading extension by `extensionPath` option.
- A single `extension` fixture with useful methods.
- tbd

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

The fixture is lazy. A test that does not request `extension` uses native
Playwright fixtures and does not launch an extension browser:

```ts
test('regular website', async ({ page }) => {
  await page.goto('https://example.com');
});
```

The exported `test` can be extended or combined with other fixture modules
using Playwright's `test.extend()` and `mergeTests()`.

## Extension class

```ts
class Extension {
  readonly context: BrowserContext;
  readonly id: string;
  readonly manifest: chrome.runtime.ManifestV3;
  readonly worker: Worker;

  getURL(path?: string): string;
}
```

`manifest` is a snapshot returned by the extension's real
`chrome.runtime.getManifest()`, including Chrome's manifest localization.

`getURL()` creates URLs for internal extension pages. It intentionally does
not reproduce the session-specific hostname Chrome may generate for
`web_accessible_resources` declared with `use_dynamic_url`.

## v0 compatibility

- One extension per test.
- Bundled Chromium and Manifest V3 only.
- A background service worker is required.
- Fresh temporary browser profile per extension test.
- Linux is the currently tested platform.
- Supported Playwright options: `headless` and `viewport`.
- Automatic Playwright video, remote connections, and custom executables are
  unsupported for the extension context.
- Other Playwright options may pass through but are not part of the v0
  compatibility contract.

Planned later work includes catalog-projection i18n tests, unpacked upgrade
testing, and extension enable/disable helpers.

## License

MIT
