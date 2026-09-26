---
title: Writing tests
description: Use the extension fixture to test background behavior and the popup.
---

Import `test` from `playwright-webext` and request the `extension` fixture in your test callback.
Use it to test background behavior and extension pages, as shown below. See the
[Extension API](../api/extension.md) for all available methods.
If you have [set up custom or merged fixtures](../basics/setup-fixtures.md), import `test` from your
fixture module instead.

## Test background

An extension can schedule background work with Chrome's alarms API. Use `extension.evaluate()` to
check an alarm in its service worker. This example assumes the extension declares the `alarms`
permission and has already registered a synchronization alarm that runs every 30 minutes.

```ts title="tests/background.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('check alarm', async ({ extension }) => {
  const alarm = await extension.evaluate(() => chrome.alarms.get('my-alarm'));
  expect(alarm).toMatchObject({
    name: 'my-alarm',
    periodInMinutes: 30,
  });
});
```

The evaluated function runs in the worker, not in the test process. Pass values as the optional
argument rather than referring to variables from the test's scope. See
[`extension.evaluate()`](../api/extension.md#evaluate).

## Test the popup

Extensions can show a popup when users click their toolbar icon. This example assumes an
`action.default_popup` declaration in your manifest and a heading containing “popup”.

```ts title="tests/popup.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('shows the popup', async ({ extension }) => {
  const popup = await extension.openPopup();
  await expect(popup.getByRole('heading')).toContainText('popup');
  await popup.close();
});
```

The popup document runs in a regular tab; see [Popup](../guides/popup.md) for its differences from the
native toolbar surface. For tests of websites affected by your extension, use its
[browser context](../basics/using-context.md).
