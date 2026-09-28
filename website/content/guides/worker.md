---
title: Worker
description: Run code in your extension's service worker and wrap reusable test actions in a class.
---

Use [`extension.evaluate()`](../api/extension.md#evaluate) to run code in your extension's service
worker.

This example assumes another open extension page handles the `DO_SOMETHING` message.
[`chrome.runtime.sendMessage()`](https://developer.chrome.com/docs/extensions/reference/api/runtime#method-sendMessage)
sends to other extension contexts.

```ts
await extension.evaluate(() => {
  return chrome.runtime.sendMessage({ type: 'DO_SOMETHING' });
});
```

## Wrap into class

Wrap repeated actions in a class to keep extension-specific behavior in one place. Tests can call
named methods instead of repeating evaluation code, and changes to the message format only need
to be made in the wrapper.

```ts title="test/pages/bg.ts"
import type { Extension } from 'playwright-webext';

export class Bg {
  constructor(public extension: Extension) {}

  async doSomething() {
    await this.extension.evaluate(() => {
      return chrome.runtime.sendMessage({ type: 'DO_SOMETHING' });
    });
  }
}
```

Create a `bg` fixture with `base.extend()` so each test can request the wrapper:

```ts title="test/fixtures.ts"
import { test as base } from 'playwright-webext';
import { Bg } from './pages/bg';

export const test = base.extend<{ bg: Bg }>({
  bg: async ({ extension }, use) => {
    await use(new Bg(extension));
  },
});
```

Import the extended `test` in your test file. This example assumes the options page handles
`DO_SOMETHING` and displays “Done” in a status element:

```ts title="test/worker.spec.ts"
import { expect } from '@playwright/test';
import { test } from './fixtures';

test('updates the status', async ({ extension, bg }) => {
  const optionsPage = await extension.openOptions();

  await bg.doSomething();

  await expect(optionsPage.getByRole('status')).toHaveText('Done');
});
```
