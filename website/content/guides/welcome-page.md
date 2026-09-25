---
title: Welcome page
description: Test the welcome tab your extension opens after its first installation.
---

An extension can open a welcome page from its `chrome.runtime.onInstalled` handler. Keep automatic
installation enabled and use `expect.poll` to check the open pages until the welcome URL appears.

## Open a welcome page on installation

This example assumes your extension includes `welcome.html` and its background service worker opens
it on first installation:

```js title="background.js"
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    void chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});
```

The welcome page is behavior supplied by your extension, not a page created by `playwright-webext`.

## Check the open pages

```ts title="tests/welcome.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('opens the welcome page on first install', async ({ extension }) => {
  await expect
    .poll(() => extension.context.pages().map((page) => page.url()))
    .toContain(extension.getURL('welcome.html'));
});
```

The fixture installs the extension before the test body runs. Polling the currently open pages works
whether the welcome tab opened during fixture setup or afterward, and retries while its initial
navigation finishes. It also works when the extension opens other tabs: the assertion checks for the
welcome URL among all open pages.

This checks a welcome page that remains open; it does not capture tabs that have already closed.
See Playwright's [`expect.poll`](https://playwright.dev/docs/test-assertions#expectpoll) and
[pages guide](https://playwright.dev/docs/pages).
