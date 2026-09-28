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

Capture the feedback page and check its heading.

```ts title="test/uninstall.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('opens the feedback page after uninstalling', async ({ extension }) => {
  await extension.uninstall();

  const feedbackPage = await extension.waitForPage('https://example.com/uninstall');
  await expect(feedbackPage.getByRole('heading')).toHaveText('Why did you uninstall?');
});
```
