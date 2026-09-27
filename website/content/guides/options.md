---
title: Options page
description: Open your extension's options document and verify that settings are saved.
---

An options page lets users change extension settings. With playwright-webext, you can open it
directly in a test without navigating Chromium's extension management UI.
[`extension.openOptions()`](../api/extension.md#openoptions) reads the page path from your manifest
and opens it in a regular tab, where you can change settings and check that they are saved.

```ts
test('options page', async ({ extension }) => {
  const optionsPage = await extension.openOptions();
  // ...check options page
});
```

## Example

This example assumes an options document with a “Theme” select, a “Save” button, and code that stores
the chosen value under `theme`. The extension needs the `storage` permission.

```ts title="tests/options.spec.ts"
import { test } from 'playwright-webext';

test('saves the theme', async ({ extension }) => {
  const optionsPage = await extension.openOptions();

  await optionsPage.getByLabel('Theme').selectOption('dark');
  await optionsPage.getByRole('button', { name: 'Save' }).click();

  await extension.storage.local.expect('theme').toEqual('dark');
});
```

You can also seed settings with [`extension.storage`](../api/storage.md) before opening the document,
then assert the values displayed by your UI.

## Wrap as POM

If your options page has many elements to interact with, wrap it in a Page Object Model (POM)
to keep locators and actions in one place.

```ts title="tests/pages/options.ts"
import type { Page } from '@playwright/test';
import type { Extension } from 'playwright-webext';

export class OptionsPage {
  #page?: Page;

  constructor(private extension: Extension) {}

  get page() {
    if (!this.#page || this.#page.isClosed()) {
      throw new Error('Call OptionsPage.open() before interacting with the options page.');
    }
    return this.#page;
  }

  async open() {
    this.#page = await this.extension.openOptions();
    return this;
  }

  async close() {
    await this.page.close();
    this.#page = undefined;
  }

  async selectTheme(theme: string) {
    await this.page.getByLabel('Theme').selectOption(theme);
  }

  saveButton() {
    return this.page.getByRole('button', { name: 'Save' });
  }
}
```

Use `OptionsPage` in your test to check the same behavior through the page object:

```ts title="tests/options.spec.ts"
import { test } from 'playwright-webext';
import { OptionsPage } from './pages/options';

test('saves the theme', async ({ extension }) => {
  const optionsPage = await new OptionsPage(extension).open();

  await optionsPage.selectTheme('dark');
  await optionsPage.saveButton().click();

  await extension.storage.local.expect('theme').toEqual('dark');
});
```

## Limitations

`openOptions()` opens the options document in a regular browser tab. Its extension APIs and storage
are available, but some native options-page behaviors cannot be tested this way:

- The document opens in its own tab even if `options_ui.open_in_tab` is `false`. Embedding inside
  Chromium's extension management UI is not reproduced.
- Each call creates a new tab. The helper does not call `chrome.runtime.openOptionsPage()` or
  reproduce its behavior for an already-open options page.
- Runtime messages from the directly opened document include `sender.tab`, which differs from
  embedded options.

See [Chrome's options-page documentation](https://developer.chrome.com/docs/extensions/develop/ui/options-page)
for the native embedded and full-page behaviors.
