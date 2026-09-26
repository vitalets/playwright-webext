---
title: Setup fixtures
description: Extend the extension test fixture or merge it with fixtures from other packages.
---

## Extend with custom fixtures

Define your custom fixtures in a separate file and extend `test` from `playwright-webext`.
This makes `extension` available alongside your custom fixtures. See
[Playwright's fixture guide](https://playwright.dev/docs/test-fixtures#creating-a-fixture) for defining fixtures.

```ts title="tests/fixtures.ts"
import { test as base } from 'playwright-webext';

export const test = base.extend({
  // ...custom fixtures
});
```

Import your extended `test` from this file in your tests.

## Combine fixtures with mergeTests

Use Playwright's [`mergeTests()`](https://playwright.dev/docs/test-fixtures#combine-custom-fixtures-from-multiple-modules)
to combine fixtures from multiple packages:

```ts title="tests/fixtures.ts"
import { mergeTests } from '@playwright/test';
import { test as base } from 'some-playwright-package';
import { test as baseWebext } from 'playwright-webext';

export const test = mergeTests(base, baseWebext).extend({
  // ...custom fixtures
});
```
