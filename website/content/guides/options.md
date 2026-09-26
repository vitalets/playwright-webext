---
title: Options page
description: Open your extension's options document and verify that settings are saved.
---

An options page lets users change extension settings. With `playwright-webext`, you can open it
directly in a test without navigating Chromium's extension management UI.
[`extension.openOptions()`](../api/extension.md#openoptions) reads the page path from your manifest
and opens it in a regular tab, where you can change settings and check that they are saved.

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
