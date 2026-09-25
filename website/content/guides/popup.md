---
title: Popup
description: Test your extension's popup document with Playwright locators and assertions.
---

Use [`extension.openPopup()`](../api/extension.md#openpopup) to open the document declared by
`action.default_popup`. It returns a normal Playwright `Page`.

## Interact with the popup document

The following example assumes your popup has a “Save” button that stores `saved: true`, and your
manifest includes the `storage` permission:

```ts title="tests/popup.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('saves preferences from the popup', async ({ extension }) => {
  const popup = await extension.openPopup();
  await popup.getByRole('button', { name: 'Save' }).click();

  await expect.poll(() => extension.storage.local.get('saved')).toEqual({ saved: true });
  await popup.close();
});
```

Prefer accessible [locators](https://playwright.dev/docs/locators) and retrying assertions over fixed
waits. Close the page when you finish using it, or let fixture teardown close the context.

## What this tests

The popup document runs inside the real extension, with its extension APIs and storage. However,
`openPopup()` hosts it in a **regular browser tab**, rather than Chromium's native toolbar popup:

- The document uses a normal tab viewport and does not close when focus moves elsewhere. Native
  popup sizing and dismissal are not reproduced.
- The new tab becomes active. Code querying the active tab sees the popup document's tab, not the
  previously active website.
- Opening the document does not grant the toolbar action's temporary `activeTab` permission or
  reproduce its user gesture.
- Runtime messages from this document include `sender.tab`; messages from a native toolbar popup
  normally do not.

Chromium's native `chrome.action.openPopup()` surface is not exposed as an interactable Playwright
`Page`. This guide follows the document-in-a-tab approach described in
[Chrome's extension testing guidance](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing).
