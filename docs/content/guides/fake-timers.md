---
title: Fake timers
description: Set dates and advance time in extension pages and service workers.
---

Playwright's [`context.clock`](https://playwright.dev/docs/api/class-browsercontext#browser-context-clock)
controls time in context pages and frames, but does not work in service workers.
Use [`extension.clock`](../api/clock.md) to manipulate time in both the extension's service worker
and all pages and frames in `extension.context`. Enable it with the
[`extensionClock`](../basics/configuration.md#extensionclock) configuration option.

```ts
test.use({
  extensionClock: {
    time: '2026-01-01T00:00:00Z',
  },
});
```

## Choose a clock mode

- **`'fixed-time'` (default):** fixes `Date.now()` and `new Date()`, while `setTimeout` and
  `setInterval` callbacks run after their normal real-time delays. Use it to test timestamps
  or behavior that depends on a specific date.
- **`'full-control'`:** controls both the date and timers such as `setTimeout` and `setInterval`.
  Use it to simulate time passing or test elapsed-time logic, such as a countdown. Time and callbacks
  advance automatically unless `paused: true` is set; then mocked callbacks wait for `runFor()`
  or `resume()`.

`paused` defaults to `false`, matching Playwright's `clock.install()` and allowing startup timers to
run. Set it to `true` for deterministic time from startup, or call `pause()` later and `resume()`
when automatic advancement is needed. `paused` and `workerFake` are only available with
`mode: 'full-control'`.

### Supported methods

| Method                | `'fixed-time'` (default)                    | `'full-control'`                                |
| --------------------- | ------------------------------------------- | ----------------------------------------------- |
| `setFixedTime(time)`  | Changes the fixed date; timers keep running | Unsupported                                     |
| `setSystemTime(time)` | Unsupported                                 | Changes the date without firing timers          |
| `pause()`             | Unsupported                                 | Stops automatic advancement at the current time |
| `resume()`            | Unsupported                                 | Resumes automatic advancement                   |
| `runFor(duration)`    | Unsupported                                 | Advances time, firing all due callbacks         |

Unsupported calls throw a configuration error; they do not switch modes. `setSystemTime()` and
`runFor()` preserve the running or paused state. Unlike Playwright, `setFixedTime()` is only
supported in `fixed-time` mode. `fastForward()` and `pauseAt()` are not currently exposed.

## Test with fixed time

For an extension that records `savedAt` in storage when the user clicks Save:

```ts title="test/clock.spec.ts"
import { test } from 'playwright-webext';

test.use({
  extensionClock: {
    time: '2026-01-01T00:00:00Z',
  },
});

test('records the save date', async ({ extension }) => {
  await extension.clock.setFixedTime('2026-02-01T00:00:00Z');
  const popup = await extension.openPopup();
  await popup.getByRole('button', { name: 'Save' }).click();

  await extension.storage.local.expect('savedAt').toBe('2026-02-01T00:00:00.000Z');
});
```

By default, `Date.now()` and `new Date()` stay fixed at `time`, while `setTimeout`,
`setInterval`, and other scheduling APIs keep running. `setFixedTime()` changes that fixed date.
This matches Playwright's [`clock.setFixedTime()` behavior](https://playwright.dev/docs/clock#test-with-predefined-time).

## Move to the next day

For an extension whose popup counts items saved today, advance one day and reopen the popup to check
that yesterday's items no longer count. With `mode: 'full-control'` and `paused` unset, time starts at
`time` and continues advancing automatically, so `setTimeout`, `setInterval`, and other timer calls
keep working.

```ts title="test/daily-count.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test.use({
  extensionClock: {
    time: '2026-01-01T12:00:00Z',
    mode: 'full-control',
  },
});

test('starts a fresh count each day', async ({ extension }) => {
  const popup = await extension.openPopup();
  await popup.getByRole('button', { name: 'Save' }).click();
  await expect(popup.getByTestId('saved-today')).toHaveText('1');
  await popup.close();

  await extension.clock.runFor(24 * 60 * 60 * 1000);

  const nextDayPopup = await extension.openPopup();
  await expect(nextDayPopup.getByTestId('saved-today')).toHaveText('0');
});
```

`runFor()` advances time in the worker and pages, executes all due timer callbacks (including repeated
intervals), and leaves time running afterward.
To change the date without running due timers, use `setSystemTime()` in this mode; it preserves
whether the clock is running or paused.

## Trigger alarms

Advancing fake time does not trigger Chrome alarms automatically. Use `extension.dispatch()` to
invoke the worker's alarm listeners explicitly:

```ts
await extension.waitForFunction(() => chrome.alarms.onAlarm.hasListeners());
await extension.dispatch('alarms.onAlarm', {
  name: 'my-alarm',
  scheduledTime: Date.parse('2026-02-01T00:00:00Z'),
});
```

See [Dispatching events](dispatching-events.md) for an example with an alarm handler and assertions.

## Under the hood

<details>
<summary>Implementation details</summary>

`fixed-time` mode uses Playwright's `setFixedTime()` for pages and Sinon with only `Date` faked
for the worker, leaving worker scheduling APIs native. `full-control` mode uses Playwright's `install()` and Sinon's timer mocks.
Both are initialized before extension code and `extensionInitScript`. Use `extension.clock` to
control both; direct Playwright clock calls affect only pages.

In `full-control` mode, the clocks advance independently, so their dates can differ slightly while running. For exact
alignment, pause and then call `setSystemTime()`. Each execution context has its own timer queue;
wait for cross-context work to be scheduled before advancing time.

New pages and navigations inherit the context's fake time. Reloading or upgrading the extension
resets the worker to the configured `time` and mode; page time is unchanged.
Fake time also affects ordinary websites in `extension.context`, but does not advance test timeouts,
network requests, or Chrome's worker lifecycle.

</details>
