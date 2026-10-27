---
title: Storage
description: Read and write extension storage in your tests.
---

Tests often need to start with saved values or check data written by an extension.
playwright-webext provides `extension.storage` to read and write that data directly from your test,
without writing service-worker evaluation code for each operation. You can set storage keys before
opening a page and check what a UI action saved.

The storage methods mirror the original
[Chrome Extensions Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage),
using the same arguments and return values with promises. Your extension needs the `storage` permission.

The examples below use `extension.storage.local`. You can also use `extension.storage.sync` and
`extension.storage.session`.

## Read from storage

Read a key with `get()`:

```ts
const result = await extension.storage.local.get('key');
// result: { key: 'value' }
```

`get()` returns an object containing the requested keys. Omit the argument to read all values.

## Write to storage

Write a key with `set()`:

```ts
await extension.storage.local.set({ key: 'value' });
```

## Assert stored values

Use `expect(key)` to check a saved value. Assertions retry while your extension writes asynchronously
and support Playwright matchers, including `.not`:

```ts
await extension.storage.local.expect('saved').toEqual(true);
await extension.storage.local.expect('theme').not.toEqual('light');
```

Omit the key or pass `undefined` to check the whole storage area:

```ts
await extension.storage.local.expect().toEqual({ saved: true, theme: 'dark' });
```

## Example

Set storage keys before opening an extension page to test how it displays saved values. This example
assumes your options page reads `theme` from local storage and displays it in a “Theme” select.
If your extension initializes storage asynchronously, wait for that initialization before seeding
values so it cannot overwrite them.

```ts title="test/storage.spec.ts"
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
