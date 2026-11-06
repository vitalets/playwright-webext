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
    time: '2026-01-01T15:00:00',
    // timers: true, // Mock JavaScript timers.
    // alarms: true, // Emulate Chrome alarms in the service worker.
    // paused: true, // Start paused; requires timers or alarms.
  },
});
```

## Choose what to mock

- **Dates only (default):** Leave `timers` and `alarms` unset or `false`. `Date.now()` and
  `new Date()` stay fixed at `time`, while JavaScript timers and Chrome alarms keep running natively.
  Use `setFixedTime()` to change the fixed date or `setSystemTime()` to let dates advance again.
- **Timers (setTimeout, setInterval, etc):** Set `timers: true` to mock JavaScript timers in
  the service worker and context pages. See Playwright's [full list of mocked APIs](https://playwright.dev/docs/clock#introduction).
- **Alarms:** Set `alarms: true` to emulate `chrome.alarms` in the live service worker. JavaScript timers remain
  native unless you also set `timers: true`. See [Test scheduled alarms](#test-scheduled-alarms)
  for examples and emulation limits.

With either `timers: true` or `alarms: true`, dates advance automatically. Add `paused: true`
to start with fake time paused; it requires at least one of those options.
Use `runFor()` to execute every due timer or alarm within a duration, or `fastForward()` to
deliver each overdue timer or alarm at most once. These methods only control the APIs you enabled.

With `timers: true`, leave `paused` unset if extension initialization depends on timers.
Wait for initialization to finish before calling `pauseAt()` with a future target.
Use `resume()` to resume automatic advancement.

`setSystemTime()` changes the date without firing timers or changing their remaining delays.
See the [API reference](../api/clock.md) for date inputs and method details.

## Examples

### Test with fixed time

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
    time: '2026-01-01T15:00:00Z',
  },
});

test('records the installation date', async ({ extension }) => {
  await extension.storage.local.expect('installedAt').toBe('2026-01-01T15:00:00.000Z');
});
```

By default, `Date.now()` and `new Date()` stay fixed at `time`, while `setTimeout`,
`setInterval`, and other scheduling APIs keep running. `setFixedTime()` changes that fixed date.
This matches Playwright's [`clock.setFixedTime()` behavior](https://playwright.dev/docs/clock#test-with-predefined-time).

### Hide a message after a delay

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
Since `time` is omitted, the clock starts at the browser's current time.
Check that the message remains visible before the delay expires and disappears when it does:

```ts title="test/popup.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test.use({
  extensionClock: {
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

### Advance to the next day and pause

Imagine a popup that displays the local date as `YYYY-MM-DD` and refreshes it with `setInterval`.
Test that it shows the new date after midnight. Start at 23:00 with `timers: true`, then
calculate tomorrow at 01:00 inside the popup to use its timezone:

```ts title="test/date.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test.use({
  extensionClock: {
    time: '2026-01-01T23:00:00',
    timers: true,
  },
});

test('updates the date after midnight', async ({ extension }) => {
  const popup = await extension.openPopup();
  const dateLabel = popup.getByTestId('current-date');
  await expect(dateLabel).toHaveText('2026-01-01');

  const tomorrowAtOne = await popup.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(1, 0, 0, 0);
    return date.getTime();
  });

  await extension.clock.pauseAt(tomorrowAtOne);
  await expect(dateLabel).toHaveText('2026-01-02');
});
```

`pauseAt()` fires each overdue timer at most once and leaves the clocks paused.
Using `setDate()` advances by a calendar day, accounting for daylight-saving changes;
adding 24 hours does not always reach the same local hour.
A time-only call such as `pauseAt('01:00')` targets the current day and throws if that time
has already passed.

### Test scheduled alarms

Imagine an extension that refreshes its data every ten minutes and stores the number of completed
refreshes as `refreshCount`. Its background script schedules an alarm and calls its `refreshData()`
function when the alarm fires:

```ts title="background.ts"
import { refreshData } from './refresh.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('refresh', { delayInMinutes: 10, periodInMinutes: 10 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'refresh') return;

  await refreshData();
  const { refreshCount = 0 } = await chrome.storage.local.get('refreshCount');
  await chrome.storage.local.set({ refreshCount: refreshCount + 1 });
});
```

Enable `alarms: true` and `paused: true` so the test controls when the alarm fires.
Wait for the alarm to be registered, advance ten minutes, and check that one refresh completed:

```ts title="test/alarms.spec.ts"
import { test } from 'playwright-webext';

test.use({
  extensionClock: {
    alarms: true,
    paused: true,
  },
});

test('refreshes data after ten minutes', async ({ extension }) => {
  await extension.waitForFunction(() => chrome.alarms.get('refresh'));
  await extension.clock.runFor('10:00');
  await extension.storage.local.expect('refreshCount').toBe(1);
});
```

Alarm emulation works independently of `timers`: leave `timers` unset to keep JavaScript timers
native, or add `timers: true` to advance them too. Dates advance automatically unless
`paused: true` is set, including in extension pages.

## Cheatsheet

| Testing scenario                                                       | Configuration or API                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------ |
| Start at a known date without time advancing                           | `extensionClock: { time, alarms: true, paused: true }` |
| Run every alarm occurrence during an interval                          | `clock.runFor(duration)`                               |
| Skip ahead and deliver each overdue alarm once                         | `clock.fastForward(duration)`                          |
| Skip to a specific time, deliver overdue alarms once, then stay paused | `clock.pauseAt(time)`                                  |
| Change time without delivering alarms during the change                | `clock.setSystemTime(time)`                            |
| Resume automatic time advancement and alarm delivery                   | `clock.resume()`                                       |

Choose between changing the **date only** and controlling scheduled work. With `timers` and `alarms`
unset, the date stays fixed while native timers and alarms keep running. Enable `timers: true`,
`alarms: true`, or both to control their execution. Fake time then advances automatically unless
you set `paused: true`; `resume()` restarts automatic advancement.

For explicit advancement, choose how to handle repeated callbacks:

- `runFor(duration)` steps through the interval, executing **every occurrence** due within it.
- `fastForward(duration)` jumps ahead and executes each overdue timer or alarm at most **once**.
  For example, a one-second interval runs 60 times with `runFor(60_000)`, but once with
  `fastForward(60_000)`. `pauseAt(time)` also skips repeated occurrences, then pauses at the target.

Repeating alarms retain their original cadence after a jump. Async work started by callbacks is
not awaited, so assert resulting storage or UI changes separately.

`setSystemTime()` changes the date without firing callbacks and preserves alarm deadlines and
JavaScript timers' remaining delays. Overdue alarms
fire on the next automatic delivery or, when paused, an explicit advance such as `runFor(0)`.
Moving backward delays alarm delivery. With alarm emulation, use `paused: true` instead of
`setFixedTime()` to freeze time.

Emulated alarms exist only in the live service worker and are lost on restart. Worker wake-up,
device sleep, persistence, and Chrome's real-time throttling are not simulated.

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
