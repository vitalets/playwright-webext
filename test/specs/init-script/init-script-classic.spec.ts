import { expect } from '@playwright/test';
import { test } from '../../../src/index.js';

test.use({
  extensionPath: './data/extension-classic-worker',
  extensionInitScript: './specs/init-script/init-script.js',
});

test('initializes classic workers again after reload', async ({ extension }) => {
  await extension.storage.local.expect('language').toBe('test-language');
  await extension.reload();
  const popup = await extension.openPopup();
  await expect(popup.getByRole('heading')).toHaveText('test-language');
  expect(await popup.evaluate(() => chrome.runtime.sendMessage('language'))).toBe('test-language');
});
