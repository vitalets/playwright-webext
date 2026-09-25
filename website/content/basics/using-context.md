---
title: Using context
description: Use the extension's browser context directly or map Playwright's context fixture to it.
---

By default, the `extension` fixture creates a separate browser context from Playwright's built-in
`page` and `context` fixtures. Use the extension context to create and test pages that interact with
your extension.

## Create a page in the extension context

Use `extension.context.newPage()` when a website needs your extension loaded:

```ts title="tests/website.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('opens a website with the extension loaded', async ({ extension }) => {
  const page = await extension.context.newPage();
  await page.goto('https://example.com');
  await expect(page.getByRole('heading', { name: 'Example Domain' })).toBeVisible();
});
```

The extension fixture closes the context and its pages during teardown.

## Map context to the extension context

If you want tests to use the familiar `context` and `page` fixtures with the extension loaded,
override `context` in your own fixture module:

```ts title="tests/fixtures.ts"
import { test as base } from 'playwright-webext';

export const test = base.extend({
  context: async ({ extension }, use) => {
    await use(extension.context);
  },
});
```

Import this `test` in your test files. The built-in `page` fixture and any pages you create with
`context.newPage()` will use the extension context, so you can test pages that interact with your
extension.

```ts title="tests/website.spec.ts"
import { test } from './fixtures';

test('opens a website with the extension loaded', async ({ page }) => {
  await page.goto('https://example.com');
  // The extension can interact with this page.
});
```

With this override, requesting `page` or `context` also initializes `extension`. Leave context cleanup
to the extension fixture; do not close its context inside the override. If you already extend `test`
with custom fixtures, add this `context` override to the same `extend()` call.

The override changes fixture routing, not the launch configuration. Only the
[forwarded Playwright options](configuration.md#forwarded-playwright-options) are forwarded to the extension context;
settings such as `baseURL` are not automatically applied. The native `browser` fixture still does
not represent the extension's browser.

See [overriding Playwright fixtures](https://playwright.dev/docs/test-fixtures#overriding-fixtures)
for more on fixture overrides.
