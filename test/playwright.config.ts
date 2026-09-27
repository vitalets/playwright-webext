import { defineConfig } from '@playwright/test';
import type { WebextOptions } from '../src/index.js';

export default defineConfig<WebextOptions>({
  workers: 3,
  use: {
    extensionPath: './data/extension',
  },
});
