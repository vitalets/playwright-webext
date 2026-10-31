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

- **`withTimers: false` (default):** `Date.now()` and `new Date()` stay fixed, while native timers
  keep running. `setTime()` changes the date and `tick()` advances it by a duration without waiting
  for real time.
- **`withTimers: true`:** Also controls timers such as `setTimeout` and `setInterval`. Time advances
  automatically unless `paused: true` is set; then mocked callbacks wait for `tick()` or `resume()`.
  Use `paused: true` for deterministic time from startup, or `pause()` later to stop at the current
  fake date. Pausing a running clock can stop at different dates between test runs.

`setTime()` never fires timers and preserves their remaining delays.
See the [API reference](../api/clock.md) for callback ordering and method details.

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
`setInterval`, and other scheduling APIs keep running. `setTime()` changes that fixed date.
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

Use `withTimers: true` and `paused: true` so the timeout waits for the test to advance time.
Check that the message remains visible before the delay expires and disappears when it does:

```ts title="test/popup.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test.use({
  extensionClock: {
    time: '2026-01-01T00:00:00Z',
    withTimers: true,
    paused: true,
  },
});

test('hides the welcome message after five seconds', async ({ extension }) => {
  const popup = await extension.openPopup();
  const message = popup.locator('#welcome');

  await expect(message).toBeVisible();

  await extension.clock.tick(4_000);
  await expect(message).toBeVisible();

  await extension.clock.tick(1_000);
  await expect(message).toBeHidden();
});
```

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
