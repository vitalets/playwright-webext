import { defineConfig } from '@playwright/test';
import type { WebextOptions } from 'playwright-webext';

export default defineConfig<WebextOptions>({
  testDir: './test',
  use: {
    extensionPath: './dist/prod',
  },
});
