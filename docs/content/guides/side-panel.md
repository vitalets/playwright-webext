---
title: Side panel
description: Test your extension's side panel document with Playwright locators and assertions.
---

Extensions can display a side panel alongside a website. With
[`extension.openSidePanel()`](../api/extension.md#opensidepanel), you can test the document declared
by `side_panel.default_path` in a regular browser tab using Playwright locators and assertions.

```ts
test('side panel', async ({ extension }) => {
  const sidePanelPage = await extension.openSidePanel();
  // ...check side panel page
});
```

## Example

This example assumes your side panel displays a “Notes for this page” heading:

```ts title="test/side-panel.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('shows the notes panel', async ({ extension }) => {
  const sidePanelPage = await extension.openSidePanel();

  await expect(sidePanelPage.getByRole('heading', { name: 'Notes' })).toContainText('Notes');
});
```

## Wrap as POM

If your side panel has many elements to interact with, wrap it in a Page Object Model (POM)
to keep locators and actions in one place.

```ts title="test/pages/side-panel.ts"
import type { Page } from '@playwright/test';
import type { Extension } from 'playwright-webext';

export class SidePanel {
  #page?: Page;

  constructor(private extension: Extension) {}

  get page() {
    if (!this.#page || this.#page.isClosed()) {
      throw new Error('Call SidePanel.open() before interacting with the side panel.');
    }
    return this.#page;
  }

  heading() {
    return this.page.getByRole('heading', { name: 'Notes' });
  }

  async open() {
    this.#page = await this.extension.openSidePanel();
    return this;
  }

  async close() {
    await this.page.close();
  }
}
```

Use `SidePanel` in your test to check the same behavior through the page object:

```ts title="test/side-panel.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';
import { SidePanel } from './pages/side-panel';

test('shows the notes panel', async ({ extension }) => {
  const sidePanel = await new SidePanel(extension).open();

  await expect(sidePanel.heading()).toContainText('Notes');
});
```

## Limitations

`openSidePanel()` opens the side panel document in a regular browser tab. Its extension APIs and
storage are available, but some native side panel behaviors cannot be tested this way:

- The document uses a normal tab viewport and lifecycle. The helper does not call
  `chrome.sidePanel.open()` or reproduce the native panel's placement, opening, and closing behavior.
- Active-tab queries see the document's own tab. The document does not remain alongside the
  previously active website as a native panel would.
- Runtime messages from the directly opened document include `sender.tab`.
- The helper reads `side_panel.default_path` from the manifest snapshot and ignores
  `chrome.sidePanel.setOptions()` overrides, including per-tab paths. Extensions that configure
  their panel only at runtime have no manifest default path, so the helper throws.

See [Chrome's Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
for native panel configuration and behavior.
