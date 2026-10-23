import { expect } from '@playwright/test';
import { test, launchWithExtension } from '../../../src/index.js';
import type { ExtensionInitScript } from '../../../src/index.js';

function scripts(path: string): ExtensionInitScript[] {
  return [
    { content: "const language = 'before'; chrome.i18n.getUILanguage = () => language;" },
    path,
    {
      content:
        "const language = chrome.i18n.getUILanguage() + '-after'; chrome.i18n.getUILanguage = () => language;",
    },
  ];
}

test.use({
  extensionInitScript: scripts('./specs/init-script/init-script.js'),
});

test('runs mixed scripts in order before module worker and page code', async ({ extension }) => {
  for (let i = 0; i < 2; i++) {
    if (i) await extension.reload();
    const popup = await extension.openPopup();
    await expect(popup.locator('#language')).toHaveText('test-language-after');
    expect(await popup.evaluate(() => chrome.runtime.sendMessage('language'))).toBe(
      'test-language-after',
    );
    await popup.reload();
    await expect(popup.locator('#language')).toHaveText('test-language-after');
  }
});

for (const build of ['extension-classic-worker', 'extension-no-worker']) {
  test(`launchWithExtension runs mixed scripts for ${build}`, async () => {
    const extension = await launchWithExtension({
      extensionPath: `./test/data/${build}`,
      extensionInitScript: scripts('./test/specs/init-script/init-script.js'),
    });
    try {
      if (extension.hasServiceWorker) {
        await extension.storage.local.expect('language').toBe('test-language-after');
      }
      const popup = await extension.openPopup();
      expect(await popup.evaluate(() => chrome.i18n.getUILanguage())).toBe('test-language-after');
    } finally {
      await extension.close();
    }
  });
}

test.describe('empty array', () => {
  test.use({ extensionInitScript: [] });

  test('installs without initialization', async ({ extension }) => {
    expect(await extension.evaluate(() => chrome.i18n.getUILanguage())).not.toBe(
      'test-language-after',
    );
  });
});
