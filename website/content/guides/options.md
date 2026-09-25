---
title: Options page
description: Open your extension's options document and verify that settings are saved.
---

Use [`extension.openOptions()`](../api/extension.md#openoptions) to open the document declared by
`options_ui.page`, falling back to the legacy `options_page` declaration.

## Change a setting

This example assumes an options document with a “Theme” select, a “Save” button, and code that stores
the chosen value under `theme`. The extension needs the `storage` permission.

```ts title="tests/options.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('saves the theme', async ({ extension }) => {
  const options = await extension.openOptions();
  await options.getByLabel('Theme').selectOption('dark');
  await options.getByRole('button', { name: 'Save' }).click();

  await expect.poll(() => extension.storage.local.get('theme')).toEqual({ theme: 'dark' });
  await options.close();
});
```

You can also seed settings with [`extension.storage`](../api/storage.md) before opening the document,
then assert the values displayed by your UI.

## Tab behavior

Each call opens a new regular tab in `extension.context`, even if `options_ui.open_in_tab` is `false`.
The helper opens the extension URL directly; it does not call `chrome.runtime.openOptionsPage()`.

This provides a standalone page for Playwright interactions. It does not reproduce options embedded
inside Chromium's extension management UI, including their message-sender behavior: messages from
the directly opened tab include `sender.tab`.

See [Chrome's options-page documentation](https://developer.chrome.com/docs/extensions/develop/ui/options-page)
for the native embedded and full-page behaviors.
