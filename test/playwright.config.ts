import { defineConfig } from '@playwright/test';
import type { WebextOptions } from '../src/index.js';

export default defineConfig<WebextOptions>({
  use: {
    extensionPath: './data/extension',
  },
});
