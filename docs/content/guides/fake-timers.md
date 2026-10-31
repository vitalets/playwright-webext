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

## Choose whether to mock timers

- **`withTimers: false` (default):** `Date.now()` and `new Date()` stay fixed, while native timers
  keep running. `setTime()` changes the date and `tick()` advances it by a duration without waiting
  for real time.
- **`withTimers: true`:** Also controls timers such as `setTimeout` and `setInterval`. Time advances
  automatically unless `paused: true` is set; then mocked callbacks wait for `tick()` or `resume()`.
  Use `paused: true` for deterministic time from startup, or `pause()` later to stop at the current
  fake date. Pausing a running clock can stop at different dates between test runs.

`tick()` jumps ahead and fires each due timer at most once by default, such as when simulating a
device waking from sleep. Use `{ timers: 'all' }` to execute every due occurrence when testing
retries, countdowns, or repeated polling:

```ts
await extension.clock.tick('01:00', { timers: 'all' });
```

Without timer mocking, either policy only advances the fixed date.
`setTime()` never fires timers and preserves their remaining delays.
See the [API reference](../api/clock.md) for callback ordering and method details.

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
  await extension.clock.setTime('2026-02-01T00:00:00Z');
  const popup = await extension.openPopup();
  await popup.getByRole('button', { name: 'Save' }).click();

  await extension.storage.local.expect('savedAt').toBe('2026-02-01T00:00:00.000Z');
});
```

By default, `Date.now()` and `new Date()` stay fixed at `time`, while `setTimeout`,
`setInterval`, and other scheduling APIs keep running. `setTime()` changes that fixed date.
This matches Playwright's [`clock.setFixedTime()` behavior](https://playwright.dev/docs/clock#test-with-predefined-time).

## Move to the next day

For an extension whose popup counts items saved today, advance one day and reopen the popup to check
that yesterday's items no longer count. With `withTimers: true` and `paused` unset, time starts at
`time` and continues advancing automatically, so `setTimeout`, `setInterval`, and other timer calls
keep working.

```ts title="test/daily-count.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test.use({
  extensionClock: {
    time: '2026-01-01T12:00:00Z',
    withTimers: true,
  },
});

test('starts a fresh count each day', async ({ extension }) => {
  const popup = await extension.openPopup();
  await popup.getByRole('button', { name: 'Save' }).click();
  await expect(popup.getByTestId('saved-today')).toHaveText('1');
  await popup.close();

  await extension.clock.tick(24 * 60 * 60 * 1000);

  const nextDayPopup = await extension.openPopup();
  await expect(nextDayPopup.getByTestId('saved-today')).toHaveText('0');
});
```

`tick()` advances time in the worker and pages, fires each due timer at most once,
and leaves time running afterward.
To change the date without running due timers, use `setTime()` with timer mocking; it preserves
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

Without timer mocking, the clock uses Playwright's `setFixedTime()` for pages and Sinon with only `Date` faked
for the worker, leaving worker scheduling APIs native. With `withTimers: true`, it uses Playwright's `install()` and Sinon's timer mocks.
Both are initialized before extension code and `extensionInitScript`. Use `extension.clock` to
control both; direct Playwright clock calls affect only pages.

With timer mocking, the clocks advance independently, so their dates can differ slightly while running. For exact
alignment, pause and then call `setTime()`. Each execution context has its own timer queue;
wait for cross-context work to be scheduled before advancing time.

New pages and navigations inherit the context's fake time. Reloading or upgrading the extension
resets the worker to the configured `time` and options; page time is unchanged. Each `tick()` advances from each clock’s own current date.
Call `setTime()` to align their dates again.
Fake time also affects ordinary websites in `extension.context`, but does not advance test timeouts,
network requests, or Chrome's worker lifecycle.

</details>
