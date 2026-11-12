---
title: Configuration
description: Point Playwright at your built browser extension.
---

Point Playwright at your built extension directory:

```ts title="playwright.config.ts"
import { defineConfig } from '@playwright/test';
import type { WebextOptions } from 'playwright-webext';

export default defineConfig<WebextOptions>({
  use: {
    extensionPath: './dist',
  },
});
```

The path is relative to the configuration file. See [Configuration options](../basics/configuration.md)
for additional settings.
