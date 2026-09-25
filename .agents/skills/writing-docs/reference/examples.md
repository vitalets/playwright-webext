# Project examples

These examples distill the user's corrections from the September 23–25, 2026 documentation session.
They illustrate editorial decisions; recheck API behavior when applying them to future versions.

## Delete prose that repeats the example

The user explicitly removed this sentence from the uninstall guide:

> This example assumes the extension has already registered its uninstall URL. Replace the URL with
> your extension's feedback URL.

The opening already explains `chrome.runtime.setUninstallURL()`, and the assertion supplies an example
URL. Delete the sentence without replacing it with another explanation of the code.

This does not mean removing every prerequisite. “The path is relative to the configuration file” adds
information that `extensionPath: './dist'` cannot convey on its own.

## Explain the extension feature before the test

Use this order for uninstall guidance:

1. Extensions can open a feedback page when uninstalled.
2. Register the page with `chrome.runtime.setUninstallURL()`.
3. Test it with `extension.uninstall()` and capture the page.

The accepted test focuses on the feedback page:

```ts
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test('opens the feedback page after uninstalling', async ({ extension }) => {
  const [feedbackPage] = await Promise.all([
    extension.context.waitForEvent('page'),
    extension.uninstall(),
  ]);

  await expect(feedbackPage).toHaveURL('https://example.com/uninstalled');
});
```

Register the listener before triggering uninstall. Do not append checks for worker count or context
identity: those would distract from what the extension developer wants to verify. This short guide
needs no “Verify an uninstall page” heading or recap after the sample.

## Make tests useful to an extension developer

For the first background test, the user rejected reading an extension ID just to assert it exists.
The ID already has a shortcut, and that assertion says little about the extension's behavior.

The chosen example checks a scheduled alarm with `extension.evaluate()` and a direct assertion.
It needs the `alarms` permission and an alarm registered before the read. Keep those conditions; do not
claim fixture readiness guarantees every asynchronous startup task has finished. If the example
instead depends on work completing later, use an appropriate wait.

For the first popup test, check heading text rather than asserting that the popup's context equals
`extension.context`. Keep this example focused; it does not need a storage scenario as well.

## Match example detail to the lesson

To explain custom fixtures, the user preferred a skeleton over an implemented popup fixture:

```ts title="tests/fixtures.ts"
import { test as base } from 'playwright-webext';

export const test = base.extend({
  // ...custom fixtures
});
```

A natural introduction is enough: “Define your custom fixtures in a separate file and extend `test`
from `playwright-webext`.” Keep the instruction to import the resulting `test` in test files: that
connection helps the reader use the fixture module.

When demonstrating fixture merging, retain the project's chosen form:

```ts
import { mergeTests } from '@playwright/test';
import { test as base } from 'some-playwright-package';
import { test as baseWebext } from 'playwright-webext';

export const test = mergeTests(base, baseWebext).extend({
  // ...custom fixtures
});
```

These are intentionally partial setup examples, not standalone runnable tests.

## Keep the explanation that changes the reader's approach

For Using context, start with the fact that `extension` creates a separate context from Playwright's
built-in `page` and `context` fixtures. Then show how to create a page there or map the fixture. After
mapping, show a normal test requesting `page` and navigating to a website the extension can interact
with. Repeating context-identity assertions would obscure that use case.

For a welcome page, automatic installation may open it before the test body starts. The accepted
pattern polls `extension.context.pages()` for the welcome URL. Keep that timing explanation: it tells
the reader why subscribing to a future page event in the test body may miss the page.

## Keep the writing neutral and familiar

The user replaced a description of the package as adding an extension fixture with:

> `playwright-webext` simplifies testing browser extensions with Playwright.

Introduce mechanics where readers need them. Avoid “handy method”; describe the method's purpose.
For standard Playwright behavior, a precise link is usually more useful than another explanation.
