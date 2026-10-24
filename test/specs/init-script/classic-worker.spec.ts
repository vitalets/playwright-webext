import { expect } from '@playwright/test';
import { test, launchWithExtension } from '../../../src/index.js';

test.use({
  extensionPath: './data/extension-classic-worker',
});

test.describe('external script', () => {
  test.use({
    extensionInitScript: './specs/init-script/init-script.js',
  });

  test('initializes classic workers again after reload', async ({ extension }) => {
    await extension.storage.local.expect('language').toBe('foo');
    await extension.reload();
    const popup = await extension.openPopup();
    await expect(popup.getByRole('heading')).toHaveText('foo');
    expect(await popup.evaluate(() => chrome.runtime.sendMessage('language'))).toBe('foo');
  });
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

test.describe('script array', () => {
  test('launchWithExtension runs mixed scripts in order', async () => {
    const extension = await launchWithExtension({
      extensionPath: './test/data/extension-classic-worker',
      extensionInitScript: [
        { content: "globalThis.foo = ['first'];" },
        './test/specs/init-script/init-script.js',
        { content: "globalThis.foo.push('last');" },
      ],
    });
    try {
      expect(await extension.evaluate('globalThis.foo')).toEqual(['first', 'file', 'last']);
      const popup = await extension.openPopup();
      expect(await popup.evaluate('globalThis.foo')).toEqual(['first', 'file', 'last']);
    } finally {
      await extension.close();
    }
  });
});
