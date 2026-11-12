---
title: Dispatching events
description: Test extension event handlers without waiting for browser events.
---

Extensions react to events such as browser startup, extension updates, and clicks on the browser action. Use
[`extension.dispatch()`](../api/extension.md#dispatch) to exercise a handler directly, without
waiting for a real event:

```ts
await extension.dispatch(eventName, params);
```

## Example

Suppose your extension saves `{ foo: 'bar' }` in local storage when the user clicks its action button.
This example uses an action without a popup, so Chrome delivers `action.onClicked` to the worker.

```js title="background.js"
chrome.action.onClicked.addListener(async () => {
  await chrome.storage.local.set({ foo: 'bar' });
});
```

Dispatch a click with the active tab as its argument. Event names are relative to `chrome`.

```ts title="test/dispatching-events.spec.ts"
import { test } from 'playwright-webext';

test('saves a value when the action button is clicked', async ({ extension }) => {
  await extension.waitForFunction(() => chrome.action.onClicked.hasListeners());

  const tab = await extension.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  });
  await extension.dispatch('action.onClicked', tab);

  await extension.storage.local.expect('foo').toBe('bar');
});
```

Dispatch does not wait for listeners to register. Before dispatching, wait for at least one listener:

```ts
await extension.waitForFunction(() => chrome.action.onClicked.hasListeners());
```

If your extension registers several listeners, wait for an application-specific readiness condition
instead. Dispatch also does not wait for asynchronous listener work to finish.

To test scheduled alarms, use the [clock API](clock-emulation.md#test-scheduled-alarms) to advance time
and trigger them automatically.

## Limitations

- Dispatch does not perform the real action, it only triggers event listeners.
- Events reach only the current service worker, not popups, options pages, or content scripts.
- Arguments must be serializable; callbacks and ports are not supported.

See the [`extension.dispatch()`](../api/extension.md#dispatch) reference for argument forms and error behavior.
