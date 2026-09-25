# playwright-webext

[![lint](https://github.com/vitalets/playwright-webext/actions/workflows/lint.yaml/badge.svg)](https://github.com/vitalets/playwright-webext/actions/workflows/lint.yaml)
[![test](https://github.com/vitalets/playwright-webext/actions/workflows/test.yaml/badge.svg)](https://github.com/vitalets/playwright-webext/actions/workflows/test.yaml)
[![npm version](https://img.shields.io/npm/v/playwright-webext)](https://www.npmjs.com/package/playwright-webext)
[![license](https://img.shields.io/npm/l/playwright-webext)](https://github.com/vitalets/playwright-webext/blob/main/LICENSE)

A [Playwright](https://playwright.dev/) toolkit for testing browser extensions.

## Features

- Auto-loading extension by `extensionPath` option.
- An `extension` fixture for interacting with extension pages, background code, and storage.
- Extension lifecycle controls for enabling, disabling, upgrading, and uninstalling.

## Documentation

[Getting started](https://vitalets.github.io/playwright-webext/) ·
[Testing guides](https://vitalets.github.io/playwright-webext/guides/welcome-page/) ·
[API reference](https://vitalets.github.io/playwright-webext/api/extension/)

## Quick start

Requires an ESM project, Node.js `^20.19.0 || >=22.12.0` (or newer if required by your Playwright
version), and an unpacked Chromium Manifest V3 extension with a background service worker.

```sh
npm install -D playwright-webext @playwright/test
npx playwright install chromium
```

Point Playwright at your built extension directory, relative to the configuration file:

```ts
import { defineConfig } from '@playwright/test';
import type { WebextOptions } from 'playwright-webext';

export default defineConfig<WebextOptions>({
  use: {
    extensionPath: './dist',
  },
});
```

Import the extended `test` and request the `extension` fixture:

```ts
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('loads the extension', async ({ extension }) => {
  expect(extension.manifest.manifest_version).toBe(3);
});
```

```sh
npx playwright test
```

The extension gets its own isolated browser context. Use `extension.context.newPage()` for pages
that need the extension; Playwright's native `page` and `context` fixtures remain separate.

## Contributing to the docs

See [website/README.md](website/README.md) for local development and publishing. Upcoming documentation
lives on `main`; the public site deploys from the `docs` branch after manual promotion.

## License

MIT
