import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('sets file access and waits for the replacement worker', async ({ extension }) => {
  const pages = extension.context.pages();
  for (const allowed of [false, true, false]) {
    await extension.setFileAccess(allowed);
    expect(
      await extension.evaluate(
        () =>
          new Promise<boolean>((resolve) => chrome.extension.isAllowedFileSchemeAccess(resolve)),
      ),
    ).toBe(allowed);
    expect(extension.context.pages()).toEqual(pages);

    const worker = extension.worker;
    await extension.setFileAccess(allowed);
    expect(extension.worker).toBe(worker);
    expect(extension.context.pages()).toEqual(pages);
  }
});

test('sets file access while disabled', async ({ extension }) => {
  await extension.setFileAccess(false);
  await extension.disable();
  await extension.setFileAccess(true);
  expect(() => extension.worker).toThrow('not available');
  await extension.enable();
  expect(
    await extension.evaluate(
      () => new Promise<boolean>((resolve) => chrome.extension.isAllowedFileSchemeAccess(resolve)),
    ),
  ).toBe(true);
});

test('closes the management page when the extension no longer exists', async ({ extension }) => {
  await extension.uninstall();
  await extension.waitForPage('https://example.com/uninstalled');
  const pages = extension.context.pages();
  await expect(extension.setFileAccess(true)).rejects.toThrow();
  expect(extension.context.pages()).toEqual(pages);
});

test.describe('before installation', () => {
  test.use({ extensionAutoInstall: false });

  test('rejects without opening a management page', async ({ extension }) => {
    const pages = extension.context.pages();
    await expect(extension.setFileAccess(true)).rejects.toThrow('Extension is not installed');
    expect(extension.context.pages()).toEqual(pages);
  });
});
