import { defineConfig } from '@playwright/test';
import type { WebextOptions } from '../src/index.js';

export default defineConfig<WebextOptions>({
  // Let Playwright choose the worker count on CI; use three workers locally.
  workers: process.env.CI ? undefined : 3,
  expect: {
    timeout: 10_000,
  },
  use: {
    extensionPath: './data/extension',
  },
  projects: [
    { name: 'chromium' },
    {
      name: 'edge',
      default: false,
      use: { channel: 'msedge' },
    },
  ],
});
