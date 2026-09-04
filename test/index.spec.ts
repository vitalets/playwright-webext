import { expect } from '@playwright/test';
import { test } from '../src/index.js';

const userAgent = 'playwright-webext-test';

test.use({
  extensionPath: './test/data/extension',
  launchOptions: {
    args: [`--user-agent=${userAgent}`],
  },
});

test('loads the extension manifest', async ({ extension }) => {
  expect(extension.manifest.name).toBe('Test Extension');
  expect(extension.manifest.manifest_version).toBe(3);
});

test('passes Playwright launch options to the extension browser', async ({ extension }) => {
  const page = await extension.context.newPage();

  expect(await page.evaluate(() => navigator.userAgent)).toBe(userAgent);
});
