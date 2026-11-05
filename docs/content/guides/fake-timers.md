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
    time: '2026-01-01T00:00:00Z',
  },
});
```

## Choose whether to mock timers

- **`timers: false` (default):** Dates start fixed while native timers keep running.
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
    time: '2026-01-01T00:00:00Z',
  },
});

test('records the installation date', async ({ extension }) => {
  await extension.storage.local.expect('installedAt').toBe('2026-01-01T00:00:00.000Z');
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
    time: '2026-01-01T00:00:00Z',
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
