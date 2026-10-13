---
title: Dispatching events
description: Test extension event handlers without waiting for browser events.
---

Extensions react to events such as browser startup, alarms, and clicks on the browser action. Use
[`extension.dispatch()`](../api/extension.md#dispatch) to exercise a handler directly, without
waiting for an alarm or performing the browser action that normally triggers it.

## Emulate a browser action click

Suppose your extension saves the current tab's URL when the user clicks its toolbar icon. Its manifest
declares an `action` without a popup and the `activeTab` and `storage` permissions.

```js title="background.js"
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url) {
    await chrome.storage.local.set({ savedUrl: tab.url });
  }
});
```

Dispatch the click with a tab object containing the properties your handler uses. Event names are
relative to `chrome`.

```ts title="test/dispatching-events.spec.ts"
import { test } from 'playwright-webext';

test('saves the tab URL when the browser action is clicked', async ({ extension }) => {
  await extension.waitForFunction(() => chrome.action.onClicked.hasListeners());

  await extension.dispatch('action.onClicked', {
    id: 1,
    windowId: 1,
    index: 0,
    url: 'https://example.com/article',
    title: 'Example article',
    active: true,
    highlighted: true,
    selected: true,
    pinned: false,
    incognito: false,
    discarded: false,
    autoDiscardable: true,
    frozen: false,
  });

  await extension.storage.local.expect('savedUrl').toBe('https://example.com/article');
});
```

You can also retrieve the active tab and pass it to the handler:

```ts
const [activeTab] = await extension.evaluate(() => chrome.tabs.query({ active: true }));
await extension.dispatch('action.onClicked', activeTab);
```

Dispatch does not wait for listeners to register. Before dispatching, wait for at least one listener:

```ts
await extension.waitForFunction(() => chrome.action.onClicked.hasListeners());
```

If your extension registers several listeners, wait for an application-specific readiness condition
instead. Dispatch also does not wait for asynchronous listener work to finish.

## Limitations

- Events reach only the current service worker, not popups, options pages, or content scripts.
- Dispatch does not create tabs, open popups, or grant `activeTab` access.
- Arguments must be serializable; callbacks and ports are not supported.
- Pass real tab properties if the handler uses them to interact with a page.

See the [`extension.dispatch()`](../api/extension.md#dispatch) reference for argument forms and error behavior.
