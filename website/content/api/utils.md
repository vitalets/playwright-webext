---
title: Utils
toc_max_heading_level: 3
description: Utilities for waiting on asynchronous test conditions.
---

## Methods

### waitUntil

**Call:** `waitUntil<T>(callback: () => T | Promise<T>, options?: WaitUntilOptions)`  
**Returns:** `Promise<T>`

Polls a synchronous or asynchronous callback until it returns a truthy value, then returns that
value. Falsy values such as `undefined`, `null`, `false`, `0`, and `''` cause another attempt.

Forwards `timeout` and `intervals` to
[`expect.poll`](https://playwright.dev/docs/test-assertions#expectpoll), using its defaults when
omitted. Rejects if the timeout expires or the callback throws.

For an extension that schedules a `sync` alarm asynchronously and has the `alarms` permission:

```ts
import { expect } from '@playwright/test';
import { test, waitUntil } from 'playwright-webext';

test('schedules synchronization', async ({ extension }) => {
  const alarm = await waitUntil(() => extension.evaluate(() => chrome.alarms.get('sync')), {
    timeout: 10_000,
  });

  expect(alarm?.periodInMinutes).toBe(30);
});
```

To wait for a page by URL, use [`extension.waitForPage()`](extension.md#waitforpage).
