---
title: Welcome page
description: Test the welcome tab your extension opens after its first installation.
---

An extension can open a welcome page from its `chrome.runtime.onInstalled` handler. Testing this
first-install behavior requires a browser profile where the extension has not already been installed.

playwright-webext installs the extension in a fresh profile for each test, so you can check the
welcome page without resetting a browser profile yourself. Keep automatic installation enabled and
use `expect.poll` to check the open pages until the welcome URL appears.

```ts
test('welcome page', async ({ extension }) => {
  const welcomeUrl = extension.getURL('welcome.html');
  const getWelcomePage = () =>
    extension.context.pages().find((openPage) => openPage.url() === welcomeUrl);

  await expect.poll(getWelcomePage).toBeDefined();
  const welcomePage = getWelcomePage()!;
  // ...check welcome page
});
```

The welcome tab may already be open when your test starts. Polling the open pages handles both a tab
that has already loaded and one that is still opening. See Playwright's
[`expect.poll`](https://playwright.dev/docs/test-assertions#expectpoll) and
[pages guide](https://playwright.dev/docs/pages).

## Example

This example assumes `welcome.html` displays a “Welcome” heading and the background service worker
opens it on first installation:

```js title="background.js"
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    void chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});
```

```ts title="test/welcome.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('opens the welcome page on install', async ({ extension }) => {
  const welcomeUrl = extension.getURL('welcome.html');
  const getWelcomePage = () =>
    extension.context.pages().find((openPage) => openPage.url() === welcomeUrl);

  await expect.poll(getWelcomePage).toBeDefined();
  const welcomePage = getWelcomePage()!;

  await expect(welcomePage.getByRole('heading', { name: 'Welcome' })).toContainText('Welcome');
});
```

## Wrap as POM

If your welcome page has many elements to interact with, wrap it in a Page Object Model (POM)
to keep locators and actions in one place. Use `attach()` to find the page opened by the extension.

```ts title="test/pages/welcome.ts"
import { expect, type Page } from '@playwright/test';
import type { Extension } from 'playwright-webext';

export class WelcomePage {
  #page?: Page;

  constructor(private extension: Extension) {}

  get page() {
    if (!this.#page || this.#page.isClosed()) {
      throw new Error('Call WelcomePage.attach() before interacting with the welcome page.');
    }
    return this.#page;
  }

  async attach() {
    await expect.poll(() => this.findWelcomePage()).toBeDefined();
    this.#page = this.findWelcomePage()!;
    return this;
  }

  async close() {
    await this.page.close();
  }

  heading() {
    return this.page.getByRole('heading', { name: 'Welcome' });
  }

  private findWelcomePage() {
    const welcomeUrl = this.extension.getURL('welcome.html');
    return this.extension.context.pages().find((openPage) => openPage.url() === welcomeUrl);
  }
}
```

Use `WelcomePage` in your test to check the same behavior through the page object:

```ts title="test/welcome.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';
import { WelcomePage } from './pages/welcome';

test('opens the welcome page on install', async ({ extension }) => {
  const welcomePage = await new WelcomePage(extension).attach();

  await expect(welcomePage.heading()).toContainText('Welcome');
});
```
