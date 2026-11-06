---
title: Fake timers
description: Set dates and advance time in extension pages and service workers.
---

Playwright's [`context.clock`](https://playwright.dev/docs/api/class-browsercontext#browser-context-clock)
controls time in context pages and frames, but does not work in service workers.
Playwright-webext provides [`extension.clock`](../api/clock.md) to manipulate time in both the extension's service worker
and all pages in `extension.context`. Enable it with the
[`extensionClock`](../basics/configuration.md#extensionclock) configuration option.

```ts
test.use({
  extensionClock: {
    time: '2026-01-01T00:00:00',
  },
});
```

## Choose whether to mock timers

- **`timers: false` (default), without alarm emulation:** Dates start fixed while native timers keep running.
  Use `setFixedTime()` to change the fixed date or `setSystemTime()` to let dates advance again.
- **`timers: true`:** Also controls timers such as `setTimeout` and `setInterval`. Time advances
  automatically unless `paused: true` is set. Use `runFor()` to execute all callbacks within a
  duration, or `fastForward()` to deliver each overdue timer at most once.

With `timers: true`, leave `paused` unset if extension initialization depends on timers.
Wait for initialization to finish before calling `pauseAt()` with a future target.
Use `resume()` to resume automatic advancement.

`setSystemTime()` changes the date without firing timers or changing their remaining delays.
See the [API reference](../api/clock.md) for date inputs and method details.

## Test with fixed time

Imagine an extension that records its installation date in storage.

```ts title="background.ts"
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.local.set({ installedAt: new Date().toISOString() });
  }
});
```

Fake time is set before the extension runs, so the installation handler records the configured date:

```ts title="test/clock.spec.ts"
import { test } from 'playwright-webext';

test.use({
  extensionClock: {
    time: '2026-01-01T00:00:00',
  },
});

test('records the installation date', async ({ extension }) => {
  const installedAt = await extension.evaluate(() => new Date('2026-01-01T00:00:00').toISOString());
  await extension.storage.local.expect('installedAt').toBe(installedAt);
});
```

By default, `Date.now()` and `new Date()` stay fixed at `time`, while `setTimeout`,
`setInterval`, and other scheduling APIs keep running. `setFixedTime()` changes that fixed date.
This matches Playwright's [`clock.setFixedTime()` behavior](https://playwright.dev/docs/clock#test-with-predefined-time).

## Hide a message after a delay

Imagine an extension whose popup shows a welcome message and hides it after five seconds.

```html title="popup.html"
<p id="welcome">Welcome!</p>
<script src="popup.js"></script>
```

```ts title="popup.ts"
const message = document.querySelector<HTMLElement>('#welcome')!;
setTimeout(() => {
  message.hidden = true;
}, 5_000);
```

Use `timers: true` and `paused: true` so the timeout waits for the test to advance time.
Check that the message remains visible before the delay expires and disappears when it does:

```ts title="test/popup.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test.use({
  extensionClock: {
    time: '2026-01-01T00:00:00',
    timers: true,
    paused: true,
  },
});

test('hides the welcome message after five seconds', async ({ extension }) => {
  const popup = await extension.openPopup();
  const message = popup.locator('#welcome');

  await expect(message).toBeVisible();

  await extension.clock.runFor(4_000);
  await expect(message).toBeVisible();

  await extension.clock.runFor(1_000);
  await expect(message).toBeHidden();
});
```

## Advance to the next day and pause

With `timers: true`, calculate tomorrow's target inside an extension page so it uses the
current fake date and browser timezone. For example, to jump from 23:00 to tomorrow at 01:00:

```ts
const popup = await extension.openPopup();
const tomorrowAtOne = await popup.evaluate(() => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(1, 0, 0, 0);
  return date.getTime();
});

await extension.clock.pauseAt(tomorrowAtOne);
```

`pauseAt()` fires each overdue timer at most once and leaves the clocks paused.
Using `setDate()` advances by a calendar day, accounting for daylight-saving changes;
adding 24 hours does not always reach the same local hour.
A time-only call such as `pauseAt('01:00')` targets the current day and throws if that time
has already passed.

## Test scheduled alarms

For an extension that refreshes its data every ten minutes using `chrome.alarms`, enable
`alarms: true` and advance the clock to exercise its normal scheduling code:

```ts title="test/alarms.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test.use({
  extensionClock: {
    time: '2026-01-01T10:00',
    alarms: true,
    paused: true,
  },
});

test('refreshes data after ten minutes', async ({ extension }) => {
  await expect.poll(() => extension.evaluate(() => chrome.alarms.get('refresh'))).toBeDefined();
  await extension.clock.runFor('10:00');
  await extension.storage.local.expect('refreshCount').toBe(1);
});
```

This example assumes the extension stores the number of completed refreshes as `refreshCount`.
Alarm emulation works independently of `timers`: leave `timers` unset to keep JavaScript timers
native, or add `timers: true` to advance them too. Dates advance automatically unless
`paused: true` is set, including in extension pages.

| Testing scenario                                                       | Configuration or API                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------ |
| Start at a known date without time advancing                           | `extensionClock: { time, alarms: true, paused: true }` |
| Run every alarm occurrence during an interval                          | `clock.runFor(duration)`                               |
| Skip ahead and deliver each overdue alarm once                         | `clock.fastForward(duration)`                          |
| Skip to a specific time, deliver overdue alarms once, then stay paused | `clock.pauseAt(time)`                                  |
| Change time without delivering alarms during the change                | `clock.setSystemTime(time)`                            |
| Resume automatic time advancement and alarm delivery                   | `clock.resume()`                                       |

`runFor()` delivers alarms at their deadlines. Alarms synchronously created by listeners can fire
within the remaining interval. `fastForward()` and `pauseAt()` deliver overdue alarms at the
destination; alarms created during that operation wait for a subsequent advancement or automatic
scheduler opportunity. Listener promises and detached asynchronous work are not awaited; assert
resulting storage or UI changes separately.

Repeating alarms retain their original cadence after a jump. If an alarm is due at 10:10 and
repeats every ten minutes, jumping to 10:35 delivers it once with `scheduledTime` of 10:10;
the listener observes 10:35 and the next deadline is 10:40. This follows Chromium's scheduler,
not the recurrence reset described in Chrome's device-wake documentation.

`setSystemTime()` leaves alarm deadlines unchanged. Moving forward can make alarms overdue:
a running clock delivers them at its next scheduler opportunity, while a paused clock waits
for an explicit advance such as `runFor(0)`. Moving backward postpones their delivery.
JavaScript timers retain their remaining delays. `setFixedTime()` is unavailable with alarm
emulation; use `paused: true` to keep time still.

Emulation covers alarm calls and listeners in the live service worker. Extension pages do not
share its emulated alarms. Worker restarts discard them; persistence, waking terminated workers,
and device sleep are not simulated. Deadlines execute deterministically without Chrome's
real-time throttling. Runaway alarm chains fail with a descriptive error; a single advancement
is limited to 10,000 alarm deliveries.

Without `alarms: true`, Chrome alarms remain native.

## Under the hood

<details>
<summary>Implementation details</summary>

The clock uses Playwright's public clock API for pages and a copy of its clock engine for the
worker. Without timer mocking, worker scheduling APIs remain native. Both clocks are initialized
before extension code and `extensionInitScript`. Use `extension.clock` to control both;
direct Playwright clock calls affect only pages.

With timer mocking, the clocks advance independently, so their dates can differ slightly while running.
Use `pauseAt()` with a future target to align their dates and pause. Each execution context has
its own timer queue; wait for cross-context work to be scheduled before advancing time.

New pages and navigations inherit the context's fake time. Reloading or upgrading the extension
resets the worker to the configured `time` and options; page time is unchanged.
`runFor()` and `fastForward()` advance from each clock's own current date.
Use `setFixedTime()` or `setSystemTime()` to set both dates again.
Fake time also affects ordinary websites in `extension.context`, but does not advance test timeouts,
network requests, or Chrome's worker lifecycle.

</details>
