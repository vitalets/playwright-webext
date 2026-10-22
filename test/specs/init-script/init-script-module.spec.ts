import { expect } from '@playwright/test';
import { test, launchWithExtension } from '../../../src/index.js';

test.use({
  extensionPath: './data/extension',
  extensionInitScript: './specs/init-script/init-script.js',
});

test('initializes before worker dependencies and page scripts', async ({ extension }) => {
  const popup = await extension.openPopup();
  expect(await popup.evaluate(() => chrome.runtime.sendMessage('language'))).toBe('test-language');
  await expect(popup.locator('#language')).toHaveText('test-language');
  await popup.reload();
  await expect(popup.locator('#language')).toHaveText('test-language');
  await extension.reload();
  const reopened = await extension.openPopup();
  expect(await reopened.evaluate(() => chrome.runtime.sendMessage('language'))).toBe(
    'test-language',
  );

  const website = await extension.context.newPage();
  await website.goto('data:text/html,<h1>Website</h1>');
  expect(await website.evaluate(() => globalThis.chrome?.i18n)).toBeUndefined();
});

test('initializes workerless documents through launchWithExtension', async () => {
  const extension = await launchWithExtension({
    extensionPath: './test/data/extension-no-worker',
    extensionInitScript: './test/specs/init-script/init-script.js',
  });
  try {
    const popup = await extension.openPopup();
    expect(await popup.evaluate(() => chrome.i18n.getUILanguage())).toBe('test-language');
  } finally {
    await extension.close();
  }
});

test.describe('inline script', () => {
  test.use({
    extensionInitScript: { content: 'Math.random = () => 42;' },
  });

  test('initializes the worker and extension pages', async ({ extension }) => {
    expect(await extension.evaluate(() => Math.random())).toBe(42);
    const popup = await extension.openPopup();
    expect(await popup.evaluate(() => Math.random())).toBe(42);
  });
});
