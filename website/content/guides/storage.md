---
title: Storage
description: Read and write extension storage in your tests.
---

`extension.storage` is a shortcut for reading and writing your extension's storage from a test.
Use it to prepare stored settings or check data saved by the extension. Your extension needs the
`storage` permission.

## Write and read storage

Use `set()` to write values and `get()` to read them:

```ts
await extension.storage.local.set({ theme: 'dark' });

const settings = await extension.storage.local.get('theme');
expect(settings).toEqual({ theme: 'dark' });
```

`get()` returns an object containing the requested keys. Omit the argument to read all values.
You can also use `extension.storage.sync` and `extension.storage.session`.

## Prepare settings for a test

Write settings before opening an extension page to test how it displays saved values. This example
assumes your options page reads `theme` from local storage and displays it in a “Theme” select:

```ts title="tests/storage.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('displays the saved theme', async ({ extension }) => {
  await extension.storage.local.set({ theme: 'dark' });

  const options = await extension.openOptions();
  await expect(options.getByLabel('Theme')).toHaveValue('dark');
  await options.close();
});
```

See the [Options page guide](options.md#change-a-setting) for checking storage after a UI action, and
the [ExtensionStorage API](../api/storage.md) for all available methods and storage areas.
