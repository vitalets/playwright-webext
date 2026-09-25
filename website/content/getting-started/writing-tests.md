---
title: Writing tests
description: Use the extension fixture to test background behavior and the popup.
---

Your tests have access to the `extension` fixture, which provides methods for interacting with
your extension. Use it to run background code, open extension pages, and read or update storage.
See the [Extension API](../api/extension.md) for all available methods.

Import `test` from `playwright-webext` and request `extension` in your test callback, as shown below.
If you have [set up custom or merged fixtures](../basics/setup-fixtures.md), import `test` from your
fixture module instead.

## Test background

Use `extension.evaluate()` to run code in the extension's service worker. This example checks that
the background script schedules a synchronization alarm every 30 minutes. It assumes the extension
declares the `alarms` permission and has registered the alarm during startup.

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

Use the `extension.openPopup()` method to open your extension's popup and get a Playwright
`Page` for interacting with it. This example checks its heading and assumes an `action.default_popup`
declaration in your manifest and a heading containing “popup”.

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
