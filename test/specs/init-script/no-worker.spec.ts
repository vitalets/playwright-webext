import { expect } from '@playwright/test';
import { test } from '../../../src/index.js';

test.use({
  extensionPath: './data/extension-no-worker',
  extensionInitScript: './specs/init-script/init-script.js',
});

test('initializes extension pages without adding a worker, including after reload', async ({
  extension,
}) => {
  expect(extension.hasServiceWorker).toBe(false);
  expect(extension.manifest.background).toBeUndefined();
  const popup = await extension.openPopup();
  expect(await popup.evaluate(() => chrome.i18n.getUILanguage())).toBe('foo');

  await extension.reload();
  const reopened = await extension.openPopup();
  expect(await reopened.evaluate(() => chrome.i18n.getUILanguage())).toBe('foo');
  expect(extension.context.serviceWorkers()).toHaveLength(0);
});
