---
title: Setup fixtures
description: Extend the extension test fixture or merge it with fixtures from other packages.
---

## Extend with custom fixtures

You’ll often have your own custom fixtures that extend Playwright’s default `test`. Define them in a
separate file, such as `tests/fixtures.ts`, and extend the `test` exported by `playwright-webext` to
make the `extension` fixture available alongside your custom fixtures.

```ts title="tests/fixtures.ts"
import { test as base } from 'playwright-webext';

export const test = base.extend({
  // ...custom fixtures
});
```

Import your extended `test` from this file in your tests.

## Combine fixtures with mergeTests

Use Playwright's `mergeTests()` to combine fixtures from multiple packages:

```ts title="tests/fixtures.ts"
import { mergeTests } from '@playwright/test';
import { test as base } from 'some-playwright-package';
import { test as baseWebext } from 'playwright-webext';

export const test = mergeTests(base, baseWebext).extend({
  // ...custom fixtures
});
```
