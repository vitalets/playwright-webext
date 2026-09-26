---
title: Popup
description: Test your extension's popup document with Playwright locators and assertions.
---

Extensions can show a popup when users click their toolbar icon, but Playwright cannot interact with
the native toolbar popup as a `Page`.

`playwright-webext` provides [`extension.openPopup()`](../api/extension.md#openpopup) to open the
document declared by `action.default_popup` in a regular browser tab. This lets you test its UI with
Playwright locators while using the extension's APIs and storage. See [Limitations](#limitations)
for differences from the native popup.

```ts
test('popup', async ({ extension }) => {
  const popupPage = await extension.openPopup();
  // ...check popup page
});
```

## Example

The following example assumes your popup has a “Save” button that stores `saved: true`, and your
manifest includes the `storage` permission:

```ts title="tests/popup.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('saves preferences from the popup', async ({ extension }) => {
  const popupPage = await extension.openPopup();

  await popupPage.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => extension.storage.local.get('saved')).toEqual({ saved: true });
});
```

Use Playwright's [locators](https://playwright.dev/docs/locators) and
[retrying assertions](https://playwright.dev/docs/test-assertions) to interact with the document.

## Limitations

`openPopup()` opens the popup document in a regular browser tab. Its extension APIs and storage
are available, but some native toolbar popup behaviors cannot be tested this way:

- The document uses a normal tab viewport and does not close when focus moves elsewhere. Native
  popup sizing and dismissal are not reproduced.
- The new tab becomes active. Code querying the active tab sees the popup document's tab, not the
  previously active website.
- Opening the document does not grant the toolbar action's temporary `activeTab` permission or
  reproduce its user gesture.
- Runtime messages from this document include `sender.tab`; messages from a native toolbar popup
  normally do not.

Chromium's native `chrome.action.openPopup()` surface is not exposed as an interactable Playwright
`Page`, so it cannot be used to test these behaviors with Playwright locators. See
[Chrome's extension testing guidance](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing).
