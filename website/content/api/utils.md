---
title: Utils
toc_max_heading_level: 3
description: Utilities for waiting on asynchronous test conditions.
---

## Methods

### waitUntil

Polls a synchronous or asynchronous callback until it returns a truthy value, then returns that
value. Falsy values such as `undefined`, `null`, `false`, `0`, and `''` cause another attempt.

#### Usage

```ts
import { waitUntil } from 'playwright-webext';

const result = await waitUntil(() => doSomething());
```

To wait for a page by URL, use [`extension.waitForPage()`](extension.md#waitforpage).

#### Arguments

- `callback` (`() => T | Promise<T>`) — Function called on each attempt. Asynchronous results
  are awaited. Return a truthy value to stop polling.
- `options` (object, optional) — Forwarded to Playwright's
  [`expect.poll`](https://playwright.dev/docs/test-assertions#expectpoll):
  - `timeout` (`number`, optional) — Polling timeout in milliseconds. Defaults to the configured
    Playwright assertion timeout (`5_000` ms unless changed). Set to `0` to disable the polling timeout;
    the test's own timeout still applies.
  - `intervals` (`number[]`, optional) — Delays between attempts in milliseconds. Defaults to
    `[100, 250, 500, 1_000]`. After exhausting the array, polling repeats the last interval until the
    callback returns a truthy value or the timeout expires.

#### Returns

`Promise<T>` — Resolves to the first truthy callback result. Rejects if the timeout expires
or the callback throws or rejects.
