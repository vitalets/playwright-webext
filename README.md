# playwright-webext

Playwright fixtures for testing one unpacked Chromium Manifest V3 extension.

The package leaves Playwright's built-in `page` and `context` untouched. Tests
that request the lazy `extension` fixture receive a separate persistent
Chromium context with the extension loaded.

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

Relative `extensionPath` values resolve from the directory containing the
Playwright configuration file. When no configuration file is used, they
resolve from `process.cwd()`. The directory must already contain a built,
unpacked MV3 extension.

## Usage

```ts
import { expect, test } from 'playwright-webext';

test('opens an extension page', async ({ extension }) => {
  const page = await extension.context.newPage();

  await page.goto(extension.getURL('options.html'));
  await expect(page).toHaveTitle(/Options/);

  const runtimeId = await extension.worker.evaluate(
    () => chrome.runtime.id,
  );
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
