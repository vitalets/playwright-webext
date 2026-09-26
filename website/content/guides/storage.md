---
title: Storage
description: Read and write extension storage in your tests.
---

Tests often need to start with saved settings or check data written by an extension.
`playwright-webext` provides `extension.storage` to read and write that data directly from your test,
without writing service-worker evaluation code for each operation. You can prepare settings before
opening a page and check what a UI action saved. Your extension needs the `storage` permission.

## Write and read storage

```ts
await extension.storage.local.set({ theme: 'dark' });

const settings = await extension.storage.local.get('theme');
expect(settings).toEqual({ theme: 'dark' });
```

`get()` returns an object containing the requested keys. Omit the argument to read all values.
You can also use `extension.storage.sync` and `extension.storage.session`.

## Prepare settings for a test

Write settings before opening an extension page to test how it displays saved values. This example
assumes your options page reads `theme` from local storage and displays it in a “Theme” select.
If your extension initializes storage asynchronously, wait for that initialization before seeding
settings so it cannot overwrite them.

```ts title="tests/storage.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('displays the saved theme', async ({ extension }) => {
  await extension.storage.local.set({ theme: 'dark' });

  const optionsPage = await extension.openOptions();
  await expect(optionsPage.getByLabel('Theme')).toHaveValue('dark');
});
```

See the [Options page guide](options.md#example) for checking storage after a UI action, and
the [ExtensionStorage API](../api/storage.md) for all available methods and storage areas.
