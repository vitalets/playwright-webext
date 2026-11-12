---
title: Performance
description: Choose a worker count that keeps extension tests running efficiently.
---

Each `extension` test launches a fresh Chromium process and installs the extension. Running too many
tests in parallel can make these browser processes compete for CPU and memory, slowing down the suite
instead of speeding it up.

We recommend keeping **1–3 Playwright workers** for extension tests. Compare total run times on your
machine to choose a worker count within this range. Set
[`workers`](https://playwright.dev/docs/test-parallel#limit-workers) in your Playwright configuration
file:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';

export default defineConfig({
  workers: 3,
});
```
