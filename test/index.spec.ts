import { expect } from '@playwright/test';
import { test } from '../src/index.js';

const userAgent = 'playwright-webext-test';

test.use({
  launchOptions: {
    args: [`--user-agent=${userAgent}`],
  },
});

test('loads the extension manifest', async ({ extension }) => {
  expect(extension.manifest.name).toBe('Test Extension');
  expect(extension.manifest.manifest_version).toBe(3);
  expect(await extension.worker.evaluate(() => navigator.userAgent)).toBe(userAgent);
});
