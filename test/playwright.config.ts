import { defineConfig } from '@playwright/test';
import type { WebextOptions } from '../src/index.js';

export default defineConfig<WebextOptions>({
  workers: 3,
  expect: {
    timeout: 10_000,
  },
  use: {
    extensionPath: './data/extension',
  },
});
