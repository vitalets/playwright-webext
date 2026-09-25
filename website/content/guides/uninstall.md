---
title: Uninstall
description: Test the feedback page opened when your extension is uninstalled.
---

Extensions often open a feedback page when uninstalled, asking users why they removed the extension.
Register this page's URL in your extension with `chrome.runtime.setUninstallURL()`.

To test this behavior, use [`extension.uninstall()`](../api/extension.md#uninstall) to simulate a user
uninstalling your extension, then capture and check the page it opens.

```ts title="tests/uninstall.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('opens the feedback page after uninstalling', async ({ extension }) => {
  const [feedbackPage] = await Promise.all([
    extension.context.waitForEvent('page'),
    extension.uninstall(),
  ]);

  await expect(feedbackPage).toHaveURL('https://example.com/uninstalled');
});
```
