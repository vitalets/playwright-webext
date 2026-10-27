---
title: Dispatching events
description: Test extension event handlers without waiting for browser events.
---

Extensions react to events such as browser startup, alarms, and clicks on the browser action. Use
[`extension.dispatch()`](../api/extension.md#dispatch) to exercise a handler directly, without
waiting for real event:

```ts
await extension.dispatch(eventName, params);
```

## Example

Suppose your extension marks a reminder as due when its alarm fires. Its manifest declares the
`alarms` and `storage` permissions.

```js title="background.js"
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'my-alarm') {
    await chrome.storage.local.set({ reminderDue: true });
  }
});
```

Dispatch the alarm without waiting for its scheduled time. Event names are relative to `chrome`.

```ts title="test/dispatching-events.spec.ts"
import { test } from 'playwright-webext';

test('marks the reminder as due when its alarm fires', async ({ extension }) => {
  await extension.waitForFunction(() => chrome.alarms.onAlarm.hasListeners());

  await extension.dispatch('alarms.onAlarm', {
    name: 'my-alarm',
    scheduledTime: Date.now(),
  });

  await extension.storage.local.expect('reminderDue').toBe(true);
});
```

Dispatch does not wait for listeners to register. Before dispatching, wait for at least one listener:

```ts
await extension.waitForFunction(() => chrome.alarms.onAlarm.hasListeners());
```

If your extension registers several listeners, wait for an application-specific readiness condition
instead. Dispatch also does not wait for asynchronous listener work to finish.

## Limitations

- Dispatch does not perform the real action, it only triggers event listeners.
- Events reach only the current service worker, not popups, options pages, or content scripts.
- Arguments must be serializable; callbacks and ports are not supported.

See the [`extension.dispatch()`](../api/extension.md#dispatch) reference for argument forms and error behavior.
