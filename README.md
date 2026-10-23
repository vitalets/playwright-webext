<div align="center">
  <a href="https://vitalets.github.io/playwright-webext">
    <img width="128" alt="playwright-webext" src="website/static/img/brand/logo.svg">
  </a>
</div>

<h2 align="center">playwright-webext</h2>

<div align="center">

[![lint](https://github.com/vitalets/playwright-webext/actions/workflows/lint.yaml/badge.svg)](https://github.com/vitalets/playwright-webext/actions/workflows/lint.yaml)
[![test](https://github.com/vitalets/playwright-webext/actions/workflows/test.yaml/badge.svg)](https://github.com/vitalets/playwright-webext/actions/workflows/test.yaml)
[![npm version](https://img.shields.io/npm/v/playwright-webext)](https://www.npmjs.com/package/playwright-webext)
[![license](https://img.shields.io/npm/l/playwright-webext)](https://github.com/vitalets/playwright-webext/blob/main/LICENSE)

</div>

A set of [Playwright](https://playwright.dev/) fixtures that make browser extensions testing easier.

## Features

- Access your extension’s APIs with the built-in [extension](https://vitalets.github.io/playwright-webext/getting-started/writing-tests/) fixture.
- Open and interact with the [popup](https://vitalets.github.io/playwright-webext/guides/popup/), [options](https://vitalets.github.io/playwright-webext/guides/options/), and
  [side panel](https://vitalets.github.io/playwright-webext/guides/side-panel/) pages.
- Read and write [extension storage](https://vitalets.github.io/playwright-webext/guides/storage/) directly from test.
- Trigger actions by [emulating browser events](https://vitalets.github.io/playwright-webext/api/extension/#dispatch).
- Inject a custom [init script](https://vitalets.github.io/playwright-webext/basics/configuration/#extensioninitscript) into the service worker and all extension pages.
- Install extension [lazily](https://vitalets.github.io/playwright-webext/basics/configuration/#extensionautoinstall) to prepare browser state.
- Check [internationalization (i18n)](https://vitalets.github.io/playwright-webext/guides/i18n/) without changing your system language.
- Verify [data migration](https://vitalets.github.io/playwright-webext/guides/migration/) between upgrades.
- Test the flow when extension is [uninstalled](https://vitalets.github.io/playwright-webext/guides/uninstall/) or [disabled](https://vitalets.github.io/playwright-webext/api/extension/#disable).

## Quick start

1. Install the package:

   ```bash
   npm install -D playwright-webext
   ```

2. Point `playwright.config.ts` at your built extension:

   ```ts
   import { defineConfig } from '@playwright/test';
   import type { WebextOptions } from 'playwright-webext';

   export default defineConfig<WebextOptions>({
     use: {
       extensionPath: './dist',
     },
   });
   ```

3. Use the `extension` fixture in your test:

   ```ts
   import { expect } from '@playwright/test';
   import { test } from 'playwright-webext';

   test('shows the popup', async ({ extension }) => {
     const popup = await extension.openPopup();
     await expect(popup.getByRole('heading')).toHaveText('My popup');
   });
   ```

4. Run the test:

   ```
   npx playwright test
   ```

## Documentation

Check out the [documentation website](https://vitalets.github.io/playwright-webext/).

## Example

See the [complete example](https://github.com/vitalets/playwright-webext/blob/main/example) for a TypeScript extension tested with `playwright-webext`.

## Motivation

[Playwright's extension guide](https://playwright.dev/docs/chrome-extensions) shows how to launch
browser with an extension, wait for its service worker, and find its ID. That gives you a working
starting point, but leaves you to maintain the setup fixtures and write helpers for extension tasks.

Playwright-webext provides helpers beyond the default guide: storage setup, localization
testing, migrations and much more. These helpers let you focus on your extension's
behavior using familiar Playwright pages, locators, and assertions.

## License

[MIT](https://github.com/vitalets/playwright-webext/blob/main/LICENSE).
