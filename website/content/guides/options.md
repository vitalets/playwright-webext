---
title: Options page
description: Open your extension's options document and verify that settings are saved.
---

An options page lets users change extension settings. With `playwright-webext`, you can open it
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
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('saves the theme', async ({ extension }) => {
  const optionsPage = await extension.openOptions();

  await optionsPage.getByLabel('Theme').selectOption('dark');
  await optionsPage.getByRole('button', { name: 'Save' }).click();

  await expect.poll(() => extension.storage.local.get('theme')).toEqual({ theme: 'dark' });
});
```

You can also seed settings with [`extension.storage`](../api/storage.md) before opening the document,
then assert the values displayed by your UI.

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
