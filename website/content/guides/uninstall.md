---
title: Uninstall
description: Test the feedback page opened when your extension is uninstalled.
---

Extensions often open a feedback page when uninstalled, asking users why they removed the extension.
Register this page's URL in your extension with `chrome.runtime.setUninstallURL()`.

playwright-webext lets you trigger uninstallation from your test with
[`extension.uninstall()`](../api/extension.md#uninstall), without navigating Chromium's extension
management UI or handling a confirmation dialog.

```ts
test('uninstall', async ({ extension }) => {
  await extension.uninstall();
  // ...check uninstall action
});
```

## Example

Capture the feedback page in the same browser context to check where users are sent.

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
