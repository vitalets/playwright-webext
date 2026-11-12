import { expect } from '@playwright/test';
import { test } from '../../src/index.js';
import type { Extension } from '../../src/index.js';

test.use({ extensionPath: './data/extension-content-script' });

test('injects content scripts from the original directory', async ({ extension }) => {
  await expectContentScript(extension);
});

test.describe('temporary directory', () => {
  // Use a no-op init script to trigger a temporary extension directory.
  test.use({ extensionInitScript: { content: 'void 0;' } });

  test('injects content scripts from a temporary directory', async ({ extension }) => {
    await expectContentScript(extension);
  });
});

async function expectContentScript(extension: Extension) {
  const page = await extension.context.newPage();
  await page.route('http://example.test/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }),
  );
  await page.goto('http://example.test/');
  await expect(page.locator('#from-extension')).toHaveText('foo');
  await expect(page.locator('#from-extension')).toHaveCSS('color', 'rgb(1, 2, 3)');
  await expect(page.locator('#image-from-extension')).toHaveJSProperty('naturalWidth', 16);
}
